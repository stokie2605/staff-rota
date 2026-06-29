from pathlib import Path

from sqlmodel import SQLModel, Session, create_engine

Path("data").mkdir(exist_ok=True)

DATABASE_URL = "sqlite:///./data/staffrota.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})


def create_db_and_tables() -> None:
    SQLModel.metadata.create_all(engine)


def get_session():
    with Session(engine) as session:
        yield session
