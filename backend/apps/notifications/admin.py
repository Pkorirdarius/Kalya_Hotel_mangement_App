from django.contrib import admin

from .models import ContactMessage, NewsletterSubscriber, NotificationLog


@admin.register(NewsletterSubscriber)
class NewsletterSubscriberAdmin(admin.ModelAdmin):
    list_display = ("email", "consent", "language", "source", "unsubscribed_at", "created_at")
    list_filter = ("consent", "language", "source")
    search_fields = ("email",)
    readonly_fields = ("created_at", "updated_at")


@admin.register(ContactMessage)
class ContactMessageAdmin(admin.ModelAdmin):
    list_display = ("reference", "name", "email", "topic", "status", "created_at")
    list_filter = ("status", "topic", "language")
    search_fields = ("reference", "name", "email", "phone", "message")
    readonly_fields = ("reference", "created_at", "updated_at")


@admin.register(NotificationLog)
class NotificationLogAdmin(admin.ModelAdmin):
    list_display = ("created_at", "channel", "kind", "recipient", "status")
    list_filter = ("channel", "status", "kind")
    search_fields = ("recipient", "subject", "kind")
    readonly_fields = (
        "channel",
        "kind",
        "recipient",
        "subject",
        "status",
        "error",
        "entity_type",
        "entity_id",
        "created_at",
    )

    def has_add_permission(self, request):
        return False
