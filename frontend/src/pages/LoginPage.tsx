import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { login } from '../lib/mockApi';

export function LoginPage() {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    try {
      login(
        String(form.get('email') ?? ''),
        String(form.get('password') ?? '')
      );
      setError('');
      navigate('/libraries');
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Не удалось выполнить вход.'
      );
    }
  }

  function handleGoogleLogin() {
    window.location.href = 'http://localhost:8000/auth/google/login';
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="login-card__inner">
          <h1
            style={{
              fontSize: '24px',
              fontWeight: 600,
              lineHeight: '1.3',
              marginBottom: '12px',
              textAlign: 'center',
            }}
          >
            С возвращением
          </h1>

          <p className="login-subtitle">
            Войдите в аккаунт, чтобы управлять своей домашней библиотекой
          </p>

          <button
            type="button"
            className="social-login-button"
            onClick={handleGoogleLogin}
          >
            <svg
              className="social-login-icon"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                fill="#EA4335"
                d="M12 10.2v3.9h5.4c-.2 1.3-1.5 3.9-5.4 3.9-3.2 0-5.9-2.7-5.9-6s2.7-6 5.9-6c1.8 0 3.1.8 3.8 1.4l2.6-2.5C16.7 3.3 14.5 2.4 12 2.4 6.9 2.4 2.8 6.5 2.8 11.6S6.9 20.8 12 20.8c6.1 0 8.9-4.3 8.9-8.6 0-.6-.1-1.1-.2-1.6H12Z"
              />
              <path
                fill="#34A853"
                d="M3.8 7.7l3.2 2.3c.9-2 2.8-3.4 5-3.4 1.8 0 3.1.8 3.8 1.4l2.6-2.5C16.7 3.3 14.5 2.4 12 2.4c-3.5 0-6.5 2-8.2 5.3Z"
              />
              <path
                fill="#4A90E2"
                d="M12 20.8c2.4 0 4.5-.8 6.1-2.3l-2.8-2.2c-.8.6-1.8 1-3.3 1-3.8 0-5.2-2.5-5.4-3.8l-3.1 2.4c1.6 3.1 4.8 4.9 8.5 4.9Z"
              />
              <path
                fill="#FBBC05"
                d="M6.6 13.5c-.2-.5-.3-1.1-.3-1.7s.1-1.2.3-1.7L3.5 7.7c-.6 1.2-.9 2.5-.9 4.1s.3 2.9.9 4.1l3.1-2.4Z"
              />
            </svg>
            <span>Продолжить через Google</span>
          </button>

          <div className="divider">или</div>

          <form className="login-form" onSubmit={handleSubmit}>
            <label className="form-group">
              <span className="form-label">Электронная почта</span>
              <input
                className="form-input"
                name="email"
                type="email"
                placeholder="Введите адрес электронной почты"
                defaultValue="anna@example.com"
                required
              />
            </label>

            <label className="form-group">
              <span className="form-label">Пароль</span>
              <div className="password-wrapper">
                <input
                  className="form-input password-input"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Введите пароль"
                  defaultValue="password123"
                  required
                />

                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
                >
                  {showPassword ? (
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        d="M3 3L21 21"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                      />
                      <path
                        d="M10.6 10.6A2 2 0 0 0 12 14a2 2 0 0 0 1.4-.6"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                      />
                      <path
                        d="M9.9 5.1A11.2 11.2 0 0 1 12 4.9c5.1 0 8.3 3.1 9.5 6.1a11.5 11.5 0 0 1-2.5 3.7M6.6 6.6A13.7 13.7 0 0 0 2.5 11c1.2 3 4.4 6.1 9.5 6.1a11 11 0 0 0 4.1-.8"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        d="M2.5 12S5.7 5.9 12 5.9 21.5 12 21.5 12 18.3 18.1 12 18.1 2.5 12 2.5 12Z"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <circle
                        cx="12"
                        cy="12"
                        r="3"
                        stroke="currentColor"
                        strokeWidth="1.8"
                      />
                    </svg>
                  )}
                </button>
              </div>
            </label>

            <div className="login-options">
              <label className="remember-me">
                <input type="checkbox" name="remember" />
                <span>Запомнить меня</span>
              </label>

              <Link to="/forgot-password" className="forgot-link">
                Забыли пароль?
              </Link>
            </div>

            {error ? <p className="error-message">{error}</p> : null}

            <button className="login-submit" type="submit">
              Войти
            </button>
          </form>

          <p className="register-text">
            У меня нет аккаунта <Link to="/register">Создать</Link>
          </p>
        </div>
      </section>
    </main>
  );
}