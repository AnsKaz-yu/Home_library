import { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  createInvite,
  deleteBook,
  deleteLibrary,
  getLibrary,
  listBooks,
  updateBook,
  updateLibrary,
} from '../lib/mockApi';
import { buildBookCoverGradient, truncateText } from '../lib/format';
import { Book, Library } from '../types/domain';

export function LibraryDetailsPage() {
  const navigate = useNavigate();
  const { libraryId = '' } = useParams();
  const [library, setLibrary] = useState<Library | null>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [inviteUrl, setInviteUrl] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isEditingLibrary, setIsEditingLibrary] = useState(false);
  const [libraryNameDraft, setLibraryNameDraft] = useState('');
  const [libraryDescriptionDraft, setLibraryDescriptionDraft] = useState('');
  const [isSavingLibrary, setIsSavingLibrary] = useState(false);
  const [editingBookId, setEditingBookId] = useState('');
  const [bookTitleDraft, setBookTitleDraft] = useState('');
  const [bookAuthorDraft, setBookAuthorDraft] = useState('');
  const [bookFileDraft, setBookFileDraft] = useState<File | null>(null);
  const [isSavingBook, setIsSavingBook] = useState(false);

  useEffect(() => {
    async function loadLibraryDetails() {
      try {
        setIsLoading(true);
        const [loadedLibrary, loadedBooks] = await Promise.all([
          getLibrary(libraryId),
          listBooks(libraryId),
        ]);

        setLibrary(loadedLibrary);
        setBooks(loadedBooks);
        setError('');
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : 'Не удалось загрузить библиотеку.'
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadLibraryDetails();
  }, [libraryId]);

  useEffect(() => {
    if (!library) {
      return;
    }

    setLibraryNameDraft(library.name);
    setLibraryDescriptionDraft(library.description);
  }, [library]);

  if (isLoading) {
    return (
      <section className="content-card">
        <h2>Загрузка библиотеки...</h2>
      </section>
    );
  }

  if (!library) {
    return (
      <section className="content-card">
        <h2>Библиотека не найдена</h2>
        {error ? <p className="muted-text">{error}</p> : null}
      </section>
    );
  }

  async function handleInvite() {
    try {
      const invite = await createInvite(libraryId);
      setInviteUrl(`${window.location.origin}/invite/${invite.token}`);
      setError('');
    } catch (inviteError) {
      setError(
        inviteError instanceof Error
          ? inviteError.message
          : 'Не удалось создать приглашение.'
      );
    }
  }

  async function handleUpdateLibrary(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!library) return;

    try {
      setIsSavingLibrary(true);
      const updatedLibrary = await updateLibrary(
        libraryId,
        libraryNameDraft,
        libraryDescriptionDraft
      );
      setLibrary(updatedLibrary);
      setIsEditingLibrary(false);
      setError('');
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : 'Не удалось обновить библиотеку.'
      );
    } finally {
      setIsSavingLibrary(false);
    }
  }

  async function handleDeleteLibrary() {
    if (!window.confirm('Удалить библиотеку и все книги в ней?')) {
      return;
    }

    try {
      setIsSavingLibrary(true);
      await deleteLibrary(libraryId);
      navigate('/libraries');
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : 'Не удалось удалить библиотеку.'
      );
    } finally {
      setIsSavingLibrary(false);
    }
  }

  function beginBookEdit(book: Book) {
    setEditingBookId(book.id);
    setBookTitleDraft(book.title);
    setBookAuthorDraft(book.author);
    setBookFileDraft(null);
    setError('');
  }

  function cancelBookEdit() {
    setEditingBookId('');
    setBookTitleDraft('');
    setBookAuthorDraft('');
    setBookFileDraft(null);
  }

  function handleBookFileChange(event: ChangeEvent<HTMLInputElement>) {
    setBookFileDraft(event.target.files?.[0] ?? null);
  }

  async function handleUpdateBook(event: FormEvent<HTMLFormElement>, bookIdToUpdate: string) {
    event.preventDefault();

    try {
      setIsSavingBook(true);
      const updatedBook = await updateBook(
        bookIdToUpdate,
        bookTitleDraft,
        bookAuthorDraft,
        bookFileDraft
      );
      setBooks(currentBooks => currentBooks.map(book => (book.id === updatedBook.id ? updatedBook : book)));
      cancelBookEdit();
      setError('');
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : 'Не удалось обновить книгу.'
      );
    } finally {
      setIsSavingBook(false);
    }
  }

  async function handleDeleteBook(book: Book) {
    if (!window.confirm(`Удалить книгу «${book.title}»?`)) {
      return;
    }

    try {
      setIsSavingBook(true);
      await deleteBook(book.id);
      setBooks(currentBooks => currentBooks.filter(currentBook => currentBook.id !== book.id));
      if (editingBookId === book.id) {
        cancelBookEdit();
      }
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : 'Не удалось удалить книгу.'
      );
    } finally {
      setIsSavingBook(false);
    }
  }

  function renderBookCard(book: Book) {
    const isEditing = editingBookId === book.id;
    const currentLibrary = library!;
    const isOwner = currentLibrary.role === 'owner';
    const coverSeed = `${book.id}:${book.title}`;

    return (
      <article className="content-card book-card library-book-card" key={book.id}>
        <div
          className="book-cover"
          style={{
            background: buildBookCoverGradient(coverSeed),
            minHeight: '220px',
          }}
        >
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div className="book-cover-title">{truncateText(book.title, 32)}</div>
            <p className="book-cover-author">
              {truncateText(book.author, 32)}
            </p>
          </div>
        </div>

        <div className="book-card__actions">
          <Link className="reader-main-action reader-main-action--primary" to={`/reader/${currentLibrary.id}/${book.id}`}>
            Открыть книгу
          </Link>

          {isOwner && (
            <>
              <button
                type="button"
                className="reader-main-action reader-main-action--secondary"
                onClick={() => beginBookEdit(book)}
                disabled={isSavingBook}
              >
                Изменить
              </button>

              <button
                type="button"
                className="reader-main-action reader-main-action--secondary"
                onClick={() => void handleDeleteBook(book)}
                disabled={isSavingBook}
              >
                Удалить
              </button>
            </>
          )}
        </div>

        <div className="stack book-card__body">
          <div className="space-between">
            <h3>{book.title}</h3>
            <span className="role-chip">{book.progress}%</span>
          </div>

          <p>{book.author}</p>

          {isEditing && isOwner && (
            <form className="stack" onSubmit={event => void handleUpdateBook(event, book.id)}>
              <label className="auth-label">
                <span>Название книги</span>
                <input
                  type="text"
                  value={bookTitleDraft}
                  onChange={event => setBookTitleDraft(event.target.value)}
                  required
                />
              </label>

              <label className="auth-label">
                <span>Автор</span>
                <input
                  type="text"
                  value={bookAuthorDraft}
                  onChange={event => setBookAuthorDraft(event.target.value)}
                  required
                />
              </label>

              <label className="auth-label">
                <span>Заменить файл книги</span>
                <input
                  type="file"
                  accept=".pdf,.epub"
                  onChange={handleBookFileChange}
                />
              </label>

              {bookFileDraft ? (
                <p className="muted-text" title={bookFileDraft.name}>
                  Новый файл: {truncateText(bookFileDraft.name, 42)}
                </p>
              ) : null}

              <div className="profile-actions-row">
                <button className="primary-button" type="submit" disabled={isSavingBook}>
                  {isSavingBook ? 'Сохранение...' : 'Сохранить изменения'}
                </button>

                <button
                  className="secondary-button"
                  type="button"
                  onClick={cancelBookEdit}
                  disabled={isSavingBook}
                >
                  Отмена
                </button>
              </div>
            </form>
          )}
        </div>
      </article>
    );
  }

  return (
    <section className="stack-large">
      <div
        className="content-card"
        style={{
          padding: '24px',
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '24px',
          flexWrap: 'wrap',
        }}
      >
        <div
          style={{
            flex: '1 1 420px',
            minWidth: '280px',
            textAlign: 'left',
          }}
        >
          <p
            style={{
              margin: '0 0 8px 0',
              fontSize: '12px',
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            Детали библиотеки
          </p>

          <h2
            style={{
              margin: '0 0 10px 0',
              fontSize: '24px',
              fontWeight: 600,
              lineHeight: '1.3',
            }}
          >
            {library.name}
          </h2>

          <p
            style={{
              margin: '0 0 10px 0',
              fontSize: '16px',
              lineHeight: '1.6',
            }}
          >
            {library.description}
          </p>

          <p
            style={{
              margin: 0,
              fontSize: '14px',
              lineHeight: '1.5',
              opacity: 0.8,
            }}
          >
            Публичный ID: {library.joinCode ?? library.id}
          </p>
        </div>

        {library.role === 'owner' && (
          <div
            style={{
              flex: '0 0 220px',
              minWidth: '220px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'stretch',
              gap: '12px',
            }}
          >
            <button
              className="primary-button"
              onClick={() => navigate(`/libraries/${libraryId}/add-book`)}
              style={{
                width: '220px',
                minWidth: '220px',
                maxWidth: '220px',
                padding: '12px 16px',
                fontSize: '14px',
              }}
            >
              Добавить книгу
            </button>

            <button
              className="secondary-button"
              onClick={handleInvite}
              style={{
                width: '220px',
                minWidth: '220px',
                maxWidth: '220px',
                padding: '12px 16px',
                fontSize: '14px',
              }}
            >
              Сгенерировать приглашение
            </button>

            <button
              className="secondary-button"
              onClick={() => setIsEditingLibrary(true)}
              style={{
                width: '220px',
                minWidth: '220px',
                maxWidth: '220px',
                padding: '12px 16px',
                fontSize: '14px',
              }}
            >
              Изменить библиотеку
            </button>

            <button
              className="secondary-button"
              onClick={() => void handleDeleteLibrary()}
              disabled={isSavingLibrary}
              style={{
                width: '220px',
                minWidth: '220px',
                maxWidth: '220px',
                padding: '12px 16px',
                fontSize: '14px',
              }}
            >
              Удалить библиотеку
            </button>
          </div>
        )}
      </div>

      {isEditingLibrary && (
        <section className="content-card stack">
          <h3>Редактирование библиотеки</h3>

          <form className="stack" onSubmit={handleUpdateLibrary}>
            <label className="auth-label">
              <span>Название библиотеки</span>
              <input
                type="text"
                value={libraryNameDraft}
                onChange={event => setLibraryNameDraft(event.target.value)}
                required
              />
            </label>

            <label className="auth-label">
              <span>Описание библиотеки</span>
              <textarea
                rows={4}
                value={libraryDescriptionDraft}
                onChange={event => setLibraryDescriptionDraft(event.target.value)}
                required
              />
            </label>

            <div className="profile-actions-row">
              <button className="primary-button" type="submit" disabled={isSavingLibrary}>
                {isSavingLibrary ? 'Сохранение...' : 'Сохранить изменения'}
              </button>

              <button
                className="secondary-button"
                type="button"
                onClick={() => setIsEditingLibrary(false)}
                disabled={isSavingLibrary}
              >
                Отмена
              </button>
            </div>
          </form>
        </section>
      )}

      {inviteUrl && (
        <section className="content-card">
          <h3>Ссылка приглашения</h3>
          <p className="mono-text" style={{ wordBreak: 'break-all' }}>
            {inviteUrl}
          </p>
        </section>
      )}

      {error ? (
        <section className="content-card">
          <p className="error-text">{error}</p>
        </section>
      ) : null}

      <section className="stats-grid">
        <article className="content-card stack">
          <p className="eyebrow">Книги</p>
          <h3
            style={{
              fontSize: '24px',
              fontWeight: 600,
              margin: '4px 0',
            }}
          >
            {books.length}
          </h3>
          <p className="muted-text">Все книги, доступные в этой библиотеке.</p>
        </article>

        <article className="content-card stack">
          <p className="eyebrow">Роль</p>
          <h3
            style={{
              fontSize: '24px',
              fontWeight: 600,
              margin: 0,
            }}
          >
            {library.role === 'owner' ? 'Владелец' : 'Читатель'}
          </h3>
          <p className="muted-text">
            Для читателя скрыта форма добавления книг.
          </p>
        </article>
      </section>

      <div className="card-grid">
        {books.length > 0 ? (
          books.map(renderBookCard)
        ) : (
          <section className="content-card empty-state">
            <p>Пока нет книг. Добавь первую книгу.</p>
          </section>
        )}
      </div>
    </section>
  );
}