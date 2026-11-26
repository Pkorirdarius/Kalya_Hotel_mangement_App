from django.urls import path

from .views import (
    StaffContentConfirmationView,
    StaffFormGuardSummaryView,
    StaffHotelSettingsView,
)

urlpatterns = [
    path("settings/", StaffHotelSettingsView.as_view(), name="staff-settings"),
    path(
        "form-guard/summary/",
        StaffFormGuardSummaryView.as_view(),
        name="staff-form-guard-summary",
    ),
    path(
        "content-confirmation/",
        StaffContentConfirmationView.as_view(),
        name="staff-content-confirmation",
    ),
]
