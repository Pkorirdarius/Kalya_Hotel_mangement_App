from __future__ import annotations

from django.utils import timezone
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.utils import unique_reference

from .models import ContactMessage, NewsletterSubscriber
from .serializers import (
    ContactMessageCreateSerializer,
    ContactMessageEnvelopeSerializer,
    ContactMessageSerializer,
    NewsletterSubscribeResponseSerializer,
    NewsletterSubscribeSerializer,
    NewsletterUnsubscribeResponseSerializer,
)


@extend_schema(tags=["marketing"])
class NewsletterSubscribeView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_scope = "newsletter"

    @extend_schema(
        request=NewsletterSubscribeSerializer,
        responses={201: NewsletterSubscribeResponseSerializer},
    )
    def post(self, request):
        serializer = NewsletterSubscribeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        email = data["email"].strip().lower()
        subscriber, created = NewsletterSubscriber.objects.get_or_create(
            email=email,
            defaults={
                "consent": True,
                "language": data["language"],
                "source": data.get("source", "website"),
            },
        )
        if not created:
            subscriber.consent = True
            subscriber.language = data["language"]
            subscriber.unsubscribed_at = None
            subscriber.save(
                update_fields=("consent", "language", "unsubscribed_at", "updated_at")
            )
        return Response(
            {"subscribed": True, "already_subscribed": not created},
            status=status.HTTP_201_CREATED,
        )


@extend_schema(tags=["marketing"])
class NewsletterUnsubscribeView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_scope = "newsletter"

    @extend_schema(
        request=NewsletterSubscribeSerializer,
        responses=NewsletterUnsubscribeResponseSerializer,
    )
    def post(self, request):
        email = str(request.data.get("email", "")).strip().lower()
        subscriber = NewsletterSubscriber.objects.filter(email=email).first()
        if subscriber is not None:
            subscriber.consent = False
            subscriber.unsubscribed_at = timezone.now()
            subscriber.save(update_fields=("consent", "unsubscribed_at", "updated_at"))
        return Response({"unsubscribed": True})


@extend_schema(tags=["marketing"])
class ContactMessageCreateView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_scope = "enquiry"

    @extend_schema(
        request=ContactMessageCreateSerializer,
        responses={201: ContactMessageEnvelopeSerializer},
    )
    def post(self, request):
        serializer = ContactMessageCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        message = ContactMessage.objects.create(
            reference=unique_reference(ContactMessage, "CM"),
            **data,
        )
        try:
            from django.conf import settings

            from .services import send_email

            send_email(
                kind="contact_message",
                subject=f"Website message · {message.reference}",
                recipient=settings.FRONT_DESK_EMAIL,
                template="staff_contact_message",
                context={"message": message},
                entity=message,
            )
        except Exception:
            pass
        return Response(
            {"message": ContactMessageSerializer(message).data},
            status=status.HTTP_201_CREATED,
        )
