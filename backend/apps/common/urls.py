from django.urls import path

from .views import HealthView, HotelSettingsView

urlpatterns = [
    path("health/", HealthView.as_view(), name="common-health"),
    path("hotel/", HotelSettingsView.as_view(), name="hotel-settings"),
]
