import { Book, Bookmark, Invite, Library, Quote, Session, User } from '../types/domain';

interface Store {
  users: User[];
  libraries: Library[];
  books: Book[];
  bookmarks: Bookmark[];
  quotes: Quote[];
  invites: Invite[];
  session: Session | null;
}

export interface SearchResult {
  book: Book;
  library: Library | null;
}

const STORAGE_KEY = 'home-library-store';

const seedStore: Store = {
  users: [
    {
      id: 'user-1',
      name: 'Anna Reader',
      email: 'anna@example.com',
      password: 'password123',
    },
  ],
  libraries: [
    {
      id: 'library-1',
      name: 'Фантастика',
      description: 'Подборка для вечернего чтения и заметок.',
      role: 'owner',
      ownerId: 'user-1',
      joinCode: 'FANTASY-001',
    },
    {
      id: 'library-2',
      name: 'Нон-фикшн',
      description: 'Книги по продукту, дизайну и управлению знаниями.',
      role: 'owner',
      ownerId: 'user-1',
      joinCode: 'KNOWLEDGE-204',
    },
  ],
  books: [
    {
      id: 'book-1',
      libraryId: 'library-1',
      title: 'Dune',
      author: 'Frank Herbert',
      progress: 42,
    },
    {
      id: 'book-2',
      libraryId: 'library-1',
      title: 'Foundation',
      author: 'Isaac Asimov',
      progress: 18,
    },
    {
      id: 'book-3',
      libraryId: 'library-2',
      title: 'Hooked',
      author: 'Nir Eyal',
      progress: 67,
    },
  ],
  bookmarks: [
    {
      id: 'bookmark-1',
      bookId: 'book-1',
      label: 'Глава 5',
      location: 'Page 124',
    },
  ],
  quotes: [
    {
      id: 'quote-1',
      bookId: 'book-1',
      text: 'Fear is the mind-killer.',
      note: 'Ключевая цитата для карточки книги.',
    },
  ],
  invites: [
    {
      token: 'invite-demo',
      libraryId: 'library-1',
      libraryName: 'Фантастика',
    },
  ],
  session: {
    userId: 'user-1',
    userName: 'Anna Reader',
    email: 'anna@example.com',
  },
};

function readStore(): Store {
  const saved = window.localStorage.getItem(STORAGE_KEY);

  if (!saved) {
    writeStore(seedStore);
    return seedStore;
  }

  return JSON.parse(saved) as Store;
}

function writeStore(store: Store) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

