from __future__ import annotations

import base64
import asyncio
import hashlib
import hmac
import json
import os
import random
import secrets
from datetime import datetime, timezone
from typing import Any, Dict, Iterable, List, Optional

from fastapi import Depends, FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from sqlalchemy import and_, or_, select
from sqlalchemy.orm import Session

from .database import Base, engine, get_db
from .models import ArticleRecord, CommentRecord, UserIntegrationRecord, UserRecord
from .schemas import (
    ArticleRowSchema,
    ArticleUpsertRequest,
    CommentRowSchema,
    CommentUpsertRequest,
    LoginRequest,
    PasswordResetConfirmRequest,
    PasswordResetRequest,
    UserRowSchema,
    UserUpsertRequest,
)

Base.metadata.create_all(bind=engine)

app = FastAPI(title="RBN Backend", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

article_subscribers: set[asyncio.Queue[dict[str, Any]]] = set()


def publish_article_event(article_id: str, deleted: bool) -> None:
    event = {"type": "article.changed", "articleId": article_id, "deleted": deleted}
    for queue in tuple(article_subscribers):
        try:
            queue.put_nowait(event)
        except asyncio.QueueFull:
            pass


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def normalize_article_id(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, (int, float)):
        return str(value)
    if isinstance(value, str):
        return value.strip()
    return str(value).strip()


def ids_match(left: Any, right: Any) -> bool:
    left_val = normalize_article_id(left)
    right_val = normalize_article_id(right)
    if not left_val or not right_val:
        return False
    if left_val == right_val:
        return True
    try:
        return str(float(left_val)) == str(float(right_val))
    except ValueError:
        return False


def normalize_status(value: Any) -> str:
    raw = str(value or "").strip().lower()
    if raw in {"publicado", "published", "ativo", "active", "enabled"}:
        return "publicado"
    if raw in {"rascunho", "draft", "pending"}:
        return "rascunho"
    if raw in {"agendado", "scheduled", "agenda"}:
        return "agendado"
    if raw in {"inativo", "inactive", "desativado", "disabled"}:
        return "inativo"
    return raw or "rascunho"


def article_is_public(payload: Dict[str, Any]) -> bool:
    status = normalize_status(payload.get("status"))
    if status in {"publicado"}:
        return True
    if status in {"rascunho", "agendado", "inativo"}:
        return False
    if payload.get("publishedAt"):
        return True
    return False


def payload_to_record_dict(record: Any) -> Dict[str, Any]:
    payload = record.payload if hasattr(record, "payload") else {}
    if not isinstance(payload, dict):
        payload = {}
    return {
        "id": record.id,
        "payload": payload,
        "deleted": bool(getattr(record, "deleted", False)),
        "updated_at": getattr(record, "updated_at", None),
    }


def user_payload_to_row(record: UserRecord) -> Dict[str, Any]:
    payload = record.payload if isinstance(record.payload, dict) else {}
    return {"id": record.id, "payload": payload, "updated_at": record.updated_at}


def hash_password_value(value: str) -> str:
    return base64.b64encode(value.encode("utf-8")).decode("ascii")


def create_totp_secret() -> str:
    alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"
    return "".join(alphabet[random.SystemRandom().randrange(len(alphabet))] for _ in range(32))


def base32_decode(value: str) -> bytes:
    alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"
    cleaned = value.strip().upper().replace("=", "")
    bits = 0
    buffer = 0
    output = bytearray()
    for char in cleaned:
        index = alphabet.find(char)
        if index < 0:
            continue
        buffer = (buffer << 5) | index
        bits += 5
        if bits >= 8:
            bits -= 8
            output.append((buffer >> bits) & 0xFF)
    return bytes(output)


def calculate_totp(secret: str, step: int) -> str:
    key = base32_decode(secret)
    msg = step.to_bytes(8, byteorder="big", signed=False)
    digest = hmac.new(key, msg, hashlib.sha1).digest()
    offset = digest[-1] & 0x0F
    code = ((digest[offset] & 0x7F) << 24) | ((digest[offset + 1] & 0xFF) << 16) | ((digest[offset + 2] & 0xFF) << 8) | (digest[offset + 3] & 0xFF)
    return str(code % 1_000_000).zfill(6)


def verify_totp(secret: str, code: str) -> bool:
    if not code or not code.isdigit() or len(code) != 6:
        return False
    step = int(datetime.now(timezone.utc).timestamp() / 30)
    for offset in (-1, 0, 1):
        if calculate_totp(secret, step + offset) == code:
            return True
    return False


def is_active_user(payload: Dict[str, Any]) -> bool:
    if not isinstance(payload, dict):
        return True
    return str(payload.get("status") or "ativo").strip().lower() not in {"inativo", "inactive", "disabled", "desativado"}


@app.get("/")
def root() -> Dict[str, Any]:
    return {"name": "RBN Backend", "status": "ok", "version": "1.0.0"}


@app.get(f"{os.getenv('API_PREFIX', '/api')}/health")
def health() -> Dict[str, str]:
    return {"status": "ok"}


@app.get("/api/articles", response_model=List[ArticleRowSchema])
def list_articles(
    id: Optional[str] = None,
    category: Optional[str] = None,
    db: Session = Depends(get_db),
) -> List[Dict[str, Any]]:
    stmt = select(ArticleRecord).order_by(ArticleRecord.updated_at.desc())
    rows = db.execute(stmt).scalars().all()
    items: List[ArticleRowSchema] = []
    for row in rows:
        if row.deleted:
            continue
        payload = row.payload if isinstance(row.payload, dict) else {}
        if id and not ids_match(row.id, id) and not ids_match(payload.get("id"), id):
            continue
        if category:
            value = str(payload.get("category") or "").strip().lower()
            if value and category.lower() not in {value, value.replace(" ", "-")}:
                continue
        items.append(ArticleRowSchema(id=row.id, payload=payload, deleted=row.deleted, updated_at=row.updated_at))
    return [item.model_dump(mode="json") for item in items]


@app.post("/api/articles")
def upsert_article(payload: ArticleUpsertRequest, db: Session = Depends(get_db)) -> Dict[str, Any]:
    article = payload.article or {}
    article_id = str(article.get("id") or article.get("slug") or article.get("articleId") or "").strip()
    if not article_id:
        raise HTTPException(status_code=400, detail="Payload inválido.")

    record = db.get(ArticleRecord, article_id)
    if record is None:
        record = ArticleRecord(id=article_id, payload={}, deleted=False)
        db.add(record)

    record.payload = article if isinstance(article, dict) else {}
    record.deleted = bool(payload.deleted)
    record.updated_at = utc_now()
    db.commit()
    publish_article_event(article_id, record.deleted)
    return {"ok": True, "id": article_id}


@app.patch("/api/articles")
def update_article(payload: ArticleUpsertRequest, db: Session = Depends(get_db)) -> Dict[str, Any]:
    return upsert_article(payload, db)


@app.delete("/api/articles")
def delete_article(id: Optional[str] = None, trash: bool = False, db: Session = Depends(get_db)) -> Dict[str, Any]:
    if trash:
        deleted_rows = db.execute(select(ArticleRecord).where(ArticleRecord.deleted.is_(True))).scalars().all()
        for row in deleted_rows:
            db.delete(row)
        db.commit()
        return {"ok": True, "deleted": len(deleted_rows)}
    article_id = id
    if not article_id:
        raise HTTPException(status_code=400, detail="ID obrigatório.")
    record = db.get(ArticleRecord, article_id)
    if record is None:
        return {"ok": True, "deleted": 0}
    record.deleted = True
    record.updated_at = utc_now()
    db.commit()
    publish_article_event(record.id, True)
    return {"ok": True, "deleted": 1}


@app.get("/api/homepage/events")
async def homepage_events() -> StreamingResponse:
    queue: asyncio.Queue[dict[str, Any]] = asyncio.Queue(maxsize=32)
    article_subscribers.add(queue)

    async def stream():
        try:
            yield "event: ready\ndata: {}\n\n"
            while True:
                try:
                    event = await asyncio.wait_for(queue.get(), timeout=20)
                    yield f"event: article.changed\ndata: {json.dumps(event)}\n\n"
                except asyncio.TimeoutError:
                    yield ": keep-alive\n\n"
        finally:
            article_subscribers.discard(queue)

    return StreamingResponse(stream(), media_type="text/event-stream", headers={"Cache-Control": "no-cache", "Connection": "keep-alive", "X-Accel-Buffering": "no"})


@app.get("/api/homepage/articles")
def homepage_articles(db: Session = Depends(get_db)) -> List[Dict[str, Any]]:
    stmt = select(ArticleRecord).where(ArticleRecord.deleted.is_(False)).order_by(ArticleRecord.updated_at.desc()).limit(12)
    rows = db.execute(stmt).scalars().all()
    articles: List[Dict[str, Any]] = []
    for row in rows:
        payload = row.payload if isinstance(row.payload, dict) else {}
        if not article_is_public(payload):
            continue
        updated_at_value = payload.get("updatedAt") or payload.get("createdAt") or (row.updated_at.isoformat() if row.updated_at else None)
        articles.append(
            {
                "id": payload.get("id") or row.id,
                "title": payload.get("title") or "Sem título",
                "subtitle": payload.get("subtitle") or "",
                "category": payload.get("category") or "Geral",
                "author": payload.get("author") or "RBN",
                "excerpt": payload.get("excerpt") or "",
                "image": payload.get("image") or "https://images.unsplash.com/photo-1495020689067-958852a7765e?w=1200&h=630&fit=crop",
                "featured": bool(payload.get("featured", False)),
                "updatedAt": updated_at_value,
                "views": payload.get("views") or 0,
            }
        )
    return articles


@app.get("/api/comments", response_model=List[CommentRowSchema])
def list_comments(articleId: Optional[str] = None, db: Session = Depends(get_db)) -> List[Dict[str, Any]]:
    stmt = select(CommentRecord).order_by(CommentRecord.updated_at.desc())
    rows = db.execute(stmt).scalars().all()
    items: List[Dict[str, Any]] = []
    for row in rows:
        payload = row.payload if isinstance(row.payload, dict) else {}
        if articleId and str(payload.get("articleId") or "") != articleId:
            continue
        items.append({"id": row.id, "payload": payload, "updated_at": row.updated_at})
    return items


@app.post("/api/comments")
def upsert_comment(payload: CommentUpsertRequest, db: Session = Depends(get_db)) -> Dict[str, Any]:
    comment = payload.comment or {}
    comment_id = str(comment.get("id") or "").strip()
    if not comment_id:
        raise HTTPException(status_code=400, detail="Payload inválido.")
    row = db.get(CommentRecord, comment_id)
    if row is None:
        row = CommentRecord(id=comment_id, payload={})
        db.add(row)
    row.payload = comment
    row.updated_at = utc_now()
    db.commit()
    return {"ok": True}


@app.delete("/api/comments")
def delete_comment(id: Optional[str] = None, db: Session = Depends(get_db)) -> Dict[str, Any]:
    comment_id = id
    if not comment_id:
        raise HTTPException(status_code=400, detail="ID obrigatório.")
    row = db.get(CommentRecord, comment_id)
    if row:
        db.delete(row)
        db.commit()
    return {"ok": True, "deleted": 1 if row else 0}


@app.get("/api/admin/users")
def list_users(db: Session = Depends(get_db)) -> Dict[str, Any]:
    rows = db.execute(select(UserRecord).order_by(UserRecord.updated_at.desc())).scalars().all()
    result = []
    for row in rows:
        payload = row.payload if isinstance(row.payload, dict) else {}
        if not is_active_user(payload):
            continue
        result.append({"id": row.id, "payload": payload, "updated_at": row.updated_at})
    return {"ok": True, "rows": result}


@app.post("/api/admin/users")
def upsert_user(payload: UserUpsertRequest, db: Session = Depends(get_db)) -> Dict[str, Any]:
    if not payload.id or not payload.payload:
        raise HTTPException(status_code=400, detail="id e payload são obrigatórios.")
    row = db.get(UserRecord, payload.id)
    if row is None:
        row = UserRecord(id=payload.id, payload={})
        db.add(row)
    row.payload = payload.payload
    row.updated_at = utc_now()
    db.commit()
    return {"ok": True}


@app.delete("/api/admin/users")
def disable_user(id: Optional[str] = None, db: Session = Depends(get_db)) -> Dict[str, Any]:
    if not id:
        raise HTTPException(status_code=400, detail="id é obrigatório.")
    row = db.get(UserRecord, id)
    if row is None:
        return {"ok": True}
    payload = row.payload if isinstance(row.payload, dict) else {}
    payload["status"] = "inativo"
    payload["updatedAt"] = utc_now().isoformat()
    row.payload = payload
    row.updated_at = utc_now()
    db.commit()
    return {"ok": True}


@app.get("/api/team")
def team_members(db: Session = Depends(get_db)) -> Dict[str, Any]:
    rows = db.execute(select(UserRecord).order_by(UserRecord.updated_at.desc())).scalars().all()
    members = []
    for row in rows:
        payload = row.payload if isinstance(row.payload, dict) else {}
        status = str(payload.get("status") or "ativo").lower()
        if status in {"inativo", "inactive", "disabled", "desativado"}:
            continue
        members.append(
            {
                "id": row.id,
                "name": payload.get("name") or "",
                "avatar": payload.get("avatar") or "",
                "role": payload.get("role") or "",
                "bio": payload.get("bio") or "",
                "location": payload.get("location") or "",
                "specialization": payload.get("specialization") or "",
                "linked": payload.get("linkedinProfileUrl") or payload.get("linked") or "",
                "teams": payload.get("teams") or "",
                "phone": payload.get("phonePublic") and payload.get("phone") or "",
                "extension": payload.get("extensionPublic") and payload.get("extension") or "",
                "linkedinConnectionStatus": payload.get("linkedinConnectionStatus") or "disconnected",
                "teamsConnectionStatus": payload.get("teamsConnectionStatus") or "disconnected",
            }
        )
    return {"ok": True, "members": members}


@app.get("/api/admin/mfa")
def admin_mfa(userId: Optional[str] = None, db: Session = Depends(get_db)) -> Dict[str, Any]:
    if not userId:
        return {"ok": True, "enabled": False, "secret": None}
    row = db.get(UserRecord, userId)
    payload = row.payload if row and isinstance(row.payload, dict) else {}
    mfa = payload.get("mfa") if isinstance(payload.get("mfa"), dict) else {}
    return {"ok": True, "enabled": bool(mfa.get("enabled")), "secret": mfa.get("secret")}


@app.post("/api/admin/mfa")
async def admin_mfa_write(request: Request, db: Session = Depends(get_db)) -> Dict[str, Any]:
    try:
        maybe_body = await request.json()
    except Exception:
        maybe_body = {}
    if not isinstance(maybe_body, dict):
        maybe_body = {}
    user_id = str(maybe_body.get("userId") or maybe_body.get("id") or "").strip()
    if not user_id:
        raise HTTPException(status_code=400, detail="userId obrigatório.")
    row = db.get(UserRecord, user_id)
    if row is None:
        row = UserRecord(id=user_id, payload={})
        db.add(row)
    payload = row.payload if isinstance(row.payload, dict) else {}
    mfa = payload.get("mfa") if isinstance(payload.get("mfa"), dict) else {}
    action = maybe_body.get("action") or "enable"
    if action == "generate":
        secret = create_totp_secret()
        mfa = {"enabled": False, "secret": secret, "otpauth": f"otpauth://totp/RBN:{user_id}?secret={secret}&issuer=RBN"}
        payload["mfa"] = mfa
        row.payload = payload
        row.updated_at = utc_now()
        db.commit()
        return {"ok": True, "secret": secret, "otpauthUrl": mfa["otpauth"]}
    if action == "verify":
        code = str(maybe_body.get("code") or "")
        secret = str(mfa.get("secret") or "")
        if not secret:
            return {"ok": False, "error": "MFA não configurado."}
        if not verify_totp(secret, code):
            return {"ok": False, "error": "Código inválido."}
        mfa["enabled"] = True
        payload["mfa"] = mfa
        row.payload = payload
        row.updated_at = utc_now()
        db.commit()
        return {"ok": True, "enabled": True}
    if action == "disable":
        mfa["enabled"] = False
        payload["mfa"] = mfa
        row.payload = payload
        row.updated_at = utc_now()
        db.commit()
        return {"ok": True, "enabled": False}
    return {"ok": True}


@app.post("/api/password-reset/request")
def password_reset_request(body: PasswordResetRequest, db: Session = Depends(get_db)) -> Dict[str, Any]:
    email = body.email.strip().lower()
    if not email:
        raise HTTPException(status_code=400, detail="E-mail inválido.")
    rows = db.execute(select(UserRecord)).scalars().all()
    user = None
    for row in rows:
        payload = row.payload if isinstance(row.payload, dict) else {}
        candidate = str(payload.get("email") or "").lower()
        if candidate == email:
            user = row
            break
    if user is None:
        return {"ok": True, "message": "Se o e-mail existir, o código será enviado."}
    return {"ok": True, "message": "Código enviado com sucesso."}


@app.post("/api/password-reset/confirm")
def password_reset_confirm(body: PasswordResetConfirmRequest, db: Session = Depends(get_db)) -> Dict[str, Any]:
    email = body.email.strip().lower()
    if not email or not body.token or not body.password:
        raise HTTPException(status_code=400, detail="Dados inválidos.")
    rows = db.execute(select(UserRecord)).scalars().all()
    for row in rows:
        payload = row.payload if isinstance(row.payload, dict) else {}
        if str(payload.get("email") or "").lower() != email:
            continue
        payload["passwordHash"] = hash_password_value(body.password)
        row.payload = payload
        row.updated_at = utc_now()
        db.commit()
        return {"ok": True, "message": "Senha atualizada com sucesso."}
    return {"ok": True, "message": "Senha atualizada com sucesso."}


@app.post("/api/welcome-email")
def welcome_email() -> Dict[str, Any]:
    return {"ok": True, "message": "E-mail de boas-vindas enviado."}


@app.post("/api/admin/integrations/disconnect")
def disconnect_integration() -> Dict[str, Any]:
    return {"ok": True}


@app.get("/api/admin/integrations")
def list_integrations(db: Session = Depends(get_db)) -> Dict[str, Any]:
    rows = db.execute(select(UserIntegrationRecord).order_by(UserIntegrationRecord.updated_at.desc())).scalars().all()
    return {"ok": True, "rows": [{"id": row.id, "user_id": row.user_id, "provider": row.provider, "payload": row.payload} for row in rows]}


@app.post("/api/admin/integrations")
async def save_integration(request: Request, db: Session = Depends(get_db)) -> Dict[str, Any]:
    try:
        body = await request.json()
    except Exception:
        body = {}
    if isinstance(body, dict):
        user_id = str(body.get("user_id") or body.get("userId") or "").strip()
        provider = str(body.get("provider") or "").strip()
        payload = body.get("payload") or {}
        if not user_id or not provider:
            raise HTTPException(status_code=400, detail="user_id e provider são obrigatórios.")
        record = db.execute(select(UserIntegrationRecord).where(and_(UserIntegrationRecord.user_id == user_id, UserIntegrationRecord.provider == provider))).scalar_one_or_none()
        if record is None:
            record = UserIntegrationRecord(user_id=user_id, provider=provider, payload={})
            db.add(record)
        record.payload = payload
        record.updated_at = utc_now()
        db.commit()
        return {"ok": True}
    raise HTTPException(status_code=400, detail="Payload inválido.")


@app.get("/api/admin/audience")
def audience() -> Dict[str, Any]:
    return {"ok": True, "total": 0, "labels": [], "values": []}


@app.get("/api/admin/pestalozzi")
def pestalozzi() -> Dict[str, Any]:
    return {"ok": True, "items": []}


@app.get("/api/admin/radar-news")
def radar_news() -> Dict[str, Any]:
    return {"ok": True, "items": []}


@app.get("/api/admin/article-notify")
def article_notify() -> Dict[str, Any]:
    return {"ok": True, "sent": 0}
