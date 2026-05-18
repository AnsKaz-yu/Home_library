import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

type Store = {
  users: Array<{
    id: string;
    name: string;
    email: string;
    password?: string;
  }>;
  libraries: Array<unknown>;
  books: Array<unknown>;
  bookmarks: Array<unknown>;
  quotes: Array<unknown>;
  invites: Array<unknown>;
  session: {
    userId: string;
    userName: string;
    email: string;
  } | null;
};

const STORAGE_KEY = 'home-library-store';

export function GoogleConnectPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const email = searchParams.get('email');
    const name = searchParams.get('name');

    if (!email || !name) {
      window.location.href = 'http://localhost:8000/auth/google/login';
      return;
    }

    const saved = window.localStorage.getItem(STORAGE_KEY);

    if (!saved) {
      navigate('/login');
      return;
    }

    const store: Store = JSON.parse(saved);

    let existingUser = store.users.find(
      (user) => user.email.toLowerCase() === email.toLowerCase()
    );

    if (!existingUser) {
      existingUser = {
        id: `google-${Math.random().toString(36).slice(2, 10)}`,
        name,
        email,
        password: '',
      };

      store.users.push(existingUser);
    } else {
      existingUser.name = name;
    }

    store.session = {
      userId: existingUser.id,
      userName: existingUser.name,
      email: existingUser.email,
    };

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    navigate('/libraries', { replace: true });
  }, [navigate, searchParams]);

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="login-card__inner">
          <h1 className="login-title">Подключение Google</h1>
          <p className="login-subtitle">Подождите, идет вход через Google...</p>
        </div>
      </section>
    </main>
  );
}