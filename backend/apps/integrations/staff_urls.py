from django.urls import path

from .views import HotelPlusExportView, OccupancyReportView, OverviewView

urlpatterns = [
    path("overview/", OverviewView.as_view(), name="staff-overview"),
    path("occupancy/", OccupancyReportView.as_view(), name="staff-occupancy"),
    path(
        "hotelplus-export/",
        HotelPlusExportView.as_view(),
        name="staff-hotelplus-export",
    ),
]
