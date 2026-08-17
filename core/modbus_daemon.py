import time
import threading
import struct
import math
from django.utils import timezone
from .models import (
    Tank, TankReading, Alarm, EventLog, SerialConnectionConfig,
    ModbusDiagnosticStats, ModbusFrameLog, FlowMeter, FlowMeterReading
)

# Global flag to control thread execution
running = True
com_locks = {}
com_locks_lock = threading.Lock()

def get_com_lock(com_port):
    with com_locks_lock:
        if com_port not in com_locks:
            com_locks[com_port] = threading.Lock()
        return com_locks[com_port]

modbus_lock = get_com_lock("COM3")

# Snooze states for offline/faulty devices to keep the polling loop fast
device_consecutive_failures = {}
device_snooze_until = {}
device_snooze_lock = threading.Lock()

def clear_device_snooze():
    with device_snooze_lock:
        device_consecutive_failures.clear()
        device_snooze_until.clear()

# Import minimalmodbus in a safe way
try:
    import minimalmodbus
    import serial
    import serial.tools.list_ports
except ImportError:
    minimalmodbus = None
    serial = None


class LoggingInstrument(minimalmodbus.Instrument if minimalmodbus else object):
    """
    Subclass of minimalmodbus.Instrument that intercepts _communicate()
    to log raw transmitted and received hexadecimal frames into ModbusFrameLog,
    and updates ModbusDiagnosticStats.
    
    Uses close_port_after_each_call=True (RadioDAQ pattern) for robust
    Windows serial port handling — minimalmodbus opens/closes the port
    automatically per transaction, preventing "port already in use" conflicts.
    """
    def __init__(self, port, slaveaddress, close_port_after_each_call=True, debug=False, response_delay=0.0):
        if minimalmodbus:
            super().__init__(
                port,
                slaveaddress,
                mode='rtu',
                close_port_after_each_call=close_port_after_each_call,
                debug=debug
            )
            # Clear stale bytes from previous failed reads before each transaction
            self.clear_buffers_before_each_transaction = True
            # Handle RS485 adapters that echo transmitted data back
            self.handle_local_echo = False
        self.response_delay = response_delay

    def _communicate(self, request, number_of_bytes_to_read):
        if self.response_delay > 0:
            time.sleep(self.response_delay)

        # Log TX packets stat
        try:
            stats, _ = ModbusDiagnosticStats.objects.get_or_create(id=1)
            stats.tx_packets += 1
            stats.save(update_fields=['tx_packets'])
        except:
            pass

        # Log TX Frame
        try:
            hex_tx = " ".join(f"{b:02X}" for b in request)
            ModbusFrameLog.objects.create(direction="TX", frame_hex=hex_tx)
        except Exception:
            pass

        # Call parent communication with exception capturing
        try:
            response = super()._communicate(request, number_of_bytes_to_read)
        except Exception as e:
            # Increment failure stats (CRC or Timeout)
            try:
                stats, _ = ModbusDiagnosticStats.objects.get_or_create(id=1)
                err_str = str(e).lower()
                if "checksum" in err_str or "crc" in err_str:
                    stats.crc_errors += 1
                    stats.save(update_fields=['crc_errors'])
                else:
                    stats.timeout_count += 1
                    stats.save(update_fields=['timeout_count'])
            except:
                pass
            raise e

        # Log RX packets stat
        try:
            stats, _ = ModbusDiagnosticStats.objects.get_or_create(id=1)
            stats.rx_packets += 1
            stats.save(update_fields=['rx_packets'])
        except:
            pass

        # Log RX Frame
        try:
            hex_rx = " ".join(f"{b:02X}" for b in response)
            ModbusFrameLog.objects.create(direction="RX", frame_hex=hex_rx)
        except Exception:
            pass

        # Rolling cleanup of older frame logs (> 100)
        try:
            count = ModbusFrameLog.objects.count()
            if count > 100:
                oldest_ids = ModbusFrameLog.objects.order_by("-timestamp")[100:].values_list("id", flat=True)
                ModbusFrameLog.objects.filter(id__in=oldest_ids).delete()
        except:
            pass

        return response


