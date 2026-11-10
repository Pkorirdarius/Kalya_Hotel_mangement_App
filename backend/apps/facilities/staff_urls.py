from rest_framework.routers import DefaultRouter

from .staff_views import (
    ConferenceBlockViewSet,
    ConferenceEnquiryViewSet,
    GymDayPassViewSet,
    GymMembershipEnquiryViewSet,
    MenuItemViewSet,
    TableBookingViewSet,
)

router = DefaultRouter()
router.register("menu-items", MenuItemViewSet, basename="staff-menu-item")
router.register("table-bookings", TableBookingViewSet, basename="staff-table-booking")
router.register(
    "conference-enquiries", ConferenceEnquiryViewSet, basename="staff-conference-enquiry"
)
router.register(
    "conference-blocks", ConferenceBlockViewSet, basename="staff-conference-block"
)
router.register("gym-day-passes", GymDayPassViewSet, basename="staff-gym-day-pass")
router.register(
    "gym-membership-enquiries",
    GymMembershipEnquiryViewSet,
    basename="staff-gym-membership-enquiry",
)

urlpatterns = router.urls
