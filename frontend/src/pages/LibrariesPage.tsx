import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createLibrary, listLibraries } from '../lib/mockApi';
import { Library } from '../types/domain';

export function LibrariesPage() {
  const navigate = useNavigate();
  const [libraries, setLibraries] = useState<Library[]>([]);
  const [searchId, setSearchId] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    void refreshLibraries();
  }, []);

  const ownerLibraries = useMemo(
    () => libraries.filter((library) => library.role === 'owner'),
    [libraries]
  );

  const readerLibraries = useMemo(
    () => libraries.filter((library) => library.role === 'reader'),
    [libraries]
  );

  async function refreshLibraries() {
    try {
      setIsLoading(true);
      setLibraries(await listLibraries());
      setError('');
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Не удалось загрузить библиотеки.'
      );
    } finally {
      setIsLoading(false);
    }
  }

  function handleSearch() {
    const normalized = searchId.trim();
    if (!normalized) return;
    navigate(`/join?code=${encodeURIComponent(normalized)}`);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    try {
      await createLibrary(
        String(form.get('name') ?? ''),
        String(form.get('description') ?? '')
      );

      await refreshLibraries();
      event.currentTarget.reset();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Не удалось создать библиотеку.'
      );
    }
  }

  function renderLibraryCard(
    library: {
      id: string;
      name: string;
      description: string;
      role: 'owner' | 'reader';
      joinCode?: string;
    }
  ) {
    return (
      <article
        className="content-card library-card clickable-card"
        key={library.id}
        onClick={() => navigate(`/libraries/${library.id}`)}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            navigate(`/libraries/${library.id}`);
          }
        }}
      >
        <div className="space-between">
          <h3>{library.name}</h3>
          <span className="role-chip">
            {library.role === 'owner' ? 'Владелец' : 'Читатель'}
          </span>
        </div>

        <p>{library.description}</p>

        <div className="stack-small">
          <p className="muted-text">
            {library.role === 'owner' ? 'Код доступа' : 'Подключено по коду'}
          </p>
          <p className="library-id-text">{library.joinCode ?? library.id}</p>
        </div>

        <Link
          className="text-link"
          to={`/libraries/${library.id}`}
          onClick={(event) => event.stopPropagation()}
        >
          Открыть библиотеку
        </Link>
      </article>
    );
  }

  return (
    <section className="libraries-page stack-large">
      <div className="hero-card">
        <div className="hero-copy">
          <p className="eyebrow">Панель библиотек</p>
          <h2>Управляй личной и совместной коллекцией книг</h2>
          <p className="muted-text hero-text">
            Создавайте свои библиотеки, открывайте доступ читателям и управляйте
            книжными коллекциями в одном месте.
          </p>
        </div>

        <form className="inline-form library-create-form" onSubmit={handleSubmit}>
          <input
            name="name"
            placeholder="Название библиотеки"
            required
          />
          <input
            name="description"
            placeholder="Короткое описание"
            required
          />
          <button className="primary-button" type="submit">
            Создать библиотеку
          </button>
        </form>
      </div>

      {error ? (
        <section className="content-card empty-state-card">
          <h3>Ошибка загрузки</h3>
          <p className="muted-text">{error}</p>
        </section>
      ) : null}

      <div className="content-card stack">
        <div className="space-between">
          <div>
            <h3>Поиск библиотеки по ID</h3>
            <p className="muted-text">
              Введите код библиотеки, чтобы открыть страницу подключения.
            </p>
          </div>
        </div>

        <div className="inline-form">
          <input
            placeholder="Введите ID или код библиотеки"
            value={searchId}
            onChange={(event) => setSearchId(event.target.value)}
          />
          <button
            type="button"
            className="secondary-button"
            onClick={handleSearch}
          >
            Найти
          </button>
        </div>
      </div>

      <section className="stats-grid">
        <article className="content-card stack">
          <p className="eyebrow">Собственные</p>
          <h3>{ownerLibraries.length}</h3>
          <p className="muted-text">
            Библиотеки, которые можно редактировать и расшаривать.
          </p>
        </article>

        <article className="content-card stack">
          <p className="eyebrow">Доступ читателя</p>
          <h3>{readerLibraries.length}</h3>
          <p className="muted-text">
            Библиотеки, в которые пользователь вошёл по ID или invite.
          </p>
        </article>
      </section>

      <section className="stack">
        <div className="space-between">
          <h3>Мои библиотеки</h3>
          <p className="muted-text">{ownerLibraries.length} библиотек</p>
        </div>

        {isLoading ? (
          <div className="content-card empty-state-card">
            <p className="muted-text">Загрузка библиотек...</p>
          </div>
        ) : ownerLibraries.length > 0 ? (
          <div className="card-grid">
            {ownerLibraries.map(renderLibraryCard)}
          </div>
        ) : (
          <div className="content-card empty-state-card">
            <h3>Пока нет собственных библиотек</h3>
            <p className="muted-text">
              Создайте первую библиотеку, чтобы начать собирать свою коллекцию книг.
            </p>
          </div>
        )}
      </section>

      <section className="stack">
        <div className="space-between">
          <h3>Библиотеки с доступом читателя</h3>
          <p className="muted-text">{readerLibraries.length} библиотек</p>
        </div>

        {isLoading ? (
          <div className="content-card empty-state-card">
            <p className="muted-text">Загрузка библиотек...</p>
          </div>
        ) : readerLibraries.length > 0 ? (
          <div className="card-grid">
            {readerLibraries.map(renderLibraryCard)}
          </div>
        ) : (
          <div className="content-card empty-state-card">
            <h3>Пока нет подключённых библиотек</h3>
            <p className="muted-text">
              Подключитесь к библиотеке по ID или invite, чтобы видеть её здесь.
            </p>
          </div>
        )}
      </section>
    </section>
  );
}