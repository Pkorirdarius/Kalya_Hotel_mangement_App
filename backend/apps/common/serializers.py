from rest_framework import serializers


class ErrorDetailSerializer(serializers.Serializer):
    code = serializers.CharField()
    message = serializers.CharField()
    fields = serializers.JSONField(allow_null=True, required=False)
    request_id = serializers.CharField(allow_null=True, required=False)


class ErrorEnvelopeSerializer(serializers.Serializer):
    error = ErrorDetailSerializer()


class HealthSerializer(serializers.Serializer):
    status = serializers.CharField()
    service = serializers.CharField()
    database = serializers.BooleanField()
    time = serializers.CharField()
