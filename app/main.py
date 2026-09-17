# app/main.py
"""
[FastAPI 메인 애플리케이션 및 라우터 모듈]
- 웹 서버의 시작점이며, 클라이언트의 HTTP 요청을 받아 적절한 CRUD 함수로 전달하고 응답을 반환합니다.
- HTML, CSS, JS 정적 파일(static) 서빙 기능도 함께 담당합니다.
"""

import os
import traceback
from typing import Optional, List
from fastapi import FastAPI, Depends, HTTPException, Query, status, Request
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from app.database import engine, Base, get_db
from app import models, schemas, crud

# 1. 앱 시작 시 SQLite 데이터베이스 파일과 'posts' 테이블이 없으면 자동 생성합니다.
Base.metadata.create_all(bind=engine)

# 2. FastAPI 인스턴스 생성
app = FastAPI(
    title="FastAPI & SQLite 게시판",
    description="FastAPI와 SQLite를 활용한 게시글 작성 및 관리 웹 애플리케이션",
    version="1.0.0"
)

# 3. 전역 예외 처리기 등록
# 서버 내부에서 예기치 않은 오류가 발생해도 일반 텍스트나 HTML이 아닌 일관된 JSON 형식으로 에러를 반환합니다.
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    print(f"[서버 오류 발생] {request.method} {request.url}: {exc}")
    traceback.print_exc()
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": f"서버 내부 오류가 발생했습니다: {str(exc)}"}
    )

# 4. CORS(교차 출처 리소스 공유) 미들웨어 설정
# 개발 및 브라우저 환경에서 API 요청이 원활하게 통과하도록 허용합니다.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =====================================================================
# REST API 엔드포인트 정의
# =====================================================================

@app.get("/api/posts", response_model=schemas.PostPagination, summary="게시글 목록 및 검색 조회")
def read_posts(
    page: int = Query(1, ge=1, description="페이지 번호 (1부터 시작)"),
    limit: int = Query(9, ge=1, le=50, description="한 페이지당 게시글 수"),
    category: Optional[str] = Query(None, description="카테고리 필터링 (예: 일반, 공지, 질문 등)"),
    keyword: Optional[str] = Query(None, description="검색어 (제목, 내용, 작성자)"),
    db: Session = Depends(get_db)
):
    """
    게시글 목록을 최신순으로 페이징하여 조회합니다.
    검색어(keyword)나 카테고리(category)를 지정하면 필터링된 결과를 제공합니다.
    """
    return crud.get_posts(db=db, page=page, limit=limit, category=category, keyword=keyword)


@app.post("/api/posts", response_model=schemas.PostResponse, status_code=status.HTTP_201_CREATED, summary="새 게시글 등록")
def create_new_post(
    post_data: schemas.PostCreate,
    db: Session = Depends(get_db)
):
    """
    새로운 게시글을 등록합니다.
    비밀번호는 SHA-256으로 해시화되어 안전하게 보관됩니다.
    """
    new_post = crud.create_post(db=db, post_data=post_data)
    return new_post


@app.get("/api/posts/{post_id}", response_model=schemas.PostResponse, summary="게시글 상세 조회")
def read_single_post(
    post_id: int,
    db: Session = Depends(get_db)
):
    """
    게시글 ID로 상세 정보를 조회합니다.
    상세 조회가 일어날 때마다 조회수(views)가 1씩 자동으로 증가합니다.
    """
    post = crud.get_post_by_id(db=db, post_id=post_id, increase_view=True)
    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="해당 ID의 게시글을 찾을 수 없습니다."
        )
    return post


@app.put("/api/posts/{post_id}", response_model=schemas.PostResponse, summary="게시글 수정")
def update_existing_post(
    post_id: int,
    post_data: schemas.PostUpdate,
    db: Session = Depends(get_db)
):
    """
    게시글을 수정합니다.
    작성 시 등록했던 비밀번호와 일치해야만 수정이 승인됩니다.
    """
    success, updated_post, message = crud.update_post(db=db, post_id=post_id, post_data=post_data)
    if not success:
        if message == "비밀번호가 일치하지 않습니다.":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=message)
        else:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=message)
    return updated_post


@app.delete("/api/posts/{post_id}", summary="게시글 삭제")
def delete_existing_post(
    post_id: int,
    delete_data: schemas.PostDelete,
    db: Session = Depends(get_db)
):
    """
    게시글을 삭제합니다.
    작성 시 등록했던 비밀번호와 일치해야만 삭제가 승인됩니다.
    """
    success, message = crud.delete_post(db=db, post_id=post_id, plain_password=delete_data.password)
    if not success:
        if message == "비밀번호가 일치하지 않습니다.":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=message)
        else:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=message)
    return {"message": message, "id": post_id}


@app.get("/api/categories", response_model=List[schemas.CategoryCount], summary="카테고리별 통계 조회")
def get_categories(db: Session = Depends(get_db)):
    """
    카테고리별 게시글 등록 현황을 조회합니다.
    """
    return crud.get_category_counts(db=db)


# =====================================================================
# 정적 웹 프론트엔드 파일(HTML, CSS, JS) 서빙
# =====================================================================

# static 폴더가 없으면 미리 생성해 둡니다.
os.makedirs("static", exist_ok=True)
os.makedirs("static/css", exist_ok=True)
os.makedirs("static/js", exist_ok=True)

# 루트 경로 및 static 하위 파일들을 브라우저에 서비스하도록 마운트합니다.
app.mount("/", StaticFiles(directory="static", html=True), name="static")
