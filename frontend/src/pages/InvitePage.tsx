import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { acceptInvite, getInvite } from '../lib/mockApi';
import { Invite } from '../types/domain';

export function InvitePage() {
  const { token = '' } = useParams();
  const navigate = useNavigate();
  const [invite, setInvite] = useState<Invite | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadInvite() {
      try {
        setIsLoading(true);
        setInvite(await getInvite(token));
        setError('');
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : 'Не удалось загрузить приглашение.'
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadInvite();
  }, [token]);

  async function handleAccept() {
    try {
      await acceptInvite(token);
      navigate('/libraries');
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Не удалось принять приглашение.'
      );
    }
  }

  if (isLoading) {
    return (
      <main className="invite-page">
        <section className="invite-card">
          <p className="invite-text">Загрузка приглашения...</p>
        </section>
      </main>
    );
  }

  if (!invite) {
    return (
      <main className="invite-page">
        <section className="invite-card">
          <p className="eyebrow">Совместный доступ</p>
          <h2 className="invite-title">Приглашение недоступно</h2>
          <p className="invite-text">
            Эта ссылка недействительна или срок приглашения истёк.
          </p>

          <div className="invite-actions">
            <Link className="secondary-button" to="/libraries">
              Вернуться к библиотекам
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="invite-page">
      <section className="invite-card">
        <div className="invite-badge">HOME LIBRARY</div>

        <p className="eyebrow">Совместный доступ</p>
        <h2 className="invite-title">
          Присоединиться к библиотеке «{invite.libraryName}»
        </h2>

        <p className="invite-text">
          После подтверждения у пользователя появится доступ в режиме читателя.
          Вы сможете просматривать книги, цитаты и заметки библиотеки.
        </p>

        <div className="invite-token-box">
          <span className="invite-token-label">Тестовый токен</span>
          <code>{token}</code>
        </div>

        {error ? <p className="error-text">{error}</p> : null}

        <div className="invite-actions">
          <button className="primary-button" onClick={handleAccept}>
            Принять приглашение
          </button>

          <Link className="text-link" to="/join">
            Или найти библиотеку по ID
          </Link>
        </div>
      </section>
    </main>
  );
}