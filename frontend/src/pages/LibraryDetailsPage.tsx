import { FormEvent, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { addBook, createInvite, getLibrary, listBooks } from '../lib/mockApi';

export function LibraryDetailsPage() {
  const { libraryId = '' } = useParams();
  const library = useMemo(() => getLibrary(libraryId), [libraryId]);
  const [books, setBooks] = useState(() => listBooks(libraryId));
  const [inviteUrl, setInviteUrl] = useState('');

  if (!library) {
    return <section className="content-card"><h2>Библиотека не найдена</h2></section>;
  }

  function handleAddBook(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    addBook(libraryId, String(form.get('title') ?? ''), String(form.get('author') ?? ''));
    setBooks(listBooks(libraryId));
    event.currentTarget.reset();
  }

  function handleInvite() {
    const invite = createInvite(libraryId);
    setInviteUrl(`${window.location.origin}/invite/${invite.token}`);
  }

  return (
    <section className="stack-large">
      <div className="hero-card">
        <div>
          <p className="eyebrow">Детали библиотеки</p>
          <h2>{library.name}</h2>
          <p>{library.description}</p>
          <p className="muted-text">Публичный ID: {library.joinCode ?? library.id}</p>
        </div>
        {library.role === 'owner' ? (
          <button className="secondary-button" onClick={handleInvite}>
            Сгенерировать приглашение
          </button>
        ) : null}
      </div>

      {inviteUrl ? (
        <section className="content-card">
          <h3>Ссылка приглашения</h3>
          <p className="mono-text">{inviteUrl}</p>
        </section>
      ) : null}

      <section className="stats-grid">
        <article className="content-card stack">
          <p className="eyebrow">Книги</p>
          <h3>{books.length}</h3>
          <p className="muted-text">Все книги, доступные в этой библиотеке.</p>
        </article>
        <article className="content-card stack">
          <p className="eyebrow">Роль</p>
          <h3>{library.role === 'owner' ? 'Владелец' : 'Читатель'}</h3>
          <p className="muted-text">Для читателя скрыта форма добавления книг.</p>
        </article>
      </section>

      {library.role === 'owner' ? (
        <form className="content-card stack" onSubmit={handleAddBook}>
          <h3>Добавить книгу</h3>
          <input name="title" placeholder="Название книги" required />
          <input name="author" placeholder="Автор" required />
          <button className="primary-button" type="submit">
            Сохранить
          </button>
        </form>
      ) : null}

      <div className="card-grid">
        {books.length > 0 ? (
          books.map((book) => (
            <article className="content-card stack" key={book.id}>
              <div className="space-between">
                <h3>{book.title}</h3>
                <span>{book.progress}%</span>
              </div>
              <p>{book.author}</p>
              <p className="muted-text">Карточка книги открывает заметки, закладки и статус чтения.</p>
              <Link className="text-link" to={`/reader/${library.id}/${book.id}`}>
                Открыть книгу
              </Link>
            </article>
          ))
        ) : (
          <section className="content-card empty-state">
            <p>В этой библиотеке пока нет книг. Добавь первую книгу, чтобы открыть карточку и заметки.</p>
          </section>
        )}
      </div>
    </section>
  );
}
