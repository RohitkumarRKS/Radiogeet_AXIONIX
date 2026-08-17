/* =========================================
   Settings Page JavaScript
   ========================================= */

document.addEventListener('DOMContentLoaded', function() {
    initSidebar();
    initTestConnection();
    initRefreshComPorts();
    initSettingsTabs();
    initTankManagement();
    initFlowMeterManagement();

    initRegisterSimulator();
    initScannersAndDiagnostics();
    updateClock();
    setInterval(updateClock, 1000);
});

function initTankManagement() {
    const modalBackdrop = document.getElementById('tank-modal-backdrop');
    const modalForm = document.getElementById('tank-modal-form');
    const modalCloseBtn = document.getElementById('tank-modal-close-btn');
    const modalCancelBtn = document.getElementById('tank-modal-cancel-btn');
    const modalTitle = document.getElementById('tank-modal-title');
    const addTankBtn = document.getElementById('add-tank-btn');

    // Input fields
    const inputTankId = document.getElementById('modal-tank-id');
    const inputTankName = document.getElementById('modal-tank-name');
    const inputCapacity = document.getElementById('modal-capacity');
    const inputUnit = document.getElementById('modal-unit');
    const inputWidgetType = document.getElementById('modal-widget-type');
    const inputRegAddr = document.getElementById('modal-register-address');
    const inputSlaveId = document.getElementById('modal-slave-id');
    const inputFuncCode = document.getElementById('modal-function-code');
    const inputDataType = document.getElementById('modal-data-type');
    const inputByteOrder = document.getElementById('modal-byte-order');
    const inputScaling = document.getElementById('modal-scaling');
    const inputOffset = document.getElementById('modal-offset');
    const inputRawZero = document.getElementById('modal-raw-zero');
    const inputRawSpan = document.getElementById('modal-raw-span');
    const inputHighLimit = document.getElementById('modal-high-limit');
    const inputLowLimit = document.getElementById('modal-low-limit');
    const inputTankErrorAccuracy = document.getElementById('modal-tank-error-accuracy');
    const inputAlarmEnabled = document.getElementById('modal-alarm-enabled');

    const inputFlowRateReg = document.getElementById('modal-flow-rate-register');
    const inputTotalVolReg = document.getElementById('modal-total-volume-register');
    const inputFlowUnit = document.getElementById('modal-flow-unit');
    const inputTotalUnit = document.getElementById('modal-total-unit');
    const flowFieldsGroup = document.getElementById('modal-flow-fields-group');

    if (inputUnit) {
        const updateLabels = () => {
            const val = inputUnit.value || '%';
            const capLabel = document.getElementById('modal-capacity-label');
            const highLabel = document.getElementById('modal-high-limit-label');
            const lowLabel = document.getElementById('modal-low-limit-label');
            const errLabel = document.getElementById('modal-tank-error-accuracy-label');
            if (capLabel) capLabel.textContent = (val === 'RAW') ? `Capacity (KL)` : `Capacity (${val})`;
            if (highLabel) highLabel.textContent = (val === 'RAW') ? `High Alarm Limit (RAW Count / %)` : `High Alarm Limit (${val})`;
            if (lowLabel) lowLabel.textContent = (val === 'RAW') ? `Low Alarm Limit (RAW Count / %)` : `Low Alarm Limit (${val})`;
            if (errLabel) errLabel.textContent = (val === 'RAW') ? `Error Accuracy Offset` : `Error Accuracy Offset (${val})`;
        };
        inputUnit.addEventListener('change', updateLabels);
    }

    const btnQuickSetRaw0 = document.getElementById('btn-quick-set-raw-0');
    const btnQuickSetRaw100 = document.getElementById('btn-quick-set-raw-100');
    const panelRawDownside = document.getElementById('panel-raw-calibration-downside');
    const inputPanelRawZero = document.getElementById('input-panel-raw-zero');
    const inputPanelRawSpan = document.getElementById('input-panel-raw-span');
    const btnPreset0 = document.getElementById('btn-preset-0');
    const btnPreset4585 = document.getElementById('btn-preset-4585');
    const btnCancelRawPanel = document.getElementById('btn-cancel-raw-panel');
    const btnApplyRawPanel = document.getElementById('btn-apply-raw-panel');

    const inputScannerRawZero = document.getElementById('modal-scanner-raw-zero');
    const inputScannerRawSpan = document.getElementById('modal-scanner-raw-span');

    const openCalibrationPanel = (focusField = 'zero') => {
        if (panelRawDownside) {
            panelRawDownside.style.display = 'block';
            if (inputPanelRawZero && inputScannerRawZero) inputPanelRawZero.value = inputScannerRawZero.value || '0.0';
            if (inputPanelRawSpan && inputScannerRawSpan) inputPanelRawSpan.value = inputScannerRawSpan.value || '4585.0';

            if (focusField === 'zero' && inputPanelRawZero) {
                inputPanelRawZero.focus();
                inputPanelRawZero.select();
            } else if (focusField === 'span' && inputPanelRawSpan) {
                inputPanelRawSpan.focus();
                inputPanelRawSpan.select();
            }
        }
    };

    if (btnQuickSetRaw0) {
        btnQuickSetRaw0.addEventListener('click', function() {
            openCalibrationPanel('zero');
        });
    }

    if (btnQuickSetRaw100) {
        btnQuickSetRaw100.addEventListener('click', function() {
            openCalibrationPanel('span');
        });
    }

    if (btnPreset0 && inputPanelRawZero) {
        btnPreset0.addEventListener('click', function() {
            inputPanelRawZero.value = '0.0';
        });
    }

    if (btnPreset4585 && inputPanelRawSpan) {
        btnPreset4585.addEventListener('click', function() {
            inputPanelRawSpan.value = '4585.0';
        });
    }

    if (btnCancelRawPanel && panelRawDownside) {
        btnCancelRawPanel.addEventListener('click', function() {
            panelRawDownside.style.display = 'none';
        });
    }

    if (btnApplyRawPanel) {
        btnApplyRawPanel.addEventListener('click', function() {
            const zVal = inputPanelRawZero ? inputPanelRawZero.value : '0.0';
            const sVal = inputPanelRawSpan ? inputPanelRawSpan.value : '4585.0';

            if (inputScannerRawZero) inputScannerRawZero.value = zVal;
            if (inputScannerRawSpan) inputScannerRawSpan.value = sVal;

            if (panelRawDownside) panelRawDownside.style.display = 'none';

            // Show confirmation toast
            const toast = document.createElement('div');
            toast.style.position = 'fixed';
            toast.style.bottom = '20px';
            toast.style.right = '20px';
            toast.style.background = 'var(--primary-green)';
            toast.style.color = '#000';
            toast.style.padding = '12px 20px';
            toast.style.borderRadius = 'var(--radius-sm)';
            toast.style.fontWeight = '700';
            toast.style.zIndex = '10000';
            toast.style.boxShadow = '0 4px 12px rgba(118, 255, 3, 0.4)';
            toast.style.fontSize = '0.85rem';
            toast.textContent = `✅ Scanner 2-Point Calibration Set: Start = ${zVal}, End = ${sVal}`;
            document.body.appendChild(toast);
            setTimeout(() => toast.remove(), 3000);
        });
    }

    const toggleModalFields = () => {
        const isFlow = inputWidgetType && inputWidgetType.value === 'flow_meter';
        if (flowFieldsGroup) {
            flowFieldsGroup.style.display = isFlow ? 'block' : 'none';
        }
        if (inputCapacity && inputCapacity.closest('.form-group')) {
            inputCapacity.closest('.form-group').style.display = isFlow ? 'none' : 'block';
        }
        if (inputUnit && inputUnit.closest('.form-group')) {
            inputUnit.closest('.form-group').style.display = isFlow ? 'none' : 'block';
        }
        if (inputRegAddr && inputRegAddr.closest('.form-group')) {
            inputRegAddr.closest('.form-group').style.display = isFlow ? 'none' : 'block';
            inputRegAddr.required = !isFlow;
        }
    };
    if (inputWidgetType) {
        inputWidgetType.addEventListener('change', toggleModalFields);
    }

    const openModal = (isEdit = false) => {
        if (modalBackdrop) {
            modalBackdrop.style.display = 'block';
        }
        if (isEdit) {
            if (modalTitle) modalTitle.textContent = "Edit Tank Telemetry Config";
            if (inputTankId) inputTankId.readOnly = true;
        } else {
            if (modalTitle) modalTitle.textContent = "Add New Tank Widget";
            if (inputTankId) {
                inputTankId.readOnly = false;
                inputTankId.value = "";
            }
            if (modalForm) modalForm.reset();
            // Reset select defaults explicitly
            if (inputWidgetType) inputWidgetType.value = "cylinder";
            if (inputFuncCode) inputFuncCode.value = "4";
            if (inputDataType) inputDataType.value = "UInt16";
            if (inputByteOrder) inputByteOrder.value = "ABCD";
            if (inputCapacity) inputCapacity.value = "5.0";
            if (inputUnit) inputUnit.value = "%";
            if (inputScaling) inputScaling.value = "1.0";
            if (inputOffset) inputOffset.value = "0.0";
            if (inputRawZero) inputRawZero.value = "4000.0";
            if (inputRawSpan) inputRawSpan.value = "20000.0";
            if (inputHighLimit) inputHighLimit.value = "90.0";
            if (inputLowLimit) inputLowLimit.value = "10.0";
            if (inputTankErrorAccuracy) inputTankErrorAccuracy.value = "0.0";
            if (inputAlarmEnabled) inputAlarmEnabled.checked = true;
            if (inputSlaveId) {
                // Pre-populate with global Connection Config Slave ID if available
                const globalSlaveId = document.getElementById('settings-slave-id')?.value || '1';
                inputSlaveId.value = globalSlaveId;
            }
        }
        toggleModalFields();
        if (inputUnit) inputUnit.dispatchEvent(new Event('change'));
    };

    const closeModal = () => {
        if (modalBackdrop) {
            modalBackdrop.style.display = 'none';
        }
    };

    if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeModal);
    if (modalCancelBtn) modalCancelBtn.addEventListener('click', closeModal);
    if (modalBackdrop) {
        modalBackdrop.addEventListener('click', function(e) {
            if (e.target === modalBackdrop) closeModal();
        });
    }

    if (addTankBtn) {
        addTankBtn.addEventListener('click', function() {
            openModal(false);
        });
    }

    const inputCapacityUnit = document.getElementById('modal-capacity-unit');

    const editButtons = document.querySelectorAll('.edit-tank-btn');
    editButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            openModal(true);

            // Populate data
            if (inputTankId) inputTankId.value = this.getAttribute('data-tank-id') || '';
            if (inputTankName) inputTankName.value = this.getAttribute('data-tank-name') || '';
            if (inputCapacity) inputCapacity.value = this.getAttribute('data-capacity') || '5.0';
            if (inputCapacityUnit) inputCapacityUnit.value = this.getAttribute('data-capacity-unit') || 'KL';
            if (inputUnit) inputUnit.value = this.getAttribute('data-unit') || '%';
            if (inputWidgetType) inputWidgetType.value = this.getAttribute('data-widget-type') || 'cylinder';
            if (inputRegAddr) inputRegAddr.value = this.getAttribute('data-tank-address') || '';
            if (inputSlaveId) inputSlaveId.value = this.getAttribute('data-slave-id') || '1';
            if (inputFuncCode) inputFuncCode.value = this.getAttribute('data-function-code') || '4';
            if (inputDataType) inputDataType.value = this.getAttribute('data-data-type') || 'UInt16';
            if (inputByteOrder) inputByteOrder.value = this.getAttribute('data-byte-order') || 'ABCD';
            if (inputScaling) inputScaling.value = this.getAttribute('data-scaling') || '1.0';
            if (inputOffset) inputOffset.value = this.getAttribute('data-offset') || '0.0';
            if (inputRawZero) inputRawZero.value = this.getAttribute('data-raw-zero') || '4000.0';
            if (inputRawSpan) inputRawSpan.value = this.getAttribute('data-raw-span') || '20000.0';
            if (inputScannerRawZero) inputScannerRawZero.value = this.getAttribute('data-scanner-raw-zero') || '0.0';
            if (inputScannerRawSpan) inputScannerRawSpan.value = this.getAttribute('data-scanner-raw-span') || '0.0';
            if (inputPanelRawZero) inputPanelRawZero.value = inputScannerRawZero ? inputScannerRawZero.value : '0.0';
            if (inputPanelRawSpan) inputPanelRawSpan.value = inputScannerRawSpan ? inputScannerRawSpan.value : '4585.0';
            if (inputHighLimit) inputHighLimit.value = this.getAttribute('data-high-limit') || '90.0';
            if (inputLowLimit) inputLowLimit.value = this.getAttribute('data-low-limit') || '10.0';
            if (inputTankErrorAccuracy) inputTankErrorAccuracy.value = this.getAttribute('data-error-accuracy') || '0.0';
            if (inputAlarmEnabled) inputAlarmEnabled.checked = this.getAttribute('data-alarm-enabled') !== 'false';

            if (inputFlowRateReg) inputFlowRateReg.value = this.getAttribute('data-flow-rate-register') || '40001';
            if (inputTotalVolReg) inputTotalVolReg.value = this.getAttribute('data-total-volume-register') || '40003';
            if (inputFlowUnit) inputFlowUnit.value = this.getAttribute('data-flow-unit') || 'L/min';
            if (inputTotalUnit) inputTotalUnit.value = this.getAttribute('data-total-unit') || 'Liters';

            toggleModalFields();
            if (inputUnit) inputUnit.dispatchEvent(new Event('change'));
        });
    });

    if (modalForm) {
        modalForm.addEventListener('submit', function(e) {
            e.preventDefault();

            const csrftoken = document.querySelector('[name=csrfmiddlewaretoken]')?.value || '';

            const payload = {
                tank_id: inputTankId?.value || '',
                name: inputTankName?.value || '',
                address: inputRegAddr?.value || '',
                capacity: inputCapacity?.value || '5.0',
                capacity_unit: inputCapacityUnit?.value || 'KL',
                unit: inputUnit?.value || '%',
                widget_type: inputWidgetType?.value || 'cylinder',
                slave_id: inputSlaveId?.value || '1',
                function_code: inputFuncCode?.value || '4',
                data_type: inputDataType?.value || 'UInt16',
                byte_order: inputByteOrder?.value || 'ABCD',
                scaling: inputScaling?.value || '1.0',
                offset: inputOffset?.value || '0.0',
                raw_zero: inputRawZero?.value || '4000.0',
                raw_span: inputRawSpan?.value || '20000.0',
                scanner_raw_zero: inputScannerRawZero?.value || '0.0',
                scanner_raw_span: inputScannerRawSpan?.value || '0.0',
                high_limit: inputHighLimit?.value || '90.0',
                low_limit: inputLowLimit?.value || '10.0',
                flow_rate_register: inputFlowRateReg?.value || '40001',
                total_volume_register: inputTotalVolReg?.value || '40003',
                flow_unit: inputFlowUnit?.value || 'L/min',
                total_unit: inputTotalUnit?.value || 'Liters',
                error_accuracy: inputTankErrorAccuracy?.value || '0.0',
                alarm_enabled: inputAlarmEnabled ? inputAlarmEnabled.checked : true
            };

            fetch('/settings/add-tank/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': csrftoken
                },
                body: JSON.stringify(payload)
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    alert(data.message);
                    closeModal();
                    window.location.reload();
                } else {
                    alert("Error: " + data.error);
                }
            })
            .catch(err => {
                console.error(err);
                alert("Failed to save tank configuration.");
            });
        });
    }

    const deleteButtons = document.querySelectorAll('.delete-tank-btn');
    deleteButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const tankId = this.getAttribute('data-tank-id');
            if (!tankId) return;

            if (!confirm(`Are you sure you want to delete Tank '${tankId}' and all its associated sensor level history? This cannot be undone.`)) {
                return;
            }

            const csrftoken = document.querySelector('[name=csrfmiddlewaretoken]')?.value || '';

            fetch(`/settings/delete-tank/${encodeURIComponent(tankId)}/`, {
                method: 'POST',
                headers: {
                    'X-CSRFToken': csrftoken
                }
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    alert(data.message);
                    window.location.reload();
                } else {
                    alert("Error: " + data.error);
                }
            })
            .catch(err => {
                console.error(err);
                alert("Failed to delete tank.");
            });
        });
    });
}

