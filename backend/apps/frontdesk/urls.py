from django.urls import path

from .views import (
    FrontDeskActionView,
    FrontDeskActivityView,
    FrontDeskEscalateView,
    FrontDeskQueueView,
)

urlpatterns = [
    path("queue/", FrontDeskQueueView.as_view(), name="frontdesk-queue"),
    path("actions/", FrontDeskActionView.as_view(), name="frontdesk-action"),
    path("activity/", FrontDeskActivityView.as_view(), name="frontdesk-activity"),
    path("escalate/", FrontDeskEscalateView.as_view(), name="frontdesk-escalate"),
]
