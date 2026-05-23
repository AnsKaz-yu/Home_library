import { FormEvent, useState } from 'react';
import {
  createBrowserRouter,
  Navigate,
  Outlet,
  Link,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import { LoginPage } from '../pages/LoginPage';
import { RegisterPage } from '../pages/RegisterPage';
import { ForgotPasswordPage } from '../pages/ForgotPasswordPage';
import { LibrariesPage } from '../pages/LibrariesPage';
import { LibraryDetailsPage } from '../pages/LibraryDetailsPage';
import { InvitePage } from '../pages/InvitePage';
import { JoinLibraryPage } from '../pages/JoinLibraryPage';
import { ReaderPage } from '../pages/ReaderPage';
import { ReaderViewPage } from '../pages/ReaderViewPage';
import { ProfilePage } from '../pages/ProfilePage';
import { getCurrentSession, logout } from '../lib/mockApi';
import { EditProfilePage } from '../pages/EditProfilePage';
import { AddBookPage } from '../pages/AddBookPage';
import { GoogleConnectPage } from '../pages/GoogleConnectPage';
import { SearchPage } from '../pages/SearchPage';

function AppShell() {
  const session = getCurrentSession();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  const isAuthPage =
    location.pathname === '/login' ||
    location.pathname === '/register' ||
    location.pathname === '/forgot-password' ||
    location.pathname === '/google-connect';

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = searchQuery.trim();

    if (!normalized) {
      return;
    }

    navigate(`/search?q=${encodeURIComponent(normalized)}`);
  }

  return (
    <div className="app-shell">
      {!isAuthPage && (
        <header className="topbar topbar-enhanced">
          <div className="topbar-brand">
            <Link
              to="/libraries"
              className="text-link"
              style={{ textDecoration: 'none' }}
            >
              <h1 className="topbar-title">Home Library</h1>
            </Link>

            <p className="topbar-subtitle">Your personal reading system</p>
          </div>

          {session && (
            <form className="topbar-search-form" onSubmit={handleSearchSubmit}>
              <div className="topbar-search-wrap">
                <input
                  type="text"
                  placeholder="Search books, authors, files..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="topbar-search-input"
                />
                <button type="submit" className="topbar-search-button">
                  Search
                </button>
              </div>
            </form>
          )}

          <div className="topbar-actions">
            {session ? (
              <>
                <Link to="/profile" className="user-badge">
                  {session.userName}
                </Link>

                <button
                  className="secondary-button"
                  onClick={() => {
                    logout();
                    window.location.href = '/login';
                  }}
                >
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
      )}

      {isAuthPage ? (
        <Outlet />
      ) : (
        <div className="workspace-layout">
          {session && (
            <nav className="sidebar">
              <Link
                className={
                  location.pathname.startsWith('/libraries')
                    ? 'nav-link active'
                    : 'nav-link'
                }
                to="/libraries"
              >
                Библиотеки
              </Link>

              <Link
                className={
                  location.pathname.startsWith('/join')
                    ? 'nav-link active'
                    : 'nav-link'
                }
                to="/join"
              >
                Поиск по ID
              </Link>

              <Link
                className={
                  location.pathname.startsWith('/profile')
                    ? 'nav-link active'
                    : 'nav-link'
                }
                to="/profile"
              >
                Профиль
              </Link>
            </nav>
          )}

          <main className="page-content">
            <Outlet />
          </main>
        </div>
      )}
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
        path: 'forgot-password',
        element: <ForgotPasswordPage />,
      },
      {
        path: 'google-connect',
        element: <GoogleConnectPage />,
      },
      {
        element: <RequireAuth />,
        children: [
          {
            path: 'libraries',
            element: <LibrariesPage />,
          },
          {
            path: 'search',
            element: <SearchPage />,
          },
          {
            path: 'join',
            element: <JoinLibraryPage />,
          },
          {
            path: 'profile',
            element: <ProfilePage />,
          },
          {
            path: 'libraries/:libraryId',
            element: <LibraryDetailsPage />,
          },
          {
            path: 'libraries/:libraryId/add-book',
            element: <AddBookPage />,
          },
          {
            path: 'reader/:libraryId/:bookId',
            element: <ReaderPage />,
          },
          {
            path: 'reader/:libraryId/:bookId/view',
            element: <ReaderViewPage />,
          },
          {
            path: 'profile/edit',
            element: <EditProfilePage />,
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