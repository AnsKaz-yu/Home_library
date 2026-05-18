import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getBook } from '../lib/mockApi';

export function ReaderViewPage() {
  const { libraryId = '', bookId = '' } = useParams();
  const book = useMemo(() => getBook(bookId), [bookId]);

  if (!book) {
    return (
      <section className="content-card">
        <h2>Книга не найдена</h2>
      </section>
    );
  }

  return (
    <section className="reader-view-page">
      <div className="reader-view-page__topbar">
        <Link className="reader-back-button" to={`/reader/${libraryId}/${bookId}`}>
          ← Back
        </Link>
      </div>

      <div className="reader-viewer-shell">
        {book.fileUrl ? (
          <iframe
            src={book.fileUrl}
            title={book.title}
            className="reader-iframe"
          />
        ) : (
          <div className="reader-empty-state">
            <h3>Файл книги недоступен</h3>
            <p>Для этой книги пока нет загруженного файла.</p>
            <Link className="primary-button" to={`/libraries/${libraryId}`}>
              Вернуться в библиотеку
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}