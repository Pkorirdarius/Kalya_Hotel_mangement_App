from __future__ import annotations

from drf_spectacular.utils import extend_schema
from rest_framework import viewsets

from apps.accounts.permissions import CanManageBookings, CanManageContent

from .models import ContactMessage, NewsletterSubscriber
from .serializers import (
    ContactMessageStaffSerializer,
    NewsletterSubscriberStaffSerializer,
)


@extend_schema(tags=["staff marketing"])
class NewsletterSubscriberViewSet(viewsets.ModelViewSet):
    permission_classes = [CanManageContent]
    serializer_class = NewsletterSubscriberStaffSerializer
    queryset = NewsletterSubscriber.objects.all()
    http_method_names = ["get", "patch", "delete", "head", "options"]
    filterset_fields = ("consent", "language", "source")
    search_fields = ("email",)


@extend_schema(tags=["staff marketing"])
class ContactMessageViewSet(viewsets.ModelViewSet):
    permission_classes = [CanManageBookings]
    serializer_class = ContactMessageStaffSerializer
    queryset = ContactMessage.objects.all()
    http_method_names = ["get", "patch", "head", "options"]
    filterset_fields = ("status", "topic")
    search_fields = ("reference", "name", "email", "phone", "message")