function initSettingsTabs() {
    const tabItems = document.querySelectorAll('.settings-tabs-menu .tab-item');
    const tabPanels = document.querySelectorAll('.settings-tab-panel');
    const tabSubtext = document.getElementById('settings-tab-subtext');

    const subtexts = {
        'device-connection': 'Configure Masibus Scanner (RS485) connection settings to fetch tank level data.',
        'serial-settings': 'Set transmission speed, data bits, parity, stop bits, and other hardware connection settings.',
        'modbus-configuration': 'Select Modbus operation mode, slave station ID, register reading function codes, and scan rate.',
        'tank-management': 'Map holding register addresses of Masibus Scanner to specific tank variables in the monitoring dashboard.',
        'scanner-auto-detect': 'Discover available COM ports, search active Modbus station Slave IDs, and scan register ranges.',
        'diagnostics-live-logs': 'View physical packet traffic stats, latency, connection quality, and live hexadecimal frames.',
        'alarm-settings': 'Configure High/Low alert limit thresholds, sound notification configurations, and email triggers.',
        'notification-settings': 'Configure SMTP Server details for Email alerts and SMS Gateway credentials for remote notification alerts.',
        'system-settings': 'Adjust local system language preferences, regional units configuration, and automatic database cleanup cycle.',
        'backup-restore': 'Generate secure backups of the entire application database or restore previous configurations from backup files.',
        'about': 'Details about software license, build number, developer information, and license activation parameters.'
    };

    tabItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();

            const targetTab = this.getAttribute('data-tab');
            if (!targetTab) return;

            // Save active tab state
            sessionStorage.setItem('activeSettingsTab', targetTab);

            // Update tab button active status
            tabItems.forEach(t => t.classList.remove('active'));
            this.classList.add('active');

            // Switch visible panel
            tabPanels.forEach(panel => {
                if (panel.id === `panel-${targetTab}`) {
                    panel.style.display = 'block';
                } else {
                    panel.style.display = 'none';
                }
            });

            // Update settings subtext
            if (tabSubtext && subtexts[targetTab]) {
                tabSubtext.textContent = subtexts[targetTab];
            }
        });
    });

    // Restore active tab from state storage on page load
    const activeTab = sessionStorage.getItem('activeSettingsTab');
    if (activeTab) {
        const tabToClick = document.querySelector(`.settings-tabs-menu .tab-item[data-tab="${activeTab}"]`);
        if (tabToClick) {
            // Temporarily bypass animations/scroll if any
            tabToClick.click();
        }
    }

    // Handle Save settings action
    const saveBtn = document.getElementById('save-settings-btn');
    if (saveBtn) {
        saveBtn.addEventListener('click', async function(e) {
            e.preventDefault();
            const originalText = saveBtn.innerHTML;
            saveBtn.textContent = 'Saving...';
            saveBtn.disabled = true;

            const csrftoken = document.querySelector('[name=csrfmiddlewaretoken]')?.value || '';
            let hasError = false;

            const saveProfile = async (profileName, suffix) => {
                const connectionName = document.getElementById('settings-connection-name' + suffix)?.value;
                const deviceType = document.getElementById('settings-device-type' + suffix)?.value;
                const connectionType = document.getElementById('settings-connection-type' + suffix)?.value;
                const comPort = document.getElementById('settings-com-port' + suffix)?.value;
                const baudRate = document.getElementById('settings-baud-rate' + suffix)?.value;
                const dataBits = document.getElementById('settings-data-bits' + suffix)?.value;
                const parity = document.getElementById('settings-parity' + suffix)?.value;
                const stopBits = document.getElementById('settings-stop-bits' + suffix)?.value;
                const slaveId = document.getElementById('settings-slave-id' + suffix)?.value;

                const timeout = document.getElementById('settings-timeout' + suffix)?.value || '0.5';
                const retryCount = document.getElementById('settings-retry-count' + suffix)?.value || '3';
                const pollingInterval = document.getElementById('settings-polling-interval' + suffix)?.value || '5';
                
                try {
                    const res = await fetch('/settings/save-connection/', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-CSRFToken': csrftoken
                        },
                        body: JSON.stringify({
                            profile_name: profileName,
                            connection_name: connectionName,
                            device_type: deviceType,
                            connection_type: connectionType,
                            com_port: comPort,
                            baud_rate: baudRate,
                            data_bits: dataBits,
                            parity: parity,
                            stop_bits: stopBits,
                            slave_id: slaveId,
                            timeout: timeout,
                            retry_count: retryCount,
                            polling_interval: pollingInterval
                        })
                    });
                    const data = await res.json();
                    if (!data.success) {
                        alert('Error saving ' + profileName + ' settings: ' + data.error);
                        hasError = true;
                    }
                } catch(e) {
                    console.error(e);
                    hasError = true;
                }
            };

            await saveProfile('Tanks', '-tanks');
            await saveProfile('Flow Meters', '-flow');

            saveBtn.innerHTML = originalText;
            saveBtn.disabled = false;
            
            if (!hasError) {
                alert('All settings configurations saved successfully! Connection scanner services reloaded.');
                window.location.reload();
            }
        });
    }
}

