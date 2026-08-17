import random
from django.core.management.base import BaseCommand
from core.models import (
    Tank, TankReading, FlowMeter, FlowMeterReading,
    SimulatedRegister, SerialConnectionConfig
)


class Command(BaseCommand):
    help = "Seeds 22 tanks and 7 flow meters with simulated register data."

    def handle(self, *args, **options):
        # Clear existing data
        TankReading.objects.all().delete()
        FlowMeterReading.objects.all().delete()
        SimulatedRegister.objects.all().delete()
        FlowMeter.objects.all().delete()
        Tank.objects.all().delete()
        self.stdout.write("[SEED] Cleared existing data.")

        tank_names = [
            "HSD Storage Tank", "FO Day Tank", "Lube Oil Reservoir",
            "DM Water Tank", "Raw Water Tank", "Diesel Service Tank",
            "Chemical Dosing Tank", "Acid Storage Tank", "Caustic Soda Tank",
            "Condensate Tank", "Feed Water Tank", "Cooling Tower Basin",
            "Waste Oil Tank", "Transformer Oil Tank", "Hydraulic Oil Tank",
            "Nitrogen Buffer Tank", "Ammonia Storage Tank", "Ethanol Tank",
            "Methanol Tank", "Brine Tank", "Glycol Tank", "Effluent Holding Tank",
        ]

        widget_types = ["cylinder", "sphere", "rectangle"]
        capacities = [5, 10, 15, 20, 25, 50, 75, 100, 150, 200]

        for i in range(22):
            tank_id = f"TK-{i+1:02d}"
            reg = 40001 + i
            cap = random.choice(capacities)
            widget = widget_types[i % 3]
            hl = random.choice([85.0, 90.0, 95.0])
            ll = random.choice([5.0, 10.0, 15.0])
            sim_val = random.randint(5, 95)

            tank = Tank.objects.create(
                tank_id=tank_id, name=tank_names[i], capacity_kl=cap,
                location=f"Area {chr(65 + i % 6)}, Bay {(i // 6) + 1}",
                is_active=True, high_limit=hl, low_limit=ll,
                register_address=reg, widget_type=widget, slave_id=1,
                function_code=3, data_type="UInt16", byte_order="ABCD",
                scaling=1.0, offset=0.0, unit="%", raw_zero=0.0, raw_span=0.0,
            )
            SimulatedRegister.objects.create(register_address=reg, value=sim_val)
            TankReading.objects.create(tank=tank, level_percent=float(sim_val))
            self.stdout.write(f"  [TANK] {tank_id} | {tank_names[i]} | Reg={reg} | Level={sim_val}%")

        flow_names = [
            "Cooling Water Inlet", "Boiler Feed Line", "Process Water Main",
            "Chilled Water Return", "Hot Water Circulation", "RO Permeate Line",
            "Condensate Return",
        ]

        for i in range(7):
            mid = f"FM-{i+1:02d}"
            fr_reg = 40101 + (i * 2)
            tv_reg = 40102 + (i * 2)
            fr_val = random.randint(10, 500)
            tv_val = random.randint(1000, 99999)

            fm = FlowMeter.objects.create(
                meter_id=mid, name=flow_names[i],
                location=f"Pipe Section {chr(65 + i)}, Floor {(i // 3) + 1}",
                is_active=True, slave_id=1,
                flow_rate_register=fr_reg, total_volume_register=tv_reg,
                function_code=3, data_type="Float32", byte_order="ABCD",
                flow_unit="L/min", total_unit="Liters",
            )
            SimulatedRegister.objects.create(register_address=fr_reg, value=fr_val)
            SimulatedRegister.objects.create(register_address=tv_reg, value=tv_val)
            FlowMeterReading.objects.create(flow_meter=fm, flow_rate=float(fr_val), total_volume=float(tv_val))
            self.stdout.write(f"  [FLOW] {mid} | {flow_names[i]} | FlowReg={fr_reg} | Rate={fr_val} L/min")

        for pn in ["Tanks", "Flow Meters"]:
            cfg, created = SerialConnectionConfig.objects.get_or_create(
                profile_name=pn,
                defaults={"connection_name": f"Simulator ({pn})", "com_port": "SIMULATOR", "baud_rate": 9600, "polling_interval": 5.0},
            )
            if not created:
                cfg.com_port = "SIMULATOR"
                cfg.save()
            self.stdout.write(f"  [CONFIG] {pn} -> SIMULATOR")

        self.stdout.write(self.style.SUCCESS("\n[SEED] Done! 22 tanks + 7 flow meters created."))
