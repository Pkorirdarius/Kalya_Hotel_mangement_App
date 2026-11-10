from __future__ import annotations

from django.utils import timezone
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import serializers, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import CanManageBookings
from apps.common.models import HotelSetting

from .models import DeskAction
from .services import (
    ActionError,
    apply_action,
    escalate_overdue_items,
    frontdesk_queue,
    recent_activity,
)


class DeskActionRequestSerializer(serializers.Serializer):
    entity_type = serializers.ChoiceField(choices=DeskAction.Entity.choices)
    entity_id = serializers.IntegerField(min_value=1)
    action = serializers.ChoiceField(choices=("confirm", "decline", "undo"))


class DeskActionSerializer(serializers.ModelSerializer):
    actor_name = serializers.SerializerMethodField()

    class Meta:
        model = DeskAction
        fields = (
            "id",
            "entity_type",
            "entity_id",
            "action",
            "previous_status",
            "new_status",
            "actor_name",
            "undo_deadline",
            "undone_at",
            "created_at",
        )

    def get_actor_name(self, obj) -> str:
        return obj.actor.get_full_name() if obj.actor else "System"


class QueueItemSerializer(serializers.Serializer):
    entity_type = serializers.CharField()
    id = serializers.IntegerField()
    reference = serializers.CharField()
    guest_name = serializers.CharField()
    phone = serializers.CharField()
    summary = serializers.CharField()
    amount = serializers.IntegerField(allow_null=True)
    status = serializers.CharField()
    payment_status = serializers.CharField()
    created_at = serializers.DateTimeField()
    deadline_at = serializers.DateTimeField()
    seconds_remaining = serializers.IntegerField()
    overdue = serializers.BooleanField()
    actions = serializers.ListField(child=serializers.CharField())


class QueueResponseSerializer(serializers.Serializer):
    generated_at = serializers.DateTimeField()
    target_minutes = serializers.IntegerField()
    escalate_minutes = serializers.IntegerField()
    undo_seconds = serializers.IntegerField()
    items = QueueItemSerializer(many=True)


class ActivityRowSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    entity_type = serializers.CharField()
    entity_id = serializers.IntegerField()
    action = serializers.CharField()
    previous_status = serializers.CharField()
    new_status = serializers.CharField()
    actor = serializers.CharField()
    created_at = serializers.DateTimeField()
    undone_at = serializers.DateTimeField(allow_null=True)


class ActivityResponseSerializer(serializers.Serializer):
    results = ActivityRowSerializer(many=True)


class EscalateResponseSerializer(serializers.Serializer):
    escalated = serializers.IntegerField()


@extend_schema(tags=["front desk"])
class FrontDeskQueueView(APIView):
    permission_classes = [CanManageBookings]

    @extend_schema(responses=QueueResponseSerializer)
    def get(self, request):
        settings_obj = HotelSetting.load()
        items = frontdesk_queue()
        return Response(
            {
                "generated_at": timezone.now().isoformat(),
                "target_minutes": settings_obj.frontdesk_target_minutes,
                "escalate_minutes": settings_obj.frontdesk_escalate_minutes,
                "undo_seconds": settings_obj.frontdesk_undo_seconds,
                "items": items,
            }
        )


@extend_schema(tags=["front desk"], request=DeskActionRequestSerializer)
class FrontDeskActionView(APIView):
    permission_classes = [CanManageBookings]

    @extend_schema(responses=DeskActionSerializer)
    def post(self, request):
        serializer = DeskActionRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        try:
            action = apply_action(
                entity_type=data["entity_type"],
                entity_id=data["entity_id"],
                action=data["action"],
                actor=request.user,
                request_id=getattr(request, "request_id", ""),
            )
        except ActionError as exc:
            raise serializers.ValidationError({"detail": str(exc)})
        return Response(DeskActionSerializer(action).data, status=status.HTTP_201_CREATED)


@extend_schema(tags=["front desk"])
class FrontDeskActivityView(APIView):
    permission_classes = [CanManageBookings]

    @extend_schema(
        parameters=[OpenApiParameter("limit", int, required=False)],
        responses=ActivityResponseSerializer,
    )
    def get(self, request):
        limit = min(100, max(1, int(request.query_params.get("limit", 30))))
        return Response({"results": recent_activity(limit)})


@extend_schema(tags=["front desk"])
class FrontDeskEscalateView(APIView):
    permission_classes = [CanManageBookings]

    @extend_schema(request=None, responses=EscalateResponseSerializer)
    def post(self, request):
        return Response({"escalated": escalate_overdue_items()})