function initTestConnection() {
    const testBtns = document.querySelectorAll('.test-connection-btn');
    
    testBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const profile = this.getAttribute('data-profile');
            let suffix = profile === 'Tanks' ? '-tanks' : '-flow';
            
            const originalText = this.textContent;
            this.textContent = 'Testing...';
            this.disabled = true;

            const comPort = document.getElementById('settings-com-port' + suffix)?.value || 'COM3';
            const baudRate = document.getElementById('settings-baud-rate' + suffix)?.value || '9600';
            const dataBits = document.getElementById('settings-data-bits' + suffix)?.value || '8';
            const parity = document.getElementById('settings-parity' + suffix)?.value || 'None';
            const stopBits = document.getElementById('settings-stop-bits' + suffix)?.value || '1';
            const slaveId = document.getElementById('settings-slave-id' + suffix)?.value || '1';

            const csrftoken = document.querySelector('[name=csrfmiddlewaretoken]')?.value || '';

            fetch('/settings/test-connection/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': csrftoken
                },
                body: JSON.stringify({
                    profile_name: profile,
                    com_port: comPort,
                    baud_rate: baudRate,
                    data_bits: dataBits,
                    parity: parity,
                    stop_bits: stopBits,
                    slave_id: slaveId
                })
            })
            .then(res => res.json())
            .then(data => {
                this.textContent = originalText;
                this.disabled = false;
                
                if (data.success) {
                    if (data.warning) {
                        alert('⚠️ [' + profile + '] ' + data.message);
                    } else {
                        alert('✅ [' + profile + '] ' + data.message + '\n\nSettings will now be applied automatically.');
                        const saveBtn = document.getElementById('save-settings-btn');
                        if (saveBtn) saveBtn.click();
                    }
                } else {
                    alert('❌ [' + profile + '] ' + data.error);
                }
            })
            .catch(err => {
                this.textContent = originalText;
                this.disabled = false;
                console.error(err);
                alert('Failed to execute test connection for ' + profile);
            });
        });
    });
}

