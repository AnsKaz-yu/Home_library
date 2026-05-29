import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getApiBaseUrl, hydrateSession } from '../lib/mockApi';

export function GoogleConnectPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState('');

  useEffect(() => {
    async function connectGoogle() {
      const status = searchParams.get('status');

      if (status !== 'success') {
        window.location.href = `${getApiBaseUrl()}/auth/google/login`;
        return;
      }

      try {
        const session = await hydrateSession();

        if (!session) {
          throw new Error('Не удалось восстановить сессию после входа через Google.');
        }

        navigate('/libraries', { replace: true });
      } catch (connectError) {
        setError(
          connectError instanceof Error
            ? connectError.message
            : 'Не удалось выполнить вход через Google.'
        );
        navigate('/login', { replace: true });
      }
    }

    void connectGoogle();
  }, [navigate, searchParams]);

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="login-card__inner">
          <h1 className="login-title">Подключение Google</h1>
          <p className="login-subtitle">Подождите, идет вход через Google...</p>
          {error ? <p className="error-message">{error}</p> : null}
        </div>
      </section>
    </main>
  );
}