import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';

export function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="login-card__inner">
          <h1 className="login-title">Восстановление пароля</h1>

          <p className="login-subtitle">
            Введите адрес электронной почты, и мы отправим инструкции для сброса пароля
          </p>

          {submitted ? (
            <div className="success-message">
              Инструкции по восстановлению пароля отправлены на вашу электронную почту.
            </div>
          ) : (
            <form className="login-form" onSubmit={handleSubmit}>
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

              <button className="login-submit" type="submit">
                Отправить
              </button>
            </form>
          )}

          <p className="register-text">
            <Link to="/login">Вернуться ко входу</Link>
          </p>
        </div>
      </section>
    </main>
  );
}