function createId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function createJoinCode(name: string) {
  const slug = name
    .trim()
    .toUpperCase()
    .replace(/[^A-ZА-Я0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 10);

  return `${slug || 'LIBRARY'}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

function getLibraryRecord(store: Store, libraryId: string) {
  return store.libraries.find((library) => library.id === libraryId) ?? null;
}

function getSourceLibraryId(store: Store, libraryId: string) {
  const library = getLibraryRecord(store, libraryId);
  return library?.sourceLibraryId ?? library?.id ?? libraryId;
}

function ensureReaderLibrary(
  store: Store,
  libraryId: string,
  libraryName: string,
  joinCode?: string
) {
  if (!store.session) {
    throw new Error('Сессия не найдена.');
  }

  const existing = store.libraries.find(
    (library) =>
      library.sourceLibraryId === libraryId &&
      library.role === 'reader' &&
      library.ownerId === store.session?.userId
  );

  if (existing) {
    return existing;
  }

  const readerLibrary: Library = {
    id: `${libraryId}-reader-${store.session.userId}`,
    name: `${libraryName} (читатель)`,
    description: 'Библиотека, подключённая по shared access.',
    role: 'reader',
    ownerId: store.session.userId,
    sourceLibraryId: libraryId,
    joinCode,
  };

  store.libraries.push(readerLibrary);
  return readerLibrary;
}

export function getCurrentSession() {
  return readStore().session;
}

export function register(name: string, email: string, password: string) {
  const store = readStore();
  const exists = store.users.some(
    (user) => user.email.toLowerCase() === email.toLowerCase()
  );

  if (exists) {
    throw new Error('Пользователь с таким email уже существует.');
  }

  const user: User = {
    id: createId('user'),
    name,
    email,
    password,
  };

  store.users.push(user);
  store.session = {
    userId: user.id,
    userName: user.name,
    email: user.email,
  };

  writeStore(store);
  return store.session;
}

export function login(email: string, password: string) {
  const store = readStore();
  const user = store.users.find(
    (item) => item.email === email && item.password === password
  );

  if (!user) {
    throw new Error('Неверный email или пароль.');
  }

  store.session = {
    userId: user.id,
    userName: user.name,
    email: user.email,
  };

  writeStore(store);
  return store.session;
}

export function logout() {
  const store = readStore();
  store.session = null;
  writeStore(store);
}

export function listLibraries() {
  const store = readStore();

  if (!store.session) {
    return [];
  }

  return store.libraries.filter(
    (library) => library.ownerId === store.session?.userId
  );
}

export function listAccessibleLibraries() {
  const store = readStore();

  if (!store.session) {
    return [];
  }

  return store.libraries.filter(
    (library) => library.ownerId === store.session?.userId
  );
}

export function createLibrary(name: string, description: string) {
  const store = readStore();

  if (!store.session) {
    throw new Error('Сессия не найдена.');
  }

  const library: Library = {
    id: createId('library'),
    name,
    description,
    role: 'owner',
    ownerId: store.session.userId,
    joinCode: createJoinCode(name),
  };

  store.libraries.push(library);
  writeStore(store);
  return library;
}

export function getLibrary(libraryId: string) {
  const store = readStore();

  if (!store.session) {
    return null;
  }

  return (
    store.libraries.find(
      (library) =>
        library.id === libraryId &&
        library.ownerId === store.session?.userId
    ) ?? null
  );
}

export function listBooks(libraryId: string) {
  const store = readStore();
  const sourceLibraryId = getSourceLibraryId(store, libraryId);
  return store.books.filter((book) => book.libraryId === sourceLibraryId);
}

export function addBook(
  libraryId: string,
  title: string,
  author: string,
  fileName?: string,
  fileUrl?: string
) {
  const store = readStore();
  const sourceLibraryId = getSourceLibraryId(store, libraryId);

  const book: Book = {
    id: createId('book'),
    libraryId: sourceLibraryId,
    title,
    author,
    progress: 0,
    fileName,
    fileUrl,
  };

  store.books.push(book);
  writeStore(store);
  return book;
}

export function getBook(bookId: string) {
  return readStore().books.find((book) => book.id === bookId) ?? null;
}

export function searchBooks(query: string): SearchResult[] {
  const store = readStore();
  const normalized = query.trim().toLowerCase();

  if (!normalized) {
    return [];
  }

  return store.books
    .filter((book) => {
      const titleMatch = book.title.toLowerCase().includes(normalized);
      const authorMatch = book.author.toLowerCase().includes(normalized);
      const fileMatch = book.fileName?.toLowerCase().includes(normalized) ?? false;

      return titleMatch || authorMatch || fileMatch;
    })
    .map((book) => {
      const library =
        store.libraries.find(
          (lib) => (lib.sourceLibraryId ?? lib.id) === book.libraryId
        ) ?? null;

      return { book, library };
    });
}

export function listBookmarks(bookId: string) {
  return readStore().bookmarks.filter((bookmark) => bookmark.bookId === bookId);
}

export function createBookmark(bookId: string, label: string, location: string) {
  const store = readStore();

  const bookmark: Bookmark = {
    id: createId('bookmark'),
    bookId,
    label,
    location,
  };

  store.bookmarks.push(bookmark);
  writeStore(store);
  return bookmark;
}

export function listQuotes(bookId: string) {
  return readStore().quotes.filter((quote) => quote.bookId === bookId);
}

export function createQuote(bookId: string, text: string, note?: string) {
  const store = readStore();

  const quote: Quote = {
    id: createId('quote'),
    bookId,
    text,
    note,
  };

  store.quotes.push(quote);
  writeStore(store);
  return quote;
}

export function createInvite(libraryId: string) {
  const store = readStore();
  const library = store.libraries.find((item) => item.id === libraryId);

  if (!library) {
    throw new Error('Библиотека не найдена.');
  }

  const invite: Invite = {
    token: createId('invite'),
    libraryId,
    libraryName: library.name,
  };

  store.invites.push(invite);
  writeStore(store);
  return invite;
}

export function getInvite(token: string) {
  return readStore().invites.find((invite) => invite.token === token) ?? null;
}

export function findLibraryByCode(code: string) {
  const normalized = code.trim().toUpperCase();
  if (!normalized) {
    return null;
  }

  return (
    readStore().libraries.find(
      (library) =>
        library.role === 'owner' &&
        (((library.joinCode ?? '').toUpperCase() === normalized) ||
          library.id.toUpperCase() === normalized)
    ) ?? null
  );
}

export function joinLibraryByCode(code: string) {
  const store = readStore();
  const normalized = code.trim().toUpperCase();

  const library = store.libraries.find(
    (item) =>
      item.role === 'owner' &&
      (((item.joinCode ?? '').toUpperCase() === normalized) ||
        item.id.toUpperCase() === normalized)
  );

  if (!library) {
    throw new Error('Библиотека с таким ID не найдена.');
  }

  const readerLibrary = ensureReaderLibrary(
    store,
    library.id,
    library.name,
    library.joinCode
  );

  writeStore(store);
  return readerLibrary;
}

export function acceptInvite(token: string) {
  const store = readStore();
  const invite = store.invites.find((item) => item.token === token);

  if (!invite) {
    throw new Error('Ссылка-приглашение недействительна.');
  }

  const ownerLibrary = store.libraries.find(
    (library) => library.id === invite.libraryId
  );

  ensureReaderLibrary(
    store,
    invite.libraryId,
    invite.libraryName,
    ownerLibrary?.joinCode
  );

  writeStore(store);
}

export function updateProfile(name: string, email: string) {
  const store = readStore();

  if (!store.session) {
    throw new Error('Сессия не найдена.');
  }

  const currentUser = store.users.find(
    (user) => user.id === store.session?.userId
  );

  if (!currentUser) {
    throw new Error('Пользователь не найден.');
  }

  const emailExists = store.users.some(
    (user) =>
      user.id !== currentUser.id &&
      user.email.toLowerCase() === email.toLowerCase()
  );

  if (emailExists) {
    throw new Error('Пользователь с таким email уже существует.');
  }

  currentUser.name = name;
  currentUser.email = email;

  store.session = {
    ...store.session,
    userName: name,
    email,
  };

  writeStore(store);
  return store.session;
}