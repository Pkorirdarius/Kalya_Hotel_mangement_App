from django.contrib import admin

from .models import Booking, BookingStatusEvent


class BookingStatusEventInline(admin.TabularInline):
    model = BookingStatusEvent
    extra = 0
    readonly_fields = (
        "from_status",
        "to_status",
        "reason",
        "actor",
        "request_id",
        "created_at",
    )
    can_delete = False


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = (
        "reference",
        "guest_name",
        "room_type",
        "checkin",
        "checkout",
        "status",
        "total",
        "source",
        "created_at",
    )
    list_filter = ("status", "source", "room_type", "checkin")
    search_fields = ("reference", "first_name", "last_name", "email", "phone")
    date_hierarchy = "checkin"
    readonly_fields = (
        "reference",
        "client_request_id",
        "price_breakdown",
        "created_at",
        "updated_at",
    )
    inlines = [BookingStatusEventInline]


@admin.register(BookingStatusEvent)
class BookingStatusEventAdmin(admin.ModelAdmin):
    list_display = ("booking", "from_status", "to_status", "actor", "created_at")
    list_filter = ("to_status",)
    search_fields = ("booking__reference",)
    readonly_fields = (
        "booking",
        "from_status",
        "to_status",
        "reason",
        "actor",
        "request_id",
        "created_at",
    )

    def has_add_permission(self, request):
        return False
