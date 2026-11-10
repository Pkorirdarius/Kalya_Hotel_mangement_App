from django.urls import path

from .views import StaffHotelSettingsView

urlpatterns = [
    path("settings/", StaffHotelSettingsView.as_view(), name="staff-settings"),
]
