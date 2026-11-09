"""Small helper used by every role-protected operation."""

from .context import get_current_user, get_request_id
from .models import AuditLog


def record_audit(
    action: str,
    *,
    actor=None,
    entity_type: str = "",
    entity_id: str | int = "",
    metadata: dict | None = None,
    request=None,
) -> AuditLog:
    actor = actor or get_current_user()
    if actor is not None and not getattr(actor, "is_authenticated", False):
        actor = None

    ip_address = None
    if request is not None:
        ip_address = request.META.get("REMOTE_ADDR") or None

    return AuditLog.objects.create(
        actor=actor,
        action=action,
        entity_type=entity_type,
        entity_id=str(entity_id),
        metadata=metadata or {},
        request_id=get_request_id() or "",
        ip_address=ip_address,
    )
