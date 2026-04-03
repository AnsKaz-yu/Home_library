from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware


app = FastAPI(title="Home Library API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def healthcheck() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/libraries")
def list_libraries() -> list[dict[str, str]]:
    return [
        {
            "id": "library-1",
            "name": "Фантастика",
            "description": "Backend stub response",
            "role": "owner",
        }
    ]


@app.post("/api/auth/login")
def login() -> dict[str, dict[str, str]]:
    return {
        "token": "stub-token",
        "user": {
            "id": "user-1",
            "name": "Anna Reader",
            "email": "anna@example.com",
        },
    }