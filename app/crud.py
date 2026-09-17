# app/crud.py
"""
[CRUD (Create, Read, Update, Delete) 비즈니스 로직 모듈]
- 데이터베이스에 직접 접근하여 게시글을 생성하고, 조회하고, 수정하고, 삭제하는 함수들을 모아둔 곳입니다.
- 라우터(main.py)에서 비즈니스 로직을 분리함으로써 코드를 깔끔하고 재사용하기 쉽게 만듭니다.
"""

import hashlib
import math
from typing import Optional, List, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import or_, func

from app.models import Post
from app.schemas import PostCreate, PostUpdate, PostPagination, PostResponse, CategoryCount


# --- 1. 보안 관련 헬퍼 함수 (비밀번호 단방향 암호화) ---

def hash_password(password: str) -> str:
    """
    사용자가 입력한 일반 텍스트 비밀번호를 SHA-256 알고리즘을 사용해 64자리 16진수 해시값으로 변환합니다.
    이렇게 하면 데이터베이스 관리자나 침입자도 원래 비밀번호를 알 수 없습니다.
    """
    return hashlib.sha256(password.encode("utf-8")).hexdigest()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    사용자가 입력한 비밀번호의 해시값과 DB에 저장된 해시값이 일치하는지 비교합니다.
    """
    return hash_password(plain_password) == hashed_password


# --- 2. 게시글 목록 조회 및 검색 (Read) ---

def get_posts(
    db: Session,
    page: int = 1,
    limit: int = 9,
    category: Optional[str] = None,
    keyword: Optional[str] = None
) -> PostPagination:
    """
    [게시글 목록 조회 함수]
    - page: 현재 페이지 번호 (1부터 시작)
    - limit: 한 페이지에 보여줄 게시글 수
    - category: 특정 카테고리만 필터링 (전체인 경우 None)
    - keyword: 검색어 (제목, 내용, 작성자 대상)
    """
    query = db.query(Post)

    # 1. 카테고리 필터링 적용
    if category and category.strip() and category != "전체":
        query = query.filter(Post.category == category.strip())

    # 2. 검색어 필터링 적용 (제목 or 내용 or 작성자에 키워드가 포함되어 있는지)
    if keyword and keyword.strip():
        search_pattern = f"%{keyword.strip()}%"
        query = query.filter(
            or_(
                Post.title.ilike(search_pattern),
                Post.content.ilike(search_pattern),
                Post.author.ilike(search_pattern)
            )
        )

    # 3. 전체 조건에 일치하는 데이터 총 개수 계산
    total_count = query.count()

    # 4. 전체 페이지 수 계산
    total_pages = math.ceil(total_count / limit) if total_count > 0 else 1

    # 5. 최신 등록순으로 정렬 후 페이징(offset, limit) 적용
    offset = (page - 1) * limit
    posts = (
        query.order_by(Post.id.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    # 6. Pydantic PostResponse 형태로 변환하여 반환
    items = [PostResponse.model_validate(p) for p in posts]

    return PostPagination(
        total_count=total_count,
        page=page,
        limit=limit,
        total_pages=total_pages,
        items=items
    )


# --- 3. 게시글 단일 조회 (Read & View Count) ---

def get_post_by_id(db: Session, post_id: int, increase_view: bool = False) -> Optional[Post]:
    """
    게시글 ID로 단일 게시글을 조회합니다.
    increase_view가 True이면 상세보기를 한 것으로 간주하여 조회수(views)를 1 증가시킵니다.
    """
    post = db.query(Post).filter(Post.id == post_id).first()
    if post and increase_view:
        post.views += 1
        db.commit()
        db.refresh(post)
    return post


# --- 4. 신규 게시글 등록 (Create) ---

def create_post(db: Session, post_data: PostCreate) -> Post:
    """
    새로운 게시글을 데이터베이스에 등록합니다.
    비밀번호는 해시화하여 안전하게 저장합니다.
    """
    new_post = Post(
        title=post_data.title,
        content=post_data.content,
        author=post_data.author,
        category=post_data.category or "일반",
        password_hash=hash_password(post_data.password),
        views=0
    )
    db.add(new_post)
    db.commit()
    db.refresh(new_post)
    return new_post


# --- 5. 게시글 수정 (Update) ---

def update_post(db: Session, post_id: int, post_data: PostUpdate) -> Tuple[bool, Optional[Post], str]:
    """
    게시글을 수정합니다.
    - 반환값: (성공여부, 수정된 Post객체, 상태메시지)
    - 비밀번호 검증이 실패하면 수정을 차단합니다.
    """
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        return False, None, "게시글을 찾을 수 없습니다."

    # 비밀번호 검증
    if not verify_password(post_data.password, post.password_hash):
        return False, None, "비밀번호가 일치하지 않습니다."

    # 변경할 값이 전달된 경우에만 업데이트
    if post_data.title is not None:
        post.title = post_data.title
    if post_data.content is not None:
        post.content = post_data.content
    if post_data.category is not None:
        post.category = post_data.category

    db.commit()
    db.refresh(post)
    return True, post, "게시글이 성공적으로 수정되었습니다."


# --- 6. 게시글 삭제 (Delete) ---

def delete_post(db: Session, post_id: int, plain_password: str) -> Tuple[bool, str]:
    """
    게시글을 삭제합니다.
    - 반환값: (성공여부, 상태메시지)
    - 비밀번호 검증이 실패하면 삭제를 차단합니다.
    """
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        return False, "게시글을 찾을 수 없습니다."

    # 비밀번호 검증
    if not verify_password(plain_password, post.password_hash):
        return False, "비밀번호가 일치하지 않습니다."

    db.delete(post)
    db.commit()
    return True, "게시글이 성공적으로 삭제되었습니다."


# --- 7. 카테고리별 통계 조회 ---

def get_category_counts(db: Session) -> List[CategoryCount]:
    """
    각 카테고리별로 등록된 게시글 수를 집계하여 반환합니다.
    (예: [ {"name": "일반", "count": 5}, {"name": "공지", "count": 2} ])
    """
    results = (
        db.query(Post.category, func.count(Post.id))
        .group_by(Post.category)
        .all()
    )
    return [CategoryCount(name=row[0], count=row[1]) for row in results]
