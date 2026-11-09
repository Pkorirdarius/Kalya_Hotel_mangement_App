from django.contrib.auth.models import AbstractUser
from django.db import models


class UserRole(models.TextChoices):
    DIRECTOR = "director", "Director"
    DATA_MANAGER = "data_manager", "Data manager"
    FRONT_DESK = "front_desk", "Front desk"
    MARKETING = "marketing", "Marketing"
    ICT_ADMIN = "ict_admin", "ICT admin"


class User(AbstractUser):
    role = models.CharField(
        max_length=32,
        choices=UserRole.choices,
        default=UserRole.FRONT_DESK,
    )
    phone = models.CharField(max_length=32, blank=True)

    def has_role(self, *roles: str) -> bool:
        return self.role in roles

    @property
    def is_hotel_staff(self) -> bool:
        return bool(self.is_active and self.is_staff)

    @property
    def capabilities(self) -> dict[str, bool]:
        if self.is_superuser:
            return {
                "view_guest_data": True,
                "export_guest_data": True,
                "manage_bookings": True,
                "manage_content": True,
                "manage_system": True,
            }
        return {
            "view_guest_data": self.has_role(
                UserRole.DIRECTOR, UserRole.DATA_MANAGER, UserRole.FRONT_DESK
            ),
            "export_guest_data": self.has_role(
                UserRole.DIRECTOR, UserRole.DATA_MANAGER
            ),
            "manage_bookings": self.has_role(
                UserRole.DIRECTOR, UserRole.DATA_MANAGER, UserRole.FRONT_DESK
            ),
            "manage_content": self.has_role(UserRole.DIRECTOR, UserRole.MARKETING),
            "manage_system": self.has_role(UserRole.DIRECTOR, UserRole.ICT_ADMIN),
        }

    def __str__(self) -> str:
        return f"{self.get_full_name() or self.username} ({self.get_role_display()})"
