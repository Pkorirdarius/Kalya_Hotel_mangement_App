from django.urls import path

from .views import (
    BlogPostDetailView,
    BlogPostListView,
    OfferListView,
    PolicyPageDetailView,
    ReviewListView,
)

urlpatterns = [
    path("posts/", BlogPostListView.as_view(), name="post-list"),
    path("posts/<slug:slug>/", BlogPostDetailView.as_view(), name="post-detail"),
    path("policies/<slug:slug>/", PolicyPageDetailView.as_view(), name="policy-detail"),
    path("offers/", OfferListView.as_view(), name="offer-list"),
    path("reviews/", ReviewListView.as_view(), name="review-list"),
]
