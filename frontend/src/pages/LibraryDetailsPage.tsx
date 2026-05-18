import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { createInvite, getLibrary, listBooks } from '../lib/mockApi';

export function LibraryDetailsPage() {
  const navigate = useNavigate();
  const { libraryId = '' } = useParams();
  const library = useMemo(() => getLibrary(libraryId), [libraryId]);
  const books = useMemo(() => listBooks(libraryId), [libraryId]);
  const [inviteUrl, setInviteUrl] = useState('');

  if (!library) {
    return (
      <section className="content-card">
        <h2>Библиотека не найдена</h2>
      </section>
    );
  }

  function handleInvite() {
    const invite = createInvite(libraryId);
    setInviteUrl(`${window.location.origin}/invite/${invite.token}`);
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
          </div>
        )}
      </div>

      {inviteUrl && (
        <section className="content-card">
          <h3>Ссылка приглашения</h3>
          <p className="mono-text" style={{ wordBreak: 'break-all' }}>
            {inviteUrl}
          </p>
        </section>
      )}

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
          books.map((book) => (
            <article className="content-card library-card" key={book.id}>
              <div className="space-between">
                <h3>{book.title}</h3>
                <span className="role-chip">{book.progress}%</span>
              </div>

              <p>{book.author}</p>

              {book.fileName ? (
                <p className="muted-text">Файл: {book.fileName}</p>
              ) : null}

              <Link className="text-link" to={`/reader/${library.id}/${book.id}`}>
                Открыть книгу
              </Link>
            </article>
          ))
        ) : (
          <section className="content-card empty-state">
            <p>Пока нет книг. Добавь первую книгу.</p>
          </section>
        )}
      </div>
    </section>
  );
}