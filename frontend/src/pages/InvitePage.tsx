import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { acceptInvite, getInvite } from '../lib/mockApi';

export function InvitePage() {
  const { token = '' } = useParams();
  const navigate = useNavigate();
  const invite = useMemo(() => getInvite(token), [token]);
  const [error, setError] = useState('');

  function handleAccept() {
    try {
      acceptInvite(token);
      navigate('/libraries');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Не удалось принять приглашение.');
    }
  }

  if (!invite) {
    return (
      <section className="content-card">
        <h2>Приглашение недоступно</h2>
        <Link className="text-link" to="/libraries">
          Вернуться к библиотекам
        </Link>
      </section>
    );
  }

  return (
    <section className="content-card stack">
      <p className="eyebrow">Совместный доступ</p>
      <h2>Присоединиться к библиотеке «{invite.libraryName}»</h2>
      <p>После подтверждения у пользователя появится доступ в режиме читателя.</p>
      <p className="muted-text">Тестовый токен: {token}</p>
      {error ? <p className="error-text">{error}</p> : null}
      <button className="primary-button" onClick={handleAccept}>
        Принять приглашение
      </button>
      <Link className="text-link" to="/join">
        Или найти библиотеку по ID
      </Link>
    </section>
  );
}
