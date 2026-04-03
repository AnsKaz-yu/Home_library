export type Role = 'owner' | 'reader';

export interface Session {
  userId: string;
  userName: string;
  email: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
}

export interface Library {
  id: string;
  name: string;
  description: string;
  role: Role;
  joinCode?: string;
  sourceLibraryId?: string;
}

export interface Book {
  id: string;
  libraryId: string;
  title: string;
  author: string;
  progress: number;
}

export interface Bookmark {
  id: string;
  bookId: string;
  label: string;
  location: string;
}

export interface Quote {
  id: string;
  bookId: string;
  text: string;
  note?: string;
}

export interface Invite {
  token: string;
  libraryId: string;
  libraryName: string;
}
