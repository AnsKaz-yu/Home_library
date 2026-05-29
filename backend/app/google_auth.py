from __future__ import annotations

import os
import secrets

from authlib.integrations.starlette_client import OAuth
from dotenv import load_dotenv
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from starlette.responses import RedirectResponse

from .database import get_db
from .repository import DatabaseRepository
from .security import hash_password

load_dotenv()

router = APIRouter()
oauth = OAuth()

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000")
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")

if GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET:
    oauth.register(
        name="google",
        client_id=GOOGLE_CLIENT_ID,
        client_secret=GOOGLE_CLIENT_SECRET,
        server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
        client_kwargs={"scope": "openid email profile"},
    )


def _ensure_google_oauth_configured() -> None:
    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Google OAuth не настроен на сервере.",
        )


@router.get("/auth/google/login")
async def google_login(request: Request):
    _ensure_google_oauth_configured()
    redirect_uri = f"{BACKEND_URL}/auth/google/callback"
    return await oauth.google.authorize_redirect(request, redirect_uri)


@router.get("/auth/google/callback")
async def google_callback(request: Request, db: Session = Depends(get_db)):
    _ensure_google_oauth_configured()

    token = await oauth.google.authorize_access_token(request)
    user = token.get("userinfo") or {}
    email = user.get("email", "").strip().lower()
    name = user.get("name", "").strip() or email.split("@")[0]

    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google не вернул email пользователя.",
        )

    repository = DatabaseRepository(db)
    existing_user = repository.get_user_by_email(email)

    if existing_user:
        account = repository.update_user(existing_user.id, name or existing_user.name, email)
    else:
        account = repository.create_user(
            name=name,
            email=email,
            password_hash=hash_password(secrets.token_urlsafe(24)),
        )

    request.session["user_id"] = account.id
    return RedirectResponse(url=f"{FRONTEND_URL}/google-connect?status=success")