import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { createLibrary, listLibraries } from '../lib/mockApi';

export function LibrariesPage() {
  const [libraries, setLibraries] = useState(() => listLibraries());
  const ownerLibraries = libraries.filter((library) => library.role === 'owner');
  const readerLibraries = libraries.filter((library) => library.role === 'reader');

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    createLibrary(String(form.get('name') ?? ''), String(form.get('description') ?? ''));
    setLibraries(listLibraries());
    event.currentTarget.reset();
  }

  return (
    <section className="stack-large">
      <div className="hero-card">
        <div>
          <p className="eyebrow">Панель библиотек</p>
          <h2>Управляй личной и совместной коллекцией книг</h2>
          <p className="muted-text">MVP содержит demo-данные.</p>
        </div>
        <form className="inline-form" onSubmit={handleSubmit}>
          <input name="name" placeholder="Название библиотеки" required />
          <input name="description" placeholder="Короткое описание" required />
          <button className="primary-button" type="submit">
            Создать библиотеку
          </button>
        </form>
      </div>

      <section className="stats-grid">
        <article className="content-card stack">
          <p className="eyebrow">Собственные</p>
          <h3>{ownerLibraries.length}</h3>
          <p className="muted-text">Библиотеки, которые можно редактировать и расшаривать.</p>
        </article>
        <article className="content-card stack">
          <p className="eyebrow">Доступ читателя</p>
          <h3>{readerLibraries.length}</h3>
          <p className="muted-text">Библиотеки, в которые пользователь вошёл по ID или invite.</p>
        </article>
      </section>

      <div className="card-grid">
        {libraries.map((library) => (
          <article className="content-card" key={library.id}>
            <div className="space-between">
              <h3>{library.name}</h3>
              <span className="role-chip">{library.role === 'owner' ? 'Владелец' : 'Читатель'}</span>
            </div>
            <p>{library.description}</p>
            <p className="muted-text">ID: {library.joinCode ?? library.id}</p>
            <Link className="text-link" to={`/libraries/${library.id}`}>
              Открыть библиотеку
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
