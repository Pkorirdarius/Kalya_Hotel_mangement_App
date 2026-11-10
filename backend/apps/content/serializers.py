from rest_framework import serializers

from .models import BlogPost, Offer, Review


class BlogPostSerializer(serializers.ModelSerializer):
    class Meta:
        model = BlogPost
        fields = (
            "slug",
            "title_en",
            "title_sw",
            "excerpt_en",
            "excerpt_sw",
            "body_en",
            "body_sw",
            "image",
            "image_alt",
            "category",
            "published_at",
            "needs_confirmation",
        )


class OfferSerializer(serializers.ModelSerializer):
    class Meta:
        model = Offer
        fields = (
            "slug",
            "title_en",
            "title_sw",
            "description_en",
            "description_sw",
            "price_label",
            "image",
            "cta_label_en",
            "cta_label_sw",
            "cta_url",
            "valid_from",
            "valid_to",
            "needs_confirmation",
        )


class ReviewSerializer(serializers.ModelSerializer):
    class Meta:
        model = Review
        fields = (
            "author",
            "rating",
            "quote_en",
            "quote_sw",
            "source",
            "reviewed_at",
            "needs_confirmation",
        )


class BlogPostStaffSerializer(BlogPostSerializer):
    class Meta(BlogPostSerializer.Meta):
        fields = BlogPostSerializer.Meta.fields + ("active", "created_at", "updated_at")


class OfferStaffSerializer(OfferSerializer):
    class Meta(OfferSerializer.Meta):
        fields = OfferSerializer.Meta.fields + ("active", "created_at", "updated_at")


class ReviewStaffSerializer(ReviewSerializer):
    class Meta(ReviewSerializer.Meta):
        fields = ReviewSerializer.Meta.fields + ("active", "created_at", "updated_at")


class ReviewListSerializer(serializers.Serializer):
    enabled = serializers.BooleanField()
    results = ReviewSerializer(many=True)
