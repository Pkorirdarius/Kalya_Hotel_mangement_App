from django.urls import path

from .views import (
    BookingPaymentInitiateView,
    CardWebhookView,
    GymPaymentInitiateView,
    MpesaWebhookView,
    PaymentDetailView,
    PaymentMethodsView,
    SandboxCompleteView,
)

urlpatterns = [
    path("methods/", PaymentMethodsView.as_view(), name="payment-methods"),
    path(
        "bookings/<str:reference>/",
        BookingPaymentInitiateView.as_view(),
        name="booking-payment-initiate",
    ),
    path(
        "gym/day-passes/<str:reference>/",
        GymPaymentInitiateView.as_view(),
        name="gym-payment-initiate",
    ),
    path("<str:reference>/", PaymentDetailView.as_view(), name="payment-detail"),
    path(
        "<str:reference>/sandbox-complete/",
        SandboxCompleteView.as_view(),
        name="payment-sandbox-complete",
    ),
    path("webhooks/mpesa/", MpesaWebhookView.as_view(), name="mpesa-webhook"),
    path("webhooks/card/", CardWebhookView.as_view(), name="card-webhook"),
]
