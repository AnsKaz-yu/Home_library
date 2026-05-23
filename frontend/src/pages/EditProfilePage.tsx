import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getCurrentSession, updateProfile } from '../lib/mockApi';

export function EditProfilePage() {
  const navigate = useNavigate();
  const session = getCurrentSession();

  const [name, setName] = useState(session?.userName ?? '');
  const [email, setEmail] = useState(session?.email ?? '');
  const [error, setError] = useState('');

  if (!session) {
    return (
      <section className="content-card">
        <h2>Пользователь не найден</h2>
      </section>
    );
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      updateProfile(name, email);
      navigate('/profile');
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Не удалось обновить профиль.'
      );
    }
  }

  return (
    <section className="stack-large edit-profile-page">
      <div className="hero-card">
        <div className="hero-copy">
          <p className="eyebrow">Редактирование профиля</p>
          <h2>Изменить профиль</h2>
          <p className="hero-text">
            Здесь можно обновить основную информацию пользователя.
          </p>
        </div>

        <Link className="secondary-button" to="/profile">
          Назад
        </Link>
      </div>

      <form className="content-card stack" onSubmit={handleSubmit}>
        <label className="auth-label">
          <span>Имя</span>
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Введите имя"
            required
          />
        </label>

        <label className="auth-label">
          <span>Email</span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Введите email"
            required
          />
        </label>

        {error ? <p className="error-text">{error}</p> : null}

        <div className="profile-actions-row">
          <Link className="secondary-button" to="/profile">
            Отмена
          </Link>

          <button className="primary-button" type="submit">
            Сохранить изменения
          </button>
        </div>
      </form>
    </section>
  );
}