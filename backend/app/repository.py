from __future__ import annotations

from dataclasses import dataclass
from typing import Optional
from uuid import uuid4

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, aliased

from . import models


@dataclass
class UserRecord:
    id: str
    name: str
    email: str
    password_hash: str


@dataclass
class LibraryRecord:
    id: str
    name: str
    description: str
    owner_id: str
    join_code: str


@dataclass
class LibraryMemberRecord:
    library_id: str
    user_id: str
    role: str


@dataclass
class BookRecord:
    id: str
    library_id: str
    title: str
    author: str
    progress: int = 0
    file_name: str | None = None
    file_url: str | None = None


@dataclass
class ReadingProgressRecord:
    user_id: str
    book_id: str
    progress: int


@dataclass
class BookmarkRecord:
    id: str
    book_id: str
    user_id: str
    label: str
    location: str


@dataclass
class QuoteRecord:
    id: str
    book_id: str
    user_id: str
    text: str
    note: Optional[str]
    location: Optional[str] = None


@dataclass
class InviteRecord:
    token: str
    library_id: str
    library_name: str
    created_by: str


class DatabaseRepository:
    def __init__(self, db: Session):
        self.db = db

    def _commit(self) -> None:
        self.db.commit()

    @staticmethod
    def _id() -> str:
        return str(uuid4())

    @staticmethod
    def _map_user(user: models.User) -> UserRecord:
        return UserRecord(
            id=user.id,
            name=user.name,
            email=user.email,
            password_hash=user.password_hash,
        )

    @staticmethod
    def _map_library(library: models.Library) -> LibraryRecord:
        return LibraryRecord(
            id=library.id,
            name=library.name,
            description=library.description,
            owner_id=library.owner_id,
            join_code=library.join_code,
        )

    @staticmethod
    def _map_member(member: models.LibraryMember) -> LibraryMemberRecord:
        return LibraryMemberRecord(
            library_id=member.library_id,
            user_id=member.user_id,
            role=member.role,
        )

    @staticmethod
    def _map_book(book: models.Book, progress: int = 0) -> BookRecord:
        return BookRecord(
            id=book.id,
            library_id=book.library_id,
            title=book.title,
            author=book.author,
            progress=progress,
            file_name=book.file_name,
            file_url=book.file_url,
        )

    @staticmethod
    def _map_progress(progress: models.ReadingProgress) -> ReadingProgressRecord:
        return ReadingProgressRecord(
            user_id=progress.user_id,
            book_id=progress.book_id,
            progress=progress.progress,
        )

    @staticmethod
    def _map_bookmark(bookmark: models.Bookmark) -> BookmarkRecord:
        return BookmarkRecord(
            id=bookmark.id,
            book_id=bookmark.book_id,
            user_id=bookmark.user_id,
            label=bookmark.label,
            location=bookmark.location,
        )

    @staticmethod
    def _map_quote(quote: models.Quote) -> QuoteRecord:
        return QuoteRecord(
            id=quote.id,
            book_id=quote.book_id,
            user_id=quote.user_id,
            text=quote.text,
            note=quote.note,
            location=quote.location,
        )

    @staticmethod
    def _map_invite(invite: models.Invite, library_name: str) -> InviteRecord:
        return InviteRecord(
            token=invite.token,
            library_id=invite.library_id,
            library_name=library_name,
            created_by=invite.created_by,
        )

    def create_user(self, name: str, email: str, password_hash: str) -> UserRecord:
        user = models.User(
            id=self._id(),
            name=name.strip(),
            email=email.strip().lower(),
            password_hash=password_hash,
        )
        self.db.add(user)
        self._commit()
        self.db.refresh(user)
        return self._map_user(user)

    def get_user_by_id(self, user_id: str) -> Optional[UserRecord]:
        user = self.db.get(models.User, user_id)
        return self._map_user(user) if user else None

    def get_user_by_email(self, email: str) -> Optional[UserRecord]:
        statement = select(models.User).where(
            func.lower(models.User.email) == email.strip().lower()
        )
        user = self.db.scalar(statement)
        return self._map_user(user) if user else None

    def update_user(self, user_id: str, name: str, email: str) -> Optional[UserRecord]:
        user = self.db.get(models.User, user_id)
        if not user:
            return None
        user.name = name.strip()
        user.email = email.strip().lower()
        self._commit()
        self.db.refresh(user)
        return self._map_user(user)

    def create_library(self, name: str, description: str, owner_id: str, join_code: str) -> LibraryRecord:
        library = models.Library(
            id=self._id(),
            name=name.strip(),
            description=description.strip(),
            owner_id=owner_id,
            join_code=join_code,
        )
        self.db.add(library)
        self.db.flush()
        self.db.add(
            models.LibraryMember(
                library_id=library.id,
                user_id=owner_id,
                role="owner",
            )
        )
        self._commit()
        self.db.refresh(library)
        return self._map_library(library)

    def update_library(self, library_id: str, name: str, description: str) -> Optional[LibraryRecord]:
        library = self.db.get(models.Library, library_id)
        if not library:
            return None
        library.name = name.strip()
        library.description = description.strip()
        self._commit()
        self.db.refresh(library)
        return self._map_library(library)

    def delete_library(self, library_id: str) -> None:
        library = self.db.get(models.Library, library_id)
        if not library:
            return
        self.db.delete(library)
        self._commit()

    def get_library_by_id(self, library_id: str) -> Optional[LibraryRecord]:
        library = self.db.get(models.Library, library_id)
        return self._map_library(library) if library else None

    def get_library_by_join_code(self, join_code: str) -> Optional[LibraryRecord]:
        statement = select(models.Library).where(
            func.upper(models.Library.join_code) == join_code.strip().upper()
        )
        library = self.db.scalar(statement)
        return self._map_library(library) if library else None

    def list_libraries_for_user(self, user_id: str) -> list[tuple[LibraryRecord, str]]:
        statement = (
            select(models.Library, models.LibraryMember.role)
            .join(models.LibraryMember, models.LibraryMember.library_id == models.Library.id)
            .where(models.LibraryMember.user_id == user_id)
            .order_by(models.Library.created_at.desc())
        )
        rows = self.db.execute(statement).all()
        return [(self._map_library(library), role) for library, role in rows]

    def add_library_member(self, library_id: str, user_id: str, role: str) -> LibraryMemberRecord:
        existing = self.db.get(models.LibraryMember, {"library_id": library_id, "user_id": user_id})
        if existing:
            return self._map_member(existing)

        member = models.LibraryMember(library_id=library_id, user_id=user_id, role=role)
        self.db.add(member)
        self._commit()
        self.db.refresh(member)
        return self._map_member(member)

    def get_library_member(self, library_id: str, user_id: str) -> Optional[LibraryMemberRecord]:
        member = self.db.get(models.LibraryMember, {"library_id": library_id, "user_id": user_id})
        return self._map_member(member) if member else None

    def create_book(
        self,
        library_id: str,
        title: str,
        author: str,
        file_name: str | None = None,
        file_url: str | None = None,
    ) -> BookRecord:
        book = models.Book(
            id=self._id(),
            library_id=library_id,
            title=title.strip(),
            author=author.strip(),
            file_name=file_name,
            file_url=file_url,
        )
        self.db.add(book)
        self._commit()
        self.db.refresh(book)
        return self._map_book(book)

    def update_book(
        self,
        book_id: str,
        title: str,
        author: str,
        file_name: str | None = None,
        file_url: str | None = None,
    ) -> Optional[BookRecord]:
        book = self.db.get(models.Book, book_id)
        if not book:
            return None
        book.title = title.strip()
        book.author = author.strip()
        if file_name is not None:
            book.file_name = file_name
        if file_url is not None:
            book.file_url = file_url
        self._commit()
        self.db.refresh(book)
        return self._map_book(book)

    def delete_book(self, book_id: str) -> None:
        book = self.db.get(models.Book, book_id)
        if not book:
            return
        self.db.delete(book)
        self._commit()

    def get_book_by_id(self, book_id: str, user_id: str | None = None) -> Optional[BookRecord]:
        book = self.db.get(models.Book, book_id)
        if not book:
            return None
        progress = 0
        if user_id:
            progress_record = self.db.get(
                models.ReadingProgress, {"user_id": user_id, "book_id": book_id}
            )
            progress = progress_record.progress if progress_record else 0
        return self._map_book(book, progress)

    def list_books_by_library(self, library_id: str, user_id: str | None = None) -> list[BookRecord]:
        statement = (
            select(models.Book)
            .where(models.Book.library_id == library_id)
            .order_by(models.Book.created_at.desc())
        )
        books = list(self.db.scalars(statement))
        progress_by_book: dict[str, int] = {}
        if user_id and books:
            progress_statement = select(models.ReadingProgress).where(
                models.ReadingProgress.user_id == user_id,
                models.ReadingProgress.book_id.in_([book.id for book in books]),
            )
            for progress in self.db.scalars(progress_statement):
                progress_by_book[progress.book_id] = progress.progress
        return [self._map_book(book, progress_by_book.get(book.id, 0)) for book in books]

    def get_reading_progress(self, user_id: str, book_id: str) -> Optional[ReadingProgressRecord]:
        progress = self.db.get(models.ReadingProgress, {"user_id": user_id, "book_id": book_id})
        return self._map_progress(progress) if progress else None

    def set_reading_progress(self, user_id: str, book_id: str, progress: int) -> ReadingProgressRecord:
        record = self.db.get(models.ReadingProgress, {"user_id": user_id, "book_id": book_id})
        if record is None:
            record = models.ReadingProgress(user_id=user_id, book_id=book_id, progress=progress)
            self.db.add(record)
        else:
            record.progress = progress
        self._commit()
        self.db.refresh(record)
        return self._map_progress(record)

    def create_bookmark(self, book_id: str, user_id: str, label: str, location: str) -> BookmarkRecord:
        bookmark = models.Bookmark(
            id=self._id(),
            book_id=book_id,
            user_id=user_id,
            label=label.strip(),
            location=location.strip(),
        )
        self.db.add(bookmark)
        self._commit()
        self.db.refresh(bookmark)
        return self._map_bookmark(bookmark)

    def list_bookmarks(self, book_id: str, user_id: str) -> list[BookmarkRecord]:
        statement = (
            select(models.Bookmark)
            .where(models.Bookmark.book_id == book_id, models.Bookmark.user_id == user_id)
            .order_by(models.Bookmark.created_at.desc())
        )
        return [self._map_bookmark(bookmark) for bookmark in self.db.scalars(statement)]

    def delete_bookmark(self, bookmark_id: str, user_id: str) -> None:
        bookmark = self.db.get(models.Bookmark, bookmark_id)
        if bookmark and bookmark.user_id == user_id:
            self.db.delete(bookmark)
            self._commit()

    def create_quote(self, book_id: str, user_id: str, text: str, note: Optional[str] = None, location: Optional[str] = None) -> QuoteRecord:
        quote = models.Quote(
            id=self._id(),
            book_id=book_id,
            user_id=user_id,
            text=text.strip(),
            note=note.strip() if note else None,
            location=location,
        )
        self.db.add(quote)
        self._commit()
        self.db.refresh(quote)
        return self._map_quote(quote)

    def list_quotes(self, book_id: str, user_id: str) -> list[QuoteRecord]:
        statement = (
            select(models.Quote)
            .where(models.Quote.book_id == book_id, models.Quote.user_id == user_id)
            .order_by(models.Quote.created_at.desc())
        )
        return [self._map_quote(quote) for quote in self.db.scalars(statement)]

    def update_quote(self, quote_id: str, user_id: str, text: str, note: Optional[str] = None) -> Optional[QuoteRecord]:
        quote = self.db.get(models.Quote, quote_id)
        if not quote or quote.user_id != user_id:
            return None
        quote.text = text.strip()
        quote.note = note.strip() if note else None
        self._commit()
        self.db.refresh(quote)
        return self._map_quote(quote)

    def delete_quote(self, quote_id: str, user_id: str) -> None:
        quote = self.db.get(models.Quote, quote_id)
        if quote and quote.user_id == user_id:
            self.db.delete(quote)
            self._commit()

    def create_invite(self, library_id: str, created_by: str, token: str) -> InviteRecord:
        invite = models.Invite(token=token, library_id=library_id, created_by=created_by)
        self.db.add(invite)
        self._commit()
        self.db.refresh(invite)
        library = self.db.get(models.Library, library_id)
        return self._map_invite(invite, library.name if library else "")

    def get_invite_by_token(self, token: str) -> Optional[InviteRecord]:
        statement = (
            select(models.Invite, models.Library.name)
            .join(models.Library, models.Library.id == models.Invite.library_id)
            .where(models.Invite.token == token)
        )
        row = self.db.execute(statement).first()
        if not row:
            return None
        invite, library_name = row
        return self._map_invite(invite, library_name)

    def search_books(self, user_id: str, query: str) -> list[tuple[BookRecord, LibraryRecord]]:
        normalized = query.strip()
        if not normalized:
            return []

        progress_alias = aliased(models.ReadingProgress)
        statement = (
            select(models.Book, models.Library, progress_alias.progress)
            .join(models.Library, models.Library.id == models.Book.library_id)
            .join(models.LibraryMember, models.LibraryMember.library_id == models.Library.id)
            .outerjoin(
                progress_alias,
                (progress_alias.book_id == models.Book.id) & (progress_alias.user_id == user_id),
            )
            .where(
                models.LibraryMember.user_id == user_id,
                or_(
                    models.Book.title.ilike(f"%{normalized}%"),
                    models.Book.author.ilike(f"%{normalized}%"),
                    models.Book.file_name.ilike(f"%{normalized}%"),
                ),
            )
            .order_by(models.Book.created_at.desc())
        )
        rows = self.db.execute(statement).all()
        return [
            (self._map_book(book, progress or 0), self._map_library(library))
            for book, library, progress in rows
        ]
