from django.urls import path

from .views import MealPlanListView

urlpatterns = [
    path("meal-plans/", MealPlanListView.as_view(), name="meal-plan-list"),
]
