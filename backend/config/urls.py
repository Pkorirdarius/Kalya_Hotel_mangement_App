"""Root URL configuration for the hotel API."""

from django.conf import settings
from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

from apps.accounts.views import CsrfTokenView
from apps.common.views import HealthView

admin.site.site_header = f"{settings.HOTEL['NAME']} administration"
admin.site.site_title = f"{settings.HOTEL['NAME']} admin"
admin.site.index_title = "Operations"

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/health/", HealthView.as_view(), name="health"),
    path("api/v1/auth/csrf/", CsrfTokenView.as_view(), name="csrf-token"),
    # Public website API
    path("api/v1/common/", include("apps.common.urls")),
    path("api/v1/", include("apps.rooms.urls")),
    path("api/v1/", include("apps.rates.urls")),
    path("api/v1/bookings/", include("apps.bookings.urls")),
    path("api/v1/payments/", include("apps.payments.urls")),
    path("api/v1/facilities/", include("apps.facilities.urls")),
    path("api/v1/content/", include("apps.content.urls")),
    path("api/v1/marketing/", include("apps.notifications.urls")),
    # Staff API
    path("api/v1/staff/auth/", include("apps.accounts.urls")),
    path("api/v1/staff/common/", include("apps.common.staff_urls")),
    path("api/v1/staff/rooms/", include("apps.rooms.staff_urls")),
    path("api/v1/staff/rates/", include("apps.rates.staff_urls")),
    path("api/v1/staff/bookings/", include("apps.bookings.staff_urls")),
    path("api/v1/staff/facilities/", include("apps.facilities.staff_urls")),
    path("api/v1/staff/content/", include("apps.content.staff_urls")),
    path("api/v1/staff/marketing/", include("apps.notifications.staff_urls")),
    path("api/v1/staff/frontdesk/", include("apps.frontdesk.urls")),
    path("api/v1/staff/reports/", include("apps.integrations.staff_urls")),
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path(
        "api/docs/",
        SpectacularSwaggerView.as_view(url_name="schema"),
        name="swagger-ui",
    ),
]
