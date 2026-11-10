from __future__ import annotations

from drf_spectacular.utils import extend_schema
from rest_framework import viewsets

from apps.accounts.permissions import CanManageContent

from .models import BlogPost, Offer, Review
from .serializers import (
    BlogPostStaffSerializer,
    OfferStaffSerializer,
    ReviewStaffSerializer,
)


@extend_schema(tags=["staff content"])
class BlogPostViewSet(viewsets.ModelViewSet):
    permission_classes = [CanManageContent]
    serializer_class = BlogPostStaffSerializer
    queryset = BlogPost.objects.all()
    lookup_field = "slug"
    filterset_fields = ("active", "category")
    search_fields = ("title_en", "title_sw", "slug")


@extend_schema(tags=["staff content"])
class OfferViewSet(viewsets.ModelViewSet):
    permission_classes = [CanManageContent]
    serializer_class = OfferStaffSerializer
    queryset = Offer.objects.all()
    lookup_field = "slug"
    filterset_fields = ("active",)
    search_fields = ("title_en", "title_sw", "slug")


@extend_schema(tags=["staff content"])
class ReviewViewSet(viewsets.ModelViewSet):
    permission_classes = [CanManageContent]
    serializer_class = ReviewStaffSerializer
    queryset = Review.objects.all()
    filterset_fields = ("active", "source", "rating")
    search_fields = ("author", "quote_en")
