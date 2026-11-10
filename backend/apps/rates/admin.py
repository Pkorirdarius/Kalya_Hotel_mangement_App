from django.contrib import admin

from .models import LongStayDiscount, MealPlan, RatePlan, Season


class SeasonInline(admin.TabularInline):
    model = Season
    extra = 0


class LongStayDiscountInline(admin.TabularInline):
    model = LongStayDiscount
    extra = 0


@admin.register(RatePlan)
class RatePlanAdmin(admin.ModelAdmin):
    list_display = (
        "room_type",
        "code",
        "name",
        "weekday_rate",
        "weekend_rate",
        "min_nights",
        "active",
    )
    list_filter = ("room_type", "active")
    search_fields = ("code", "name")
    inlines = [SeasonInline, LongStayDiscountInline]


@admin.register(Season)
class SeasonAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "rate_plan",
        "start_date",
        "end_date",
        "weekday_rate",
        "weekend_rate",
        "priority",
        "active",
    )
    list_filter = ("active", "rate_plan")
    search_fields = ("name",)


@admin.register(LongStayDiscount)
class LongStayDiscountAdmin(admin.ModelAdmin):
    list_display = ("rate_plan", "min_nights", "percent", "active")
    list_filter = ("active", "rate_plan")


@admin.register(MealPlan)
class MealPlanAdmin(admin.ModelAdmin):
    list_display = (
        "code",
        "name_en",
        "supplement_per_person_per_night",
        "active",
        "sort_order",
    )
    list_filter = ("active",)
    search_fields = ("code", "name_en")
