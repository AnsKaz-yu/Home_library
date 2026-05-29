import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  getBook,
  listBookmarks,
  listQuotes,
} from '../lib/mockApi';
import { truncateText } from '../lib/format';
import { Book, Bookmark, Quote } from '../types/domain';

export function ReaderPage() {
  const { libraryId = '', bookId = '' } = useParams();
  const [book, setBook] = useState<Book | null>(null);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadReaderPage() {
      try {
        setIsLoading(true);
        const [loadedBook, loadedBookmarks, loadedQuotes] = await Promise.all([
          getBook(bookId),
          listBookmarks(bookId),
          listQuotes(bookId),
        ]);

        setBook(loadedBook);
        setBookmarks(loadedBookmarks);
        setQuotes(loadedQuotes);
        setProgress(loadedBook?.progress ?? 0);
        setError('');
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : 'Не удалось загрузить книгу.'
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadReaderPage();
  }, [bookId]);

  if (isLoading) {
    return (
      <section className="content-card">
        <h2>Загрузка книги...</h2>
      </section>
    );
  }

  if (!book) {
    return (
      <section className="content-card">
        <h2>Книга не найдена</h2>
        {error ? <p className="muted-text">{error}</p> : null}
      </section>
    );
  }

  async function handleDownload() {
    const currentBook = book;

    if (!currentBook?.fileUrl) return;

    try {
      const response = await fetch(currentBook.fileUrl);
      const blob = await response.blob();
      const objectUrl = window.URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = currentBook.fileName || `${currentBook.title}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(objectUrl);
    } catch (error) {
      console.error(error);
      alert('Не удалось скачать файл.');
    }
  }

  return (
    <section className="reader-page-modern">
      <div className="reader-page-modern__topbar">
        <Link className="reader-back-button" to={`/libraries/${libraryId}`}>
          ← Назад
        </Link>
      </div>

      <div className="reader-page-modern__layout">
        <aside className="reader-page-modern__sidebar">
          <div className="reader-book-summary-card">
            <div className="reader-book-summary-card__cover">
              <div className="reader-book-summary-card__cover-badge">
                Издание Home Library
              </div>
              <div className="reader-book-summary-card__cover-title">
                {book.title}
              </div>
            </div>

            <div className="reader-book-summary-card__body">
              <h2>{book.title}</h2>
              <p>{book.author}</p>

              {book.fileName ? (
                <p className="reader-book-summary-card__file" title={book.fileName}>
                  Файл: {truncateText(book.fileName, 42)}
                </p>
              ) : (
                <p className="reader-book-summary-card__file">
                  Файл недоступен
                </p>
              )}
            </div>
          </div>

          <section className="content-card stack">
            <h3>Закладки</h3>

            <p className="muted-text">
              Закладки создаются из просмотрщика книги.
            </p>

            {bookmarks.length > 0 ? (
              bookmarks.map((bookmark) => (
                <p key={bookmark.id}>
                  {bookmark.label} · {bookmark.location}
                </p>
              ))
            ) : (
              <p className="muted-text">Пока нет закладок.</p>
            )}
          </section>

          <section className="content-card stack">
            <h3>Цитаты</h3>

            <p className="muted-text">
              Цитаты создаются из просмотрщика книги через выделение текста.
            </p>

            {quotes.length > 0 ? (
              quotes.map((quote) => (
                <blockquote className="quote-card" key={quote.id}>
                  <p>{quote.text}</p>
                  {quote.note ? <footer>{quote.note}</footer> : null}
                </blockquote>
              ))
            ) : (
              <p className="muted-text">Пока нет сохранённых цитат.</p>
            )}
          </section>

          {error ? <p className="error-message">{error}</p> : null}
        </aside>

        <main className="reader-page-modern__content">
          <div className="reader-stats-row">
            <div className="reader-stat-card">
              <span className="reader-stat-card__label">Прогресс</span>
              <strong>{progress}%</strong>
            </div>

            <div className="reader-stat-card">
              <span className="reader-stat-card__label">Статус</span>
              <strong>{progress > 0 ? 'В процессе' : 'Не начато'}</strong>
            </div>

            <div className="reader-stat-card">
              <span className="reader-stat-card__label">Закладки</span>
              <strong>{bookmarks.length}</strong>
            </div>

            <div className="reader-stat-card">
              <span className="reader-stat-card__label">Цитаты</span>
              <strong>{quotes.length}</strong>
            </div>
          </div>

          <section className="content-card stack" style={{ marginBottom: '24px' }}>
            <h3>Прогресс чтения</h3>
            <div
              className="reader-progress-meter"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress}
              aria-label="Прогресс чтения"
            >
              <div className="reader-progress-meter__fill" style={{ width: `${progress}%` }} />
            </div>
            <p className="muted-text">
              Текущее значение: {progress}% · Обновляется автоматически во время чтения в просмотрщике
            </p>
          </section>

          <div className="reader-actions-row">
            {book.fileUrl ? (
              <>
                <Link
                  className="reader-main-action reader-main-action--primary"
                  to={`/reader/${libraryId}/${bookId}/view`}
                >
                  Читать онлайн
                </Link>

                <button
                  type="button"
                  className="reader-main-action reader-main-action--secondary"
                  onClick={handleDownload}
                >
                  Скачать
                </button>
              </>
            ) : (
              <div className="reader-placeholder">
                Для этой книги файл недоступен.
              </div>
            )}
          </div>
        </main>
      </div>
    </section>
  );
}