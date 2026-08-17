from django.db import models
from django.contrib.auth.models import User


class UserProfile(models.Model):
    """Extended user profile with industrial-specific fields."""
    ROLE_CHOICES = [
        ("admin", "Administrator"),
        ("operator", "Operator"),
        ("engineer", "Engineer"),
        ("manager", "Plant Manager"),
        ("supervisor", "Supervisor"),
        ("viewer", "Viewer"),
    ]

    GROUP_CHOICES = [
        ("operations", "Operations Team"),
        ("admin_team", "Admin Team"),
        ("engineering", "Engineering Team"),
        ("management", "Management"),
        ("maintenance", "Maintenance Team"),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile")
    mobile_number = models.CharField(max_length=20, blank=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default="operator")
    organization = models.CharField(max_length=200, blank=True)
    timezone = models.CharField(max_length=50, default="Asia/Kolkata")
    user_group = models.CharField(max_length=50, choices=GROUP_CHOICES, default="operations", blank=True)
    language = models.CharField(max_length=20, default="English")
    is_active_user = models.BooleanField(default=True)
    account_expires = models.DateField(null=True, blank=True)
    remarks = models.TextField(blank=True)
    receive_email = models.BooleanField(default=True)
    receive_sms = models.BooleanField(default=False)
    mobile_app_access = models.BooleanField(default=True)
    assigned_tanks = models.ManyToManyField('Tank', blank=True, related_name="assigned_profiles")

    def __str__(self):
        return f"{self.user.get_full_name()} - {self.get_role_display()}"


class ModulePermission(models.Model):
    """Per-user, per-module access permission flags."""
    profile = models.ForeignKey(UserProfile, on_delete=models.CASCADE, related_name="permissions")
    module_name = models.CharField(max_length=50)
    can_view = models.BooleanField(default=True)
    can_add = models.BooleanField(default=False)
    can_edit = models.BooleanField(default=False)
    can_delete = models.BooleanField(default=False)
    can_export = models.BooleanField(default=False)

    class Meta:
        unique_together = ("profile", "module_name")

    def __str__(self):
        return f"{self.profile.user.username} - {self.module_name}"


class WorkspaceConfig(models.Model):
    """Stores the initial workspace setup configuration."""
    INDUSTRY_CHOICES = [
        ("oil_gas", "Oil & Gas"),
        ("petrochemical", "Petrochemical"),
        ("pharmaceutical", "Pharmaceutical"),
        ("water_treatment", "Water Treatment"),
        ("power_generation", "Power Generation"),
        ("food_beverage", "Food & Beverage"),
        ("chemical", "Chemical Processing"),
        ("manufacturing", "Manufacturing"),
        ("other", "Other"),
    ]

    STORAGE_CHOICES = [
        ("local", "Local Storage"),
        ("cloud", "Cloud Storage"),
        ("hybrid", "Hybrid (Local + Cloud)"),
    ]

    UNIT_CHOICES = [
        ("metric", "Metric (KL, °C, bar)"),
        ("imperial", "Imperial (gal, °F, psi)"),
    ]

    full_name = models.CharField(max_length=200)
    email = models.EmailField()
    company_name = models.CharField(max_length=200)
    industry_type = models.CharField(max_length=50, choices=INDUSTRY_CHOICES)
    country = models.CharField(max_length=100)
    phone_number = models.CharField(max_length=20, blank=True)
    timezone = models.CharField(max_length=50, default="Asia/Kolkata")
    language = models.CharField(max_length=20, default="English")
    activation_key = models.CharField(max_length=100, blank=True)
    is_activated = models.BooleanField(default=False)
    system_usage = models.CharField(max_length=50, blank=True)
    number_of_sites = models.IntegerField(default=1)
    preferred_storage = models.CharField(max_length=20, choices=STORAGE_CHOICES, default="local")
    units_preference = models.CharField(max_length=20, choices=UNIT_CHOICES, default="metric")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.company_name} - {self.full_name}"


