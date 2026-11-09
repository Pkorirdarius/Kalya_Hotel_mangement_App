from rest_framework.permissions import BasePermission

from .models import UserRole


class RolePermission(BasePermission):
    roles: tuple[str, ...] = ()
    message = "You do not have permission to perform this action."

    def has_permission(self, request, view) -> bool:
        user = request.user
        if not (user and user.is_authenticated and user.is_active):
            return False
        if user.is_superuser:
            return True
        if not user.is_staff:
            return False
        return user.role in self.roles


class IsHotelStaff(RolePermission):
    roles = tuple(UserRole.values)


class IsDirectorOrDataManager(RolePermission):
    roles = (UserRole.DIRECTOR, UserRole.DATA_MANAGER)


class CanManageBookings(RolePermission):
    roles = (UserRole.DIRECTOR, UserRole.DATA_MANAGER, UserRole.FRONT_DESK)


class CanManageContent(RolePermission):
    roles = (UserRole.DIRECTOR, UserRole.MARKETING)


class CanManageSystem(RolePermission):
    roles = (UserRole.DIRECTOR, UserRole.ICT_ADMIN)