function initRefreshComPorts() {
    const refreshBtns = document.querySelectorAll('.refresh-com-btn');
    refreshBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const targetId = this.getAttribute('data-target');
            const selectEl = document.getElementById(targetId);
            if (!selectEl) return;
            
            const originalText = this.textContent;
            this.textContent = '⏳';
            this.disabled = true;

            fetch('/settings/list-com-ports/')
            .then(res => res.json())
            .then(data => {
                this.textContent = originalText;
                this.disabled = false;

                if (data.success) {
                    const currentVal = selectEl.value;
                    let portsToUse = data.ports;
                    
                    const oldPorts = Array.from(selectEl.options).map(o => o.value);
                    const changed = (oldPorts.length !== portsToUse.length) || !portsToUse.every((val, i) => val === oldPorts[i]);
                    if (changed) {
                        selectEl.innerHTML = '';
                        portsToUse.forEach(port => {
                            const option = document.createElement('option');
                            option.value = port;
                            option.textContent = port;
                            if (port === currentVal) {
                                option.selected = true;
                            }
                            selectEl.appendChild(option);
                        });
                    }
                } else {
                    alert('Failed to refresh COM ports: ' + data.error);
                }
            })
            .catch(err => {
                this.textContent = originalText;
                this.disabled = false;
                console.error(err);
                alert('Error fetching COM ports.');
            });
        });
    });
}

