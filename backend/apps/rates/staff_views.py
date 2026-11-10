from __future__ import annotations

from drf_spectacular.utils import extend_schema
from rest_framework import viewsets

from apps.accounts.permissions import CanManageInventory

from .models import LongStayDiscount, MealPlan, RatePlan, Season
from .serializers import (
    LongStayDiscountSerializer,
    MealPlanSerializer,
    RatePlanSerializer,
    SeasonSerializer,
)


@extend_schema(tags=["staff rates"])
class RatePlanViewSet(viewsets.ModelViewSet):
    permission_classes = [CanManageInventory]
    serializer_class = RatePlanSerializer
    queryset = RatePlan.objects.select_related("room_type").prefetch_related(
        "seasons", "discounts"
    )
    filterset_fields = ("room_type", "active")
    search_fields = ("code", "name")


@extend_schema(tags=["staff rates"])
class SeasonViewSet(viewsets.ModelViewSet):
    permission_classes = [CanManageInventory]
    serializer_class = SeasonSerializer
    queryset = Season.objects.select_related("rate_plan")
    filterset_fields = ("rate_plan", "active")


@extend_schema(tags=["staff rates"])
class LongStayDiscountViewSet(viewsets.ModelViewSet):
    permission_classes = [CanManageInventory]
    serializer_class = LongStayDiscountSerializer
    queryset = LongStayDiscount.objects.select_related("rate_plan")
    filterset_fields = ("rate_plan", "active")


@extend_schema(tags=["staff rates"])
class MealPlanViewSet(viewsets.ModelViewSet):
    permission_classes = [CanManageInventory]
    serializer_class = MealPlanSerializer
    queryset = MealPlan.objects.all()
    filterset_fields = ("active",)
    search_fields = ("code", "name_en")