def decode_registers(registers, data_type, byte_order):
    """
    Decodes a list of 16-bit integers (registers) into the specified data_type
    using the specified byte_order ('ABCD', 'BADC', 'CDAB', 'DCBA').
    """
    if not registers:
        return 0.0

    raw_bytes = bytearray()
    for reg in registers:
        raw_bytes.extend(struct.pack('>H', reg))

    if len(raw_bytes) == 2:
        b0, b1 = raw_bytes[0], raw_bytes[1]
        if byte_order in ('BADC', 'DCBA'):
            swapped = bytes([b1, b0])
        else:
            swapped = bytes([b0, b1])
            
        if data_type == 'Boolean':
            val = struct.unpack('>H', swapped)[0]
            return 1.0 if val != 0 else 0.0
        elif data_type == 'Int16':
            return float(struct.unpack('>h', swapped)[0])
        else:  # UInt16
            return float(struct.unpack('>H', swapped)[0])
            
    elif len(raw_bytes) == 4:
        b0, b1, b2, b3 = raw_bytes[0], raw_bytes[1], raw_bytes[2], raw_bytes[3]
        if byte_order == 'ABCD':
            swapped = bytes([b0, b1, b2, b3])
        elif byte_order == 'BADC':
            swapped = bytes([b1, b0, b3, b2])
        elif byte_order == 'CDAB':
            swapped = bytes([b2, b3, b0, b1])
        elif byte_order == 'DCBA':
            swapped = bytes([b3, b2, b1, b0])
        else:
            swapped = bytes([b0, b1, b2, b3])
            
        if data_type == 'Int32':
            val = float(struct.unpack('>i', swapped)[0])
        elif data_type == 'UInt32':
            val = float(struct.unpack('>I', swapped)[0])
        elif data_type == 'Float32':
            val = float(struct.unpack('>f', swapped)[0])
        else:
            val = float(registers[0])

        if math.isnan(val) or math.isinf(val):
            return 0.0
        return val
            
    elif len(raw_bytes) == 8:
        if byte_order in ('DCBA', 'CDAB'):
            swapped = bytes(reversed(raw_bytes))
        else:
            swapped = bytes(raw_bytes)
        val = float(struct.unpack('>d', swapped)[0])
        if math.isnan(val) or math.isinf(val):
            return 0.0
        return val
        
    val = float(registers[0])
    if math.isnan(val) or math.isinf(val):
        return 0.0
    return val


def scale_raw_value(val, raw_zero=0.0, raw_span=0.0):
    """
    If raw_zero and raw_span are both 0.0 (or invalid), pass raw scanner value through directly.
    Otherwise, scale 0-100% proportionally between raw_zero and raw_span.
    """
    scaled_val = float(val)
    if scaled_val < 0 or scaled_val > 30000 or scaled_val in (32765.0, 32767.0, 65534.0, 65535.0):
        return 0.0
        
    if raw_zero == 0.0 and raw_span == 0.0:
        return max(0.0, scaled_val)
    if raw_span <= raw_zero:
        return max(0.0, scaled_val)

    percentage = ((scaled_val - raw_zero) / (raw_span - raw_zero)) * 100.0
    return max(0.0, min(100.0, percentage))


def format_tank_value(level_percent, capacity_kl, unit, raw_val=None):
    if unit == "RAW":
        v = raw_val if raw_val is not None else level_percent
        if v is None:
            return "--"
        if isinstance(v, (int, float)) and float(v).is_integer():
            return f"{int(v)}"
        return f"{float(v):.1f}"
    if level_percent is None:
        return "--"
    unit = (unit or "%").strip()
    cap = float(capacity_kl) if capacity_kl else 5.0
    if unit == "%":
        return f"{level_percent:.1f}%"
    elif unit in ("L", "Liters"):
        liters = (level_percent / 100.0) * cap * 1000.0
        return f"{round(liters)} L"
    elif unit in ("mL", "Milliliters"):
        ml = (level_percent / 100.0) * (cap * 1000.0 if cap <= 100 else cap) * 1000.0
        return f"{round(ml)} mL"
    elif unit in ("KL", "Kiloliters"):
        kl = (level_percent / 100.0) * cap
        return f"{kl:.1f} KL"
    elif unit in ("m³", "m3"):
        m3 = (level_percent / 100.0) * cap
        return f"{m3:.1f} m³"
    elif unit in ("gal", "Gallons"):
        gal = (level_percent / 100.0) * cap * 264.172
        return f"{gal:.1f} gal"
    else:
        return f"{level_percent:.1f} {unit}"


