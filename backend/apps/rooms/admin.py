from django.contrib import admin

from .models import RoomBlock, RoomType


class RoomBlockInline(admin.TabularInline):
    model = RoomBlock
    extra = 0


@admin.register(RoomType)
class RoomTypeAdmin(admin.ModelAdmin):
    list_display = (
        "name_en",
        "slug",
        "sleeps",
        "total_rooms",
        "website_allotment",
        "active",
        "needs_confirmation",
    )
    list_filter = ("active", "needs_confirmation")
    search_fields = ("name_en", "slug")
    prepopulated_fields = {"slug": ("name_en",)}
    inlines = [RoomBlockInline]


@admin.register(RoomBlock)
class RoomBlockAdmin(admin.ModelAdmin):
    list_display = ("room_type", "start_date", "end_date", "quantity", "reason")
    list_filter = ("room_type",)
    search_fields = ("reason",)
