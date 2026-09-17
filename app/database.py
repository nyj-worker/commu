# app/database.py
"""
[데이터베이스 연결 및 세션 설정 모듈]
- SQLite 데이터베이스 파일(board.db)과의 연결을 담당합니다.
- SQLAlchemy ORM을 사용하여 파이썬 객체와 DB 테이블을 매핑할 수 있는 기반을 제공합니다.
"""

import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# 1. 데이터베이스 접속 주소 설정
# - 환경변수에 DATABASE_URL이 설정되어 있으면 해당 주소(클라우드 DB)를 사용하고,
# - 설정되어 있지 않으면 기본값으로 로컬 SQLite 파일(sqlite:///./board.db)을 사용합니다.
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./board.db")

# 일부 클라우드(Render, Supabase 등)에서 postgres:// 로 시작하는 경우 SQLAlchemy 2.0 호환을 위해 postgresql:// 로 치환합니다.
if SQLALCHEMY_DATABASE_URL.startswith("postgres://"):
    SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL.replace("postgres://", "postgresql://", 1)

# 2. 데이터베이스 엔진 생성
# SQLite일 때만 멀티스레드 접속 허용 옵션(check_same_thread=False)을 적용합니다.
connect_args = {}
if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args=connect_args
)

# 3. 데이터베이스 세션 팩토리(SessionLocal) 생성
# autocommit=False: 명시적으로 db.commit()을 호출해야만 데이터가 최종 저장됩니다 (실수 방지).
# autoflush=False: 커밋 전 임의로 플러시되지 않도록 제어합니다.
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 4. ORM 모델 클래스들이 상속받을 기본 클래스(Base) 정의
Base = declarative_base()


def get_db():
    """
    [FastAPI Dependency (의존성 주입) 함수]
    각 API 요청이 들어올 때마다 새로운 DB 세션을 열고,
    요청 처리가 끝나면(성공하든 오류가 나든) 반드시 세션을 닫아서 자원을 반환(finally)합니다.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
