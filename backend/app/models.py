from __future__ import annotations

from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, SmallInteger, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    email: Mapped[str] = mapped_column(String(254), nullable=False, unique=True)
    password_hash: Mapped[str] = mapped_column(String(256), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    owned_libraries: Mapped[list["Library"]] = relationship(back_populates="owner")
    memberships: Mapped[list["LibraryMember"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    reading_progress: Mapped[list["ReadingProgress"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    bookmarks: Mapped[list["Bookmark"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    quotes: Mapped[list["Quote"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    invites: Mapped[list["Invite"]] = relationship(back_populates="creator")


class Library(Base):
    __tablename__ = "libraries"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    owner_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    join_code: Mapped[str] = mapped_column(String(32), nullable=False, unique=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    owner: Mapped[User] = relationship(back_populates="owned_libraries")
    members: Mapped[list["LibraryMember"]] = relationship(
        back_populates="library", cascade="all, delete-orphan"
    )
    books: Mapped[list["Book"]] = relationship(
        back_populates="library", cascade="all, delete-orphan"
    )
    invites: Mapped[list["Invite"]] = relationship(
        back_populates="library", cascade="all, delete-orphan"
    )


class LibraryMember(Base):
    __tablename__ = "library_members"

    library_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("libraries.id", ondelete="CASCADE"), primary_key=True
    )
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    role: Mapped[str] = mapped_column(String(16), nullable=False)
    joined_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    library: Mapped[Library] = relationship(back_populates="members")
    user: Mapped[User] = relationship(back_populates="memberships")


class Book(Base):
    __tablename__ = "books"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    library_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("libraries.id", ondelete="CASCADE"), nullable=False
    )
    title: Mapped[str] = mapped_column(String(400), nullable=False)
    author: Mapped[str] = mapped_column(String(300), nullable=False, default="")
    file_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    file_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    library: Mapped[Library] = relationship(back_populates="books")
    progress_entries: Mapped[list["ReadingProgress"]] = relationship(
        back_populates="book", cascade="all, delete-orphan"
    )
    bookmarks: Mapped[list["Bookmark"]] = relationship(
        back_populates="book", cascade="all, delete-orphan"
    )
    quotes: Mapped[list["Quote"]] = relationship(
        back_populates="book", cascade="all, delete-orphan"
    )


class ReadingProgress(Base):
    __tablename__ = "reading_progress"
    __table_args__ = (
        CheckConstraint("progress BETWEEN 0 AND 100", name="ck_reading_progress_range"),
    )

    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    book_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("books.id", ondelete="CASCADE"), primary_key=True
    )
    progress: Mapped[int] = mapped_column(SmallInteger, nullable=False, default=0)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )

    user: Mapped[User] = relationship(back_populates="reading_progress")
    book: Mapped[Book] = relationship(back_populates="progress_entries")


class Bookmark(Base):
    __tablename__ = "bookmarks"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    book_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("books.id", ondelete="CASCADE"), nullable=False
    )
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    label: Mapped[str] = mapped_column(String(200), nullable=False)
    location: Mapped[str] = mapped_column(String(200), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    book: Mapped[Book] = relationship(back_populates="bookmarks")
    user: Mapped[User] = relationship(back_populates="bookmarks")


class Quote(Base):
    __tablename__ = "quotes"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    book_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("books.id", ondelete="CASCADE"), nullable=False
    )
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    text: Mapped[str] = mapped_column(Text, nullable=False)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    location: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    book: Mapped[Book] = relationship(back_populates="quotes")
    user: Mapped[User] = relationship(back_populates="quotes")


class Invite(Base):
    __tablename__ = "invites"

    token: Mapped[str] = mapped_column(String(64), primary_key=True)
    library_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("libraries.id", ondelete="CASCADE"), nullable=False
    )
    created_by: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=False
    )
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    library: Mapped[Library] = relationship(back_populates="invites")
    creator: Mapped[User] = relationship(back_populates="invites")


Index("ix_libraries_owner_id", Library.owner_id)
Index("ix_library_members_user_id", LibraryMember.user_id)
Index("ix_books_library_id", Book.library_id)
Index("ix_reading_progress_book_id", ReadingProgress.book_id)
Index("ix_bookmarks_book_id_user_id", Bookmark.book_id, Bookmark.user_id)
Index("ix_quotes_book_id_user_id", Quote.book_id, Quote.user_id)