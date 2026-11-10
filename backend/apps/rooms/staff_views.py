from __future__ import annotations

from drf_spectacular.utils import extend_schema
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.accounts.permissions import CanManageInventory
from apps.bookings.services.availability import available_rooms

from .models import RoomBlock, RoomType
from .serializers import RoomBlockSerializer, RoomTypeStaffSerializer


@extend_schema(tags=["staff rooms"])
class RoomTypeViewSet(viewsets.ModelViewSet):
    permission_classes = [CanManageInventory]
    serializer_class = RoomTypeStaffSerializer
    queryset = RoomType.objects.all().order_by("sort_order", "name_en")
    lookup_field = "slug"
    filterset_fields = ("active",)
    search_fields = ("name_en", "slug")

    @extend_schema(responses={200: None})
    @action(detail=True, methods=["get"], url_path="availability")
    def availability(self, request, slug=None):
        room_type = self.get_object()
        checkin = request.query_params.get("checkin")
        checkout = request.query_params.get("checkout")
        if not checkin or not checkout:
            return Response(
                {"detail": "Provide checkin and checkout dates."}, status=400
            )
        from datetime import date as date_cls

        try:
            checkin_date = date_cls.fromisoformat(checkin)
            checkout_date = date_cls.fromisoformat(checkout)
        except ValueError:
            return Response({"detail": "Use ISO dates (YYYY-MM-DD)."}, status=400)
        return Response(
            {
                "room_type": room_type.slug,
                "checkin": checkin_date,
                "checkout": checkout_date,
                "available_rooms": available_rooms(
                    room_type, checkin_date, checkout_date
                ),
                "online_inventory": room_type.online_inventory,
            }
        )


@extend_schema(tags=["staff rooms"])
class RoomBlockViewSet(viewsets.ModelViewSet):
    permission_classes = [CanManageInventory]
    serializer_class = RoomBlockSerializer
    queryset = RoomBlock.objects.select_related("room_type").all()
    filterset_fields = ("room_type",)
    ordering_fields = ("start_date", "end_date", "created_at")

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
