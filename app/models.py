# app/models.py
"""
[데이터베이스 테이블 모델 모듈]
- SQLAlchemy를 사용하여 SQLite의 'posts'(게시글) 테이블 구조를 파이썬 클래스로 정의합니다.
"""

from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, DateTime
from app.database import Base


def get_current_time():
    """현재 시각(UTC)을 반환하는 헬퍼 함수"""
    return datetime.now(timezone.utc)


class Post(Base):
    """
    [게시글 테이블 정의: posts]
    실제 SQLite 데이터베이스에 'posts'라는 이름의 테이블로 생성됩니다.
    """
    __tablename__ = "posts"

    # 1. 고유 식별 번호 (Primary Key, 자동 증가 정수)
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)

    # 2. 게시글 제목 (최대 200자, 필수 입력)
    title = Column(String(200), nullable=False, index=True)

    # 3. 게시글 본문 (길이 제한 없는 긴 텍스트, 필수 입력)
    content = Column(Text, nullable=False)

    # 4. 작성자 이름 또는 닉네임 (최대 50자, 필수 입력)
    author = Column(String(50), nullable=False)

    # 5. 게시글 수정/삭제용 비밀번호 해시값 (보안을 위해 평문이 아닌 SHA-256 해시로 저장)
    password_hash = Column(String(64), nullable=False)

    # 6. 게시글 카테고리 (예: 일반, 공지, 자유, 질문, 팁 등)
    category = Column(String(30), nullable=False, default="일반", index=True)

    # 7. 조회수 (기본값 0)
    views = Column(Integer, nullable=False, default=0)

    # 8. 작성일시 (데이터 삽입 시 현재 시각 자동 기록)
    created_at = Column(DateTime(timezone=True), default=get_current_time, nullable=False)

    # 9. 최종 수정일시 (데이터 수정 시마다 갱신)
    updated_at = Column(DateTime(timezone=True), default=get_current_time, onupdate=get_current_time, nullable=False)