class Tank(models.Model):
    """Represents a physical tank in the monitoring system."""
    tank_id = models.CharField(max_length=20, unique=True)
    name = models.CharField(max_length=100)
    capacity_kl = models.FloatField(default=5.0)
    capacity_unit = models.CharField(max_length=15, default="KL", null=True, blank=True)
    location = models.CharField(max_length=200, blank=True)
    is_active = models.BooleanField(default=True)
    high_limit = models.FloatField(default=90.0)
    low_limit = models.FloatField(default=10.0)
    register_address = models.IntegerField(default=40001)
    widget_type = models.CharField(max_length=20, default="cylinder")
    slave_id = models.IntegerField(default=1)
    function_code = models.IntegerField(default=3)
    data_type = models.CharField(max_length=20, default="UInt16")
    byte_order = models.CharField(max_length=10, default="ABCD")
    scaling = models.FloatField(default=1.0)
    offset = models.FloatField(default=0.0)
    unit = models.CharField(max_length=10, default="%")
    # 4-20mA calibration: raw register value at 4mA (0%) and 20mA (100%)
    raw_zero = models.FloatField(default=0.0)  # Raw register value at 4mA (0%)
    raw_span = models.FloatField(default=0.0)  # Raw register value at 20mA (100%)
    # Independent 2-Point Scanner Calibration (Custom Start 0% and End 100% values)
    scanner_raw_zero = models.FloatField(default=0.0)
    scanner_raw_span = models.FloatField(default=0.0)
    alarm_enabled = models.BooleanField(default=True)
    error_accuracy = models.FloatField(default=0.0)

    # Flow Meter specific fields if widget_type == 'flow_meter'
    flow_rate_register = models.IntegerField(default=40001, null=True, blank=True)
    total_volume_register = models.IntegerField(default=40003, null=True, blank=True)
    flow_unit = models.CharField(max_length=10, default="L/min", null=True, blank=True)
    total_unit = models.CharField(max_length=10, default="Liters", null=True, blank=True)

    def __str__(self):
        return f"{self.tank_id} - {self.name}"


class TankReading(models.Model):
    """Stores tank level readings over time."""
    tank = models.ForeignKey(Tank, on_delete=models.CASCADE, related_name="readings")
    level_percent = models.FloatField()
    raw_value = models.FloatField(null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    
    # Flow Meter readings if tank has widget_type == 'flow_meter'
    flow_rate = models.FloatField(null=True, blank=True)
    total_flow = models.FloatField(null=True, blank=True)

    class Meta:
        ordering = ["-timestamp"]

    def __str__(self):
        return f"{self.tank.tank_id}: {self.level_percent}% at {self.timestamp}"


class Alarm(models.Model):
    """Tracks alarm events for tanks."""
    ALARM_TYPE_CHOICES = [
        ("high", "High Alarm"),
        ("low", "Low Alarm"),
    ]

    tank = models.ForeignKey(Tank, on_delete=models.CASCADE, related_name="alarms", null=True, blank=True)
    flow_meter = models.ForeignKey('FlowMeter', on_delete=models.CASCADE, related_name="alarms", null=True, blank=True)
    alarm_type = models.CharField(max_length=10, choices=ALARM_TYPE_CHOICES)
    level_percent = models.FloatField() # Used for flow rate in flow meters
    timestamp = models.DateTimeField(auto_now_add=True)
    acknowledged = models.BooleanField(default=False)
    snooze_until = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-timestamp"]

    def __str__(self):
        device_name = self.tank.tank_id if self.tank else (self.flow_meter.meter_id if self.flow_meter else "Unknown")
        return f"{device_name} - {self.get_alarm_type_display()} ({self.level_percent})"


class EventLog(models.Model):
    """Stores system-wide logs and device communication events."""
    timestamp = models.DateTimeField(auto_now_add=True)
    event_type = models.CharField(max_length=50)  # e.g., INFO, WARNING, CRITICAL, SYSTEM
    source = models.CharField(max_length=100)     # e.g., Sensor, Security, Connection
    message = models.TextField()

    class Meta:
        ordering = ["-timestamp"]

    def __str__(self):
        return f"[{self.event_type}] {self.message} at {self.timestamp}"


class SerialConnectionConfig(models.Model):
    """Stores the active serial port settings for Modbus communications."""
    profile_name = models.CharField(max_length=50, default="Tanks", unique=True)
    connection_name = models.CharField(max_length=100, default="Masibus Scanner 01")
    device_type = models.CharField(max_length=100, default="Masibus Scanner")
    connection_type = models.CharField(max_length=50, default="Serial (RS485)")
    com_port = models.CharField(max_length=20, default="COM3")
    baud_rate = models.IntegerField(default=9600)
    data_bits = models.IntegerField(default=8)
    parity = models.CharField(max_length=10, default="None")
    stop_bits = models.IntegerField(default=1)
    slave_id = models.IntegerField(default=1)

    timeout = models.FloatField(default=1.0)
    retry_count = models.IntegerField(default=3)
    polling_interval = models.FloatField(default=5.0)
    response_delay = models.FloatField(default=0.0)
    rts_delay = models.FloatField(default=0.0)
    auto_reconnect = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.com_port} - {self.connection_name}"


