from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from . import models
from .security import hash_password


def seed_demo_data(db: Session) -> None:
    existing_user = db.scalar(select(models.User).limit(1))
    if existing_user:
        return

    demo_user = models.User(
        id="user-1",
        name="Anna Reader",
        email="anna@example.com",
        password_hash=hash_password("password123"),
    )

    library_fantasy = models.Library(
        id="library-1",
        name="Фантастика",
        description="Подборка для вечернего чтения и заметок.",
        owner_id=demo_user.id,
        join_code="FANTASY-001",
    )
    library_knowledge = models.Library(
        id="library-2",
        name="Нон-фикшн",
        description="Книги по продукту, дизайну и управлению знаниями.",
        owner_id=demo_user.id,
        join_code="KNOWLEDGE-204",
    )

    db.add(demo_user)
    db.add_all([library_fantasy, library_knowledge])
    db.flush()

    db.add_all(
        [
            models.LibraryMember(
                library_id=library_fantasy.id,
                user_id=demo_user.id,
                role="owner",
            ),
            models.LibraryMember(
                library_id=library_knowledge.id,
                user_id=demo_user.id,
                role="owner",
            ),
        ]
    )

    dune = models.Book(
        id="book-1",
        library_id=library_fantasy.id,
        title="Dune",
        author="Frank Herbert",
    )
    foundation = models.Book(
        id="book-2",
        library_id=library_fantasy.id,
        title="Foundation",
        author="Isaac Asimov",
    )
    hooked = models.Book(
        id="book-3",
        library_id=library_knowledge.id,
        title="Hooked",
        author="Nir Eyal",
    )
    db.add_all([dune, foundation, hooked])
    db.flush()

    db.add_all(
        [
            models.ReadingProgress(user_id=demo_user.id, book_id=dune.id, progress=42),
            models.ReadingProgress(user_id=demo_user.id, book_id=foundation.id, progress=18),
            models.ReadingProgress(user_id=demo_user.id, book_id=hooked.id, progress=67),
            models.Bookmark(
                id="bookmark-1",
                book_id=dune.id,
                user_id=demo_user.id,
                label="Глава 5",
                location="Page 124",
            ),
            models.Quote(
                id="quote-1",
                book_id=dune.id,
                user_id=demo_user.id,
                text="Fear is the mind-killer.",
                note="Ключевая цитата для карточки книги.",
            ),
            models.Invite(
                token="invite-demo",
                library_id=library_fantasy.id,
                created_by=demo_user.id,
            ),
        ]
    )

    db.commit()