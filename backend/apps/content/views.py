from django.utils import timezone
from drf_spectacular.utils import extend_schema
from rest_framework import generics
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.models import HotelSetting

from .models import BlogPost, Offer, Review
from .serializers import (
    BlogPostSerializer,
    OfferSerializer,
    ReviewListSerializer,
    ReviewSerializer,
)


@extend_schema(tags=["content"])
class BlogPostListView(generics.ListAPIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    serializer_class = BlogPostSerializer
    pagination_class = None

    def get_queryset(self):
        return BlogPost.objects.filter(
            active=True, published_at__isnull=False, published_at__lte=timezone.now()
        )


@extend_schema(tags=["content"])
class BlogPostDetailView(generics.RetrieveAPIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    serializer_class = BlogPostSerializer
    lookup_field = "slug"

    def get_queryset(self):
        return BlogPost.objects.filter(
            active=True, published_at__isnull=False, published_at__lte=timezone.now()
        )


@extend_schema(tags=["content"])
class OfferListView(generics.ListAPIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    serializer_class = OfferSerializer
    pagination_class = None

    def get_queryset(self):
        today = timezone.localdate()
        return Offer.objects.filter(active=True).filter(
            models_valid_offer_q(today)
        )


def models_valid_offer_q(today):
    from django.db.models import Q

    return (
        Q(valid_from__isnull=True) | Q(valid_from__lte=today)
    ) & (Q(valid_to__isnull=True) | Q(valid_to__gte=today))


@extend_schema(tags=["content"])
class ReviewListView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    @extend_schema(responses=ReviewListSerializer)
    def get(self, request):
        enabled = HotelSetting.load().google_reviews_enabled
        results = []
        if enabled:
            results = ReviewSerializer(
                Review.objects.filter(active=True)[:12], many=True
            ).data
        return Response({"enabled": enabled, "results": results})
