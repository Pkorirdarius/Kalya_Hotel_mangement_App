from django.contrib.auth import authenticate, login, logout
from django.middleware.csrf import get_token
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.exceptions import AuthenticationFailed, PermissionDenied
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.audit import record_audit
from apps.common.serializers import ErrorEnvelopeSerializer

from .models import User
from .permissions import IsHotelStaff
from .serializers import (
    CsrfResponseSerializer,
    LoginSerializer,
    UserEnvelopeSerializer,
    UserSerializer,
)


@extend_schema(tags=["auth"])
class CsrfTokenView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    @extend_schema(responses={200: CsrfResponseSerializer})
    def get(self, request):
        return Response({"csrfToken": get_token(request)})


@extend_schema(tags=["auth"])
@method_decorator(csrf_protect, name="dispatch")
class LoginView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_scope = "login"

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        identifier = serializer.validated_data["username"]
        password = serializer.validated_data["password"]

        username = identifier
        if "@" in identifier:
            match = User.objects.filter(email__iexact=identifier).first()
            if match is not None:
                username = match.get_username()

        user = authenticate(request=request, username=username, password=password)
        if user is None:
            raise AuthenticationFailed("Invalid username or password.")
        if not user.is_hotel_staff:
            raise PermissionDenied("Staff access only.")

        login(request, user)
        record_audit(
            "staff.login",
            actor=user,
            entity_type="user",
            entity_id=user.pk,
            metadata={"username": user.username},
            request=request,
        )
        return Response({"user": UserSerializer(user).data})


@extend_schema(tags=["auth"])
class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        record_audit(
            "staff.logout",
            actor=request.user,
            entity_type="user",
            entity_id=request.user.pk,
            request=request,
        )
        logout(request)
        return Response(status=status.HTTP_204_NO_CONTENT)


@extend_schema(tags=["auth"])
class MeView(APIView):
    permission_classes = [IsHotelStaff]

    def get(self, request):
        return Response({"user": UserSerializer(request.user).data})
