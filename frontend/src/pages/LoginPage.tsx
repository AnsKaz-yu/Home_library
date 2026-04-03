import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { login } from '../lib/mockApi';

export function LoginPage() {
  const navigate = useNavigate();
  const [error, setError] = useState('');

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    try {
      login(String(form.get('email') ?? ''), String(form.get('password') ?? ''));
      navigate('/libraries');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Не удалось выполнить вход.');
    }
  }

  return (
    <section className="auth-card">
      <p className="eyebrow">Вход в систему</p>
      <h2>Продолжить работу с библиотеками</h2>
      <form className="stack" onSubmit={handleSubmit}>
        <label>
          Email
          <input name="email" type="email" defaultValue="anna@example.com" required />
        </label>
        <label>
          Пароль
          <input name="password" type="password" defaultValue="password123" required />
        </label>
        {error ? <p className="error-text">{error}</p> : null}
        <button className="primary-button" type="submit">
          Войти
        </button>
      </form>
      <p className="muted-text">
        Нет аккаунта? <Link to="/register">Создать</Link>
      </p>
    </section>
  );
}
