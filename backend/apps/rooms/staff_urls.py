from django.urls import path
from rest_framework.routers import DefaultRouter

from .staff_views import RoomBlockViewSet, RoomTypeViewSet, RoomViewSet

router = DefaultRouter()
router.register("room-types", RoomTypeViewSet, basename="staff-room-type")
router.register("room-blocks", RoomBlockViewSet, basename="staff-room-block")

# This module is mounted at /api/v1/staff/rooms/, so the room list is the
# natural root of that namespace. The router's API root is shadowed by it.
urlpatterns = [
    path("", RoomViewSet.as_view({"get": "list"}), name="staff-room-list"),
    path(
        "<int:pk>/",
        RoomViewSet.as_view({"get": "retrieve"}),
        name="staff-room-detail",
    ),
    path(
        "<int:pk>/status/",
        RoomViewSet.as_view({"patch": "status"}),
        name="staff-room-status",
    ),
] + router.urls
