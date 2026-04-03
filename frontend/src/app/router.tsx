import { createBrowserRouter, Navigate, Outlet, Link, useLocation } from 'react-router-dom';
import { LoginPage } from '../pages/LoginPage';
import { RegisterPage } from '../pages/RegisterPage';
import { LibrariesPage } from '../pages/LibrariesPage';
import { LibraryDetailsPage } from '../pages/LibraryDetailsPage';
import { InvitePage } from '../pages/InvitePage';
import { JoinLibraryPage } from '../pages/JoinLibraryPage';
import { ReaderPage } from '../pages/ReaderPage';
import { getCurrentSession, logout } from '../lib/mockApi';

function AppShell() {
  const session = getCurrentSession();
  const location = useLocation();

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Cloud reading workspace</p>
          <h1>Home Library</h1>
        </div>
        <div className="topbar-actions">
          {session ? (
            <>
              <span className="user-badge">{session.userName}</span>
              <button className="secondary-button" onClick={() => {
                logout();
                window.location.href = '/login';
              }}>
                Выйти
              </button>
            </>
          ) : (
            <Link className="secondary-button" to="/login">
              Войти
            </Link>
          )}
        </div>
      </header>
      <div className="workspace-layout">
        {session && (
          <nav className="sidebar">
            <Link className={location.pathname.startsWith('/libraries') ? 'nav-link active' : 'nav-link'} to="/libraries">
              Библиотеки
            </Link>
            <Link className={location.pathname.startsWith('/join') ? 'nav-link active' : 'nav-link'} to="/join">
              Поиск по ID
            </Link>
          </nav>
        )}
        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function RequireAuth() {
  const session = getCurrentSession();

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      {
        index: true,
        element: <Navigate to="/libraries" replace />,
      },
      {
        path: 'login',
        element: <LoginPage />,
      },
      {
        path: 'register',
        element: <RegisterPage />,
      },
      {
        element: <RequireAuth />,
        children: [
          {
            path: 'libraries',
            element: <LibrariesPage />,
          },
          {
            path: 'join',
            element: <JoinLibraryPage />,
          },
          {
            path: 'libraries/:libraryId',
            element: <LibraryDetailsPage />,
          },
          {
            path: 'reader/:libraryId/:bookId',
            element: <ReaderPage />,
          },
        ],
      },
      {
        path: 'invite/:token',
        element: <InvitePage />,
      },
    ],
  },
]);