function initSidebar() {
    const toggle = document.getElementById('sidebar-toggle');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');

    if (toggle && sidebar) {
        toggle.addEventListener('click', () => {
            sidebar.classList.toggle('open');
            if (overlay) overlay.classList.toggle('show');
        });
    }
}

function updateClock() {
    const dateEl = document.getElementById('header-date');
    const timeEl = document.getElementById('header-time');
    
    if (dateEl && timeEl) {
        const now = new Date();
        dateEl.textContent = now.toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        });
        timeEl.textContent = now.toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true,
        });
    }
}

function initRegisterSimulator() {
    const rows = document.querySelectorAll('#panel-register-simulator tbody tr');
    rows.forEach(row => {
        const regAddr = row.getAttribute('data-register-address');
        if (!regAddr) return;

        const valInput = row.querySelector('.sim-value-input');
        const updateBtn = row.querySelector('.update-sim-btn');
        const quickBtns = row.querySelectorAll('.quick-set-btn');

        const saveVal = (val) => {
            const csrftoken = document.querySelector('[name=csrfmiddlewaretoken]')?.value || '';
            
            if (updateBtn) {
                updateBtn.textContent = 'Saving...';
                updateBtn.disabled = true;
            }

            fetch('/settings/save-simulated-register/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': csrftoken
                },
                body: JSON.stringify({
                    register_address: regAddr,
                    value: val
                })
            })
            .then(res => res.json())
            .then(data => {
                if (updateBtn) {
                    updateBtn.textContent = 'Update';
                    updateBtn.disabled = false;
                }
                if (data.success) {
                    if (valInput) valInput.value = val;
                    // Flash success toast
                    const toast = document.createElement('div');
                    toast.style.position = 'fixed';
                    toast.style.bottom = '20px';
                    toast.style.right = '20px';
                    toast.style.background = 'var(--primary-green)';
                    toast.style.color = '#000';
                    toast.style.padding = '12px 24px';
                    toast.style.borderRadius = 'var(--radius-sm)';
                    toast.style.fontWeight = '700';
                    toast.style.zIndex = '10000';
                    toast.style.boxShadow = '0 4px 12px rgba(118, 255, 3, 0.3)';
                    toast.style.fontFamily = 'var(--font-primary)';
                    toast.style.fontSize = '0.85rem';
                    toast.textContent = `Register ${regAddr} simulated value set to ${val} successfully.`;
                    document.body.appendChild(toast);
                    setTimeout(() => toast.remove(), 2500);
                } else {
                    alert('Error: ' + data.error);
                }
            })
            .catch(err => {
                if (updateBtn) {
                    updateBtn.textContent = 'Update';
                    updateBtn.disabled = false;
                }
                console.error(err);
                alert('Failed to update simulated register.');
            });
        };

        if (updateBtn && valInput) {
            updateBtn.addEventListener('click', () => {
                saveVal(parseInt(valInput.value || 0));
            });
            // Enter key also triggers update
            valInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    saveVal(parseInt(valInput.value || 0));
                }
            });
        }

        quickBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const val = parseInt(btn.getAttribute('data-val') || 0);
                saveVal(val);
            });
        });
    });
}


