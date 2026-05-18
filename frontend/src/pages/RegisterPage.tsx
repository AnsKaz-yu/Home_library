import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { register } from '../lib/mockApi';

export function RegisterPage() {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    const name = String(form.get('name') ?? '').trim();
    const email = String(form.get('email') ?? '').trim();
    const password = String(form.get('password') ?? '');
    const confirmPassword = String(form.get('confirmPassword') ?? '');

    if (password !== confirmPassword) {
      setError('Пароли не совпадают.');
      return;
    }

    try {
      register(name, email, password);
      setError('');
      navigate('/libraries');
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Не удалось создать аккаунт.'
      );
    }
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="login-card__inner">
          <h1 className="login-title">Создать аккаунт</h1>

          <p className="login-subtitle">
            Зарегистрируйтесь, чтобы создать домашнюю библиотеку и управлять своей коллекцией книг
          </p>

          <form className="login-form" onSubmit={handleSubmit}>
            <label className="form-group">
              <span className="form-label">Имя</span>
              <input
                className="form-input"
                name="name"
                type="text"
                placeholder="Введите имя"
                required
              />
            </label>

            <label className="form-group">
              <span className="form-label">Электронная почта</span>
              <input
                className="form-input"
                name="email"
                type="email"
                placeholder="Введите адрес электронной почты"
                required
              />
            </label>

            {/* PASSWORD */}
            <label className="form-group">
              <span className="form-label">Пароль</span>
              <div className="password-wrapper">
                <input
                  className="form-input password-input"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Минимум 8 символов"
                  minLength={8}
                  required
                />

                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword((prev) => !prev)}
                >
                  {showPassword ? (
                    <svg viewBox="0 0 24 24">
                      <path d="M3 3L21 21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                      <path d="M10.6 10.6A2 2 0 0 0 12 14a2 2 0 0 0 1.4-.6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                      <path d="M9.9 5.1A11.2 11.2 0 0 1 12 4.9c5.1 0 8.3 3.1 9.5 6.1a11.5 11.5 0 0 1-2.5 3.7M6.6 6.6A13.7 13.7 0 0 0 2.5 11c1.2 3 4.4 6.1 9.5 6.1a11 11 0 0 0 4.1-.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24">
                      <path d="M2.5 12S5.7 5.9 12 5.9 21.5 12 21.5 12 18.3 18.1 12 18.1 2.5 12 2.5 12Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
                    </svg>
                  )}
                </button>
              </div>
            </label>

            {/* CONFIRM PASSWORD */}
            <label className="form-group">
              <span className="form-label">Подтвердите пароль</span>
              <div className="password-wrapper">
                <input
                  className="form-input password-input"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Повторите пароль"
                  minLength={8}
                  required
                />

                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                >
                  {showConfirmPassword ? (
                    <svg viewBox="0 0 24 24">
                      <path d="M3 3L21 21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                      <path d="M10.6 10.6A2 2 0 0 0 12 14a2 2 0 0 0 1.4-.6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                      <path d="M9.9 5.1A11.2 11.2 0 0 1 12 4.9c5.1 0 8.3 3.1 9.5 6.1a11.5 11.5 0 0 1-2.5 3.7M6.6 6.6A13.7 13.7 0 0 0 2.5 11c1.2 3 4.4 6.1 9.5 6.1a11 11 0 0 0 4.1-.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24">
                      <path d="M2.5 12S5.7 5.9 12 5.9 21.5 12 21.5 12 18.3 18.1 12 18.1 2.5 12 2.5 12Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
                    </svg>
                  )}
                </button>
              </div>
            </label>

            {error ? <p className="error-message">{error}</p> : null}

            <button className="login-submit" type="submit">
              Зарегистрироваться
            </button>
          </form>

          <p className="register-text">
            Уже есть аккаунт? <Link to="/login">Войти</Link>
          </p>
        </div>
      </section>
    </main>
  );
}