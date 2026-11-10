from django.urls import path

from .staff_views import StaffBookingDetailView, StaffBookingListView

urlpatterns = [
    path("bookings/", StaffBookingListView.as_view(), name="staff-booking-list"),
    path(
        "bookings/<str:reference>/",
        StaffBookingDetailView.as_view(),
        name="staff-booking-detail",
    ),
]
