import { ChangeEvent, FormEvent, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { addBook } from '../lib/mockApi';
import { truncateText } from '../lib/format';

export function AddBookPage() {
  const navigate = useNavigate();
  const { libraryId = '' } = useParams();

  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    if (event.target.files && event.target.files.length > 0) {
      setFile(event.target.files[0]);
    } else {
      setFile(null);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!libraryId) {
      setError('ID библиотеки не найден.');
      return;
    }

    if (!title.trim()) {
      setError('Введите название книги.');
      return;
    }

    if (!author.trim()) {
      setError('Введите автора книги.');
      return;
    }

    if (!file) {
      setError('Пожалуйста, выберите файл книги.');
      return;
    }

    if (file.type !== 'application/pdf' && file.type !== 'application/epub+zip' && !file.name.endsWith('.epub')) {
      setError('Пожалуйста, выберите PDF или EPUB файл.');
      return;
    }

    try {
      setIsSaving(true);
      setError('');

      await addBook(libraryId, title.trim(), author.trim(), file);

      navigate(`/libraries/${libraryId}`);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Не удалось сохранить книгу.'
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="stack-large">
      <div className="hero-card">
        <div className="hero-copy">
          <p className="eyebrow">Добавление книги</p>
          <h2>Добавить новую книгу</h2>
          <p className="hero-text">
            Заполните данные книги, чтобы добавить её в библиотеку.
          </p>
        </div>
      </div>

      <form className="content-card stack" onSubmit={handleSubmit}>
        <input
          type="text"
          name="title"
          placeholder="Название книги"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />

        <input
          type="text"
          name="author"
          placeholder="Автор"
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          required
        />

        <input
          type="file"
          name="bookFile"
          onChange={handleFileChange}
          accept=".pdf,.epub"
          required
        />

        {file ? (
          <p className="muted-text" title={file.name}>Выбранный файл: {truncateText(file.name, 42)}</p>
        ) : null}

        {error ? <p className="error-message">{error}</p> : null}

        <button className="primary-button" type="submit" disabled={isSaving}>
          {isSaving ? 'Сохранение...' : 'Сохранить книгу'}
        </button>
      </form>
    </section>
  );
}