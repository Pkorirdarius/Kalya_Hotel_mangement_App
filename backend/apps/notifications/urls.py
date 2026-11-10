from django.urls import path

from .views import (
    ContactMessageCreateView,
    NewsletterSubscribeView,
    NewsletterUnsubscribeView,
)

urlpatterns = [
    path("newsletter/", NewsletterSubscribeView.as_view(), name="newsletter-subscribe"),
    path(
        "newsletter/unsubscribe/",
        NewsletterUnsubscribeView.as_view(),
        name="newsletter-unsubscribe",
    ),
    path("contact/", ContactMessageCreateView.as_view(), name="contact-create"),
]