def compute_tank_level_and_raw(device, val):
    unscaled_raw = float(val)
    if abs(unscaled_raw) < 1e-10:
        unscaled_raw = 0.0
    if unscaled_raw < 0 or unscaled_raw > 30000 or unscaled_raw in (32765.0, 32767.0, 65534.0, 65535.0):
        return {"level_percent": 0.0, "raw_value": 0.0}
    
    scaling = getattr(device, 'scaling', 1.0)
    offset = getattr(device, 'offset', 0.0)
    unscaled_raw = unscaled_raw * scaling + offset
    if unscaled_raw < 0 or unscaled_raw > 30000:
        return {"level_percent": 0.0, "raw_value": 0.0}
    
    unit = getattr(device, 'unit', '%')
    s_zero = getattr(device, 'scanner_raw_zero', 0.0)
    s_span = getattr(device, 'scanner_raw_span', 0.0)
    r_zero = getattr(device, 'raw_zero', 0.0)
    r_span = getattr(device, 'raw_span', 0.0)
    
    if s_span > s_zero:
        level_percent = ((unscaled_raw - s_zero) / (s_span - s_zero)) * 100.0
        level_percent = max(0.0, min(100.0, level_percent))
    elif r_span > r_zero:
        level_percent = scale_raw_value(unscaled_raw, r_zero, r_span)
    else:
        level_percent = max(0.0, min(100.0, unscaled_raw))
        
    return {"level_percent": level_percent, "raw_value": unscaled_raw}


