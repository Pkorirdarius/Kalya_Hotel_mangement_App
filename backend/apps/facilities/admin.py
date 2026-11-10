from django.contrib import admin

from .models import (
    ConferenceBlock,
    ConferenceEnquiry,
    GymDayPass,
    GymMembershipEnquiry,
    MenuItem,
    TableBooking,
)


@admin.register(MenuItem)
class MenuItemAdmin(admin.ModelAdmin):
    list_display = (
        "name_en",
        "venue",
        "category",
        "price",
        "active",
        "needs_confirmation",
        "sort_order",
    )
    list_filter = ("venue", "category", "active", "needs_confirmation")
    search_fields = ("name_en", "name_sw")


@admin.register(TableBooking)
class TableBookingAdmin(admin.ModelAdmin):
    list_display = (
        "reference",
        "guest_name",
        "date",
        "time",
        "party_size",
        "status",
        "escalated_at",
        "created_at",
    )
    list_filter = ("status", "date")
    search_fields = ("reference", "first_name", "last_name", "phone", "email")
    readonly_fields = ("reference", "escalated_at", "created_at", "updated_at")


@admin.register(ConferenceEnquiry)
class ConferenceEnquiryAdmin(admin.ModelAdmin):
    list_display = (
        "reference",
        "guest_name",
        "company",
        "date",
        "session",
        "people",
        "layout",
        "status",
        "created_at",
    )
    list_filter = ("status", "session", "layout", "date")
    search_fields = ("reference", "first_name", "last_name", "company", "email", "phone")
    readonly_fields = ("reference", "escalated_at", "created_at", "updated_at")


@admin.register(ConferenceBlock)
class ConferenceBlockAdmin(admin.ModelAdmin):
    list_display = ("date", "session", "reason")
    list_filter = ("session",)
    search_fields = ("reason",)


@admin.register(GymDayPass)
class GymDayPassAdmin(admin.ModelAdmin):
    list_display = (
        "reference",
        "full_name",
        "date",
        "amount",
        "payment_method",
        "status",
        "paid_at",
        "created_at",
    )
    list_filter = ("status", "payment_method", "date")
    search_fields = ("reference", "full_name", "phone", "email", "payment_reference")
    readonly_fields = (
        "reference",
        "qr_token",
        "escalated_at",
        "created_at",
        "updated_at",
    )


@admin.register(GymMembershipEnquiry)
class GymMembershipEnquiryAdmin(admin.ModelAdmin):
    list_display = ("full_name", "phone", "email", "status", "created_at")
    list_filter = ("status",)
    search_fields = ("full_name", "phone", "email")
