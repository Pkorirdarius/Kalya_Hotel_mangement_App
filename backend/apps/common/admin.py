from django.contrib import admin

from .models import AuditLog, HotelSetting


@admin.register(HotelSetting)
class HotelSettingAdmin(admin.ModelAdmin):
    fieldsets = (
        (
            "Identity",
            {
                "fields": (
                    "name",
                    "tagline",
                    "address",
                    "town",
                    "county",
                    "country",
                    "phone",
                    "phone_href",
                    "email",
                    "whatsapp",
                    "map_query",
                )
            },
        ),
        ("Booking policy", {
            "fields": (
                "currency",
                "timezone",
                "cancellation_cutoff_hours",
                "hold_ttl_minutes",
                "bank_transfer_hold_hours",
                "max_nights_per_booking",
                "frontdesk_target_minutes",
                "frontdesk_escalate_minutes",
                "frontdesk_undo_seconds",
                "tax_included",
                "tax_rate_percent",
            )
        }),
        ("Facilities", {
            "fields": (
                "restaurant_capacity",
                "restaurant_hours",
                "coffee_capacity",
                "coffee_hours",
                "conference_capacity",
                "conference_hours",
                "gym_capacity",
                "gym_hours",
                "gym_day_pass_price",
                "gym_monthly_price",
                "conference_half_day_price",
                "conference_full_day_price",
            )
        }),
        ("Bank transfer", {
            "fields": (
                "bank_name",
                "bank_account_name",
                "bank_account_number",
                "bank_branch",
                "bank_swift",
            )
        }),
        ("Publishing and privacy", {
            "fields": (
                "claims_verified",
                "google_reviews_enabled",
                "privacy_notice_url",
                "privacy_notice_version",
                "data_retention_months",
            )
        }),
    )

    def has_add_permission(self, request):
        return not HotelSetting.objects.exists()

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ("created_at", "action", "actor", "entity_type", "entity_id", "request_id")
    list_filter = ("action", "entity_type")
    search_fields = ("actor__username", "entity_id", "request_id")
    readonly_fields = (
        "actor",
        "action",
        "entity_type",
        "entity_id",
        "metadata",
        "request_id",
        "ip_address",
        "created_at",
    )

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
