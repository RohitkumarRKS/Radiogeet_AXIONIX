from django.test import TestCase
from core.views import format_tank_level, format_tank_capacity

class UnitConversionTests(TestCase):
    def test_percentage_unit(self):
        self.assertEqual(format_tank_level(80.0, 5.0, "%"), "80.0%")
        self.assertEqual(format_tank_capacity(5.0, "%"), "5.0 KL")

    def test_liters_unit(self):
        # 80% of 5 KL = 4000 L
        self.assertEqual(format_tank_level(80.0, 5.0, "L"), "4000 L")
        self.assertEqual(format_tank_level(80.0, 5.0, "Liters"), "4000 L")
        self.assertEqual(format_tank_capacity(5.0, "L"), "5000 L")

    def test_kiloliters_unit(self):
        # 80% of 5 KL = 4.0 KL
        self.assertEqual(format_tank_level(80.0, 5.0, "KL"), "4.0 KL")
        self.assertEqual(format_tank_capacity(5.0, "KL"), "5.0 KL")

    def test_cubic_meters_unit(self):
        # 80% of 5 KL = 4.0 m³
        self.assertEqual(format_tank_level(80.0, 5.0, "m³"), "4.0 m³")
        self.assertEqual(format_tank_capacity(5.0, "m³"), "5.0 m³")

    def test_gallons_unit(self):
        # 80% of 5 KL = 4.0 * 264.172 = 1056.7 gal
        self.assertEqual(format_tank_level(80.0, 5.0, "gal"), "1056.7 gal")
        self.assertEqual(format_tank_capacity(5.0, "gal"), "1320.9 gal")


class LicenseKeyValidationTests(TestCase):
    def test_license_key_seeding(self):
        from core.models import LicenseKey
        from core.views import ensure_one_year_keys_exist

        # Initial count of license keys
        self.assertEqual(LicenseKey.objects.count(), 0)

        # Seed keys
        ensure_one_year_keys_exist()

        # Check that we seeded 10 one-year, 10 two-year, 10 three-year, and 10 lifetime keys
        self.assertEqual(LicenseKey.objects.count(), 40)

        # Check a 2-year key
        two_year_lic = LicenseKey.objects.get(key="RADIOGEET-SRKB-TDH6-SZ3J")
        self.assertEqual(two_year_lic.duration_days, 730)

        # Check a 3-year key
        three_year_lic = LicenseKey.objects.get(key="RADIOGEET-LVDW-I90R-Z0CB")
        self.assertEqual(three_year_lic.duration_days, 1095)

        # Check a lifetime key
        lifetime_lic = LicenseKey.objects.get(key="RADIOGEET-2VJ0-JR04-OM5D")
        self.assertEqual(lifetime_lic.duration_days, 36500)
