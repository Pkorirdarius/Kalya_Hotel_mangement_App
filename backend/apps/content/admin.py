from django.contrib import admin

from .models import BlogPost, Offer, Review


@admin.register(BlogPost)
class BlogPostAdmin(admin.ModelAdmin):
    list_display = ("title_en", "slug", "category", "published_at", "active", "needs_confirmation")
    list_filter = ("active", "needs_confirmation", "category")
    search_fields = ("title_en", "title_sw", "slug")
    prepopulated_fields = {"slug": ("title_en",)}


@admin.register(Offer)
class OfferAdmin(admin.ModelAdmin):
    list_display = (
        "title_en",
        "slug",
        "price_label",
        "valid_from",
        "valid_to",
        "active",
        "needs_confirmation",
    )
    list_filter = ("active", "needs_confirmation")
    search_fields = ("title_en", "title_sw", "slug")
    prepopulated_fields = {"slug": ("title_en",)}


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ("author", "rating", "source", "reviewed_at", "active", "needs_confirmation")
    list_filter = ("active", "needs_confirmation", "source", "rating")
    search_fields = ("author", "quote_en")
