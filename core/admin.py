from django.contrib import admin
from .models import UserProfile, WorkspaceConfig, Tank, TankReading, Alarm, EventLog, ModulePermission, SimulatedRegister, LicenseConfig


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "role", "organization", "mobile_number", "user_group", "is_active_user")
    list_filter = ("role", "user_group", "is_active_user")


@admin.register(ModulePermission)
class ModulePermissionAdmin(admin.ModelAdmin):
    list_display = ("profile", "module_name", "can_view", "can_add", "can_edit", "can_delete", "can_export")
    list_filter = ("module_name",)


@admin.register(WorkspaceConfig)
class WorkspaceConfigAdmin(admin.ModelAdmin):
    list_display = ("company_name", "full_name", "industry_type", "is_activated")
    list_filter = ("industry_type", "is_activated")


@admin.register(Tank)
class TankAdmin(admin.ModelAdmin):
    list_display = ("tank_id", "name", "capacity_kl", "is_active")
    list_filter = ("is_active",)


@admin.register(TankReading)
class TankReadingAdmin(admin.ModelAdmin):
    list_display = ("tank", "level_percent", "timestamp")
    list_filter = ("tank",)


@admin.register(Alarm)
class AlarmAdmin(admin.ModelAdmin):
    list_display = ("tank", "alarm_type", "level_percent", "timestamp", "acknowledged")
    list_filter = ("alarm_type", "acknowledged")


@admin.register(EventLog)
class EventLogAdmin(admin.ModelAdmin):
    list_display = ("timestamp", "event_type", "source", "message")
    list_filter = ("event_type", "source")


@admin.register(SimulatedRegister)
class SimulatedRegisterAdmin(admin.ModelAdmin):
    list_display = ("register_address", "value", "last_updated")
    list_filter = ("register_address",)

@admin.register(LicenseConfig)
class LicenseConfigAdmin(admin.ModelAdmin):
    list_display = ("license_type", "license_key", "is_active")
