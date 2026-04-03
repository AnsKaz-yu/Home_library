import { FormEvent, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { createBookmark, createQuote, getBook, listBookmarks, listQuotes } from '../lib/mockApi';

export function ReaderPage() {
  const { bookId = '' } = useParams();
  const book = useMemo(() => getBook(bookId), [bookId]);
  const [bookmarks, setBookmarks] = useState(() => listBookmarks(bookId));
  const [quotes, setQuotes] = useState(() => listQuotes(bookId));

  if (!book) {
    return <section className="content-card"><h2>Книга не найдена</h2></section>;
  }

  function handleBookmarkSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    createBookmark(bookId, String(form.get('label') ?? ''), String(form.get('location') ?? ''));
    setBookmarks(listBookmarks(bookId));
    event.currentTarget.reset();
  }

  function handleQuoteSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    createQuote(bookId, String(form.get('text') ?? ''), String(form.get('note') ?? ''));
    setQuotes(listQuotes(bookId));
    event.currentTarget.reset();
  }

  return (
    <section className="reader-layout">
      <article className="reader-panel">
        <p className="eyebrow">Карточка книги</p>
        <div className="book-card">
          <div className="book-cover">
            <div>
              <p className="eyebrow">Home Library Edition</p>
              <div className="book-cover-title">{book.title}</div>
            </div>
          </div>
          <div className="stack-large">
            <div>
              <h2>{book.title}</h2>
              <p className="muted-text">{book.author}</p>
            </div>
            <div className="book-meta">
              <div className="meta-tile">
                <strong>Прогресс</strong>
                <span>{book.progress}%</span>
              </div>
              <div className="meta-tile">
                <strong>Статус</strong>
                <span>{book.progress > 0 ? 'В процессе' : 'Не начато'}</span>
              </div>
            </div>
            <div className="reader-placeholder">
              В MVP здесь отображается карточка книги. Полноценный встроенный reader в текущий scope не входит.
            </div>
          </div>
        </div>
      </article>

      <aside className="reader-sidebar">
        <section className="content-card stack">
          <h3>Закладки</h3>
          <form className="stack" onSubmit={handleBookmarkSubmit}>
            <input name="label" placeholder="Название закладки" required />
            <input name="location" placeholder="Позиция, например Page 18" required />
            <button className="primary-button" type="submit">
              Добавить
            </button>
          </form>
          {bookmarks.map((bookmark) => (
            <p key={bookmark.id}>{bookmark.label} · {bookmark.location}</p>
          ))}
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
          {quotes.map((quote) => (
            <blockquote className="quote-card" key={quote.id}>
              <p>{quote.text}</p>
              {quote.note ? <footer>{quote.note}</footer> : null}
            </blockquote>
          ))}
        </section>
      </aside>
    </section>
  );
}
