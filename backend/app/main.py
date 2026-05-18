from pathlib import Path
import shutil
import uuid

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.middleware.sessions import SessionMiddleware

from .google_auth import router as google_router

app = FastAPI(title="Home Library API")

app.add_middleware(
    SessionMiddleware,
    secret_key="home-library-super-secret-key",
    same_site="lax",
    https_only=False,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = Path(__file__).resolve().parent
UPLOAD_DIR = BASE_DIR / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

app.include_router(google_router)


@app.get("/")
def read_root():
    return {"message": "Home Library backend is running"}


@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.post("/api/books/upload")
async def upload_book(
    title: str = Form(...),
    author: str = Form(...),
    bookFile: UploadFile = File(...),
):
    if not bookFile.filename:
      raise HTTPException(status_code=400, detail="Файл не выбран.")

    if not bookFile.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Разрешены только PDF-файлы.")

    safe_name = bookFile.filename.replace(" ", "_")
    unique_name = f"{uuid.uuid4().hex}_{safe_name}"
    file_path = UPLOAD_DIR / unique_name

    with file_path.open("wb") as buffer:
        shutil.copyfileobj(bookFile.file, buffer)

    file_url = f"http://localhost:8000/uploads/{unique_name}"

    return {
        "message": "Книга успешно загружена.",
        "fileName": bookFile.filename,
        "fileUrl": file_url,
        "title": title,
        "author": author,
    }