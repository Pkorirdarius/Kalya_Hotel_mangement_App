from rest_framework.routers import DefaultRouter

from .staff_views import RoomBlockViewSet, RoomTypeViewSet

router = DefaultRouter()
router.register("room-types", RoomTypeViewSet, basename="staff-room-type")
router.register("room-blocks", RoomBlockViewSet, basename="staff-room-block")

urlpatterns = router.urls
