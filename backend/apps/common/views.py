from django.db import connection
from django.utils import timezone
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .serializers import HealthSerializer


class HealthView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    @extend_schema(tags=["system"], responses={200: HealthSerializer, 503: HealthSerializer})
    def get(self, request):
        try:
            connection.ensure_connection()
        except Exception:
            database_ok = False
        else:
            database_ok = True

        return Response(
            {
                "status": "ok" if database_ok else "degraded",
                "service": "west-premier-api",
                "database": database_ok,
                "time": timezone.now().isoformat(),
            },
            status=status.HTTP_200_OK if database_ok else status.HTTP_503_SERVICE_UNAVAILABLE,
        )
