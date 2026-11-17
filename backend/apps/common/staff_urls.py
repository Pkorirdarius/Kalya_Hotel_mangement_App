from django.urls import path

from .views import StaffFormGuardSummaryView, StaffHotelSettingsView

urlpatterns = [
    path("settings/", StaffHotelSettingsView.as_view(), name="staff-settings"),
    path(
        "form-guard/summary/",
        StaffFormGuardSummaryView.as_view(),
        name="staff-form-guard-summary",
    ),
]
