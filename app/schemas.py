# app/schemas.py
"""
[Pydantic 데이터 검증 및 직렬화 스키마 모듈]
- 클라이언트로부터 들어오는 입력 데이터(Request Body)를 검증하고,
- 클라이언트에게 응답(Response Body)할 때 민감한 정보(비밀번호 등)를 제외하고 가공하는 역할을 합니다.
"""

from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict


# 1. 공통 속성을 담은 기본 스키마
class PostBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=200, description="게시글 제목")
    content: str = Field(..., min_length=1, description="게시글 본문 내용")
    author: str = Field(..., min_length=1, max_length=50, description="작성자 이름/닉네임")
    category: str = Field(default="일반", max_length=30, description="게시글 카테고리 (일반/공지/자유/질문/팁 등)")


# 2. 게시글 신규 등록 요청 스키마 (클라이언트 -> 서버)
class PostCreate(PostBase):
    password: str = Field(..., min_length=4, max_length=50, description="수정/삭제용 비밀번호 (4자리 이상)")


# 3. 게시글 수정 요청 스키마 (클라이언트 -> 서버)
class PostUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200, description="수정할 제목")
    content: Optional[str] = Field(None, min_length=1, description="수정할 내용")
    category: Optional[str] = Field(None, max_length=30, description="수정할 카테고리")
    password: str = Field(..., min_length=1, description="본인 확인용 비밀번호")


# 4. 게시글 삭제 요청 스키마 (클라이언트 -> 서버)
class PostDelete(BaseModel):
    password: str = Field(..., min_length=1, description="본인 확인용 비밀번호")


# 5. 게시글 단일 상세 조회 응답 스키마 (서버 -> 클라이언트)
# 주의: password_hash 필드는 제외하여 비밀번호가 외부로 유출되지 않도록 철저히 보호합니다.
class PostResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    content: str
    author: str
    category: str
    views: int
    created_at: datetime
    updated_at: datetime


# 6. 게시글 목록 페이징 응답 스키마 (서버 -> 클라이언트)
class PostPagination(BaseModel):
    total_count: int
    page: int
    limit: int
    total_pages: int
    items: List[PostResponse]


# 7. 카테고리 목록 통계 응답 스키마
class CategoryCount(BaseModel):
    name: str
    count: int
