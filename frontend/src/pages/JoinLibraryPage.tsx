import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { findLibraryByCode, joinLibraryByCode } from '../lib/mockApi';
import { Library } from '../types/domain';

export function JoinLibraryPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<Library | null>(null);
  const [error, setError] = useState('');

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedQuery = query.trim();
    const library = findLibraryByCode(trimmedQuery);

    if (!library) {
      setResult(null);
      setError('Библиотека не найдена. Проверь ID и попробуй снова.');
      return;
    }

    setResult(library);
    setError('');
  }

  function handleJoin() {
    try {
      const library = joinLibraryByCode(query.trim());
      navigate(`/libraries/${library.id}`);
    } catch (joinError) {
      setError(
        joinError instanceof Error
          ? joinError.message
          : 'Не удалось присоединиться к библиотеке.'
      );
    }
  }

  return (
    <section className="stack-large">
      <div className="hero-card">
        <div className="hero-copy">
          <p className="eyebrow">Поиск библиотеки</p>
          <h2>Присоединение по ID</h2>
          <p className="hero-text">
            Найдите библиотеку по public ID или по invite code и присоединитесь к
            коллекции как читатель.
          </p>
        </div>

        <form className="inline-form" onSubmit={handleSearch}>
          <input
            name="code"
            placeholder="Например FANTASY-001"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            required
          />
          <input value="invite-demo" readOnly aria-label="Пример invite token" />
          <button className="primary-button" type="submit">
            Найти библиотеку
          </button>
        </form>
      </div>

      <section className="join-grid">
        <article className="content-card stack">
          <h3>Демо-данные для просмотра</h3>
          <p className="muted-text join-muted">
            Можно использовать один из подготовленных ID.
          </p>

          <div className="badge-row">
  {['FANTASY-001', 'KNOWLEDGE-204', 'invite-demo'].map((code) => (
    <span
      key={code}
      className="role-chip clickable-chip"
      onClick={() => {
  setQuery(code);
  setResult(null);
  setError('');
}}
    >
      {code}
    </span>
  ))}
</div>
        </article>

        <article className="content-card stack">
          <h3>Результат поиска</h3>

          {result ? (
            <div className="join-result-card">
              <div className="stack">
                <strong className="join-result-title">{result.name}</strong>
                <p>{result.description}</p>
                <p className="muted-text join-muted">
                  ID: {result.joinCode ?? result.id}
                </p>
              </div>

              <button className="primary-button" onClick={handleJoin}>
                Присоединиться как читатель
              </button>
            </div>
          ) : (
            <div className="empty-state">
              <p>{error || 'После поиска здесь появится карточка найденной библиотеки.'}</p>
            </div>
          )}
        </article>
      </section>
    </section>
  );
}