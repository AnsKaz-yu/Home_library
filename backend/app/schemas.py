from __future__ import annotations

from pydantic import BaseModel, EmailStr, Field


class SessionResponse(BaseModel):
    userId: str
    userName: str
    email: EmailStr


class RegisterRequest(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class UpdateProfileRequest(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: EmailStr


class LibraryCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    description: str = Field(min_length=1)


class LibraryJoinRequest(BaseModel):
    code: str = Field(min_length=1, max_length=64)


class ProgressUpdateRequest(BaseModel):
    progress: int = Field(ge=0, le=100)


class BookmarkCreateRequest(BaseModel):
    label: str = Field(min_length=1, max_length=200)
    location: str = Field(min_length=1, max_length=200)


class QuoteCreateRequest(BaseModel):
    text: str = Field(min_length=1)
    note: str | None = None
    location: str | None = None


class UserResponse(BaseModel):
    id: str
    name: str
    email: EmailStr


class LibraryResponse(BaseModel):
    id: str
    name: str
    description: str
    role: str
    ownerId: str | None = None
    joinCode: str | None = None


class BookResponse(BaseModel):
    id: str
    libraryId: str
    title: str
    author: str
    progress: int
    fileName: str | None = None
    fileUrl: str | None = None


class BookmarkResponse(BaseModel):
    id: str
    bookId: str
    label: str
    location: str


class QuoteResponse(BaseModel):
    id: str
    bookId: str
    text: str
    note: str | None = None
    location: str | None = None


class InviteResponse(BaseModel):
    token: str
    libraryId: str
    libraryName: str


class SearchResultResponse(BaseModel):
    book: BookResponse
    library: LibraryResponse | None = None


class MessageResponse(BaseModel):
    message: str