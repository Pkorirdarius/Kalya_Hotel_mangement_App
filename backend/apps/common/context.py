"""Request-scoped values shared by middleware, logging and audit helpers."""

from contextvars import ContextVar, Token
from typing import Any

_request_id: ContextVar[str | None] = ContextVar("request_id", default=None)
_current_user: ContextVar[Any | None] = ContextVar("current_user", default=None)


def get_request_id() -> str | None:
    return _request_id.get()


def set_request_id(value: str) -> Token:
    return _request_id.set(value)


def reset_request_id(token: Token) -> None:
    _request_id.reset(token)


def get_current_user() -> Any | None:
    return _current_user.get()


def set_current_user(user: Any) -> Token:
    return _current_user.set(user)


def reset_current_user(token: Token) -> None:
    _current_user.reset(token)
