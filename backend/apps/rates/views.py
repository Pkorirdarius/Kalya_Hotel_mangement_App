from drf_spectacular.utils import extend_schema
from rest_framework import generics
from rest_framework.permissions import AllowAny

from .models import MealPlan
from .serializers import MealPlanSerializer


@extend_schema(tags=["rooms"])
class MealPlanListView(generics.ListAPIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    serializer_class = MealPlanSerializer
    pagination_class = None
    queryset = MealPlan.objects.filter(active=True)
