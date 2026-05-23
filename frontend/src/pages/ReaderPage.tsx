import { FormEvent, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  createBookmark,
  createQuote,
  getBook,
  listBookmarks,
  listQuotes,
} from '../lib/mockApi';

export function ReaderPage() {
  const { libraryId = '', bookId = '' } = useParams();
  const book = useMemo(() => getBook(bookId), [bookId]);
  const [bookmarks, setBookmarks] = useState(() => listBookmarks(bookId));
  const [quotes, setQuotes] = useState(() => listQuotes(bookId));

  if (!book) {
    return (
      <section className="content-card">
        <h2>Книга не найдена</h2>
      </section>
    );
  }

  function handleBookmarkSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    createBookmark(
      bookId,
      String(form.get('label') ?? ''),
      String(form.get('location') ?? '')
    );

    setBookmarks(listBookmarks(bookId));
    event.currentTarget.reset();
  }

  function handleQuoteSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    createQuote(
      bookId,
      String(form.get('text') ?? ''),
      String(form.get('note') ?? '')
    );

    setQuotes(listQuotes(bookId));
    event.currentTarget.reset();
  }

  async function handleDownload() {
    if (!book.fileUrl) return;

    try {
      const response = await fetch(book.fileUrl);
      const blob = await response.blob();
      const objectUrl = window.URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = book.fileName || `${book.title}.pdf`;
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
          ← Back
        </Link>
      </div>

      <div className="reader-page-modern__layout">
        <aside className="reader-page-modern__sidebar">
          <div className="reader-book-summary-card">
            <div className="reader-book-summary-card__cover">
              <div className="reader-book-summary-card__cover-badge">
                Home Library Edition
              </div>
              <div className="reader-book-summary-card__cover-title">
                {book.title}
              </div>
            </div>

            <div className="reader-book-summary-card__body">
              <h2>{book.title}</h2>
              <p>{book.author}</p>

              {book.fileName ? (
                <p className="reader-book-summary-card__file">
                  Файл: {book.fileName}
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

            <form className="stack" onSubmit={handleBookmarkSubmit}>
              <input name="label" placeholder="Название закладки" required />
              <input
                name="location"
                placeholder="Позиция, например Page 18"
                required
              />
              <button className="primary-button" type="submit">
                Добавить
              </button>
            </form>

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

            <form className="stack" onSubmit={handleQuoteSubmit}>
              <textarea name="text" placeholder="Текст цитаты" rows={4} required />
              <input name="note" placeholder="Комментарий" />
              <button className="primary-button" type="submit">
                Сохранить цитату
              </button>
            </form>

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
        </aside>

        <main className="reader-page-modern__content">
          <div className="reader-stats-row">
            <div className="reader-stat-card">
              <span className="reader-stat-card__label">Progress</span>
              <strong>{book.progress}%</strong>
            </div>

            <div className="reader-stat-card">
              <span className="reader-stat-card__label">Status</span>
              <strong>{book.progress > 0 ? 'В процессе' : 'Не начато'}</strong>
            </div>

            <div className="reader-stat-card">
              <span className="reader-stat-card__label">Bookmarks</span>
              <strong>{bookmarks.length}</strong>
            </div>

            <div className="reader-stat-card">
              <span className="reader-stat-card__label">Quotes</span>
              <strong>{quotes.length}</strong>
            </div>
          </div>

          <div className="reader-actions-row">
            {book.fileUrl ? (
              <>
                <Link
                  className="reader-main-action reader-main-action--primary"
                  to={`/reader/${libraryId}/${bookId}/view`}
                >
                  Read Online
                </Link>

                <button
                  type="button"
                  className="reader-main-action reader-main-action--secondary"
                  onClick={handleDownload}
                >
                  Download
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