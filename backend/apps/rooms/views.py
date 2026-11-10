from drf_spectacular.utils import extend_schema
from rest_framework import generics
from rest_framework.permissions import AllowAny

from .models import RoomType
from .serializers import RoomTypeDetailSerializer, RoomTypePublicSerializer


@extend_schema(tags=["rooms"])
class RoomTypeListView(generics.ListAPIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    serializer_class = RoomTypePublicSerializer
    pagination_class = None

    def get_queryset(self):
        return RoomType.objects.filter(active=True).prefetch_related("rate_plans")


@extend_schema(tags=["rooms"])
class RoomTypeDetailView(generics.RetrieveAPIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    serializer_class = RoomTypeDetailSerializer
    lookup_field = "slug"

    def get_queryset(self):
        return RoomType.objects.filter(active=True).prefetch_related(
            "rate_plans", "rate_plans__seasons", "rate_plans__discounts"
        )
