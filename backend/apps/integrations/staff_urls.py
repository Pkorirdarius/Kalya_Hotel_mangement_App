from django.urls import path

from .views import (
    HotelPlusExportView,
    OccupancyReportView,
    OverviewView,
    PaymentReportView,
)

urlpatterns = [
    path("overview/", OverviewView.as_view(), name="staff-overview"),
    path("occupancy/", OccupancyReportView.as_view(), name="staff-occupancy"),
    path("payments/", PaymentReportView.as_view(), name="staff-payment-report"),
    path(
        "hotelplus-export/",
        HotelPlusExportView.as_view(),
        name="staff-hotelplus-export",
    ),
]
