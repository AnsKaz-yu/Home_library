import { FormEvent, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { SearchResult, searchBooks } from '../lib/mockApi';
import { truncateText } from '../lib/format';

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') ?? '';
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function runSearch() {
      if (!initialQuery) {
        setResults([]);
        setError('');
        return;
      }

      try {
        setIsLoading(true);
        setResults(await searchBooks(initialQuery));
        setError('');
      } catch (searchError) {
        setError(
          searchError instanceof Error
            ? searchError.message
            : 'Не удалось выполнить поиск.'
        );
      } finally {
        setIsLoading(false);
      }
    }

    void runSearch();
  }, [initialQuery]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = query.trim();

    if (!normalized) {
      setSearchParams({});
      return;
    }

    setSearchParams({ q: normalized });
  }

  return (
    <section className="stack-large">
      <div className="hero-card">
        <div className="hero-copy">
          <p className="eyebrow">Глобальный поиск</p>
          <h2>Поиск книг по всему сайту</h2>
          <p className="hero-text">
            Ищите книги по названию, автору или имени файла.
          </p>
        </div>

        <form className="inline-form" onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Введите название книги, автора или имя файла"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <button className="primary-button" type="submit">
            Искать
          </button>
        </form>
      </div>

      {initialQuery ? (
        <section className="stack">
          <div className="space-between">
            <h3>Результаты поиска</h3>
            <p className="muted-text">{results.length} найдено</p>
          </div>

          {error ? (
            <div className="content-card empty-state-card">
              <h3>Ошибка поиска</h3>
              <p className="muted-text">{error}</p>
            </div>
          ) : isLoading ? (
            <div className="content-card empty-state-card">
              <p className="muted-text">Ищем книги...</p>
            </div>
          ) : results.length > 0 ? (
            <div className="card-grid">
              {results.map(({ book, library }) => (
                <article className="content-card library-card" key={book.id}>
                  <div className="space-between">
                    <h3>{book.title}</h3>
                    <span className="role-chip">{book.progress}%</span>
                  </div>

                  <p>{book.author}</p>

                  {library ? (
                    <p className="muted-text">Библиотека: {library.name}</p>
                  ) : null}

                  {book.fileName ? (
                    <p className="muted-text" title={book.fileName}>Файл: {truncateText(book.fileName, 34)}</p>
                  ) : null}

                  <div className="stack-small">
                    <Link
                      className="text-link"
                      to={`/reader/${library?.id ?? book.libraryId}/${book.id}`}
                    >
                      Открыть книгу
                    </Link>

                    {book.fileUrl ? (
                      <a
                        className="text-link"
                        href={book.fileUrl}
                        download
                        target="_blank"
                        rel="noreferrer"
                      >
                        Скачать книгу
                      </a>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="content-card empty-state-card">
              <h3>Ничего не найдено</h3>
              <p className="muted-text">
                Попробуйте изменить запрос или ввести другое название.
              </p>
            </div>
          )}
        </section>
      ) : (
        <div className="content-card empty-state-card">
          <h3>Введите запрос для поиска</h3>
          <p className="muted-text">
            Поиск работает по книгам, авторам и имени файла.
          </p>
        </div>
      )}
    </section>
  );
}