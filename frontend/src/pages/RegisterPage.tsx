import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { register } from '../lib/mockApi';

export function RegisterPage() {
  const navigate = useNavigate();
  const [error, setError] = useState('');

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    try {
      register(
        String(form.get('name') ?? ''),
        String(form.get('email') ?? ''),
        String(form.get('password') ?? ''),
      );
      navigate('/libraries');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Не удалось создать аккаунт.');
    }
  }

  return (
    <section className="auth-card">
      <p className="eyebrow">Регистрация</p>
      <h2>Создать личное пространство для чтения</h2>
      <form className="stack" onSubmit={handleSubmit}>
        <label>
          Имя
          <input name="name" type="text" required />
        </label>
        <label>
          Email
          <input name="email" type="email" required />
        </label>
        <label>
          Пароль
          <input name="password" type="password" minLength={8} required />
        </label>
        {error ? <p className="error-text">{error}</p> : null}
        <button className="primary-button" type="submit">
          Зарегистрироваться
        </button>
      </form>
      <p className="muted-text">
        Уже есть аккаунт? <Link to="/login">Войти</Link>
      </p>
    </section>
  );
}
