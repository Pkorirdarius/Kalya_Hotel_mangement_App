from rest_framework.routers import DefaultRouter

from .staff_views import (
    LongStayDiscountViewSet,
    MealPlanViewSet,
    RatePlanViewSet,
    SeasonViewSet,
)

router = DefaultRouter()
router.register("rate-plans", RatePlanViewSet, basename="staff-rate-plan")
router.register("seasons", SeasonViewSet, basename="staff-season")
router.register(
    "long-stay-discounts", LongStayDiscountViewSet, basename="staff-long-stay-discount"
)
router.register("meal-plans", MealPlanViewSet, basename="staff-meal-plan")

urlpatterns = router.urls
