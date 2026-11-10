from django.contrib import admin

from .models import DeskAction


@admin.register(DeskAction)
class DeskActionAdmin(admin.ModelAdmin):
    list_display = (
        "created_at",
        "entity_type",
        "entity_id",
        "action",
        "previous_status",
        "new_status",
        "actor",
        "undone_at",
    )
    list_filter = ("entity_type", "action")
    search_fields = ("entity_id", "actor__username")
    readonly_fields = (
        "entity_type",
        "entity_id",
        "action",
        "previous_status",
        "new_status",
        "actor",
        "undo_deadline",
        "undone_at",
        "created_at",
    )

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False
