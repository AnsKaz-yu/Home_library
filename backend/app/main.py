from __future__ import annotations

import re
import secrets
import shutil
from pathlib import Path

from fastapi import Depends, FastAPI, File, Form, HTTPException, Query, Request, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from starlette.middleware.sessions import SessionMiddleware

from .database import SessionLocal, get_db, init_db
from .google_auth import router as google_router
from .repository import BookRecord, DatabaseRepository, LibraryRecord, UserRecord
from .schemas import (
    BookmarkCreateRequest,
    BookmarkResponse,
    BookResponse,
    InviteResponse,
    LibraryCreateRequest,
    LibraryJoinRequest,
    LibraryResponse,
    LoginRequest,
    MessageResponse,
    ProgressUpdateRequest,
    QuoteCreateRequest,
    QuoteResponse,
    RegisterRequest,
    SearchResultResponse,
    SessionResponse,
    UpdateProfileRequest,
)
from .seed import seed_demo_data
from .security import hash_password, verify_password

app = FastAPI(title="Home Library API")

FRONTEND_URL = "http://localhost:5173"
BACKEND_URL = "http://localhost:8000"

app.add_middleware(
    SessionMiddleware,
    secret_key="home-library-super-secret-key",
    same_site="lax",
    https_only=False,
    max_age=86400 * 30,  # 30 days
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


@app.on_event("startup")
def on_startup() -> None:
    init_db()
    with SessionLocal() as db:
        seed_demo_data(db)


def get_repository(db: Session = Depends(get_db)) -> DatabaseRepository:
    return DatabaseRepository(db)


def build_session_response(user: UserRecord) -> SessionResponse:
    return SessionResponse(userId=user.id, userName=user.name, email=user.email)


def build_library_response(library: LibraryRecord, role: str) -> LibraryResponse:
    return LibraryResponse(
        id=library.id,
        name=library.name,
        description=library.description,
        role=role,
        ownerId=library.owner_id,
        joinCode=library.join_code,
    )


def build_book_response(book: BookRecord) -> BookResponse:
    stored_upload_name = book.file_url.rsplit('/', 1)[-1] if book.file_url else None
    public_file_name = stored_upload_name or book.file_name
    file_url = build_public_file_url(public_file_name) if public_file_name else book.file_url
    return BookResponse(
        id=book.id,
        libraryId=book.library_id,
        title=book.title,
        author=book.author,
        progress=book.progress,
        fileName=book.file_name,
        fileUrl=file_url,
    )


def get_current_user(request: Request, repo: DatabaseRepository = Depends(get_repository)) -> UserRecord:
    user_id = request.session.get("user_id")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Требуется авторизация.")

    user = repo.get_user_by_id(user_id)
    if not user:
        request.session.clear()
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Сессия недействительна.")

    return user


def require_library_access(
    repo: DatabaseRepository,
    user_id: str,
    library_id: str,
) -> tuple[LibraryRecord, str]:
    library = repo.get_library_by_id(library_id)
    if not library:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Библиотека не найдена.")

    member = repo.get_library_member(library_id, user_id)
    if not member:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Нет доступа к библиотеке.")

    return library, member.role


def require_owner(repo: DatabaseRepository, user_id: str, library_id: str) -> LibraryRecord:
    library, role = require_library_access(repo, user_id, library_id)
    if role != "owner":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Недостаточно прав.")
    return library


def find_library_by_code(repo: DatabaseRepository, code: str) -> LibraryRecord | None:
    normalized = code.strip()
    if not normalized:
        return None

    return repo.get_library_by_join_code(normalized) or repo.get_library_by_id(normalized)


def ensure_join_code(repo: DatabaseRepository, name: str) -> str:
    slug = re.sub(r"[^A-ZА-Я0-9]+", "-", name.strip().upper()).strip("-")[:10]
    prefix = slug or "LIBRARY"

    while True:
        code = f"{prefix}-{secrets.token_hex(2).upper()}"
        if not repo.get_library_by_join_code(code):
            return code


def ensure_invite_token(repo: DatabaseRepository) -> str:
    while True:
        token = f"invite-{secrets.token_urlsafe(9)}"
        if not repo.get_invite_by_token(token):
            return token


def build_public_file_url(file_name: str, request: Request | None = None) -> str:
    base_url = str(request.base_url).rstrip('/') if request else BACKEND_URL
    return f"{base_url}/api/uploads/{file_name}"


def build_file_url(request: Request, file_name: str) -> str:
    return build_public_file_url(file_name, request)


def remove_uploaded_file(file_url: str | None) -> None:
    if not file_url:
        return

    file_name = file_url.rsplit('/', 1)[-1]
    file_path = (UPLOAD_DIR / file_name).resolve()
    upload_root = UPLOAD_DIR.resolve()

    if upload_root not in file_path.parents or not file_path.is_file():
        return

    try:
        file_path.unlink()
    except FileNotFoundError:
        pass


@app.get("/api/uploads/{file_name}")
def get_uploaded_file(file_name: str):
    file_path = (UPLOAD_DIR / file_name).resolve()
    upload_root = UPLOAD_DIR.resolve()

    if upload_root not in file_path.parents or not file_path.is_file():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Файл не найден.")

    return FileResponse(file_path)


@app.get("/")
def read_root():
    return {"message": "Home Library backend is running"}


@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.post("/api/auth/register", response_model=SessionResponse, status_code=status.HTTP_201_CREATED)
def register_user(
    payload: RegisterRequest,
    request: Request,
    repo: DatabaseRepository = Depends(get_repository),
):
    if repo.get_user_by_email(payload.email):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Пользователь с таким email уже существует.")

    user = repo.create_user(payload.name, payload.email, hash_password(payload.password))
    request.session["user_id"] = user.id
    return build_session_response(user)


@app.post("/api/auth/login", response_model=SessionResponse)
def login_user(
    payload: LoginRequest,
    request: Request,
    repo: DatabaseRepository = Depends(get_repository),
):
    user = repo.get_user_by_email(payload.email)
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Неверный email или пароль.")

    request.session["user_id"] = user.id
    return build_session_response(user)


@app.post("/api/auth/logout", response_model=MessageResponse)
def logout_user(request: Request):
    request.session.clear()
    return MessageResponse(message="Выход выполнен.")


@app.get("/api/auth/session", response_model=SessionResponse)
def get_session(current_user: UserRecord = Depends(get_current_user)):
    return build_session_response(current_user)


@app.put("/api/auth/profile", response_model=SessionResponse)
def update_profile(
    payload: UpdateProfileRequest,
    request: Request,
    current_user: UserRecord = Depends(get_current_user),
    repo: DatabaseRepository = Depends(get_repository),
):
    email_owner = repo.get_user_by_email(payload.email)
    if email_owner and email_owner.id != current_user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Пользователь с таким email уже существует.")

    updated_user = repo.update_user(current_user.id, payload.name, payload.email)
    request.session["user_id"] = current_user.id
    return build_session_response(updated_user or current_user)


@app.get("/api/libraries", response_model=list[LibraryResponse])
def list_libraries(
    current_user: UserRecord = Depends(get_current_user),
    repo: DatabaseRepository = Depends(get_repository),
):
    libraries = repo.list_libraries_for_user(current_user.id)
    return [build_library_response(library, role) for library, role in libraries]


@app.post("/api/libraries", response_model=LibraryResponse, status_code=status.HTTP_201_CREATED)
def create_library(
    payload: LibraryCreateRequest,
    current_user: UserRecord = Depends(get_current_user),
    repo: DatabaseRepository = Depends(get_repository),
):
    library = repo.create_library(
        payload.name,
        payload.description,
        current_user.id,
        ensure_join_code(repo, payload.name),
    )
    return build_library_response(library, "owner")


@app.put("/api/libraries/{library_id}", response_model=LibraryResponse)
def update_library(
    library_id: str,
    payload: LibraryCreateRequest,
    current_user: UserRecord = Depends(get_current_user),
    repo: DatabaseRepository = Depends(get_repository),
):
    require_owner(repo, current_user.id, library_id)
    library = repo.update_library(library_id, payload.name, payload.description)
    if not library:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Библиотека не найдена.")
    return build_library_response(library, "owner")


@app.delete("/api/libraries/{library_id}", response_model=MessageResponse)
def delete_library(
    library_id: str,
    current_user: UserRecord = Depends(get_current_user),
    repo: DatabaseRepository = Depends(get_repository),
):
    require_owner(repo, current_user.id, library_id)
    books = repo.list_books_by_library(library_id, current_user.id)
    for book in books:
        remove_uploaded_file(book.file_url)
    repo.delete_library(library_id)
    return MessageResponse(message="Библиотека удалена.")


@app.get("/api/libraries/lookup", response_model=LibraryResponse)
def lookup_library(
    code: str = Query(..., min_length=1),
    current_user: UserRecord = Depends(get_current_user),
    repo: DatabaseRepository = Depends(get_repository),
):
    library = find_library_by_code(repo, code)
    if not library:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Библиотека не найдена.")

    membership = repo.get_library_member(library.id, current_user.id)
    role = membership.role if membership else "owner"
    return build_library_response(library, role)


@app.post("/api/libraries/join", response_model=LibraryResponse)
def join_library(
    payload: LibraryJoinRequest,
    current_user: UserRecord = Depends(get_current_user),
    repo: DatabaseRepository = Depends(get_repository),
):
    library = find_library_by_code(repo, payload.code)
    if not library:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Библиотека с таким ID не найдена.")

    membership = repo.get_library_member(library.id, current_user.id)
    if membership:
        return build_library_response(library, membership.role)

    repo.add_library_member(library.id, current_user.id, "reader")
    return build_library_response(library, "reader")


@app.get("/api/libraries/{library_id}", response_model=LibraryResponse)
def get_library(
    library_id: str,
    current_user: UserRecord = Depends(get_current_user),
    repo: DatabaseRepository = Depends(get_repository),
):
    library, role = require_library_access(repo, current_user.id, library_id)
    return build_library_response(library, role)


@app.get("/api/libraries/{library_id}/books", response_model=list[BookResponse])
def list_library_books(
    library_id: str,
    current_user: UserRecord = Depends(get_current_user),
    repo: DatabaseRepository = Depends(get_repository),
):
    require_library_access(repo, current_user.id, library_id)
    books = repo.list_books_by_library(library_id, current_user.id)
    return [build_book_response(book) for book in books]


@app.post("/api/libraries/{library_id}/books", response_model=BookResponse, status_code=status.HTTP_201_CREATED)
async def create_library_book(
    library_id: str,
    request: Request,
    title: str = Form(...),
    author: str = Form(...),
    bookFile: UploadFile | None = File(None),
    current_user: UserRecord = Depends(get_current_user),
    repo: DatabaseRepository = Depends(get_repository),
):
    require_owner(repo, current_user.id, library_id)

    stored_file_name: str | None = None
    stored_file_url: str | None = None

    if bookFile is not None:
        if not bookFile.filename:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Файл не выбран.")

        if not bookFile.filename.lower().endswith((".pdf", ".epub")):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Разрешены PDF- или EPUB-файлы.")

        safe_name = bookFile.filename.replace(" ", "_")
        unique_name = f"{secrets.token_hex(16)}_{safe_name}"
        file_path = UPLOAD_DIR / unique_name

        with file_path.open("wb") as buffer:
            shutil.copyfileobj(bookFile.file, buffer)

        stored_file_name = bookFile.filename
        stored_file_url = build_file_url(request, unique_name)

    book = repo.create_book(library_id, title, author, stored_file_name, stored_file_url)
    return build_book_response(book)


@app.put("/api/books/{book_id}", response_model=BookResponse)
async def update_book(
    book_id: str,
    request: Request,
    title: str = Form(...),
    author: str = Form(...),
    bookFile: UploadFile | None = File(None),
    current_user: UserRecord = Depends(get_current_user),
    repo: DatabaseRepository = Depends(get_repository),
):
    existing_book = repo.get_book_by_id(book_id)
    if not existing_book:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Книга не найдена.")

    require_owner(repo, current_user.id, existing_book.library_id)

    stored_file_name = existing_book.file_name
    stored_file_url = existing_book.file_url
    previous_file_url = existing_book.file_url

    if bookFile is not None:
        if not bookFile.filename:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Файл не выбран.")

        if not bookFile.filename.lower().endswith((".pdf", ".epub")):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Разрешены PDF- или EPUB-файлы.")

        safe_name = bookFile.filename.replace(" ", "_")
        unique_name = f"{secrets.token_hex(16)}_{safe_name}"
        file_path = UPLOAD_DIR / unique_name

        with file_path.open("wb") as buffer:
            shutil.copyfileobj(bookFile.file, buffer)

        stored_file_name = bookFile.filename
        stored_file_url = build_file_url(request, unique_name)

    updated_book = repo.update_book(book_id, title, author, stored_file_name, stored_file_url)
    if not updated_book:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Книга не найдена.")

    if bookFile is not None:
        remove_uploaded_file(previous_file_url)

    return build_book_response(updated_book)


@app.delete("/api/books/{book_id}", response_model=MessageResponse)
def delete_book(
    book_id: str,
    current_user: UserRecord = Depends(get_current_user),
    repo: DatabaseRepository = Depends(get_repository),
):
    existing_book = repo.get_book_by_id(book_id)
    if not existing_book:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Книга не найдена.")

    require_owner(repo, current_user.id, existing_book.library_id)
    repo.delete_book(book_id)
    remove_uploaded_file(existing_book.file_url)
    return MessageResponse(message="Книга удалена.")


@app.post("/api/libraries/{library_id}/invites", response_model=InviteResponse, status_code=status.HTTP_201_CREATED)
def create_library_invite(
    library_id: str,
    current_user: UserRecord = Depends(get_current_user),
    repo: DatabaseRepository = Depends(get_repository),
):
    library = require_owner(repo, current_user.id, library_id)
    invite = repo.create_invite(library.id, current_user.id, ensure_invite_token(repo))
    return InviteResponse(token=invite.token, libraryId=invite.library_id, libraryName=invite.library_name)


@app.get("/api/invites/{token}", response_model=InviteResponse)
def get_invite(
    token: str,
    repo: DatabaseRepository = Depends(get_repository),
):
    invite = repo.get_invite_by_token(token)
    if not invite:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ссылка-приглашение недействительна.")
    return InviteResponse(token=invite.token, libraryId=invite.library_id, libraryName=invite.library_name)


@app.post("/api/invites/{token}/accept", response_model=LibraryResponse)
def accept_invite(
    token: str,
    current_user: UserRecord = Depends(get_current_user),
    repo: DatabaseRepository = Depends(get_repository),
):
    invite = repo.get_invite_by_token(token)
    if not invite:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ссылка-приглашение недействительна.")

    library = repo.get_library_by_id(invite.library_id)
    membership = repo.get_library_member(invite.library_id, current_user.id)
    if membership:
        return build_library_response(library, membership.role)

    repo.add_library_member(invite.library_id, current_user.id, "reader")
    return build_library_response(library, "reader")


@app.get("/api/books/search", response_model=list[SearchResultResponse])
def search_books(
    q: str = Query(..., min_length=1),
    current_user: UserRecord = Depends(get_current_user),
    repo: DatabaseRepository = Depends(get_repository),
):
    results = repo.search_books(current_user.id, q)
    return [
        SearchResultResponse(
            book=build_book_response(book),
            library=build_library_response(library, repo.get_library_member(library.id, current_user.id).role),
        )
        for book, library in results
    ]


@app.get("/api/books/{book_id}", response_model=BookResponse)
def get_book(
    book_id: str,
    current_user: UserRecord = Depends(get_current_user),
    repo: DatabaseRepository = Depends(get_repository),
):
    book = repo.get_book_by_id(book_id, current_user.id)
    if not book:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Книга не найдена.")
    require_library_access(repo, current_user.id, book.library_id)
    return build_book_response(book)


@app.put("/api/books/{book_id}/progress", response_model=BookResponse)
def update_book_progress(
    book_id: str,
    payload: ProgressUpdateRequest,
    current_user: UserRecord = Depends(get_current_user),
    repo: DatabaseRepository = Depends(get_repository),
):
    book = repo.get_book_by_id(book_id, current_user.id)
    if not book:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Книга не найдена.")
    require_library_access(repo, current_user.id, book.library_id)
    repo.set_reading_progress(current_user.id, book_id, payload.progress)
    updated_book = repo.get_book_by_id(book_id, current_user.id)
    return build_book_response(updated_book)


@app.get("/api/books/{book_id}/bookmarks", response_model=list[BookmarkResponse])
def list_bookmarks(
    book_id: str,
    current_user: UserRecord = Depends(get_current_user),
    repo: DatabaseRepository = Depends(get_repository),
):
    book = repo.get_book_by_id(book_id, current_user.id)
    if not book:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Книга не найдена.")
    require_library_access(repo, current_user.id, book.library_id)
    bookmarks = repo.list_bookmarks(book_id, current_user.id)
    return [BookmarkResponse(id=item.id, bookId=item.book_id, label=item.label, location=item.location) for item in bookmarks]


@app.post("/api/books/{book_id}/bookmarks", response_model=BookmarkResponse, status_code=status.HTTP_201_CREATED)
def create_bookmark(
    book_id: str,
    payload: BookmarkCreateRequest,
    current_user: UserRecord = Depends(get_current_user),
    repo: DatabaseRepository = Depends(get_repository),
):
    book = repo.get_book_by_id(book_id, current_user.id)
    if not book:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Книга не найдена.")
    require_library_access(repo, current_user.id, book.library_id)
    bookmark = repo.create_bookmark(book_id, current_user.id, payload.label, payload.location)
    return BookmarkResponse(id=bookmark.id, bookId=bookmark.book_id, label=bookmark.label, location=bookmark.location)


@app.delete("/api/books/{book_id}/bookmarks/{bookmark_id}", response_model=MessageResponse)
def delete_bookmark(
    book_id: str,
    bookmark_id: str,
    current_user: UserRecord = Depends(get_current_user),
    repo: DatabaseRepository = Depends(get_repository),
):
    book = repo.get_book_by_id(book_id, current_user.id)
    if not book:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Книга не найдена.")
    require_library_access(repo, current_user.id, book.library_id)
    repo.delete_bookmark(bookmark_id, current_user.id)
    return MessageResponse(message="Закладка удалена.")


@app.get("/api/books/{book_id}/quotes", response_model=list[QuoteResponse])
def list_quotes(
    book_id: str,
    current_user: UserRecord = Depends(get_current_user),
    repo: DatabaseRepository = Depends(get_repository),
):
    book = repo.get_book_by_id(book_id, current_user.id)
    if not book:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Книга не найдена.")
    require_library_access(repo, current_user.id, book.library_id)
    quotes = repo.list_quotes(book_id, current_user.id)
    return [QuoteResponse(id=item.id, bookId=item.book_id, text=item.text, note=item.note, location=item.location) for item in quotes]


@app.post("/api/books/{book_id}/quotes", response_model=QuoteResponse, status_code=status.HTTP_201_CREATED)
def create_quote(
    book_id: str,
    payload: QuoteCreateRequest,
    current_user: UserRecord = Depends(get_current_user),
    repo: DatabaseRepository = Depends(get_repository),
):
    book = repo.get_book_by_id(book_id, current_user.id)
    if not book:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Книга не найдена.")
    require_library_access(repo, current_user.id, book.library_id)
    quote = repo.create_quote(book_id, current_user.id, payload.text, payload.note, payload.location)
    return QuoteResponse(id=quote.id, bookId=quote.book_id, text=quote.text, note=quote.note, location=quote.location)


@app.delete("/api/books/{book_id}/quotes/{quote_id}", response_model=MessageResponse)
def delete_quote(
    book_id: str,
    quote_id: str,
    current_user: UserRecord = Depends(get_current_user),
    repo: DatabaseRepository = Depends(get_repository),
):
    book = repo.get_book_by_id(book_id, current_user.id)
    if not book:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Книга не найдена.")
    require_library_access(repo, current_user.id, book.library_id)
    repo.delete_quote(quote_id, current_user.id)
    return MessageResponse(message="Цитата удалена.")