def read_modbus_values(profile_name):
    """
    Attempts to read data from configured devices using minimalmodbus for a specific profile.
    Returns (levels, status_msg, success)
    """
    levels = {}
    
    # Query configuration from database
    config = SerialConnectionConfig.objects.filter(profile_name=profile_name).first()
    if config:
        com_port = config.com_port
        baudrate = config.baud_rate
        bytesize = config.data_bits
        parity_str = config.parity
        stopbits = config.stop_bits
        timeout = config.timeout
        response_delay = config.response_delay
        config_slave_id = config.slave_id
    else:
        com_port = "COM3"
        baudrate = 9600
        bytesize = 8
        parity_str = "None"
        stopbits = 1
        timeout = 0.2
        response_delay = 0.0
        config_slave_id = 1
        
    # Get active devices based on profile
    if profile_name == "Tanks":
        devices = list(Tank.objects.filter(is_active=True))
    elif profile_name == "Flow Meters":
        devices = list(FlowMeter.objects.filter(is_active=True))
    else:
        devices = []
        
    if not devices:
        return {}, f"Telemetry scan offline. No {profile_name} configured for polling.", False

    # Database telemetry simulator mode
    if com_port == "SIMULATOR":
        success_count = 0
        errors = []
        start_time = time.perf_counter()
        
        time.sleep(0.05)
        
        for device in devices:
            is_flow = hasattr(device, 'meter_id')
            device_id = device.meter_id if is_flow else device.tank_id
            
            registers_to_read = []
            if is_flow:
                if device.flow_rate_register is not None:
                    registers_to_read.append(device.flow_rate_register)
                if device.total_volume_register is not None:
                    registers_to_read.append(device.total_volume_register)
            else:
                registers_to_read.append(device.register_address)
                
            device_results = {}
            last_err = None
            
            from .models import SimulatedRegister
            for raw_addr in registers_to_read:
                protocol_addr = raw_addr - 40001 if raw_addr >= 40000 else (raw_addr - 30001 if raw_addr >= 30000 else raw_addr)
                
                tx_frame = f"{device.slave_id:02X} {device.function_code:02X} {protocol_addr >> 8 & 0xFF:02X} {protocol_addr & 0xFF:02X} 00 01 D5 CA"
                ModbusFrameLog.objects.create(direction="TX", frame_hex=tx_frame)
                
                try:
                    sim_reg = SimulatedRegister.objects.filter(register_address=raw_addr).first()
                    if sim_reg is None:
                        sim_reg, _ = SimulatedRegister.objects.get_or_create(register_address=raw_addr, defaults={"value": 0})

                    val = sim_reg.value
                    
                    rx_frame = f"{device.slave_id:02X} {device.function_code:02X} 02 {val >> 8 & 0xFF:02X} {val & 0xFF:02X} 38 45"
                    ModbusFrameLog.objects.create(direction="RX", frame_hex=rx_frame)
                    
                    if float(val) in (32765.0, 32767.0, 65534.0, 65535.0):
                        device_results[raw_addr] = {"level_percent": 0.0, "raw_value": 0.0} if not is_flow else 0.0
                    else:
                        if not is_flow:
                            device_results[raw_addr] = compute_tank_level_and_raw(device, val)
                        else:
                            device_results[raw_addr] = float(val)
                    last_err = None
                except Exception as reg_err:
                    last_err = reg_err
                    errors.append(f"{device_id} (Register {raw_addr}): {str(reg_err)}")
            
            if not last_err:
                if is_flow:
                    levels[device_id] = {
                        "flow_rate": device_results.get(device.flow_rate_register, 0.0) if device.flow_rate_register is not None else 0.0,
                        "total_volume": device_results.get(device.total_volume_register, 0.0) if device.total_volume_register is not None else 0.0
                    }
                else:
                    levels[device_id] = device_results.get(device.register_address, 0.0)
                success_count += 1
                
        duration = (time.perf_counter() - start_time) * 1000.0
        
        try:
            stats, _ = ModbusDiagnosticStats.objects.get_or_create(id=1)
            stats.tx_packets += len(devices)
            stats.rx_packets += success_count
            stats.timeout_count += (len(devices) - success_count)
            stats.response_time_ms = duration
            stats.last_comm = timezone.now()
            
            total_attempts = stats.tx_packets
            failures = stats.crc_errors + stats.timeout_count
            if total_attempts > 0:
                stats.comm_quality = max(0.0, min(100.0, ((total_attempts - failures) / total_attempts) * 100.0))
            stats.save()
            
            count = ModbusFrameLog.objects.count()
            if count > 100:
                oldest_ids = ModbusFrameLog.objects.order_by("-timestamp")[100:].values_list("id", flat=True)
                ModbusFrameLog.objects.filter(id__in=oldest_ids).delete()
        except:
            pass
            
        if success_count > 0:
            return levels, f"Successfully read {success_count}/{len(devices)} {profile_name} simulated registers", True
        else:
            err_summary = errors[0] if errors else "No registers configured in simulator database"
            return {}, f"Simulation query failed: {err_summary}", False
    
    if not minimalmodbus or not serial:
        return {}, "Modbus libraries not installed.", False

    # Read retry_count from config (default 3)
    retry_count = 2
    if config:
        retry_count = max(1, config.retry_count)

    # Configure instrument — RadioDAQ pattern:
    # Let minimalmodbus manage the serial port lifecycle via close_port_after_each_call=True.
    # Do NOT manually call serial.open()/serial.close().
    instrument = None
    start_time = time.perf_counter()
    
    port_lock = get_com_lock(com_port)
    port_lock.acquire()
    try:
        available_ports = [p.device for p in serial.tools.list_ports.comports()]
        if com_port not in available_ports:
            return {}, f"Port {com_port} not available. Device might be disconnected.", False
        
        parity_map = {
            "None": serial.PARITY_NONE,
            "Even": serial.PARITY_EVEN,
            "Odd": serial.PARITY_ODD,
        }
        parity = parity_map.get(parity_str, serial.PARITY_NONE)
        
        # Configure custom Logging Instrument with close_port_after_each_call=True
        # Port is closed after transaction so shared ports do not trigger Access Denied errors
        instrument = LoggingInstrument(com_port, config_slave_id, close_port_after_each_call=True, response_delay=response_delay)
        instrument.serial.baudrate = baudrate
        instrument.serial.bytesize = bytesize
        instrument.serial.parity = parity
        instrument.serial.stopbits = stopbits
        instrument.serial.timeout = timeout
        success_count = 0
        errors = []
        
        # Group devices by (slave_id, function_code) to perform ultra-fast Multi-Register Block Reads
        device_groups = {}
        for dev in devices:
            dev_id = dev.meter_id if hasattr(dev, 'meter_id') else dev.tank_id
            with device_snooze_lock:
                if dev_id in device_snooze_until and time.time() < device_snooze_until[dev_id]:
                    continue
            
            is_f = hasattr(dev, 'meter_id') or (hasattr(dev, 'widget_type') and dev.widget_type == 'flow_meter')
            raw_a = dev.flow_rate_register if is_f else dev.register_address
            if raw_a is None:
                continue
                
            if raw_a >= 40000:
                fc = 3
                prot_a = raw_a - 40001
            elif raw_a >= 30000:
                fc = 4
                prot_a = raw_a - 30001
            else:
                fc = getattr(dev, 'function_code', 4)
                prot_a = raw_a
                
            key = (dev.slave_id, fc)
            if key not in device_groups:
                device_groups[key] = []
            device_groups[key].append((dev, raw_a, prot_a, is_f))

        for (s_id, fc), group_devs in device_groups.items():
            instrument.address = s_id
            
            # Check if group qualifies for a single Block Read query
            prot_addrs = [item[2] for item in group_devs]
            min_p = min(prot_addrs)
            max_p = max(prot_addrs)
            block_count = (max_p - min_p) + 1
            
            block_success = False
            block_data = {}
            
            # Attempt Block Read if all data_types are 16-bit (UInt16/Int16) and count <= 32 registers
            all_16bit = all(getattr(item[0], 'data_type', 'UInt16') in ('UInt16', 'Int16') for item in group_devs)
            if all_16bit and block_count <= 32 and fc in (3, 4):
                for attempt in range(retry_count):
                    try:
                        regs = instrument.read_registers(min_p, block_count, functioncode=fc)
                        for item in group_devs:
                            dev, raw_a, prot_a, is_f = item
                            idx = prot_a - min_p
                            raw_val = float(regs[idx])
                            block_data[raw_a] = raw_val
                        block_success = True
                        break
                    except Exception:
                        if attempt < retry_count - 1:
                            time.sleep(0.02)

            # Process devices in group
            for item in group_devs:
                dev, raw_a, prot_a, is_f = item
                dev_id = dev.meter_id if hasattr(dev, 'meter_id') else dev.tank_id
                device_results = {}
                last_err = None
                
                if block_success and raw_a in block_data:
                    raw_val = block_data[raw_a]
                    if not is_f:
                        device_results[raw_a] = compute_tank_level_and_raw(dev, raw_val)
                    else:
                        device_results[raw_a] = float(raw_val)
                else:
                    # Single read fallback
                    for attempt in range(retry_count):
                        try:
                            if fc in (1, 2):
                                val = instrument.read_bit(prot_a, functioncode=fc)
                                raw_val = float(val)
                            else:
                                num_regs = 1
                                d_type = getattr(dev, 'data_type', 'UInt16')
                                if d_type in ("Int32", "UInt32", "Float32"):
                                    num_regs = 2
                                elif d_type == "Float64":
                                    num_regs = 4
                                regs = instrument.read_registers(prot_a, num_regs, functioncode=fc)
                                raw_val = decode_registers(regs, d_type, getattr(dev, 'byte_order', 'ABCD'))
                            
                            if not is_f:
                                device_results[raw_a] = compute_tank_level_and_raw(dev, raw_val)
                            else:
                                device_results[raw_a] = float(raw_val)
                            last_err = None
                            break
                        except Exception as reg_err:
                            last_err = reg_err
                            if attempt < retry_count - 1:
                                time.sleep(0.03)
                            continue

                if not last_err or (block_success and raw_a in block_data):
                    if is_f:
                        levels[dev_id] = {
                            "flow_rate": device_results.get(dev.flow_rate_register, 0.0) if dev.flow_rate_register is not None else 0.0,
                            "total_volume": device_results.get(dev.total_volume_register, 0.0) if dev.total_volume_register is not None else 0.0
                        }
                    else:
                        levels[dev_id] = device_results.get(dev.register_address, 0.0)
                    success_count += 1
                
        duration = (time.perf_counter() - start_time) * 1000.0
        
        # Update Diagnostic stats
        try:
            stats, _ = ModbusDiagnosticStats.objects.get_or_create(id=1)
            stats.response_time_ms = duration
            stats.last_comm = timezone.now()
            
            total_attempts = stats.tx_packets
            failures = stats.crc_errors + stats.timeout_count
            if total_attempts > 0:
                stats.comm_quality = max(0.0, min(100.0, ((total_attempts - failures) / total_attempts) * 100.0))
            stats.save()
        except:
            pass
            
        if success_count > 0:
            return levels, f"Successfully read {success_count}/{len(devices)} {profile_name} on {com_port}", True
        else:
            err_summary = errors[0] if errors else "No registers responded"
            return {}, f"Modbus Serial {com_port} query failed: {err_summary}", False
            
    except Exception as e:
        duration = (time.perf_counter() - start_time) * 1000.0
        try:
            stats, _ = ModbusDiagnosticStats.objects.get_or_create(id=1)
            stats.response_time_ms = duration
            stats.last_comm = timezone.now()
            stats.save()
        except:
            pass
            
        return {}, f"Modbus Serial {com_port} unavailable: {str(e)}", False
    finally:
        if instrument and hasattr(instrument, 'serial') and instrument.serial and instrument.serial.is_open:
            try:
                instrument.serial.close()
            except:
                pass
        port_lock.release()