class SimulatedRegister(models.Model):
    """Simulates physical Modbus register values for testing purposes."""
    register_address = models.IntegerField(unique=True)
    value = models.IntegerField(default=0)
    last_updated = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Register {self.register_address}: {self.value}"


class ModbusDiagnosticStats(models.Model):
    """Tracks physical Modbus connection packet transmission status and health."""
    tx_packets = models.IntegerField(default=0)
    rx_packets = models.IntegerField(default=0)
    crc_errors = models.IntegerField(default=0)
    timeout_count = models.IntegerField(default=0)
    response_time_ms = models.FloatField(default=0.0)
    comm_quality = models.FloatField(default=100.0)
    last_comm = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"Packets TX={self.tx_packets} RX={self.rx_packets} Quality={self.comm_quality}%"


class ModbusFrameLog(models.Model):
    """Logs raw hexadecimal request and response frames passing over serial interface."""
    timestamp = models.DateTimeField(auto_now_add=True)
    direction = models.CharField(max_length=5) # e.g. "TX" or "RX"
    frame_hex = models.TextField()

    class Meta:
        ordering = ["-timestamp"]

    def __str__(self):
        return f"{self.direction}: {self.frame_hex} at {self.timestamp}"


class FlowMeter(models.Model):
    """Represents a physical flow meter in the monitoring system."""
    meter_id = models.CharField(max_length=20, unique=True)
    name = models.CharField(max_length=100)
    location = models.CharField(max_length=200, blank=True)
    is_active = models.BooleanField(default=True)
    
    slave_id = models.IntegerField(default=1)
    flow_rate_register = models.IntegerField(default=40001)
    total_volume_register = models.IntegerField(default=40003, null=True, blank=True)
    function_code = models.IntegerField(default=3)
    data_type = models.CharField(max_length=20, default="Float32")
    byte_order = models.CharField(max_length=10, default="ABCD")
    
    flow_unit = models.CharField(max_length=20, default="L/min")
    total_unit = models.CharField(max_length=20, default="Liters", null=True, blank=True)
    high_limit = models.FloatField(default=90.0)
    low_limit = models.FloatField(default=10.0)
    alarm_enabled = models.BooleanField(default=True)
    error_accuracy = models.FloatField(default=0.0)
    
    # 2-Point Scanner Calibration for Flow Meters
    scanner_raw_zero = models.FloatField(default=0.0)
    scanner_raw_span = models.FloatField(default=0.0)
    calibrated_span = models.FloatField(default=100.0)

    def __str__(self):
        return f"{self.meter_id} - {self.name}"


class FlowMeterReading(models.Model):
    """Stores flow meter readings over time."""
    flow_meter = models.ForeignKey(FlowMeter, on_delete=models.CASCADE, related_name="readings")
    flow_rate = models.FloatField(default=0.0)
    total_volume = models.FloatField(default=0.0)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-timestamp"]

    def __str__(self):
        return f"{self.flow_meter.meter_id}: {self.flow_rate} {self.flow_meter.flow_unit} at {self.timestamp}"


class LicenseConfig(models.Model):
    """Stores system license configuration."""
    license_type = models.CharField(max_length=50, default="3-Day Lifetime Trial License")
    license_key = models.CharField(max_length=100, default="RADIOGEET-AXIONIX-S3CR3T-K3Y-2026-3T")
    is_active = models.BooleanField(default=True)

    def save(self, *args, **kwargs):
        # Singleton pattern: only allow one instance
        self.pk = 1
        super(LicenseConfig, self).save(*args, **kwargs)

    @classmethod
    def load(cls):
        obj, created = cls.objects.get_or_create(pk=1)
        return obj

    def __str__(self):
        return f"{self.license_type} - {self.license_key}"


class LicenseKey(models.Model):
    """Tracks individual, single-use license keys."""
    key = models.CharField(max_length=50, unique=True, help_text="The license key string")
    duration_days = models.IntegerField(default=365, help_text="Duration of the license in days")
    is_used = models.BooleanField(default=False, help_text="Whether this key has been activated")
    activated_at = models.DateTimeField(null=True, blank=True, help_text="When the key was activated")
    expires_at = models.DateTimeField(null=True, blank=True, help_text="When the license expires")

    def __str__(self):
        return f"{self.key} (Used: {self.is_used})"
