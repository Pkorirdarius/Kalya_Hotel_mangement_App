from rest_framework.routers import DefaultRouter

from .staff_views import BlogPostViewSet, OfferViewSet, ReviewViewSet

router = DefaultRouter()
router.register("posts", BlogPostViewSet, basename="staff-post")
router.register("offers", OfferViewSet, basename="staff-offer")
router.register("reviews", ReviewViewSet, basename="staff-review")

urlpatterns = router.urls