def auto_detect_modbus_settings():
    """
    Scans COM ports and Modbus parameters (Baudrate, Parity, Slave ID)
    to automatically locate the connected device.
    If a successful read is achieved, it saves the settings to the database.
    """
    print("[AXIONIX Auto-Detect] Starting Modbus RS485 settings auto-detection...")
    
    if not serial:
        return False
    
    ports = [p.device for p in serial.tools.list_ports.comports()]
    if not ports:
        print("[AXIONIX Auto-Detect] No active COM ports found on system.")
        return False
        
    tanks = list(Tank.objects.filter(is_active=True))
    if not tanks:
        print("[AXIONIX Auto-Detect] No active tanks configured to test read.")
        return False
    
    test_tank = tanks[0]
    raw_addr = test_tank.register_address
    protocol_addr = raw_addr - 40001 if raw_addr >= 40000 else (raw_addr - 30001 if raw_addr >= 30000 else raw_addr)
    func_code = test_tank.function_code
    
    config = SerialConnectionConfig.objects.first()
    pref_port = config.com_port if config else None
    pref_slave_id = config.slave_id if config else 10
    
    # Try the preferred port first
    if pref_port in ports:
        ports.remove(pref_port)
        ports.insert(0, pref_port)
        
    bauds = [9600, 19200, 115200]
    parities = ["None", "Even", "Odd"]
    slave_ids = [pref_slave_id, 10, 1, 2, 5]
    
    # Remove duplicates
    slave_ids = list(dict.fromkeys(slave_ids))
    
    # Create an info event to notify user in Event Log
    try:
        EventLog.objects.create(
            event_type="INFO",
            source="Modbus Auto-Detect",
            message="Modbus offline. Running background auto-detection of COM Port, Baudrate, and Slave ID..."
        )
    except:
        pass
        
    for port in ports:
        if port == "SIMULATOR":
            continue
        for baud in bauds:
            for parity_str in parities:
                for slave_id in slave_ids:
                    try:
                        parity_map = {
                            "None": serial.PARITY_NONE,
                            "Even": serial.PARITY_EVEN,
                            "Odd": serial.PARITY_ODD,
                        }
                        parity = parity_map.get(parity_str, serial.PARITY_NONE)
                        
                        # Execute a single transaction test
                        port_lock = get_com_lock(port)
                        with port_lock:
                            instrument = LoggingInstrument(port, slave_id, close_port_after_each_call=True)
                            instrument.serial.baudrate = baud
                            instrument.serial.bytesize = 8
                            instrument.serial.parity = parity
                            instrument.serial.stopbits = 1
                            instrument.serial.timeout = 0.25  # short timeout for quick scanning
                            instrument.clear_buffers_before_each_transaction = True
                            
                            # Read bit/register to test response
                            if func_code in (1, 2):
                                instrument.read_bit(protocol_addr, functioncode=func_code)
                            else:
                                instrument.read_register(protocol_addr, functioncode=func_code)
                        
                        # SUCCESS! Found a responsive setting.
                        print(f"[AXIONIX Auto-Detect] SUCCESS! Mapped on {port} | Baud={baud} | Parity={parity_str} | Slave={slave_id}")
                        
                        if not config:
                            config = SerialConnectionConfig()
                        
                        config.com_port = port
                        config.baud_rate = baud
                        config.parity = parity_str
                        config.slave_id = slave_id
                        config.save()
                            
                        # Log successful auto-detection event
                        try:
                            EventLog.objects.create(
                                event_type="SYSTEM",
                                source="Modbus Auto-Detect",
                                message=f"Device found! Automatically reconnected on {port} (Baud={baud}, Parity={parity_str}, Slave ID={slave_id})."
                            )
                        except:
                            pass
                        return True
                    except Exception as e:
                        pass
                        
    # Log failure to find device
    try:
        EventLog.objects.create(
            event_type="WARNING",
            source="Modbus Auto-Detect",
            message="Auto-detection finished. No responsive RS485 Modbus devices found. Check wiring/power."
        )
    except:
        pass
    return False


