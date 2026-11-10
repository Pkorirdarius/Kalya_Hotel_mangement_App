from django.db import models

from apps.common.models import TimeStampedModel


class BlogPost(TimeStampedModel):
    slug = models.SlugField(max_length=140, unique=True)
    title_en = models.CharField(max_length=200)
    title_sw = models.CharField(max_length=200, blank=True)
    excerpt_en = models.TextField(blank=True)
    excerpt_sw = models.TextField(blank=True)
    body_en = models.TextField(blank=True)
    body_sw = models.TextField(blank=True)
    image = models.URLField(max_length=500, blank=True)
    image_alt = models.CharField(max_length=255, blank=True)
    category = models.CharField(max_length=60, blank=True)
    published_at = models.DateTimeField(null=True, blank=True)
    active = models.BooleanField(default=True)
    needs_confirmation = models.BooleanField(
        default=True, help_text="Content still needs hotel/marketing review."
    )

    class Meta:
        ordering = ("-published_at", "-created_at")

    def __str__(self) -> str:
        return self.title_en


class Offer(TimeStampedModel):
    slug = models.SlugField(max_length=140, unique=True)
    title_en = models.CharField(max_length=200)
    title_sw = models.CharField(max_length=200, blank=True)
    description_en = models.TextField(blank=True)
    description_sw = models.TextField(blank=True)
    price_label = models.CharField(max_length=120, blank=True)
    image = models.URLField(max_length=500, blank=True)
    cta_label_en = models.CharField(max_length=80, blank=True)
    cta_label_sw = models.CharField(max_length=80, blank=True)
    cta_url = models.CharField(max_length=255, blank=True)
    valid_from = models.DateField(null=True, blank=True)
    valid_to = models.DateField(null=True, blank=True)
    active = models.BooleanField(default=True)
    needs_confirmation = models.BooleanField(default=True)

    class Meta:
        ordering = ("-created_at",)

    def __str__(self) -> str:
        return self.title_en


class Review(TimeStampedModel):
    author = models.CharField(max_length=120)
    rating = models.PositiveSmallIntegerField(default=5)
    quote_en = models.TextField()
    quote_sw = models.TextField(blank=True)
    source = models.CharField(max_length=40, default="google")
    reviewed_at = models.DateField(null=True, blank=True)
    active = models.BooleanField(default=True)
    needs_confirmation = models.BooleanField(default=True)

    class Meta:
        ordering = ("-reviewed_at", "-created_at")

    def __str__(self) -> str:
        return f"{self.author} · {self.rating}/5"
