from django.urls import path

from .views import RoomTypeDetailView, RoomTypeListView

urlpatterns = [
    path("rooms/", RoomTypeListView.as_view(), name="room-list"),
    path("rooms/<slug:slug>/", RoomTypeDetailView.as_view(), name="room-detail"),
]
