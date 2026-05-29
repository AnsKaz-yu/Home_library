import { Book, Bookmark, Invite, Library, Quote, Session } from '../types/domain';

export interface SearchResult {
  book: Book;
  library: Library | null;
}

const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ??
  'http://localhost:8000';
const SESSION_STORAGE_KEY = 'home-library-session';

let cachedSession = readSessionCache();

function readSessionCache(): Session | null {
  const saved = window.localStorage.getItem(SESSION_STORAGE_KEY);
  return saved ? (JSON.parse(saved) as Session) : null;
}

function writeSessionCache(session: Session | null) {
  cachedSession = session;

  if (session) {
    window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  } else {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
  }
}

function extractErrorMessage(payload: unknown, fallback: string) {
  if (
    payload &&
    typeof payload === 'object' &&
    'detail' in payload &&
    typeof payload.detail === 'string'
  ) {
    return payload.detail;
  }

  if (
    payload &&
    typeof payload === 'object' &&
    'message' in payload &&
    typeof payload.message === 'string'
  ) {
    return payload.message;
  }

  return fallback;
}

async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
  fallbackMessage = 'Ошибка запроса.',
  returnNullOn: number[] = []
): Promise<T> {
  const headers = new Headers(init.headers);

  if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
    credentials: 'include',
  });

  if (returnNullOn.includes(response.status)) {
    return null as T;
  }

  // Session expired on server — clear local cache and redirect to login
  if (response.status === 401 && path !== '/api/auth/session' && path !== '/api/auth/login') {
    writeSessionCache(null);
    window.location.href = '/login';
    throw new Error('Сессия истекла. Пожалуйста, войдите снова.');
  }

  const isJson = response.headers.get('content-type')?.includes('application/json');
  const payload = isJson ? await response.json() : null;

  if (!response.ok) {
    throw new Error(extractErrorMessage(payload, fallbackMessage));
  }

  return payload as T;
}

export function getApiBaseUrl() {
  return API_BASE_URL;
}

export function getCurrentSession() {
  return cachedSession;
}

export async function hydrateSession() {
  const session = await apiFetch<Session | null>(
    '/api/auth/session',
    { method: 'GET' },
    'Не удалось получить сессию.',
    [401]
  );

  writeSessionCache(session);
  return session;
}

export async function register(name: string, email: string, password: string) {
  const session = await apiFetch<Session>(
    '/api/auth/register',
    {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    },
    'Не удалось создать аккаунт.'
  );

  writeSessionCache(session);
  return session;
}

export async function login(email: string, password: string) {
  const session = await apiFetch<Session>(
    '/api/auth/login',
    {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    },
    'Не удалось выполнить вход.'
  );

  writeSessionCache(session);
  return session;
}

export async function logout() {
  try {
    await apiFetch<{ message: string }>(
      '/api/auth/logout',
      { method: 'POST' },
      'Не удалось выйти из аккаунта.'
    );
  } finally {
    writeSessionCache(null);
  }
}

export async function listLibraries() {
  return apiFetch<Library[]>('/api/libraries', { method: 'GET' }, 'Не удалось загрузить библиотеки.');
}

export async function listAccessibleLibraries() {
  return listLibraries();
}

export async function createLibrary(name: string, description: string) {
  return apiFetch<Library>(
    '/api/libraries',
    {
      method: 'POST',
      body: JSON.stringify({ name, description }),
    },
    'Не удалось создать библиотеку.'
  );
}

export async function updateLibrary(libraryId: string, name: string, description: string) {
  return apiFetch<Library>(
    `/api/libraries/${libraryId}`,
    {
      method: 'PUT',
      body: JSON.stringify({ name, description }),
    },
    'Не удалось обновить библиотеку.'
  );
}

export async function deleteLibrary(libraryId: string) {
  return apiFetch<{ message: string }>(
    `/api/libraries/${libraryId}`,
    { method: 'DELETE' },
    'Не удалось удалить библиотеку.'
  );
}

export async function getLibrary(libraryId: string) {
  return apiFetch<Library | null>(
    `/api/libraries/${libraryId}`,
    { method: 'GET' },
    'Не удалось загрузить библиотеку.',
    [404]
  );
}

export async function listBooks(libraryId: string) {
  return apiFetch<Book[]>(
    `/api/libraries/${libraryId}/books`,
    { method: 'GET' },
    'Не удалось загрузить книги.'
  );
}

export async function addBook(
  libraryId: string,
  title: string,
  author: string,
  file?: File | null
) {
  const formData = new FormData();
  formData.append('title', title);
  formData.append('author', author);

  if (file) {
    formData.append('bookFile', file);
  }

  return apiFetch<Book>(
    `/api/libraries/${libraryId}/books`,
    {
      method: 'POST',
      body: formData,
    },
    'Не удалось сохранить книгу.'
  );
}

