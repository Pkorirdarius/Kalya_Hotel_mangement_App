from rest_framework import serializers

from apps.common.serializers import KesField

from .models import LongStayDiscount, MealPlan, RatePlan, Season


class RatePlanPublicSerializer(serializers.ModelSerializer):
    weekday_rate = KesField(read_only=True)
    weekend_rate = KesField(read_only=True)
    meal_plan_codes = serializers.SerializerMethodField()

    class Meta:
        model = RatePlan
        fields = (
            "id",
            "code",
            "name",
            "weekday_rate",
            "weekend_rate",
            "min_nights",
            "meal_plan_codes",
        )

    def get_meal_plan_codes(self, obj):
        return list(
            MealPlan.objects.filter(active=True).values_list("code", flat=True)
        )


class SeasonSerializer(serializers.ModelSerializer):
    weekday_rate = KesField()
    weekend_rate = KesField()

    class Meta:
        model = Season
        fields = (
            "id",
            "rate_plan",
            "name",
            "start_date",
            "end_date",
            "weekday_rate",
            "weekend_rate",
            "priority",
            "active",
        )


class LongStayDiscountSerializer(serializers.ModelSerializer):
    percent = serializers.DecimalField(max_digits=5, decimal_places=2)

    class Meta:
        model = LongStayDiscount
        fields = ("id", "rate_plan", "min_nights", "percent", "active")


class RatePlanSerializer(serializers.ModelSerializer):
    weekday_rate = KesField()
    weekend_rate = KesField()
    seasons = SeasonSerializer(many=True, read_only=True)
    discounts = LongStayDiscountSerializer(many=True, read_only=True)

    class Meta:
        model = RatePlan
        fields = (
            "id",
            "room_type",
            "code",
            "name",
            "weekday_rate",
            "weekend_rate",
            "min_nights",
            "active",
            "sort_order",
            "seasons",
            "discounts",
        )


class MealPlanSerializer(serializers.ModelSerializer):
    supplement_per_person_per_night = KesField()

    class Meta:
        model = MealPlan
        fields = (
            "id",
            "code",
            "name_en",
            "name_sw",
            "description_en",
            "description_sw",
            "supplement_per_person_per_night",
            "active",
            "sort_order",
        )
