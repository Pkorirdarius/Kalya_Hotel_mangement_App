from django.urls import path

from .views import (
    ConferenceAvailabilityView,
    ConferenceEnquiryCreateView,
    ConferenceEnquiryDetailView,
    GymAvailabilityView,
    GymDayPassCreateView,
    GymDayPassDetailView,
    GymDayPassQrView,
    MenuView,
    RestaurantSlotsView,
    TableBookingCreateView,
    TableBookingDetailView,
)

urlpatterns = [
    path("menu/", MenuView.as_view(), name="menu"),
    path("restaurant/slots/", RestaurantSlotsView.as_view(), name="restaurant-slots"),
    path(
        "restaurant/bookings/",
        TableBookingCreateView.as_view(),
        name="table-booking-create",
    ),
    path(
        "restaurant/bookings/<str:reference>/",
        TableBookingDetailView.as_view(),
        name="table-booking-detail",
    ),
    path(
        "conference/availability/",
        ConferenceAvailabilityView.as_view(),
        name="conference-availability",
    ),
    path(
        "conference/enquiries/",
        ConferenceEnquiryCreateView.as_view(),
        name="conference-enquiry-create",
    ),
    path(
        "conference/enquiries/<str:reference>/",
        ConferenceEnquiryDetailView.as_view(),
        name="conference-enquiry-detail",
    ),
    path("gym/availability/", GymAvailabilityView.as_view(), name="gym-availability"),
    path(
        "gym/day-passes/",
        GymDayPassCreateView.as_view(),
        name="gym-day-pass-create",
    ),
    path(
        "gym/day-passes/<str:reference>/",
        GymDayPassDetailView.as_view(),
        name="gym-day-pass-detail",
    ),
    path(
        "gym/day-passes/<str:reference>/qr/",
        GymDayPassQrView.as_view(),
        name="gym-day-pass-qr",
    ),
]