export async function updateBook(
  bookId: string,
  title: string,
  author: string,
  file?: File | null
) {
  const formData = new FormData();
  formData.append('title', title);
  formData.append('author', author);

  if (file) {
    formData.append('bookFile', file);
  }

  return apiFetch<Book>(
    `/api/books/${bookId}`,
    {
      method: 'PUT',
      body: formData,
    },
    'Не удалось обновить книгу.'
  );
}

export async function deleteBook(bookId: string) {
  return apiFetch<{ message: string }>(
    `/api/books/${bookId}`,
    { method: 'DELETE' },
    'Не удалось удалить книгу.'
  );
}

export async function getBook(bookId: string) {
  return apiFetch<Book | null>(
    `/api/books/${bookId}`,
    { method: 'GET' },
    'Не удалось загрузить книгу.',
    [404]
  );
}

export async function updateReadingProgress(bookId: string, progress: number) {
  return apiFetch<Book>(
    `/api/books/${bookId}/progress`,
    {
      method: 'PUT',
      body: JSON.stringify({ progress }),
    },
    'Не удалось сохранить прогресс.'
  );
}

export async function searchBooks(query: string): Promise<SearchResult[]> {
  const normalized = query.trim();

  if (!normalized) {
    return [];
  }

  return apiFetch<SearchResult[]>(
    `/api/books/search?q=${encodeURIComponent(normalized)}`,
    { method: 'GET' },
    'Не удалось выполнить поиск.'
  );
}

export async function listBookmarks(bookId: string) {
  return apiFetch<Bookmark[]>(
    `/api/books/${bookId}/bookmarks`,
    { method: 'GET' },
    'Не удалось загрузить закладки.'
  );
}

export async function createBookmark(bookId: string, label: string, location: string) {
  return apiFetch<Bookmark>(
    `/api/books/${bookId}/bookmarks`,
    {
      method: 'POST',
      body: JSON.stringify({ label, location }),
    },
    'Не удалось создать закладку.'
  );
}

export async function deleteBookmark(bookId: string, bookmarkId: string) {
  return apiFetch<{ message: string }>(
    `/api/books/${bookId}/bookmarks/${bookmarkId}`,
    { method: 'DELETE' },
    'Не удалось удалить закладку.'
  );
}

export async function listQuotes(bookId: string) {
  return apiFetch<Quote[]>(
    `/api/books/${bookId}/quotes`,
    { method: 'GET' },
    'Не удалось загрузить цитаты.'
  );
}

export async function createQuote(bookId: string, text: string, note?: string, location?: string) {
  return apiFetch<Quote>(
    `/api/books/${bookId}/quotes`,
    {
      method: 'POST',
      body: JSON.stringify({ text, note, location }),
    },
    'Не удалось сохранить цитату.'
  );
}

export async function deleteQuote(bookId: string, quoteId: string) {
  return apiFetch<{ message: string }>(
    `/api/books/${bookId}/quotes/${quoteId}`,
    { method: 'DELETE' },
    'Не удалось удалить цитату.'
  );
}

export async function createInvite(libraryId: string) {
  return apiFetch<Invite>(
    `/api/libraries/${libraryId}/invites`,
    { method: 'POST' },
    'Не удалось создать приглашение.'
  );
}

export async function getInvite(token: string) {
  return apiFetch<Invite | null>(
    `/api/invites/${token}`,
    { method: 'GET' },
    'Не удалось загрузить приглашение.',
    [404]
  );
}

export async function findLibraryByCode(code: string) {
  const normalized = code.trim();

  if (!normalized) {
    return null;
  }

  return apiFetch<Library | null>(
    `/api/libraries/lookup?code=${encodeURIComponent(normalized)}`,
    { method: 'GET' },
    'Не удалось найти библиотеку.',
    [404]
  );
}

export async function joinLibraryByCode(code: string) {
  return apiFetch<Library>(
    '/api/libraries/join',
    {
      method: 'POST',
      body: JSON.stringify({ code }),
    },
    'Не удалось присоединиться к библиотеке.'
  );
}

export async function acceptInvite(token: string) {
  return apiFetch<Library>(
    `/api/invites/${token}/accept`,
    {
      method: 'POST',
    },
    'Не удалось принять приглашение.'
  );
}

export async function updateProfile(name: string, email: string) {
  const session = await apiFetch<Session>(
    '/api/auth/profile',
    {
      method: 'PUT',
      body: JSON.stringify({ name, email }),
    },
    'Не удалось обновить профиль.'
  );

  writeSessionCache(session);
  return session;
}