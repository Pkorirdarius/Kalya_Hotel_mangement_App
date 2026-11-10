from rest_framework import serializers

from apps.common.utils import normalise_kenyan_phone

from .models import ContactMessage, NewsletterSubscriber


class NewsletterSubscribeSerializer(serializers.Serializer):
    email = serializers.EmailField()
    consent = serializers.BooleanField(default=True)
    language = serializers.ChoiceField(choices=("en", "sw"), default="en")
    source = serializers.CharField(max_length=80, required=False, allow_blank=True)

    def validate_consent(self, value):
        if not value:
            raise serializers.ValidationError(
                "Please agree to receive the newsletter."
            )
        return value


class NewsletterSubscriberSerializer(serializers.ModelSerializer):
    class Meta:
        model = NewsletterSubscriber
        fields = ("email", "language", "consent", "created_at")


class ContactMessageCreateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=120)
    email = serializers.EmailField()
    phone = serializers.CharField(max_length=32, required=False, allow_blank=True)
    topic = serializers.CharField(max_length=60, required=False, allow_blank=True)
    message = serializers.CharField(max_length=3000)
    language = serializers.ChoiceField(choices=("en", "sw"), default="en")

    def validate_phone(self, value):
        if not value:
            return ""
        try:
            return normalise_kenyan_phone(value)
        except ValueError as exc:
            raise serializers.ValidationError(str(exc)) from exc


class ContactMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContactMessage
        fields = ("reference", "name", "email", "phone", "topic", "message", "status", "created_at")


class NewsletterSubscriberStaffSerializer(serializers.ModelSerializer):
    class Meta:
        model = NewsletterSubscriber
        fields = (
            "id",
            "email",
            "language",
            "consent",
            "source",
            "unsubscribed_at",
            "created_at",
        )
        read_only_fields = ("id", "created_at")


class ContactMessageStaffSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = ContactMessage
        fields = (
            "reference",
            "name",
            "email",
            "phone",
            "topic",
            "message",
            "language",
            "status",
            "status_display",
            "created_at",
        )
        read_only_fields = ("reference", "created_at")


class NewsletterSubscribeResponseSerializer(serializers.Serializer):
    subscribed = serializers.BooleanField()
    already_subscribed = serializers.BooleanField()


class NewsletterUnsubscribeResponseSerializer(serializers.Serializer):
    unsubscribed = serializers.BooleanField()


class ContactMessageEnvelopeSerializer(serializers.Serializer):
    message = ContactMessageSerializer()
