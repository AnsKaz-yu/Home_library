import { Link } from 'react-router-dom';
import { getCurrentSession } from '../lib/mockApi';

export function ProfilePage() {
  const session = getCurrentSession();

  if (!session) {
    return (
      <section className="content-card">
        <h2>Пользователь не найден</h2>
      </section>
    );
  }

  return (
    <section className="stack-large profile-page">
      <div className="hero-card">
        <div className="hero-copy">
          <p className="eyebrow">Профиль</p>
          <h2>{session.userName}</h2>
          <p className="hero-text">
            Здесь отображается основная информация пользователя и доступ к настройкам аккаунта.
          </p>
        </div>

        <div className="stack">
          <Link className="secondary-button" to="/profile/edit">
            Изменить
          </Link>

          <Link className="secondary-button" to="/libraries">
            Назад к библиотекам
          </Link>
        </div>
      </div>

      <section className="stats-grid">
        <article className="content-card stack">
          <p className="eyebrow">Имя</p>
          <h3>{session.userName}</h3>
          <p className="muted-text">Основное имя пользователя в системе.</p>
        </article>

        <article className="content-card stack">
          <p className="eyebrow">Email</p>
          <h3>{session.email}</h3>
          <p className="muted-text">Электронная почта, связанная с аккаунтом.</p>
        </article>
      </section>

      <section className="content-card stack">
        <h3>Действия</h3>
        <p className="muted-text">
          Здесь можно перейти к редактированию профиля или вернуться в библиотеку.
        </p>

        <Link className="primary-button" to="/libraries">
          Перейти в библиотеку
        </Link>
      </section>
    </section>
  );
}