from rest_framework.routers import DefaultRouter

from .staff_views import ContactMessageViewSet, NewsletterSubscriberViewSet

router = DefaultRouter()
router.register(
    "newsletter-subscribers", NewsletterSubscriberViewSet, basename="staff-newsletter"
)
router.register(
    "contact-messages", ContactMessageViewSet, basename="staff-contact-message"
)

urlpatterns = router.urls