def modbus_polling_loop(profile_name):
    global running
    print(f"[AXIONIX Background Daemon] Starting Advanced Modbus RS485 polling loop for {profile_name}...")
    
    try:
        EventLog.objects.create(
            event_type="SYSTEM",
            source=f"Modbus Daemon ({profile_name})",
            message=f"{profile_name} Scanner RS485 advanced connection daemon initialized."
        )
    except Exception as e:
        pass

    time.sleep(0.5)
    consecutive_failures = 0

    while running:
        sleep_interval = 1.0
        com_port = "COM3"
        devices_count = 0
        try:
            config = SerialConnectionConfig.objects.filter(profile_name=profile_name).first()
            if config:
                sleep_interval = max(0.1, float(config.polling_interval))
                com_port = config.com_port
            if profile_name == "Tanks":
                devices_count = Tank.objects.filter(is_active=True).count()
            else:
                devices_count = FlowMeter.objects.filter(is_active=True).count()
        except:
            pass

        try:
            levels, status_msg, success = read_modbus_values(profile_name)
            
            if success:
                consecutive_failures = 0
                for device_id, level_data in levels.items():
                    if profile_name == "Tanks":
                        try:
                            tank = Tank.objects.get(tank_id=device_id)
                            if tank.widget_type == "flow_meter":
                                raw_flow_rate = level_data.get("flow_rate", 0.0)
                                if raw_flow_rate < 0 or raw_flow_rate > 30000 or raw_flow_rate in (32765, 32767, 65534, 65535):
                                    level_val = 0.0
                                else:
                                    level_val = raw_flow_rate + tank.error_accuracy
                                if level_val < 0 or level_val > 30000:
                                    level_val = 0.0
                                TankReading.objects.create(
                                    tank=tank,
                                    level_percent=level_val,
                                    flow_rate=level_val,
                                    total_flow=level_data.get("total_volume", 0.0)
                                )
                            else:
                                if isinstance(level_data, dict):
                                    level_val = level_data.get("level_percent", 0.0)
                                    raw_val_num = level_data.get("raw_value", 0.0)
                                else:
                                    level_val = level_data
                                    raw_val_num = level_data

                                if level_val < 0 or level_val > 30000 or level_val in (32765, 32767, 65534, 65535):
                                    level_val = 0.0
                                else:
                                    level_val = level_val + tank.error_accuracy

                                if raw_val_num < 0 or raw_val_num > 30000 or raw_val_num in (32765, 32767, 65534, 65535):
                                    raw_val_num = 0.0
                                else:
                                    raw_val_num = raw_val_num + tank.error_accuracy

                                TankReading.objects.create(
                                    tank=tank,
                                    level_percent=level_val,
                                    raw_value=raw_val_num
                                )
                            
                            if tank.alarm_enabled:
                                check_val = raw_val_num if (tank.unit == "RAW" and raw_val_num is not None) else level_val
                                if check_val >= tank.high_limit:
                                    active_alarm = Alarm.objects.filter(tank=tank, alarm_type="high", acknowledged=False).first()
                                    if not active_alarm:
                                        snoozed = Alarm.objects.filter(tank=tank, alarm_type="high", acknowledged=True, snooze_until__gt=timezone.now()).exists()
                                        if not snoozed:
                                            val_disp = format_tank_value(level_val, tank.capacity_kl, tank.unit, raw_val_num)
                                            limit_disp = format_tank_value(tank.high_limit, tank.capacity_kl, tank.unit, tank.high_limit)
                                            Alarm.objects.create(tank=tank, alarm_type="high", level_percent=check_val)
                                            EventLog.objects.create(
                                                event_type="CRITICAL",
                                                source="Level Sensor",
                                                message=f"Critical Alarm: {device_id} level exceeded High threshold ({val_disp} vs Limit {limit_disp})."
                                            )
                                else:
                                    Alarm.objects.filter(tank=tank, alarm_type="high").update(acknowledged=True, snooze_until=None)

                                if check_val <= tank.low_limit:
                                    active_alarm = Alarm.objects.filter(tank=tank, alarm_type="low", acknowledged=False).first()
                                    if not active_alarm:
                                        snoozed = Alarm.objects.filter(tank=tank, alarm_type="low", acknowledged=True, snooze_until__gt=timezone.now()).exists()
                                        if not snoozed:
                                            val_disp = format_tank_value(level_val, tank.capacity_kl, tank.unit, raw_val_num)
                                            limit_disp = format_tank_value(tank.low_limit, tank.capacity_kl, tank.unit, tank.low_limit)
                                            Alarm.objects.create(tank=tank, alarm_type="low", level_percent=check_val)
                                            EventLog.objects.create(
                                                event_type="WARNING",
                                                source="Level Sensor",
                                                message=f"Low Level Alarm: {device_id} level dropped below Low threshold ({val_disp} vs Limit {limit_disp})."
                                            )
                                else:
                                    Alarm.objects.filter(tank=tank, alarm_type="low").update(acknowledged=True, snooze_until=None)
                        except Tank.DoesNotExist:
                            pass
                    elif profile_name == "Flow Meters":
                        try:
                            fm = FlowMeter.objects.get(meter_id=device_id)
                            raw_flow = level_data["flow_rate"]
                            if raw_flow < 0 or raw_flow > 30000 or raw_flow in (32765, 32767, 65534, 65535):
                                flow_rate = 0.0
                            elif fm.scanner_raw_span > fm.scanner_raw_zero:
                                flow_rate = ((raw_flow - fm.scanner_raw_zero) / (fm.scanner_raw_span - fm.scanner_raw_zero)) * fm.calibrated_span
                                flow_rate = flow_rate + fm.error_accuracy
                            else:
                                flow_rate = raw_flow + fm.error_accuracy

                            if flow_rate < 0 or flow_rate > 30000:
                                flow_rate = 0.0

                            FlowMeterReading.objects.create(
                                flow_meter=fm,
                                flow_rate=flow_rate,
                                total_volume=level_data["total_volume"]
                            )
                            if fm.alarm_enabled:
                                if flow_rate >= fm.high_limit:
                                    active_alarm = Alarm.objects.filter(flow_meter=fm, alarm_type="high", acknowledged=False).first()
                                    if not active_alarm:
                                        snoozed = Alarm.objects.filter(flow_meter=fm, alarm_type="high", acknowledged=True, snooze_until__gt=timezone.now()).exists()
                                        if not snoozed:
                                            Alarm.objects.create(flow_meter=fm, alarm_type="high", level_percent=flow_rate)
                                            EventLog.objects.create(
                                                event_type="CRITICAL",
                                                source="Flow Sensor",
                                                message=f"Critical Alarm: {device_id} flow rate exceeded High threshold ({flow_rate} L/min)."
                                            )
                                else:
                                    Alarm.objects.filter(flow_meter=fm, alarm_type="high").update(acknowledged=True, snooze_until=None)

                                if flow_rate <= fm.low_limit:
                                    active_alarm = Alarm.objects.filter(flow_meter=fm, alarm_type="low", acknowledged=False).first()
                                    if not active_alarm:
                                        snoozed = Alarm.objects.filter(flow_meter=fm, alarm_type="low", acknowledged=True, snooze_until__gt=timezone.now()).exists()
                                        if not snoozed:
                                            Alarm.objects.create(flow_meter=fm, alarm_type="low", level_percent=flow_rate)
                                            EventLog.objects.create(
                                                event_type="WARNING",
                                                source="Flow Sensor",
                                                message=f"Warning Alarm: {device_id} flow rate dropped below Low threshold ({flow_rate} L/min)."
                                            )
                                else:
                                    Alarm.objects.filter(flow_meter=fm, alarm_type="low").update(acknowledged=True, snooze_until=None)
                        except FlowMeter.DoesNotExist:
                            pass
            try:
                daemon_logs = list(EventLog.objects.filter(source=f"Modbus Daemon ({profile_name})").order_by("-timestamp"))
                
                show_failed = False
                msg = None
                if not success:
                    if status_msg.startswith("Telemetry scan offline"):
                        show_failed = True
                        msg = status_msg
                    else:
                        consecutive_failures += 1
                        if consecutive_failures >= 3:
                            show_failed = True
                            msg = f"Telemetry scan failed. {status_msg}"
                        else:
                            # Log warning but do not mark daemon offline
                            EventLog.objects.create(
                                event_type="WARNING",
                                source=f"Modbus Daemon ({profile_name}) Warning",
                                message=f"Intermittent scan failure (attempt {consecutive_failures}/3): {status_msg}"
                            )
                else:
                    consecutive_failures = 0
                    msg = f"Telemetry scan successful. {status_msg}"

                if msg is not None:
                    if daemon_logs:
                        log_obj = daemon_logs[0]
                        log_obj.message = msg
                        log_obj.timestamp = timezone.now()
                        log_obj.save()
                        if len(daemon_logs) > 1:
                            EventLog.objects.filter(source=f"Modbus Daemon ({profile_name})").exclude(id=log_obj.id).delete()
                    else:
                        EventLog.objects.create(
                            event_type="INFO" if (success or status_msg.startswith("Telemetry scan offline")) else "WARNING",
                            source=f"Modbus Daemon ({profile_name})",
                            message=msg
                        )
            except Exception as log_err:
                pass
                
        except Exception as ex:
            try:
                daemon_logs = list(EventLog.objects.filter(source=f"Modbus Daemon ({profile_name})").order_by("-timestamp"))
                if daemon_logs:
                    log_obj = daemon_logs[0]
                    log_obj.message = f"Communication service error: {ex}"
                    log_obj.timestamp = timezone.now()
                    log_obj.save()
                else:
                    EventLog.objects.create(
                        event_type="CRITICAL",
                        source=f"Modbus Daemon ({profile_name})",
                        message=f"Communication service error: {ex}"
                    )
            except:
                pass
                
        time.sleep(sleep_interval)


def start_modbus_daemon():
    """Starts the background threads."""
    tanks_thread = threading.Thread(target=modbus_polling_loop, args=("Tanks",), name="ModbusDaemonTanks")
    tanks_thread.daemon = True
    tanks_thread.start()
    
    fm_thread = threading.Thread(target=modbus_polling_loop, args=("Flow Meters",), name="ModbusDaemonFlowMeters")
    fm_thread.daemon = True
    fm_thread.start()
