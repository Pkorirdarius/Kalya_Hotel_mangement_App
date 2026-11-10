from rest_framework import serializers

from apps.common.serializers import KesField

from .models import RoomBlock, RoomType


class RoomTypePublicSerializer(serializers.ModelSerializer):
    from_price = KesField(read_only=True, allow_null=True)
    name = serializers.CharField(source="name_en", read_only=True)
    description = serializers.CharField(source="description_en", read_only=True)

    class Meta:
        model = RoomType
        fields = (
            "slug",
            "name",
            "name_en",
            "name_sw",
            "description",
            "description_en",
            "description_sw",
            "sleeps",
            "size_sqm",
            "bed_en",
            "bed_sw",
            "image",
            "images",
            "amenities",
            "highlights",
            "from_price",
            "needs_confirmation",
        )


class RoomTypeDetailSerializer(RoomTypePublicSerializer):
    rate_plans = serializers.SerializerMethodField()

    class Meta(RoomTypePublicSerializer.Meta):
        fields = RoomTypePublicSerializer.Meta.fields + ("rate_plans",)

    def get_rate_plans(self, obj) -> list[dict]:
        from apps.rates.serializers import RatePlanPublicSerializer

        return RatePlanPublicSerializer(
            obj.rate_plans.filter(active=True), many=True
        ).data


class RoomTypeStaffSerializer(serializers.ModelSerializer):
    from_price = KesField(read_only=True, allow_null=True)

    class Meta:
        model = RoomType
        fields = (
            "id",
            "slug",
            "name_en",
            "name_sw",
            "description_en",
            "description_sw",
            "sleeps",
            "size_sqm",
            "bed_en",
            "bed_sw",
            "total_rooms",
            "website_allotment",
            "image",
            "images",
            "amenities",
            "highlights",
            "sort_order",
            "active",
            "needs_confirmation",
            "from_price",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "from_price", "created_at", "updated_at")


class RoomBlockSerializer(serializers.ModelSerializer):
    room_type = serializers.SlugRelatedField(
        slug_field="slug", queryset=RoomType.objects.all()
    )

    class Meta:
        model = RoomBlock
        fields = (
            "id",
            "room_type",
            "start_date",
            "end_date",
            "quantity",
            "reason",
            "created_at",
        )
        read_only_fields = ("id", "created_at")

    def validate(self, attrs):
        instance = getattr(self, "instance", None)
        room_type = attrs.get("room_type") or getattr(instance, "room_type", None)
        start = attrs.get("start_date") or getattr(instance, "start_date", None)
        end = attrs.get("end_date") or getattr(instance, "end_date", None)
        quantity = attrs.get("quantity") or getattr(instance, "quantity", 1)
        if start and end and end <= start:
            raise serializers.ValidationError(
                {"end_date": "End date must be after start date."}
            )
        if room_type and quantity > room_type.total_rooms:
            raise serializers.ValidationError(
                {"quantity": "Cannot block more rooms than the room type has."}
            )
        return attrs
