"""Root URL configuration for the West Premier Hotel API."""

from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

from apps.accounts.views import CsrfTokenView
from apps.common.views import HealthView

admin.site.site_header = "West Premier Hotel administration"
admin.site.site_title = "West Premier Hotel admin"
admin.site.index_title = "Operations"

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/health/", HealthView.as_view(), name="health"),
    path("api/v1/auth/csrf/", CsrfTokenView.as_view(), name="csrf-token"),
    path("api/v1/staff/auth/", include("apps.accounts.urls")),
    path("api/v1/common/", include("apps.common.urls")),
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path(
        "api/docs/",
        SpectacularSwaggerView.as_view(url_name="schema"),
        name="swagger-ui",
    ),
]
