from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, Optional

from pydantic import BaseModel, Field


class ArticleRowSchema(BaseModel):
    id: str
    payload: Dict[str, Any] = Field(default_factory=dict)
    deleted: bool = False
    updated_at: Optional[datetime] = None


class CommentRowSchema(BaseModel):
    id: str
    payload: Dict[str, Any] = Field(default_factory=dict)
    updated_at: Optional[datetime] = None


class UserRowSchema(BaseModel):
    id: str
    payload: Dict[str, Any] = Field(default_factory=dict)
    updated_at: Optional[datetime] = None


class ArticleUpsertRequest(BaseModel):
    article: Dict[str, Any]
    deleted: bool = False


class CommentUpsertRequest(BaseModel):
    comment: Dict[str, Any]


class UserUpsertRequest(BaseModel):
    id: str
    payload: Dict[str, Any]


class LoginRequest(BaseModel):
    email: Optional[str] = None
    login: Optional[str] = None
    password: str


class PasswordResetRequest(BaseModel):
    email: str


class PasswordResetConfirmRequest(BaseModel):
    email: str
    token: Optional[str] = None
    password: Optional[str] = None
    code: Optional[str] = None
    newPassword: Optional[str] = None
