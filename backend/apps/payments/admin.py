from django.contrib import admin

from .models import Payment, PaymentWebhookEvent


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = (
        "reference",
        "provider",
        "purpose",
        "amount",
        "status",
        "booking",
        "paid_at",
        "created_at",
    )
    list_filter = ("provider", "status", "purpose")
    search_fields = (
        "reference",
        "provider_reference",
        "checkout_request_id",
        "booking__reference",
        "phone",
    )
    readonly_fields = (
        "reference",
        "raw_request",
        "raw_response",
        "created_at",
        "updated_at",
    )


@admin.register(PaymentWebhookEvent)
class PaymentWebhookEventAdmin(admin.ModelAdmin):
    list_display = ("provider", "event_id", "processed", "signature_valid", "received_at")
    list_filter = ("provider", "processed", "signature_valid")
    search_fields = ("event_id",)
    readonly_fields = (
        "provider",
        "event_id",
        "signature_valid",
        "payload",
        "processed",
        "error",
        "received_at",
    )

    def has_add_permission(self, request):
        return False