function initScannersAndDiagnostics() {
    // 1. Port Auto Scanner
    const runPortScanBtn = document.getElementById('run-port-scan-btn');
    const portScanStatus = document.getElementById('port-scan-status');
    const portScanResults = document.getElementById('port-scan-results');

    if (runPortScanBtn && portScanResults) {
        runPortScanBtn.addEventListener('click', function() {
            runPortScanBtn.disabled = true;
            portScanStatus.textContent = 'Scanning active system COM ports...';
            portScanResults.innerHTML = '';

            fetch('/settings/scan-ports/')
            .then(res => res.json())
            .then(data => {
                runPortScanBtn.disabled = false;
                portScanStatus.textContent = '';
                if (data.success && data.ports.length > 0) {
                    data.ports.forEach(port => {
                        const btn = document.createElement('button');
                        btn.className = 'btn btn-outline';
                        btn.style.padding = '4px 10px';
                        btn.style.fontSize = '0.8rem';
                        btn.style.borderRadius = '4px';
                        btn.type = 'button';
                        btn.textContent = port;
                        btn.title = `Click to set COM Port to ${port}`;
                        btn.addEventListener('click', function() {
                            const tankSelect = document.getElementById('settings-com-port-tanks');
                            const flowSelect = document.getElementById('settings-com-port-flow');
                            
                            let updated = false;
                            
                            if (tankSelect) {
                                if (!Array.from(tankSelect.options).some(opt => opt.value === port)) {
                                    const opt = document.createElement('option');
                                    opt.value = port;
                                    opt.textContent = port;
                                    tankSelect.appendChild(opt);
                                }
                                tankSelect.value = port;
                                updated = true;
                            }
                            
                            if (flowSelect) {
                                if (!Array.from(flowSelect.options).some(opt => opt.value === port)) {
                                    const opt = document.createElement('option');
                                    opt.value = port;
                                    opt.textContent = port;
                                    flowSelect.appendChild(opt);
                                }
                                flowSelect.value = port;
                                updated = true;
                            }
                            
                            if (updated) {
                                alert(`COM Port updated to ${port} in the connection forms. Please save settings.`);
                            }
                        });
                        portScanResults.appendChild(btn);
                    });
                } else {
                    portScanResults.innerHTML = '<span style="color: #ff3b30; font-size: 0.85rem;">No active serial ports detected.</span>';
                }
            })
            .catch(err => {
                runPortScanBtn.disabled = false;
                portScanStatus.textContent = '';
                console.error(err);
                portScanResults.innerHTML = '<span style="color: #ff3b30; font-size: 0.85rem;">Scan failed.</span>';
            });
        });
    }

    // 2. Slave ID Scanner
    const runSlaveScanBtn = document.getElementById('run-slave-scan-btn');
    const slaveScanResults = document.getElementById('slave-scan-results');

    if (runSlaveScanBtn && slaveScanResults) {
        runSlaveScanBtn.addEventListener('click', function() {
            const port = document.getElementById('slave-scan-port')?.value || 'COM3';
            const startId = parseInt(document.getElementById('slave-scan-start')?.value || '1');
            const endId = parseInt(document.getElementById('slave-scan-end')?.value || '10');

            runSlaveScanBtn.disabled = true;
            runSlaveScanBtn.textContent = 'Scanning...';
            
            // Empty immediately before scanning
            slaveScanResults.innerHTML = '<div style="font-size: 0.85rem; font-weight: bold; margin-bottom: 8px; color: var(--text-muted);">Active scan in progress...</div><div id="slave-scan-badges" style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 8px;"></div>';
            const badgesWrap = document.getElementById('slave-scan-badges');
            let foundAny = false;

            const csrftoken = document.querySelector('[name=csrfmiddlewaretoken]')?.value || '';

            const scanSequentially = async () => {
                for (let id = startId; id <= endId; id++) {
                    try {
                        const res = await fetch('/settings/scan-slaves/', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'X-CSRFToken': csrftoken
                            },
                            body: JSON.stringify({
                                com_port: port,
                                start_id: id,
                                end_id: id
                            })
                        });
                        const data = await res.json();
                        if (data.success && data.slaves.length > 0) {
                            foundAny = true;
                            data.slaves.forEach(foundId => {
                                const badge = document.createElement('span');
                                badge.style.background = 'rgba(76, 175, 80, 0.15)';
                                badge.style.border = '1px solid #4CAF50';
                                badge.style.color = '#81c784';
                                badge.style.padding = '3px 8px';
                                badge.style.borderRadius = '4px';
                                badge.style.fontSize = '0.8rem';
                                badge.style.fontWeight = 'bold';
                                badge.textContent = `ID ${foundId}`;
                                badgesWrap.appendChild(badge);
                            });
                        }
                    } catch (err) {
                        console.error(err);
                    }
                }

                // Finish
                runSlaveScanBtn.disabled = false;
                runSlaveScanBtn.textContent = 'Scan Slave Range';

                const titleEl = slaveScanResults.firstChild;
                if (foundAny) {
                    titleEl.textContent = 'Active Modbus Slave stations detected:';
                    titleEl.style.color = 'var(--primary-green-light)';
                } else {
                    slaveScanResults.innerHTML = '<span style="font-size: 0.85rem; color: #ff9f0a;">No responsive Modbus Slave devices found in range. Check connection, station address and baudrate.</span>';
                }
            };

            scanSequentially();
        });
    }

    // 3. Register Scanner
    const runRegScanBtn = document.getElementById('run-reg-scan-btn');
    const regScanResultsWrap = document.getElementById('reg-scan-results-wrap');
    const regScanResultsTableBody = document.querySelector('#reg-scan-results-table tbody');

    if (runRegScanBtn && regScanResultsWrap && regScanResultsTableBody) {
        runRegScanBtn.addEventListener('click', function() {
            const port = document.getElementById('reg-scan-port')?.value || 'COM3';
            const slaveId = parseInt(document.getElementById('reg-scan-slave-id')?.value || '1');
            const startReg = parseInt(document.getElementById('reg-scan-start')?.value || '40001');
            const endReg = parseInt(document.getElementById('reg-scan-end')?.value || '40010');
            const funcCode = parseInt(document.getElementById('reg-scan-func-code')?.value || '3');

            runRegScanBtn.disabled = true;
            runRegScanBtn.textContent = 'Scanning...';
            
            // Empty table body immediately
            regScanResultsWrap.style.display = 'block';
            regScanResultsTableBody.innerHTML = '';

            const csrftoken = document.querySelector('[name=csrfmiddlewaretoken]')?.value || '';

            const scanRegistersSequentially = async () => {
                for (let reg = startReg; reg <= endReg; reg++) {
                    // Pre-fill loading row
                    const tempTr = document.createElement('tr');
                    tempTr.id = `temp-row-${reg}`;
                    tempTr.innerHTML = `
                        <td style="font-weight: bold;">${reg}</td>
                        <td colspan="4" style="color: var(--text-muted); font-style: italic;">Polling register...</td>
                    `;
                    regScanResultsTableBody.appendChild(tempTr);

                    try {
                        const res = await fetch('/settings/scan-registers/', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'X-CSRFToken': csrftoken
                            },
                            body: JSON.stringify({
                                com_port: port,
                                slave_id: slaveId,
                                start_register: reg,
                                end_register: reg,
                                function_code: funcCode
                            })
                        });
                        const data = await res.json();

                        const rowToRemove = document.getElementById(`temp-row-${reg}`);
                        if (rowToRemove) rowToRemove.remove();

                        if (data.success && data.results.length > 0) {
                            const rResult = data.results[0];
                            const tr = document.createElement('tr');
                            
                            const tdAddress = document.createElement('td');
                            tdAddress.style.fontWeight = 'bold';
                            tdAddress.textContent = rResult.register;
                            tr.appendChild(tdAddress);

                            const tdVal = document.createElement('td');
                            tdVal.textContent = rResult.value !== null ? rResult.value : '--';
                            tr.appendChild(tdVal);

                            const tdHex = document.createElement('td');
                            tdHex.style.fontFamily = 'monospace';
                            tdHex.textContent = rResult.value !== null ? '0x' + rResult.value.toString(16).toUpperCase() : '--';
                            tr.appendChild(tdHex);

                            const tdBin = document.createElement('td');
                            tdBin.style.fontFamily = 'monospace';
                            tdBin.textContent = rResult.value !== null ? rResult.value.toString(2).padStart(16, '0') : '--';
                            tr.appendChild(tdBin);

                            const tdStatus = document.createElement('td');
                            if (rResult.status === 'Success') {
                                tdStatus.innerHTML = '<span style="color: #4CAF50; font-weight: bold;">✓ Responsive</span>';
                            } else {
                                tdStatus.innerHTML = '<span style="color: #64748b;">' + rResult.status + '</span>';
                            }
                            tr.appendChild(tdStatus);

                            regScanResultsTableBody.appendChild(tr);
                        }
                    } catch (err) {
                        console.error(err);
                        const rowToRemove = document.getElementById(`temp-row-${reg}`);
                        if (rowToRemove) rowToRemove.remove();
                    }
                }

                runRegScanBtn.disabled = false;
                runRegScanBtn.textContent = 'Scan Registers';
            };

            scanRegistersSequentially();
        });
    }

    // 4. Real-time Diagnostics Statistics & Terminal Log viewer
    const terminalViewer = document.getElementById('terminal-viewer');
    const pauseTerminalBtn = document.getElementById('pause-terminal-btn');
    const clearTerminalBtn = document.getElementById('clear-terminal-btn');
    let isPaused = false;
    let loggedTimestamps = new Set();

    if (clearTerminalBtn && terminalViewer) {
        clearTerminalBtn.addEventListener('click', function() {
            terminalViewer.innerHTML = '<div style="color: #64748b; font-style: italic;">Terminal log cleared. Streaming traffic...</div>';
            loggedTimestamps.clear();
        });
    }

    if (pauseTerminalBtn) {
        pauseTerminalBtn.addEventListener('click', function() {
            isPaused = !isPaused;
            pauseTerminalBtn.textContent = isPaused ? '▶ Resume' : '⏸ Pause';
        });
    }

    function pollDiagnostics() {
        const panel = document.getElementById('panel-diagnostics-live-logs');
        if (!panel || panel.style.display !== 'block') return;

        fetch('/api/diagnostics/')
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                // Update stats counts
                document.getElementById('diag-tx-packets').textContent = data.stats.tx_packets;
                document.getElementById('diag-rx-packets').textContent = data.stats.rx_packets;
                document.getElementById('diag-crc-errors').textContent = data.stats.crc_errors;
                document.getElementById('diag-timeouts').textContent = data.stats.timeout_count;
                document.getElementById('diag-latency').textContent = data.stats.response_time_ms.toFixed(1);
                
                const qualEl = document.getElementById('diag-quality');
                qualEl.textContent = data.stats.comm_quality.toFixed(1) + '%';
                if (data.stats.comm_quality >= 95) {
                    qualEl.style.color = 'var(--primary-green-light)';
                } else if (data.stats.comm_quality >= 80) {
                    qualEl.style.color = '#ff9f0a';
                } else {
                    qualEl.style.color = '#ff3b30';
                }

                // Update terminal viewer
                if (terminalViewer && !isPaused && data.frames.length > 0) {
                    let hasNew = false;
                    let outputHTML = '';
                    
                    const revFrames = [...data.frames].reverse();
                    
                    revFrames.forEach(f => {
                        const key = `${f.timestamp}-${f.direction}-${f.frame_hex}`;
                        if (!loggedTimestamps.has(key)) {
                            hasNew = true;
                            loggedTimestamps.add(key);
                            
                            const color = f.direction === 'TX' ? '#00bcd4' : '#4CAF50';
                            const prefix = f.direction === 'TX' ? '[TX ➔]' : '[RX 🠔]';
                            outputHTML += `<div style="margin-bottom: 4px;"><span style="color: #64748b;">${f.timestamp}</span> <strong style="color: ${color};">${prefix}</strong> <span style="font-weight: 700; color: #f4f4f5;">${f.frame_hex}</span></div>`;
                        }
                    });

                    if (hasNew) {
                        if (terminalViewer.innerHTML.includes('Connecting to serial') || terminalViewer.innerHTML.includes('Terminal log cleared')) {
                            terminalViewer.innerHTML = '';
                        }
                        
                        terminalViewer.innerHTML += outputHTML;
                        terminalViewer.scrollTop = terminalViewer.scrollHeight;
                        
                        while (terminalViewer.childNodes.length > 200) {
                            terminalViewer.removeChild(terminalViewer.firstChild);
                        }
                    }
                }
            }
        })
        .catch(err => console.error('Error fetching diagnostics:', err));
    }

    // Poll every 1 second
    setInterval(pollDiagnostics, 1000);
}


