from django.urls import path

from .views import (
    AvailabilityView,
    BookingCancelView,
    BookingCreateView,
    BookingDetailView,
    QuoteView,
)

urlpatterns = [
    path("availability/", AvailabilityView.as_view(), name="availability"),
    path("quote/", QuoteView.as_view(), name="booking-quote"),
    path("", BookingCreateView.as_view(), name="booking-create"),
    path("<str:reference>/", BookingDetailView.as_view(), name="booking-detail"),
    path("<str:reference>/cancel/", BookingCancelView.as_view(), name="booking-cancel"),
]