function initFlowMeterManagement() {
    const modalBackdrop = document.getElementById('flow-modal-backdrop');
    const modalForm = document.getElementById('flow-modal-form');
    const modalCloseBtn = document.getElementById('flow-modal-close-btn');
    const modalCancelBtn = document.getElementById('flow-modal-cancel-btn');
    const modalTitle = document.getElementById('flow-modal-title');
    const addFlowBtn = document.getElementById('add-flow-meter-btn');

    const inputFlowId = document.getElementById('modal-flow-id');
    const inputFlowName = document.getElementById('modal-flow-name');
    const inputFlowRateReg = document.getElementById('modal-flow-rate-reg');
    const inputTotalReg = document.getElementById('modal-total-volume-reg');
    const inputSlaveId = document.getElementById('modal-flow-slave-id');
    const inputFuncCode = document.getElementById('modal-flow-function-code');
    const inputDataType = document.getElementById('modal-flow-data-type');
    const inputByteOrder = document.getElementById('modal-flow-byte-order');
    const inputFlowUnit = document.getElementById('modal-flow-unit');
    const inputTotalUnit = document.getElementById('modal-total-unit');
    const inputFlowErrorAccuracy = document.getElementById('modal-flow-error-accuracy');
    const inputFlowHighLimit = document.getElementById('modal-flow-high-limit');
    const inputFlowLowLimit = document.getElementById('modal-flow-low-limit');
    const inputFlowAlarmEnabled = document.getElementById('modal-flow-alarm-enabled');
    const inputScannerRawZero = document.getElementById('modal-flow-scanner-raw-zero');
    const inputScannerRawSpan = document.getElementById('modal-flow-scanner-raw-span');
    const inputCalibratedSpan = document.getElementById('modal-flow-calibrated-span');

    if (inputFlowUnit) {
        const updateFlowLabels = () => {
            const val = inputFlowUnit.value || 'm³/h';
            const highLabel = document.getElementById('modal-flow-high-label');
            const lowLabel = document.getElementById('modal-flow-low-label');
            const errLabel = document.getElementById('modal-flow-error-accuracy-label');
            if (highLabel) highLabel.textContent = `High Alarm Limit (${val})`;
            if (lowLabel) lowLabel.textContent = `Low Alarm Limit (${val})`;
            if (errLabel) errLabel.textContent = `Error Accuracy Offset (${val})`;
        };
        inputFlowUnit.addEventListener('input', updateFlowLabels);
        inputFlowUnit.addEventListener('change', updateFlowLabels);
    }

    const openModal = (isEdit = false) => {
        if (modalBackdrop) modalBackdrop.style.display = 'block';
        if (isEdit) {
            if (modalTitle) modalTitle.textContent = "Edit Flow Meter Config";
            if (inputFlowId) inputFlowId.readOnly = true;
        } else {
            if (modalTitle) modalTitle.textContent = "Add New Flow Meter";
            if (inputFlowId) {
                inputFlowId.readOnly = false;
                inputFlowId.value = "";
            }
            if (modalForm) modalForm.reset();
            if (inputFuncCode) inputFuncCode.value = "3";
            if (inputDataType) inputDataType.value = "Float32";
            if (inputByteOrder) inputByteOrder.value = "ABCD";
            if (inputFlowUnit) inputFlowUnit.value = "m³/h";
            if (inputTotalUnit) inputTotalUnit.value = "m³";
            if (inputFlowErrorAccuracy) inputFlowErrorAccuracy.value = "0.0";
            if (inputFlowHighLimit) inputFlowHighLimit.value = "90.0";
            if (inputFlowLowLimit) inputFlowLowLimit.value = "10.0";
            if (inputFlowAlarmEnabled) inputFlowAlarmEnabled.checked = true;
            if (inputScannerRawZero) inputScannerRawZero.value = "0.0";
            if (inputScannerRawSpan) inputScannerRawSpan.value = "0.0";
            if (inputCalibratedSpan) inputCalibratedSpan.value = "100.0";
            if (inputSlaveId) {
                const globalSlaveId = document.getElementById('settings-slave-id-flow')?.value || '1';
                inputSlaveId.value = globalSlaveId;
            }
        }
        if (inputFlowUnit) inputFlowUnit.dispatchEvent(new Event('change'));
    };

    const closeModal = () => {
        if (modalBackdrop) modalBackdrop.style.display = 'none';
    };

    if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeModal);
    if (modalCancelBtn) modalCancelBtn.addEventListener('click', closeModal);
    if (modalBackdrop) {
        modalBackdrop.addEventListener('click', function(e) {
            if (e.target === modalBackdrop) closeModal();
        });
    }

    if (addFlowBtn) {
        addFlowBtn.addEventListener('click', function() {
            openModal(false);
        });
    }

    const editButtons = document.querySelectorAll('.edit-flow-meter-btn');
    editButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            openModal(true);
            if (inputFlowId) inputFlowId.value = this.getAttribute('data-meter-id') || '';
            if (inputFlowName) inputFlowName.value = this.getAttribute('data-meter-name') || '';
            if (inputFlowRateReg) inputFlowRateReg.value = this.getAttribute('data-flow-reg') || '';
            if (inputTotalReg) inputTotalReg.value = this.getAttribute('data-total-reg') || '';
            if (inputSlaveId) inputSlaveId.value = this.getAttribute('data-slave-id') || '1';
            if (inputFuncCode) inputFuncCode.value = this.getAttribute('data-function-code') || '3';
            if (inputDataType) inputDataType.value = this.getAttribute('data-data-type') || 'Float32';
            if (inputByteOrder) inputByteOrder.value = this.getAttribute('data-byte-order') || 'ABCD';
            if (inputFlowUnit) inputFlowUnit.value = this.getAttribute('data-flow-unit') || 'L/min';
            if (inputTotalUnit) inputTotalUnit.value = this.getAttribute('data-total-unit') || 'Liters';
            if (inputFlowErrorAccuracy) inputFlowErrorAccuracy.value = this.getAttribute('data-error-accuracy') || '0.0';
            if (inputFlowHighLimit) inputFlowHighLimit.value = this.getAttribute('data-high-limit') || '90.0';
            if (inputFlowLowLimit) inputFlowLowLimit.value = this.getAttribute('data-low-limit') || '10.0';
            if (inputScannerRawZero) inputScannerRawZero.value = this.getAttribute('data-scanner-raw-zero') || '0.0';
            if (inputScannerRawSpan) inputScannerRawSpan.value = this.getAttribute('data-scanner-raw-span') || '0.0';
            if (inputCalibratedSpan) inputCalibratedSpan.value = this.getAttribute('data-calibrated-span') || '100.0';
            if (inputFlowAlarmEnabled) inputFlowAlarmEnabled.checked = this.getAttribute('data-alarm-enabled') !== 'false';
            if (inputFlowUnit) inputFlowUnit.dispatchEvent(new Event('change'));
        });
    });

    if (modalForm) {
        modalForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const csrftoken = document.querySelector('[name=csrfmiddlewaretoken]')?.value || '';

            const payload = {
                meter_id: inputFlowId?.value || '',
                name: inputFlowName?.value || '',
                flow_rate_register: inputFlowRateReg?.value || '',
                total_volume_register: inputTotalReg?.value || '',
                slave_id: inputSlaveId?.value || '1',
                function_code: inputFuncCode?.value || '3',
                data_type: inputDataType?.value || 'Float32',
                byte_order: inputByteOrder?.value || 'ABCD',
                flow_unit: inputFlowUnit?.value || 'L/min',
                total_unit: inputTotalUnit?.value || 'Liters',
                error_accuracy: inputFlowErrorAccuracy?.value || '0.0',
                high_limit: inputFlowHighLimit?.value || '90.0',
                low_limit: inputFlowLowLimit?.value || '10.0',
                scanner_raw_zero: inputScannerRawZero?.value || '0.0',
                scanner_raw_span: inputScannerRawSpan?.value || '0.0',
                calibrated_span: inputCalibratedSpan?.value || '100.0',
                alarm_enabled: inputFlowAlarmEnabled ? inputFlowAlarmEnabled.checked : true
            };

            fetch('/settings/add-flow-meter/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': csrftoken
                },
                body: JSON.stringify(payload)
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    alert(data.message);
                    closeModal();
                    window.location.reload();
                } else {
                    alert("Error: " + data.error);
                }
            })
            .catch(err => {
                console.error(err);
                alert("Failed to save flow meter configuration.");
            });
        });
    }

    const deleteButtons = document.querySelectorAll('.delete-flow-meter-btn');
    deleteButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const meterId = this.getAttribute('data-meter-id');
            if (!meterId) return;

            if (!confirm(`Are you sure you want to delete Flow Meter '${meterId}'? This cannot be undone.`)) {
                return;
            }

            const csrftoken = document.querySelector('[name=csrfmiddlewaretoken]')?.value || '';
            fetch(`/settings/delete-flow-meter/${encodeURIComponent(meterId)}/`, {
                method: 'POST',
                headers: {
                    'X-CSRFToken': csrftoken
                }
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    alert(data.message);
                    window.location.reload();
                } else {
                    alert("Error: " + data.error);
                }
            })
            .catch(err => {
                console.error(err);
                alert("Failed to delete flow meter.");
            });
        });
    });
}
