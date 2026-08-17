/* =========================================
   Dashboard JavaScript
   Chart.js integration + real-time updates
   ========================================= */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize trend chart
    initTrendChart();

    // Sidebar toggle
    initSidebar();

    // Time range buttons
    initTimeRangeButtons();

    // Animate tank fills on load
    animateTankFills();

    // Update clock
    updateClock();
    setInterval(updateClock, 1000);

    // Initialize dynamic real-time telemetry polling
    initRealTimeUpdates();

    // Initialize all modals (unified handler)
    initAllModals();
});

let trendChart = null;
let lastChartUpdateTime = 0;
let activeModalTankId = null;
let activeModalCapacity = 5.0;
let latestTelemetryCache = {};
let modalChart = null;
let currentOpenFlowId = null;

function getThemeColors() {
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    return {
        gridColor: isLight ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.04)',
        textColor: isLight ? '#4b5563' : '#a0aec0',
        legendColor: isLight ? '#374151' : '#a0aec0'
    };
}

function initTrendChart() {
    const canvas = document.getElementById('trend-chart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    fetch('/api/historical-data/')
    .then(res => res.json())
    .then(payload => {
        const themeColors = getThemeColors();
        const labels = payload.timestamps.map(ts => {
            const d = new Date(ts);
            return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
        });
        const datasets = [];
        
        const colors = [
            { line: '#4CAF50', bg: 'rgba(76, 175, 80, 0.1)' },
            { line: '#2196F3', bg: 'rgba(33, 150, 243, 0.1)' },
            { line: '#FF9800', bg: 'rgba(255, 152, 0, 0.1)' },
            { line: '#f44336', bg: 'rgba(244, 67, 54, 0.1)' },
            { line: '#9C27B0', bg: 'rgba(156, 39, 176, 0.1)' },
            { line: '#00BCD4', bg: 'rgba(0, 188, 212, 0.1)' },
        ];

        let index = 0;
        for (const tankId in payload.datasets) {
            datasets.push({
                label: tankId,
                data: payload.datasets[tankId],
                borderColor: colors[index % colors.length].line,
                backgroundColor: colors[index % colors.length].bg,
                borderWidth: 2,
                pointRadius: 0,
                pointHoverRadius: 4,
                tension: 0.4,
                fill: false,
                spanGaps: true,
            });
            index++;
        }

        trendChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: datasets,
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'bottom',
                        labels: {
                            color: themeColors.legendColor,
                            usePointStyle: true,
                            pointStyle: 'line',
                            padding: 16,
                            font: {
                                family: "'Inter', sans-serif",
                                size: 11,
                            },
                        },
                    },
                    tooltip: {
                        backgroundColor: 'rgba(10, 14, 26, 0.95)',
                        titleColor: '#ffffff',
                        bodyColor: '#a0aec0',
                        borderColor: 'rgba(76, 175, 80, 0.3)',
                        borderWidth: 1,
                        padding: 12,
                        titleFont: { family: "'Inter', sans-serif", weight: '600' },
                        bodyFont: { family: "'Inter', sans-serif" },
                        callbacks: {
                            label: function(ctx) {
                                const isFlow = ctx.dataset.label.startsWith('FM-');
                                return `${ctx.dataset.label}: ${ctx.parsed.y.toFixed(1)}${isFlow ? ' L/min' : '%'}`;
                            }
                        }
                    },
                },
                scales: {
                    x: {
                        offset: false,
                        grid: {
                            color: themeColors.gridColor,
                            drawBorder: false,
                        },
                        ticks: {
                            color: themeColors.textColor,
                            font: { family: "'Inter', sans-serif", size: 10 },
                            maxTicksLimit: 8,
                        },
                    },
                    y: {
                        min: 0,
                        suggestedMax: 100,
                        grid: {
                            color: themeColors.gridColor,
                            drawBorder: false,
                        },
                        ticks: {
                            color: themeColors.textColor,
                            font: { family: "'Inter', sans-serif", size: 10 },
                            callback: function(value) { return value; },
                        },
                        title: {
                            display: true,
                            text: 'Measurement Value',
                            color: themeColors.textColor,
                            font: { family: "'Inter', sans-serif", size: 11 },
                        },
                    },
                },
            },
        });
        
        // Bind tank filter change
        const filterEl = document.getElementById('chart-tank-filter');
        if (filterEl) {
            filterEl.addEventListener('change', updateTrendChartData);
        }
    })
    .catch(err => console.error('Error fetching trend data:', err));
}

function updateTrendChartData() {
    if (!trendChart) return;
    
    const activeRangeBtn = document.querySelector('.time-range-btn.active');
    const range = activeRangeBtn ? activeRangeBtn.getAttribute('data-range').toUpperCase() : '6H';
    
    const filterEl = document.getElementById('chart-tank-filter');
    const tankId = filterEl ? filterEl.value : 'all';
    
    let url = `/api/historical-data/?range=${range}`;
    if (tankId !== 'all') {
        url += `&tank_id=${encodeURIComponent(tankId)}`;
    }
    
    // Show chart-header subtitle text
    const titleSpan = document.querySelector('.chart-title span');
    if (titleSpan) {
        titleSpan.textContent = tankId === 'all' ? '(All Tanks)' : `(${tankId})`;
    }
    
    fetch(url)
    .then(res => res.json())
    .then(payload => {
        const labels = payload.timestamps.map(ts => {
            const d = new Date(ts);
            return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
        });
        const datasets = [];
        const colors = [
            { line: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)' },
            { line: '#0ea5e9', bg: 'rgba(14, 165, 233, 0.1)' },
            { line: '#FF9800', bg: 'rgba(255, 152, 0, 0.1)' },
            { line: '#f44336', bg: 'rgba(244, 67, 54, 0.1)' },
            { line: '#9C27B0', bg: 'rgba(156, 39, 176, 0.1)' },
            { line: '#00BCD4', bg: 'rgba(0, 188, 212, 0.1)' },
        ];
        
        let index = 0;
        for (const tid in payload.datasets) {
            datasets.push({
                label: tid,
                data: payload.datasets[tid],
                borderColor: colors[index % colors.length].line,
                backgroundColor: colors[index % colors.length].bg,
                borderWidth: 2,
                pointRadius: 0,
                pointHoverRadius: 4,
                tension: 0.4,
                fill: false,
            });
            index++;
        }
        
        trendChart.data.labels = labels;
        trendChart.data.datasets = datasets;
        trendChart.update();
    })
    .catch(err => console.error('Error reloading trend chart data:', err));
}

function initSidebar() {
    const toggle = document.getElementById('sidebar-toggle');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');

    if (toggle && sidebar) {
        toggle.addEventListener('click', () => {
            sidebar.classList.toggle('open');
            overlay.classList.toggle('show');
        });
    }

    if (overlay) {
        overlay.addEventListener('click', () => {
            sidebar.classList.remove('open');
            overlay.classList.remove('show');
        });
    }
}

function initTimeRangeButtons() {
    document.querySelectorAll('.time-range-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.time-range-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            updateTrendChartData();
        });
    });
}

function animateTankFills() {
    document.querySelectorAll('.tank-fill').forEach(fill => {
        const targetHeight = fill.getAttribute('data-level') + '%';
        fill.style.height = '0%';
        setTimeout(() => {
            fill.style.height = targetHeight;
        }, 300);
    });
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

// =========================================
// UNIFIED Modal Management
// Fixes the open/close/reopen bug by using ONLY classList.add('show') / classList.remove('show')
// Never uses style.display directly - prevents inline style from overriding CSS class
// =========================================

function openOverlay(overlay) {
    if (!overlay) return;
    overlay.style.display = ''; // Clear any inline display style
    overlay.classList.add('show');
    document.body.style.overflow = 'hidden';
}

function closeOverlay(overlay) {
    if (!overlay) return;
    overlay.classList.remove('show');
    document.body.style.overflow = '';
}

function formatVolume(valInKL, unit, capacityUnit = null) {
    if (valInKL === null || valInKL === undefined || isNaN(valInKL)) {
        return '--';
    }
    const targetUnit = (capacityUnit || unit || '%').trim();
    if (targetUnit === 'RAW' || targetUnit === 'None' || targetUnit === 'No Unit') {
        const num = parseFloat(valInKL);
        return Number.isInteger(num) ? `${num}` : `${num.toFixed(1)}`;
    } else if (targetUnit === 'L' || targetUnit === 'Liters') {
        const liters = valInKL > 100 ? valInKL : valInKL * 1000;
        return `${Math.round(liters)} L`;
    } else if (targetUnit === 'mL' || targetUnit === 'Milliliters') {
        const ml = valInKL > 100 ? valInKL : valInKL * 1000000;
        return `${Math.round(ml)} mL`;
    } else if (targetUnit === 'KL' || targetUnit === 'Kiloliters' || targetUnit === '%') {
        return `${valInKL.toFixed(1)} KL`;
    } else if (targetUnit === 'm³' || targetUnit === 'm3') {
        return `${valInKL.toFixed(1)} m³`;
    } else if (targetUnit === 'gal' || targetUnit === 'Gallons') {
        const gallons = valInKL > 100 ? valInKL : valInKL * 264.172;
        return `${gallons.toFixed(1)} gal`;
    } else {
        return Number.isInteger(valInKL) ? `${valInKL} ${targetUnit}` : `${valInKL.toFixed(1)} ${targetUnit}`;
    }
}

function adjustLcdFontSize(el, text) {
    if (!el) return;
    const len = text.trim().length;
    if (len > 8) {
        el.style.fontSize = '1.3rem';
    } else if (len > 6) {
        el.style.fontSize = '1.6rem';
    } else if (len > 5) {
        el.style.fontSize = '1.8rem';
    } else {
        el.style.fontSize = '2.2rem';
    }
}

function formatTankLevel(levelPercent, capacityKL, unit, rawVal = null) {
    const normUnit = (unit || '%').trim();
    if (normUnit === 'RAW') {
        const val = (rawVal !== null && rawVal !== undefined && rawVal !== '' && !isNaN(rawVal)) ? rawVal : levelPercent;
        if (val === null || val === undefined || isNaN(val)) return '--';
        const num = parseFloat(val);
        return Number.isInteger(num) ? `${num}` : `${num.toFixed(1)}`;
    }
    if (levelPercent === null || levelPercent === undefined || isNaN(levelPercent)) {
        return '--';
    }
    const cap = parseFloat(capacityKL) || 5.0;
    if (normUnit === '%') {
        return `${levelPercent.toFixed(1)}%`;
    } else if (normUnit === 'L' || normUnit === 'Liters') {
        const liters = (levelPercent / 100.0) * cap * 1000;
        return `${Math.round(liters)} L`;
    } else if (normUnit === 'mL' || normUnit === 'Milliliters') {
        const ml = (levelPercent / 100.0) * (cap <= 100 ? cap * 1000000 : cap);
        return `${Math.round(ml)} mL`;
    } else if (normUnit === 'KL' || normUnit === 'Kiloliters') {
        const kl = (levelPercent / 100.0) * cap;
        return `${kl.toFixed(1)} KL`;
    } else if (normUnit === 'm³' || normUnit === 'm3') {
        const m3 = (levelPercent / 100.0) * cap;
        return `${m3.toFixed(1)} m³`;
    } else if (normUnit === 'gal' || normUnit === 'Gallons') {
        const gal = (levelPercent / 100.0) * cap * 264.172;
        return `${gal.toFixed(1)} gal`;
    } else {
        return `${levelPercent.toFixed(1)} ${normUnit}`;
    }
}

function formatTankCapacity(capacityKL, unit, capacityUnit = null) {
    if (capacityKL === null || capacityKL === undefined || isNaN(capacityKL)) {
        return '--';
    }
    const cap = parseFloat(capacityKL);
    const targetUnit = (capacityUnit || unit || '%').trim();
    if (targetUnit === 'RAW' || targetUnit === 'None' || targetUnit === 'No Unit') {
        return Number.isInteger(cap) ? `${cap}` : `${cap.toFixed(1)}`;
    } else if (targetUnit === 'L' || targetUnit === 'Liters') {
        return cap > 100 ? `${Math.round(cap)} L` : `${Math.round(cap * 1000)} L`;
    } else if (targetUnit === 'mL' || targetUnit === 'Milliliters') {
        return cap > 100 ? `${Math.round(cap)} mL` : `${Math.round(cap * 1000000)} mL`;
    } else if (targetUnit === 'KL' || targetUnit === 'Kiloliters' || targetUnit === '%') {
        return `${cap.toFixed(1)} KL`;
    } else if (targetUnit === 'm³' || targetUnit === 'm3') {
        return `${cap.toFixed(1)} m³`;
    } else if (targetUnit === 'gal' || targetUnit === 'Gallons') {
        return `${cap.toFixed(1)} gal`;
    } else {
        return `${cap.toFixed(1)} ${targetUnit}`;
    }
}

function updateDashboardModalLabels(deviceType, unit) {
    if (deviceType === 'tank') {
        const u = unit || '%';
        const capLabel = document.getElementById('widget-capacity-label');
        const highLabel = document.getElementById('widget-high-label');
        const lowLabel = document.getElementById('widget-low-label');
        const errLabel = document.getElementById('widget-error-accuracy-label');
        if (capLabel) capLabel.textContent = `Capacity (${u})`;
        if (highLabel) highLabel.textContent = `High Threshold (${u})`;
        if (lowLabel) lowLabel.textContent = `Low Threshold (${u})`;
        if (errLabel) errLabel.textContent = `Error Accuracy (${u})`;
    } else if (deviceType === 'flow_meter') {
        const u = unit || 'L/min';
        const highLabel = document.getElementById('widget-flow-high-limit-label');
        const lowLabel = document.getElementById('widget-flow-low-limit-label');
        const errLabel = document.getElementById('widget-flow-error-accuracy-label');
        if (highLabel) highLabel.textContent = `High Limit (${u})`;
        if (lowLabel) lowLabel.textContent = `Low Limit (${u})`;
        if (errLabel) errLabel.textContent = `Error Accuracy (${u})`;
    }
}

function initAllModals() {
    const tankModalOverlay = document.getElementById('tank-modal-overlay');
    const flowModalOverlay = document.getElementById('flow-modal-overlay');
    const addWidgetOverlay = document.getElementById('add-widget-modal-overlay');
    const deviceSummaryOverlay = document.getElementById('device-summary-modal-overlay');
    const capacityEditorOverlay = document.getElementById('capacity-editor-modal-overlay');

    // --- Tank Detail Modal ---
    initTankModal(tankModalOverlay);

    // --- Flow Meter Detail Modal ---
    initFlowModal(flowModalOverlay);

    // --- Add Widget Modal ---
    initAddWidgetModal(addWidgetOverlay);

    // --- Device Summary Modal ---
    initDeviceSummaryModal(deviceSummaryOverlay);

    // --- Capacity Editor Modal ---
    initCapacityEditorModal(capacityEditorOverlay);
}

function initDeviceSummaryModal(overlay) {
    const cardTrigger = document.getElementById('device-summary-card');
    const closeBtn = document.getElementById('device-summary-close-btn');
    
    if (!cardTrigger || !overlay) return;
    
    overlay.style.display = ''; // Clear inline style
    
    cardTrigger.addEventListener('click', () => {
        populateDeviceSummaryModal();
        openOverlay(overlay);
    });
    
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            closeOverlay(overlay);
        });
    }
    
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            closeOverlay(overlay);
        }
    });
}

function populateDeviceSummaryModal() {
    const tanksList = document.getElementById('device-summary-tanks-list');
    const metersList = document.getElementById('device-summary-meters-list');
    if (!tanksList || !metersList) return;
    
    tanksList.innerHTML = '';
    metersList.innerHTML = '';
    
    // Populate Tanks
    const tankCards = document.querySelectorAll('.tank-grid .tank-card:not(.add-widget-card)');
    let activeTanks = 0;
    tankCards.forEach(card => {
        const id = card.getAttribute('data-tank-id');
        const name = card.getAttribute('data-tank-name') || id;
        const levelEl = card.querySelector('.tank-card-level');
        const level = levelEl ? levelEl.textContent : '--';
        
        const statusEl = card.querySelector('.tank-card-status');
        const statusText = statusEl ? statusEl.textContent : 'Normal';
        const statusClass = statusEl ? statusEl.className : 'tank-card-status normal';
        
        const item = document.createElement('div');
        item.style.display = 'flex';
        item.style.justifyContent = 'space-between';
        item.style.alignItems = 'center';
        item.style.padding = '8px 12px';
        item.style.background = 'rgba(255, 255, 255, 0.02)';
        item.style.border = '1px solid rgba(255, 255, 255, 0.05)';
        item.style.borderRadius = 'var(--radius-sm)';
        
        item.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 2px;">
                <span style="font-weight: 700; font-size: 0.85rem; color: var(--text-primary);">${name} <span style="font-size: 0.72rem; color: var(--text-muted); font-weight: normal;">(${id})</span></span>
                <span style="font-size: 0.78rem; color: var(--text-secondary); font-family: var(--font-display); font-weight: 600;">Current Level: ${level}</span>
            </div>
            <span class="${statusClass}" style="font-size: 0.62rem; font-weight: 700; padding: 2px 8px; border-radius: 10px; text-transform: uppercase;">${statusText}</span>
        `;
        tanksList.appendChild(item);
        activeTanks++;
    });
    
    if (tankCards.length === 0) {
        tanksList.innerHTML = `<div style="text-align: center; color: var(--text-muted); font-size: 0.85rem; padding: 12px;">No active tanks configured.</div>`;
    }
    
    // Populate Flow Meters
    const meterCards = document.querySelectorAll('#flow-meter-cards .flow-meter-card');
    let activeMeters = 0;
    meterCards.forEach(card => {
        const fullId = card.id;
        const id = fullId.replace('flow-card-', '');
        
        const nameEl = card.querySelector('.tank-card-name');
        const fullName = nameEl ? nameEl.textContent : id;
        const name = fullName.split(' (')[0];
        
        const rateEl = card.querySelector(`#flow-rate-${id}`);
        const rate = rateEl ? rateEl.textContent : '--';
        
        const unitEl = card.querySelector('.flow-metric-unit');
        const unit = unitEl ? unitEl.textContent : 'L/min';
        
        const statusEl = card.querySelector(`#flow-status-${id}`);
        const statusText = statusEl ? statusEl.textContent : 'Online';
        const statusClass = statusEl ? statusEl.className : 'tank-card-status normal';
        
        const item = document.createElement('div');
        item.style.display = 'flex';
        item.style.justifyContent = 'space-between';
        item.style.alignItems = 'center';
        item.style.padding = '8px 12px';
        item.style.background = 'rgba(255, 255, 255, 0.02)';
        item.style.border = '1px solid rgba(255, 255, 255, 0.05)';
        item.style.borderRadius = 'var(--radius-sm)';
        
        item.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 2px;">
                <span style="font-weight: 700; font-size: 0.85rem; color: var(--text-primary);">${name} <span style="font-size: 0.72rem; color: var(--text-muted); font-weight: normal;">(${id})</span></span>
                <span style="font-size: 0.78rem; color: var(--text-secondary); font-family: var(--font-display); font-weight: 600;">Current Flow: ${rate} ${unit}</span>
            </div>
            <span class="${statusClass}" style="font-size: 0.62rem; font-weight: 700; padding: 2px 8px; border-radius: 10px; text-transform: uppercase;">${statusText}</span>
        `;
        metersList.appendChild(item);
        activeMeters++;
    });
    
    if (meterCards.length === 0) {
        metersList.innerHTML = `<div style="text-align: center; color: var(--text-muted); font-size: 0.85rem; padding: 12px;">No active flow meters configured.</div>`;
    }
    
    // Update summary counts dynamically in the modal
    const modalTanksCount = document.getElementById('modal-summary-tanks-count');
    const modalMetersCount = document.getElementById('modal-summary-meters-count');
    if (modalTanksCount) modalTanksCount.textContent = activeTanks;
    if (modalMetersCount) modalMetersCount.textContent = activeMeters;
}

function initCapacityEditorModal(overlay) {
    const cardTrigger = document.getElementById('total-capacity-card');
    const closeBtn = document.getElementById('capacity-editor-close-btn');
    const cancelBtn = document.getElementById('capacity-editor-cancel-btn');
    
    if (!cardTrigger || !overlay) return;
    
    overlay.style.display = ''; // Clear inline style
    
    cardTrigger.addEventListener('click', () => {
        populateCapacityEditorModal();
        openOverlay(overlay);
    });
    
    if (closeBtn) closeBtn.addEventListener('click', () => closeOverlay(overlay));
    if (cancelBtn) cancelBtn.addEventListener('click', () => closeOverlay(overlay));
    
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            closeOverlay(overlay);
        }
    });
}

function populateCapacityEditorModal() {
    const tanksList = document.getElementById('capacity-editor-tanks-list');
    const metersList = document.getElementById('capacity-editor-meters-list');
    if (!tanksList || !metersList) return;
    
    tanksList.innerHTML = '';
    metersList.innerHTML = '';
    
    // Populate Tanks Volumetric Capacities
    const tankCards = document.querySelectorAll('.tank-grid .tank-card:not(.add-widget-card)');
    tankCards.forEach(card => {
        const id = card.getAttribute('data-tank-id');
        const name = card.getAttribute('data-tank-name') || id;
        const capacity = card.getAttribute('data-capacity') || '5.0';
        const unit = card.getAttribute('data-unit') || 'KL';
        
        const item = document.createElement('div');
        item.style.display = 'flex';
        item.style.justifyContent = 'space-between';
        item.style.alignItems = 'center';
        item.style.padding = '10px 14px';
        item.style.background = 'rgba(255, 255, 255, 0.02)';
        item.style.border = '1px solid rgba(255, 255, 255, 0.05)';
        item.style.borderRadius = 'var(--radius-sm)';
        
        item.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 2px;">
                <span style="font-weight: 700; font-size: 0.88rem; color: var(--text-primary);">${name} <span style="font-size: 0.72rem; color: var(--text-muted); font-weight: normal;">(${id})</span></span>
                <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 500;">Volumetric capacity</span>
            </div>
            <span style="font-size: 0.95rem; font-family: var(--font-display); font-weight: 700; color: var(--primary-green-light);">${parseFloat(capacity).toFixed(1)} ${unit}</span>
        `;
        tanksList.appendChild(item);
    });
    
    if (tankCards.length === 0) {
        tanksList.innerHTML = `<div style="text-align: center; color: var(--text-muted); font-size: 0.88rem; padding: 24px;">No active tanks configured.</div>`;
    }
    
    // Populate Flow Meters Limits (Capacities)
    const meterCards = document.querySelectorAll('#flow-meter-cards .flow-meter-card');
    meterCards.forEach(card => {
        const id = card.getAttribute('data-flow-id') || card.id.replace('flow-card-', '');
        const name = card.getAttribute('data-flow-name') || id;
        const highLimit = card.getAttribute('data-high-limit') || '90.0';
        const unit = card.getAttribute('data-unit') || 'L/min';
        
        const item = document.createElement('div');
        item.style.display = 'flex';
        item.style.justifyContent = 'space-between';
        item.style.alignItems = 'center';
        item.style.padding = '10px 14px';
        item.style.background = 'rgba(255, 255, 255, 0.02)';
        item.style.border = '1px solid rgba(255, 255, 255, 0.05)';
        item.style.borderRadius = 'var(--radius-sm)';
        
        item.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 2px;">
                <span style="font-weight: 700; font-size: 0.88rem; color: var(--text-primary);">${name} <span style="font-size: 0.72rem; color: var(--text-muted); font-weight: normal;">(${id})</span></span>
                <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 500;">Maximum rated flow limit</span>
            </div>
            <span style="font-size: 0.95rem; font-family: var(--font-display); font-weight: 700; color: #2196f3;">${parseFloat(highLimit).toFixed(1)} ${unit}</span>
        `;
        metersList.appendChild(item);
    });
    
    if (meterCards.length === 0) {
        metersList.innerHTML = `<div style="text-align: center; color: var(--text-muted); font-size: 0.88rem; padding: 24px;">No active flow meters configured.</div>`;
    }
}

function initTankModal(overlay) {
    const cards = document.querySelectorAll('.tank-card:not(.add-widget-card)');
    const closeBtn = document.getElementById('modal-close-btn');
    const fullscreenBtn = document.getElementById('modal-fullscreen-btn');
    const modalInsideCard = document.getElementById('tank-modal-card');

    if (!overlay || !closeBtn) return;

    cards.forEach(card => {
        card.addEventListener('click', function(e) {
            // Don't open if clicking on Add Widget card
            if (this.classList.contains('add-widget-card')) return;
            
            // Get tank details from card dataset
            const tankId = this.getAttribute('data-tank-id');
            const tankName = this.getAttribute('data-tank-name') || tankId;
            const regAddr = this.getAttribute('data-register-address') || '--';
            const slaveId = this.getAttribute('data-slave-id') || '--';
            const funcCode = this.getAttribute('data-function-code') || '3';
        const capacity = parseFloat(this.getAttribute('data-capacity') || '5.0');
            const highLimit = parseFloat(this.getAttribute('data-high-limit') || '90.0');
            const lowLimit = parseFloat(this.getAttribute('data-low-limit') || '10.0');
            const unit = this.getAttribute('data-unit') || '%';
            const baudRate = this.getAttribute('data-baud-rate') || '9600';
            const parity = this.getAttribute('data-parity') || 'None';
            const rawValAttr = this.getAttribute('data-raw-value');
            const rawVal = (rawValAttr !== null && rawValAttr !== undefined && rawValAttr !== '') ? parseFloat(rawValAttr) : null;
            const scannerRawZero = parseFloat(this.getAttribute('data-scanner-raw-zero') || '0.0');
            const scannerRawSpan = parseFloat(this.getAttribute('data-scanner-raw-span') || '0.0');

            // Set global active modal indicators for real-time polling updates
            activeModalTankId = tankId;
            activeModalCapacity = capacity;

            // Get raw percentage level from telemetry cache or data attribute
            let levelPercent = latestTelemetryCache[tankId];
            if (levelPercent === undefined || levelPercent === null) {
                const fillEl = this.querySelector('.tank-fill');
                if (fillEl && fillEl.hasAttribute('data-level')) {
                    const rawLvl = fillEl.getAttribute('data-level');
                    if (rawLvl !== '') levelPercent = parseFloat(rawLvl);
                }
            }
            if (isNaN(levelPercent)) levelPercent = null;

            const statusEl = this.querySelector('.tank-card-status');
            const status = statusEl ? statusEl.textContent : 'Normal';
            const statusClass = status.toLowerCase().replace(' ', '-');

            // Update modal content
            document.getElementById('modal-tank-title').textContent = `${tankName.toUpperCase()} DETAIL DIAGNOSTIC`;
            document.getElementById('modal-tank-subtitle').textContent = `Real-time Level Sensor Feed • Location: Area ${tankName.split(' ')[1] || '1'}`;
            document.getElementById('modal-percentage-text').textContent = levelPercent !== null ? formatTankLevel(levelPercent, capacity, unit, rawVal) : '--';

            // Update cylinder height and class (always 0-100% full visual)
            const fill = document.getElementById('modal-cylinder-fill');
            fill.className = `cylinder-fill ${statusClass}`;
            fill.style.height = '0%';
            if (levelPercent !== null) {
                setTimeout(() => {
                    const clampedFill = Math.max(0, Math.min(100, levelPercent));
                    fill.style.height = clampedFill + '%';
                }, 200);
            }

            // Update cylinder dotted thresholds visual based on actual db configuration and unit
            const highLimitLine = document.getElementById('modal-high-limit-line');
            const lowLimitLine = document.getElementById('modal-low-limit-line');
            if (unit === 'RAW' && scannerRawSpan > scannerRawZero) {
                const highPct = highLimit > 100 ? Math.max(0, Math.min(100, ((highLimit - scannerRawZero) / (scannerRawSpan - scannerRawZero)) * 100)) : highLimit;
                const lowPct = lowLimit > 100 ? Math.max(0, Math.min(100, ((lowLimit - scannerRawZero) / (scannerRawSpan - scannerRawZero)) * 100)) : lowLimit;
                if (highLimitLine) {
                    highLimitLine.style.bottom = `${highPct}%`;
                    const highSpan = highLimitLine.querySelector('span');
                    if (highSpan) highSpan.textContent = `High Limit ${highLimit}`;
                }
                if (lowLimitLine) {
                    lowLimitLine.style.bottom = `${lowPct}%`;
                    const lowSpan = lowLimitLine.querySelector('span');
                    if (lowSpan) lowSpan.textContent = `Low Limit ${lowLimit}`;
                }
            } else {
                if (highLimitLine) {
                    highLimitLine.style.bottom = `${highLimit}%`;
                    const highSpan = highLimitLine.querySelector('span');
                    if (highSpan) highSpan.textContent = `High Limit ${formatTankLevel(highLimit, capacity, unit)}`;
                }
                if (lowLimitLine) {
                    lowLimitLine.style.bottom = `${lowLimit}%`;
                    const lowSpan = lowLimitLine.querySelector('span');
                    if (lowSpan) lowSpan.textContent = `Low Limit ${formatTankLevel(lowLimit, capacity, unit)}`;
                }
            }

            // Update scale ticks automatically calculated for RAW setpoints
            const scaleTicks = document.querySelectorAll('#modal-scale-ticks span');
            scaleTicks.forEach(span => {
                const valPct = parseFloat(span.getAttribute('data-val'));
                if (unit === 'RAW' && scannerRawSpan > scannerRawZero) {
                    const rawTickVal = scannerRawZero + (valPct / 100.0) * (scannerRawSpan - scannerRawZero);
                    span.textContent = `${Math.round(rawTickVal)} -`;
                } else {
                    span.textContent = `${formatTankLevel(valPct, capacity, unit)} -`;
                }
            });

            // Update indicator status dot
            const statusDot = document.getElementById('modal-tank-status-dot');
            if (statusDot) statusDot.className = `modal-status-indicator ${statusClass}`;

            // Update register address & scanner values
            let registerText = '';
            if (funcCode === '1') {
                registerText = `Coil ${regAddr}`;
            } else if (funcCode === '2') {
                registerText = `Discrete Input ${regAddr}`;
            } else if (funcCode === '4') {
                registerText = `Input Register ${regAddr}`;
            } else {
                registerText = `Holding Register ${regAddr}`;
            }
            const regEl = document.getElementById('modal-register-address');
            if (regEl) regEl.textContent = registerText;
            
            const slaveIdVal = document.getElementById('modal-slave-id');
            if (slaveIdVal) {
                slaveIdVal.textContent = `${slaveId} (Address ${slaveId.toString().padStart(2, '0')})`;
            }
            
            const baudrateEl = document.getElementById('modal-baudrate');
            if (baudrateEl) {
                baudrateEl.textContent = `${baudRate} bps / ${parity}`;
            }
            
            const capacityUnit = this.getAttribute('data-capacity-unit') || 'KL';

            // Set capacity label dynamically
            const capacityEl = document.getElementById('modal-capacity');
            if (capacityEl) {
                capacityEl.textContent = formatTankCapacity(capacity, unit, capacityUnit);
            }
            
            // Volume metrics calculation
            const curVolEl = document.getElementById('modal-current-volume');
            const emptyVolEl = document.getElementById('modal-empty-volume');
            if (curVolEl && emptyVolEl) {
                if (levelPercent !== null) {
                    const filledKL = (levelPercent / 100) * capacity;
                    const emptyKL = capacity - filledKL;
                    curVolEl.textContent = formatVolume(filledKL, unit, capacityUnit);
                    emptyVolEl.textContent = formatVolume(emptyKL, unit, capacityUnit);
                } else {
                    curVolEl.textContent = `--`;
                    emptyVolEl.textContent = `--`;
                }
            }

            // Update alarm limit readout
            const alarmConfigEl = document.getElementById('modal-alarm-config');
            if (alarmConfigEl) {
                if (unit === 'RAW' && highLimit > 100) {
                    alarmConfigEl.textContent = `${lowLimit} Low / ${highLimit} High`;
                } else {
                    alarmConfigEl.textContent = `${formatTankLevel(lowLimit, capacity, unit)} Low / ${formatTankLevel(highLimit, capacity, unit)} High`;
                }
            }

            // Open overlay using unified function
            openOverlay(overlay);

            // Create/update historical graph inside modal
            setTimeout(() => {
                renderModalChart(tankName, tankId);
            }, 300);
        });
    });


    const widgetFlowRateUnitInput = document.getElementById('widget-flow-rate-unit');
    if (widgetFlowRateUnitInput) {
        const handler = function() {
            updateDashboardModalLabels('flow_meter', widgetFlowRateUnitInput.value.trim());
        };
        widgetFlowRateUnitInput.addEventListener('input', handler);
        widgetFlowRateUnitInput.addEventListener('change', handler);
    }

    const editWidgetBtn = document.getElementById('modal-edit-widget-btn');
    if (editWidgetBtn) {
        editWidgetBtn.addEventListener('click', () => {
            const tankId = activeModalTankId;
            const card = document.querySelector(`[data-tank-id="${tankId}"]`);
            closeTankModal(overlay, modalInsideCard);
            if (!card) return;
            
            console.log('Populating edit modal for tank:', tankId, 'Card:', card);
            console.log('data-capacity:', card.getAttribute('data-capacity'));
            console.log('data-high-limit:', card.getAttribute('data-high-limit'));
            console.log('data-low-limit:', card.getAttribute('data-low-limit'));
            console.log('data-slave-id:', card.getAttribute('data-slave-id'));
            console.log('data-error-accuracy:', card.getAttribute('data-error-accuracy'));
            
            const deviceTypeSelect = document.getElementById('widget-device-type');
            if (deviceTypeSelect) {
                deviceTypeSelect.value = 'tank';
                deviceTypeSelect.disabled = true;
            }
            updateDashboardModalLabels('tank', card.getAttribute('data-unit'));
            const widgetIdInput = document.getElementById('widget-id-input');
            if (widgetIdInput) {
                widgetIdInput.value = tankId;
                widgetIdInput.readOnly = true;
            }
            const widgetNameInput = document.getElementById('widget-name-input');
            if (widgetNameInput) widgetNameInput.value = card.getAttribute('data-tank-name') || '';
            const widgetComPort = document.getElementById('widget-com-port');
            if (widgetComPort) widgetComPort.value = card.getAttribute('data-com-port') || 'SIMULATOR';
            const widgetAddressInput = document.getElementById('widget-address-input');
            if (widgetAddressInput) widgetAddressInput.value = card.getAttribute('data-register-address') || '';
            const widgetStyleInput = document.getElementById('widget-style-input');
            if (widgetStyleInput) widgetStyleInput.value = card.getAttribute('data-widget-type') || 'cylinder';
            
            const widgetCapacityInput = document.getElementById('widget-capacity-input');
            if (widgetCapacityInput) {
                widgetCapacityInput.value = card.getAttribute('data-capacity') || '5.0';
                console.log('widgetCapacityInput element:', widgetCapacityInput, 'value set to:', widgetCapacityInput.value);
            } else {
                console.log('widgetCapacityInput not found!');
            }

            const widgetHighInput = document.getElementById('widget-high-input');
            if (widgetHighInput) {
                widgetHighInput.value = card.getAttribute('data-high-limit') || '90';
                console.log('widgetHighInput element:', widgetHighInput, 'value set to:', widgetHighInput.value);
            } else {
                console.log('widgetHighInput not found!');
            }

            const widgetLowInput = document.getElementById('widget-low-input');
            if (widgetLowInput) {
                widgetLowInput.value = card.getAttribute('data-low-limit') || '10';
                console.log('widgetLowInput element:', widgetLowInput, 'value set to:', widgetLowInput.value);
            } else {
                console.log('widgetLowInput not found!');
            }

            const widgetSlaveIdInput = document.getElementById('widget-slave-id-input');
            if (widgetSlaveIdInput) {
                widgetSlaveIdInput.value = card.getAttribute('data-slave-id') || '1';
                console.log('widgetSlaveIdInput element:', widgetSlaveIdInput, 'value set to:', widgetSlaveIdInput.value);
            } else {
                console.log('widgetSlaveIdInput not found!');
            }

            const widgetErrorAccuracy = document.getElementById('widget-error-accuracy');
            if (widgetErrorAccuracy) {
                widgetErrorAccuracy.value = card.getAttribute('data-error-accuracy') || '0.0';
                console.log('widgetErrorAccuracy element:', widgetErrorAccuracy, 'value set to:', widgetErrorAccuracy.value);
            } else {
                console.log('widgetErrorAccuracy not found!');
            }

            const modalTitle = document.querySelector('#add-widget-modal-overlay h2');
            if (modalTitle) modalTitle.textContent = "EDIT TELEMETRY WIDGET";
            const submitBtn = document.getElementById('add-widget-submit-btn');
            if (submitBtn) submitBtn.textContent = "Save Changes";
            const addWidgetOverlay = document.getElementById('add-widget-modal-overlay');
            openOverlay(addWidgetOverlay);
            if (deviceTypeSelect) deviceTypeSelect.dispatchEvent(new Event('change'));
        });
    }

    // Close button handler (single handler)
    closeBtn.addEventListener('click', function() {
        closeTankModal(overlay, modalInsideCard);
    });
    
    // Overlay click to close
    overlay.addEventListener('click', function(e) {
        if (e.target === overlay) {
            closeTankModal(overlay, modalInsideCard);
        }
    });

    // Fullscreen behavior
    if (fullscreenBtn && modalInsideCard) {
        fullscreenBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            modalInsideCard.classList.toggle('fullscreen');
        });
    }
}

function closeTankModal(overlay, modalInsideCard) {
    closeOverlay(overlay || document.getElementById('tank-modal-overlay'));
    
    const card = modalInsideCard || document.getElementById('tank-modal-card');
    if (card) card.classList.remove('fullscreen');
    
    // Reset global active modal indicators
    activeModalTankId = null;
    activeModalCapacity = 5.0;

    if (modalChart) {
        modalChart.destroy();
        modalChart = null;
    }
}

function renderModalChart(tankName, tankId) {
    const canvas = document.getElementById('modal-tank-chart');
    if (!canvas) return;

    if (modalChart) {
        modalChart.destroy();
    }

    const ctx = canvas.getContext('2d');

    fetch(`/api/historical-data/?tank_id=${encodeURIComponent(tankId)}`)
    .then(res => res.json())
    .then(payload => {
        const themeColors = getThemeColors();
        const labels = payload.timestamps.map(ts => {
            const d = new Date(ts);
            return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
        });
        const data = payload.datasets[tankId] || [];

        modalChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: `${tankName} Level History`,
                    data: data,
                    borderColor: '#76FF03',
                    backgroundColor: 'rgba(118, 255, 3, 0.05)',
                    borderWidth: 2,
                    pointRadius: 2,
                    pointBackgroundColor: '#76FF03',
                    tension: 0.3,
                    fill: true,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(10, 14, 26, 0.95)',
                        titleColor: '#ffffff',
                        bodyColor: '#a0aec0',
                        borderColor: 'rgba(118, 255, 3, 0.3)',
                        borderWidth: 1,
                    }
                },
                scales: {
                    x: {
                        grid: { color: themeColors.gridColor, drawBorder: false },
                        ticks: { color: themeColors.textColor, font: { size: 9 }, maxTicksLimit: 6 }
                    },
                    y: {
                        min: 0,
                        max: 100,
                        grid: { color: themeColors.gridColor, drawBorder: false },
                        ticks: { color: themeColors.textColor, font: { size: 9 }, stepSize: 20 }
                    }
                }
            }
        });
    })
    .catch(err => console.error('Error fetching modal chart historical data:', err));
}

// =========================================
// Flow Meter Modal
// =========================================

function initFlowModal(overlay) {
    if (!overlay) return;
    
    // Remove the inline display:none so that CSS class controls visibility
    overlay.style.display = '';

    const closeBtn = document.getElementById('modal-flow-close-btn');
    
    if (closeBtn) {
        closeBtn.addEventListener('click', function() {
            closeFlowModal(overlay);
        });
    }
    
    overlay.addEventListener('click', function(e) {
        if (e.target === overlay) {
            closeFlowModal(overlay);
        }
    });

    const editFlowBtn = document.getElementById('modal-flow-edit-widget-btn');
    if (editFlowBtn) {
        editFlowBtn.addEventListener('click', (e) => {
            if (e) {
                e.preventDefault();
                e.stopPropagation();
            }
            const flowId = currentOpenFlowId || overlay.getAttribute('data-flow-id');
            console.log('editFlowBtn clicked. Flow ID:', flowId);

            const card = document.getElementById(`flow-card-${flowId}`) || document.querySelector(`[data-flow-id="${flowId}"]`);
            console.log('Found flow card:', card);

            closeFlowModal(overlay);

            const deviceTypeSelect = document.getElementById('widget-device-type');
            if (deviceTypeSelect) {
                deviceTypeSelect.value = 'flow_meter';
                deviceTypeSelect.disabled = true;
            }

            const flowUnit = card ? (card.getAttribute('data-flow-unit') || card.getAttribute('data-unit') || 'L/min') : (overlay.getAttribute('data-unit') || 'L/min');
            const totalUnit = card ? (card.getAttribute('data-total-unit') || 'Liters') : (overlay.getAttribute('data-total-unit') || 'Liters');
            updateDashboardModalLabels('flow_meter', flowUnit);

            const widgetIdInput = document.getElementById('widget-id-input');
            if (widgetIdInput) {
                widgetIdInput.value = flowId || '';
                widgetIdInput.readOnly = true;
            }

            const widgetNameInput = document.getElementById('widget-name-input');
            if (widgetNameInput) {
                widgetNameInput.value = card ? (card.getAttribute('data-flow-name') || card.getAttribute('data-name') || flowId) : (overlay.getAttribute('data-flow-name') || flowId || '');
            }

            const widgetComPort = document.getElementById('widget-com-port');
            if (widgetComPort) {
                widgetComPort.value = card ? (card.getAttribute('data-com-port') || 'SIMULATOR') : (overlay.getAttribute('data-com-port') || 'SIMULATOR');
            }

            const widgetFlowRateReg = document.getElementById('widget-flow-rate-reg');
            if (widgetFlowRateReg) {
                widgetFlowRateReg.value = card ? (card.getAttribute('data-flow-rate-register') || '40001') : '40001';
            }

            const widgetFlowTotalReg = document.getElementById('widget-flow-total-reg');
            if (widgetFlowTotalReg) {
                widgetFlowTotalReg.value = card ? (card.getAttribute('data-total-volume-register') || '40003') : '40003';
            }

            const widgetFlowRateUnit = document.getElementById('widget-flow-rate-unit');
            if (widgetFlowRateUnit) widgetFlowRateUnit.value = flowUnit;

            const widgetFlowTotalUnit = document.getElementById('widget-flow-total-unit');
            if (widgetFlowTotalUnit) widgetFlowTotalUnit.value = totalUnit;

            const widgetFlowSlaveId = document.getElementById('widget-flow-slave-id');
            if (widgetFlowSlaveId) {
                widgetFlowSlaveId.value = card ? (card.getAttribute('data-slave-id') || '1') : (overlay.getAttribute('data-slave-id') || '1');
            }

            const widgetFlowHighLimit = document.getElementById('widget-flow-high-limit');
            if (widgetFlowHighLimit) {
                widgetFlowHighLimit.value = card ? (card.getAttribute('data-high-limit') || '90') : (overlay.getAttribute('data-high-limit') || '90');
            }

            const widgetFlowLowLimit = document.getElementById('widget-flow-low-limit');
            if (widgetFlowLowLimit) {
                widgetFlowLowLimit.value = card ? (card.getAttribute('data-low-limit') || '10') : (overlay.getAttribute('data-low-limit') || '10');
            }

            const widgetFlowErrorAccuracy = document.getElementById('widget-flow-error-accuracy');
            if (widgetFlowErrorAccuracy) {
                widgetFlowErrorAccuracy.value = card ? (card.getAttribute('data-error-accuracy') || '0.0') : '0.0';
            }

            const modalTitle = document.querySelector('#add-widget-modal-overlay h2');
            if (modalTitle) modalTitle.textContent = "EDIT TELEMETRY WIDGET";

            const submitBtn = document.getElementById('add-widget-submit-btn');
            if (submitBtn) submitBtn.textContent = "Save Changes";

            const tankFieldsGroup = document.getElementById('tank-fields-group');
            const flowFieldsGroup = document.getElementById('flow-fields-group');
            if (tankFieldsGroup) tankFieldsGroup.style.display = 'none';
            if (flowFieldsGroup) flowFieldsGroup.style.display = 'block';

            const widgetAddressInput = document.getElementById('widget-address-input');
            if (widgetAddressInput) widgetAddressInput.required = false;
            if (widgetFlowRateReg) widgetFlowRateReg.required = true;
            if (widgetFlowTotalReg) widgetFlowTotalReg.required = true;

            const addWidgetOverlay = document.getElementById('add-widget-modal-overlay');
            openOverlay(addWidgetOverlay);

            if (deviceTypeSelect) deviceTypeSelect.dispatchEvent(new Event('change'));
        });
    }
}

function openFlowModal(id, name, status, rate, total, rateUnit, totalUnit, highLimit, lowLimit, statusClass) {
    currentOpenFlowId = id;
    const overlay = document.getElementById('flow-modal-overlay');
    
    const titleEl = document.getElementById('modal-flow-title');
    if (titleEl) titleEl.textContent = `${name} (${id})`;
    
    // Save attributes on overlay for sync
    overlay.setAttribute('data-flow-id', id || '');
    overlay.setAttribute('data-flow-name', name || '');
    overlay.setAttribute('data-high-limit', highLimit || '90.0');
    overlay.setAttribute('data-low-limit', lowLimit || '10.0');
    overlay.setAttribute('data-unit', rateUnit || 'L/min');
    overlay.setAttribute('data-total-unit', totalUnit || 'Liters');

    const dot = document.getElementById('modal-flow-status-dot');
    const statusText = document.getElementById('modal-flow-status');
    if (dot && statusText) {
        statusText.textContent = status;
        dot.style.background = '';
        if (statusClass === 'alarm-high') {
            dot.className = 'modal-status-indicator alarm-high';
            statusText.className = 'diag-val error';
        } else if (statusClass === 'alarm-low') {
            dot.className = 'modal-status-indicator alarm-low';
            statusText.className = 'diag-val warning';
        } else if (status === 'Online' || statusClass === 'normal') {
            dot.className = 'modal-status-indicator normal';
            statusText.className = 'diag-val success';
        } else {
            dot.className = 'modal-status-indicator no-data';
            statusText.className = 'diag-val error';
        }
    }
    
    const rateEl = document.getElementById('modal-flow-rate');
    const totalEl = document.getElementById('modal-flow-total');
    const unitEl = document.getElementById('modal-flow-unit');
    const totalUnitEl = document.getElementById('modal-total-unit');
    
    if (rateEl) rateEl.textContent = rate;
    if (totalEl) totalEl.textContent = total;
    if (rateUnit && unitEl) unitEl.textContent = rateUnit;
    if (totalUnit && totalUnitEl) totalUnitEl.textContent = totalUnit;
    
    // Update alarm configuration text
    const alarmConfigEl = document.getElementById('modal-flow-alarm-config');
    if (alarmConfigEl) {
        alarmConfigEl.textContent = `${parseFloat(lowLimit || 10).toFixed(1)} ${rateUnit} Low / ${parseFloat(highLimit || 90).toFixed(1)} ${rateUnit} High`;
    }

    // Update cylinder / SVG radial visual
    const fillEl = document.getElementById('modal-flow-cylinder-fill');
    const textEl = document.getElementById('modal-flow-percentage-text');
    const rateUnitLabel = document.getElementById('modal-flow-rate-unit-label');
    let numericRate = parseFloat(rate);
    if (isNaN(numericRate)) numericRate = 0;
    
    if (textEl) {
        const txt = numericRate.toFixed(1);
        textEl.textContent = txt;
        adjustLcdFontSize(textEl, txt);
    }
    if (fillEl) {
        let visualPercent = Math.max(0, Math.min(100, numericRate));
        fillEl.style.height = visualPercent + '%';
    }
    if (rateUnitLabel && rateUnit) {
        rateUnitLabel.textContent = rateUnit;
    }

    // Update Pipe Flow Waves, arrows & bubble speed dynamically
    const wavesEl = document.getElementById('modal-flow-waves');
    if (wavesEl) {
        if (numericRate <= 0 || status === 'Offline') {
            wavesEl.style.display = 'none';
        } else {
            wavesEl.style.display = 'block';
            let speed = Math.max(0.4, Math.min(4.0, 60 / numericRate));
            const animElements = wavesEl.querySelectorAll('.wave-bubble, .flow-arrow');
            animElements.forEach((el, idx) => {
                el.style.animationDuration = `${speed}s`;
                if (el.classList.contains('wave-bubble')) {
                    el.style.animationDelay = `${(speed / 8) * (idx % 8)}s`;
                }
            });
        }
    }
    
    openOverlay(overlay);
}

function closeFlowModal(overlay) {
    closeOverlay(overlay || document.getElementById('flow-modal-overlay'));
    currentOpenFlowId = null;
}

function updateFlowModalIfOpen(id, status, rate, total, statusClass) {
    const overlay = document.getElementById('flow-modal-overlay');
    if (currentOpenFlowId === id && overlay && overlay.classList.contains('show')) {
        const cardEl = document.getElementById(`flow-card-${id}`);
        if (cardEl) {
            overlay.setAttribute('data-high-limit', cardEl.getAttribute('data-high-limit') || '90.0');
            overlay.setAttribute('data-low-limit', cardEl.getAttribute('data-low-limit') || '10.0');
            overlay.setAttribute('data-unit', cardEl.getAttribute('data-flow-unit') || 'L/min');
        }
        const dot = document.getElementById('modal-flow-status-dot');
        const statusText = document.getElementById('modal-flow-status');
        if (dot && statusText) {
            statusText.textContent = status;
            dot.style.background = '';
            if (statusClass === 'alarm-high') {
                dot.className = 'modal-status-indicator alarm-high';
                statusText.className = 'diag-val error';
            } else if (statusClass === 'alarm-low') {
                dot.className = 'modal-status-indicator alarm-low';
                statusText.className = 'diag-val warning';
            } else if (status === 'Online' || statusClass === 'normal') {
                dot.className = 'modal-status-indicator normal';
                statusText.className = 'diag-val success';
            } else {
                dot.className = 'modal-status-indicator no-data';
                statusText.className = 'diag-val error';
            }
        }

        // Update alarm configuration dynamically in real time
        const alarmConfigEl = document.getElementById('modal-flow-alarm-config');
        if (alarmConfigEl) {
            const highLimit = overlay.getAttribute('data-high-limit') || '90.0';
            const lowLimit = overlay.getAttribute('data-low-limit') || '10.0';
            const rateUnit = overlay.getAttribute('data-unit') || 'L/min';
            alarmConfigEl.textContent = `${parseFloat(lowLimit).toFixed(1)} ${rateUnit} Low / ${parseFloat(highLimit).toFixed(1)} ${rateUnit} High`;
        }
        
        const rateEl = document.getElementById('modal-flow-rate');
        const totalEl = document.getElementById('modal-flow-total');
        if (rateEl) rateEl.textContent = rate;
        if (totalEl) totalEl.textContent = total;
        
        // Update cylinder / SVG radial visual
        const fillEl = document.getElementById('modal-flow-cylinder-fill');
        const textEl = document.getElementById('modal-flow-percentage-text');
        let numericRate = parseFloat(rate);
        if (isNaN(numericRate)) numericRate = 0;

        if (textEl) {
            const txt = numericRate.toFixed(1);
            textEl.textContent = txt;
            adjustLcdFontSize(textEl, txt);
        }
        if (fillEl) {
            let visualPercent = Math.max(0, Math.min(100, numericRate));
            fillEl.style.height = visualPercent + '%';
        }

        // Update Pipe Flow Waves, arrows & bubble speed dynamically
        const wavesEl = document.getElementById('modal-flow-waves');
        if (wavesEl) {
            if (numericRate <= 0 || status === 'Offline') {
                wavesEl.style.display = 'none';
            } else {
                wavesEl.style.display = 'block';
                let speed = Math.max(0.4, Math.min(4.0, 60 / numericRate));
                const animElements = wavesEl.querySelectorAll('.wave-bubble, .flow-arrow');
                animElements.forEach((el, idx) => {
                    el.style.animationDuration = `${speed}s`;
                    if (el.classList.contains('wave-bubble')) {
                        el.style.animationDelay = `${(speed / 8) * (idx % 8)}s`;
                    }
                });
            }
        }
    }
}

// =========================================
// Real-Time Updates
// =========================================

function initRealTimeUpdates() {
    // Poll tank data every 1 second for fast real-time updates
    setInterval(fetchRealTimeTankData, 1000);
    // Poll flow meter data every 1 second
    setInterval(fetchRealTimeFlowData, 1000);
    
    // Live update trend chart from local cache every 5 seconds (matching Modbus daemon scan cycle)
    setInterval(updateTrendChartLive, 5000);

    // Immediately fire once
    fetchRealTimeTankData();
    fetchRealTimeFlowData();
}

function updateTrendChartLive() {
    if (!trendChart || !document.getElementById('trend-chart')) return;
    
    // Push data regardless of connection status as long as there is data in cache
    if (Object.keys(latestTelemetryCache).length === 0) return;

    const nowStr = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
    
    trendChart.data.labels.push(nowStr);
    while (trendChart.data.labels.length > 300) {
        trendChart.data.labels.shift();
    }
    
    trendChart.data.datasets.forEach(dataset => {
        const val = latestTelemetryCache[dataset.label];
        dataset.data.push(val !== undefined && val !== null ? val : null);
        while (dataset.data.length > trendChart.data.labels.length) {
            dataset.data.shift();
        }
    });
    
    trendChart.update();
}

function fetchRealTimeTankData() {
    fetch('/api/tanks/')
    .then(res => res.json())
    .then(data => {
        // Update header connection status indicator in real-time
        const statusDot = document.querySelector('.system-status .status-dot');
        const statusText = document.querySelector('.system-status .status-text');
        if (statusDot && statusText) {
            if (data.is_connected) {
                statusDot.className = 'status-dot online';
                statusText.textContent = 'ONLINE';
                statusText.style.color = '#4CAF50';
            } else {
                statusDot.className = 'status-dot offline';
                statusText.textContent = 'OFFLINE';
                statusText.style.color = '#f44336';
            }
        }

        if (data.tanks) {
            data.tanks.forEach(tank => {
                const cards = document.querySelectorAll('.tank-card:not(.add-widget-card)');
                cards.forEach(card => {
                    const cardId = card.getAttribute('data-tank-id');
                    if (cardId === tank.id) {
                        const unit = tank.unit || card.getAttribute('data-unit') || '%';
                        const capacity = tank.capacity !== undefined ? tank.capacity : parseFloat(card.getAttribute('data-capacity') || '5.0');
                        const levelStr = tank.level !== null ? (tank.formatted_level || formatTankLevel(tank.level, capacity, unit)) : '--';
                        
                        // Update level text
                        const levelEl = card.querySelector('.tank-card-level');
                        if (levelEl) {
                            levelEl.textContent = levelStr;
                        }
                        
                        // Update cylinder fill visual
                        const fillEl = card.querySelector('.tank-fill');
                        if (fillEl) {
                            const clampedFill = tank.level !== null ? Math.max(0, Math.min(100, tank.level)) : 0;
                            fillEl.style.height = clampedFill + '%';
                            fillEl.setAttribute('data-level', tank.level !== null ? tank.level : '');
                        }

                        // Update gauge fill visual
                        const gaugeFillEl = card.querySelector('.gauge-fill');
                        if (gaugeFillEl) {
                            const dashVal = tank.level !== null ? (tank.level * 0.75).toFixed(1) : 0;
                            gaugeFillEl.setAttribute('stroke-dasharray', `${dashVal}, 100`);
                        }

                        // Update cache for trend chart & store raw_value attribute
                        latestTelemetryCache[tank.id] = tank.level;
                        if (tank.raw_value !== undefined && tank.raw_value !== null) {
                            card.setAttribute('data-raw-value', tank.raw_value);
                        }

                        // Update numeric widget text
                        const numericValEl = card.querySelector('.numeric-val');
                        if (numericValEl) {
                            numericValEl.textContent = levelStr;
                        }

                        // Update status light glow color
                        const statusGlowEl = card.querySelector('.status-light-glow');
                        if (statusGlowEl) {
                            statusGlowEl.className = `status-light-glow ${tank.status_class}`;
                        }
                        
                        // Update status status text
                        const statusEl = card.querySelector('.tank-card-status');
                        if (statusEl) {
                            statusEl.textContent = tank.status;
                            statusEl.className = `tank-card-status ${tank.status_class}`;
                        }
                        
                        // Update card classes
                        card.className = `tank-card ${tank.status_class}`;
                        
                        // Sync visual fills classes
                        const innerFills = card.querySelectorAll('.tank-fill, .gauge-fill, .widget-numeric-box, .widget-status-indicator');
                        innerFills.forEach(el => {
                            // Retain specific widget class but replace status class
                            const isGaugeFill = el.classList.contains('gauge-fill');
                            const isNumBox = el.classList.contains('widget-numeric-box');
                            const isStatusInd = el.classList.contains('widget-status-indicator');
                            const isTankFill = el.classList.contains('tank-fill');
                            
                            el.className = '';
                            if (isGaugeFill) el.classList.add('gauge-fill');
                            if (isNumBox) el.classList.add('widget-numeric-box');
                            if (isStatusInd) el.classList.add('widget-status-indicator');
                            if (isTankFill) el.classList.add('tank-fill');
                            el.classList.add(tank.status_class);
                        });
                    }
                });

                // Sync the detail diagnostic modal in real time if it's currently open for this tank
                if (activeModalTankId === tank.id) {
                    const level = tank.level;
                    const statusClass = tank.status_class;
                    const activeCard = document.querySelector(`.tank-card[data-tank-id="${tank.id}"]`);
                    const unit = tank.unit || (activeCard ? (activeCard.getAttribute('data-unit') || '%') : '%');
                    const capacity = tank.capacity !== undefined ? tank.capacity : (activeCard ? parseFloat(activeCard.getAttribute('data-capacity') || '5.0') : activeModalCapacity);
                    const rawVal = tank.raw_value !== undefined ? tank.raw_value : (activeCard ? activeCard.getAttribute('data-raw-value') : null);
                    
                    const modalPercentEl = document.getElementById('modal-percentage-text');
                    if (modalPercentEl) {
                        modalPercentEl.textContent = level !== null ? (tank.formatted_level || formatTankLevel(level, capacity, unit, rawVal)) : '--';
                    }
                    
                    const modalCylinderFill = document.getElementById('modal-cylinder-fill');
                    if (modalCylinderFill) {
                        modalCylinderFill.className = `cylinder-fill ${statusClass}`;
                        const clampedFill = level !== null ? Math.max(0, Math.min(100, level)) : 0;
                        modalCylinderFill.style.height = clampedFill + '%';
                    }
                    
                    const modalStatusDot = document.getElementById('modal-tank-status-dot');
                    if (modalStatusDot) {
                        modalStatusDot.className = `modal-status-indicator ${statusClass}`;
                    }
                    
                    const modalCurrentVol = document.getElementById('modal-current-volume');
                    const modalEmptyVol = document.getElementById('modal-empty-volume');
                    if (modalCurrentVol && modalEmptyVol) {
                        if (level !== null) {
                            const filledKL = (level / 100) * activeModalCapacity;
                            const emptyKL = activeModalCapacity - filledKL;
                            modalCurrentVol.textContent = formatVolume(filledKL, unit);
                            modalEmptyVol.textContent = formatVolume(emptyKL, unit);
                        } else {
                            modalCurrentVol.textContent = `--`;
                            modalEmptyVol.textContent = `--`;
                        }
                    }
                }
            });
        }
        
        // Refresh summary card counters in real-time
        updateSummaryCardCounters();
        
        // Refresh the device summary modal in real-time if open
        const devOverlay = document.getElementById('device-summary-modal-overlay');
        if (devOverlay && devOverlay.classList.contains('show')) {
            populateDeviceSummaryModal();
        }
    })
    .catch(err => console.error('Error fetching real-time tank levels:', err));
}

function updateSummaryCardCounters() {
    let tankHigh = 0, tankLow = 0;
    document.querySelectorAll('.tank-card:not(.add-widget-card)').forEach(card => {
        if (card.classList.contains('alarm-high')) tankHigh++;
        else if (card.classList.contains('alarm-low')) tankLow++;
    });

    let fmHigh = 0, fmLow = 0;
    document.querySelectorAll('.flow-meter-card').forEach(card => {
        if (card.classList.contains('alarm-high')) fmHigh++;
        else if (card.classList.contains('alarm-low')) fmLow++;
    });

    const highCountEl = document.getElementById('high-alarms-count');
    const highSubEl = document.getElementById('high-alarms-sub');
    if (highCountEl) highCountEl.textContent = tankHigh + fmHigh;
    if (highSubEl) highSubEl.textContent = `(${tankHigh} Tanks, ${fmHigh} Flow Meters)`;

    const lowCountEl = document.getElementById('low-alarms-count');
    const lowSubEl = document.getElementById('low-alarms-sub');
    if (lowCountEl) lowCountEl.textContent = tankLow + fmLow;
    if (lowSubEl) lowSubEl.textContent = `(${tankLow} Tanks, ${fmLow} Flow Meters)`;
}

function fetchRealTimeFlowData() {
    fetch('/api/flow-meters/')
    .then(res => res.json())
    .then(data => {
        const container = document.getElementById('flow-meter-live-section');
        if (!container) return;

        if (!data.flow_meters || data.flow_meters.length === 0) {
            container.style.display = 'none';
            return;
        }

        container.style.display = 'block';

        data.flow_meters.forEach(fm => {
            let card = document.getElementById(`flow-card-${fm.id}`);
            if (!card) {
                // Create card dynamically if not yet in DOM
                card = document.createElement('div');
                card.id = `flow-card-${fm.id}`;
                card.className = `flow-meter-card ${fm.status_class || ''}`;
                card.setAttribute('data-flow-id', fm.id);
                card.setAttribute('data-flow-name', fm.name);
                card.setAttribute('data-high-limit', fm.high_limit);
                card.setAttribute('data-low-limit', fm.low_limit);
                card.setAttribute('data-unit', fm.flow_unit);
                card.setAttribute('data-flow-rate-register', fm.flow_rate_register);
                card.setAttribute('data-total-volume-register', fm.total_volume_register);
                card.setAttribute('data-slave-id', fm.slave_id);
                card.setAttribute('data-flow-unit', fm.flow_unit);
                card.setAttribute('data-error-accuracy', fm.error_accuracy);
                card.setAttribute('data-total-unit', fm.total_unit);
                card.setAttribute('data-com-port', fm.com_port);
                card.setAttribute('data-widget-type', 'flow_meter');
                card.style.cursor = 'pointer';
                card.style.display = 'flex';
                card.style.flexDirection = 'column';
                card.style.justifyContent = 'space-between';
                card.style.minHeight = '310px';
                card.innerHTML = `
                    <div class="tank-card-header" style="margin-bottom: 5px;">
                        <span class="tank-card-name">${fm.name} (${fm.id})</span>
                        <span class="tank-card-status ${fm.status_class || ''}" id="flow-status-${fm.id}">${fm.status}</span>
                    </div>
                    
                    <!-- Center Visual: Industrial Flow Meter (Scaled down via transform) -->
                    <div class="card-flow-visual-wrapper" style="height: 155px; display: flex; align-items: center; justify-content: center; position: relative; overflow: visible; margin: 10px 0;">
                        <div class="industrial-flow-meter" style="transform: scale(0.65); transform-origin: center center; position: absolute;">
                            <!-- 1. The Digital LCD Display Box -->
                            <div class="meter-display-casing">
                                <div class="lcd-inner-bezel">
                                    <div class="meter-lcd-screen">
                                        <div class="lcd-main-readout">
                                            <span id="flow-lcd-val-${fm.id}">0.0</span>
                                        </div>
                                        <div class="lcd-unit-label">
                                            <span>${fm.flow_unit}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- 2. The Mounting Neck -->
                            <div class="meter-mounting-neck">
                                <div class="neck-nut-top"></div>
                                <div class="neck-shaft"></div>
                                <div class="neck-nut-bottom"></div>
                            </div>
                            
                            <!-- 3. The Pipe and Flanges -->
                            <div class="meter-pipe-assembly">
                                <div class="metal-pipe left-pipe"></div>
                                
                                <!-- Left Flange -->
                                <div class="pipe-flange">
                                    <div class="flange-rim"></div>
                                    <div class="flange-bolts">
                                        <div class="bolt bolt-1"></div>
                                        <div class="bolt bolt-2"></div>
                                        <div class="bolt bolt-3"></div>
                                        <div class="bolt bolt-4"></div>
                                    </div>
                                </div>
                                
                                <!-- Clear Glass Flow Chamber with Golden Fluid -->
                                <div class="glass-flow-chamber">
                                    <div class="chamber-fluid-bg"></div>
                                    <div class="chamber-glass-shine"></div>
                                    
                                    <!-- Active Flow Arrows & Bubbles -->
                                    <div class="flow-interactive-wrapper" id="flow-waves-${fm.id}">
                                        <div class="chamber-flow-arrows">
                                            <div class="flow-arrow arrow-1"></div>
                                            <div class="flow-arrow arrow-2"></div>
                                        </div>
                                        <div class="chamber-bubbles">
                                            <div class="bubble wave-bubble b1"></div>
                                            <div class="bubble wave-bubble b2"></div>
                                            <div class="bubble wave-bubble b3"></div>
                                            <div class="bubble wave-bubble b4"></div>
                                            <div class="bubble wave-bubble b5"></div>
                                            <div class="bubble wave-bubble b6"></div>
                                            <div class="bubble wave-bubble b7"></div>
                                            <div class="bubble wave-bubble b8"></div>
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- Right Flange -->
                                <div class="pipe-flange">
                                    <div class="flange-rim"></div>
                                    <div class="flange-bolts">
                                        <div class="bolt bolt-1"></div>
                                        <div class="bolt bolt-2"></div>
                                        <div class="bolt bolt-3"></div>
                                        <div class="bolt bolt-4"></div>
                                    </div>
                                </div>
                                
                                <div class="metal-pipe right-pipe"></div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Bottom Side: Metrics Row -->
                    <div class="flow-metrics-row-layout" style="display: flex; justify-content: center; border-top: 1px solid var(--bg-card-border); padding-top: 10px; margin-top: 5px;">
                        <div class="flow-metric-row" style="display: flex; flex-direction: column; align-items: center;">
                            <span class="flow-metric-label" style="font-size: 0.65rem; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px;">Flow Rate</span>
                            <div class="flow-metric-val-wrap" style="display: flex; align-items: baseline; gap: 4px;">
                                <span class="flow-metric-value text-green" id="flow-rate-${fm.id}" style="font-size: 1.25rem;">--</span>
                                <span class="flow-metric-unit" style="font-size: 0.75rem; color: var(--text-muted); font-weight: 500;">${fm.flow_unit}</span>
                            </div>
                        </div>
                    </div>
                `;
                
                // Add click event listener to open Flow Modal (like Tank modal)
                card.addEventListener('click', () => {
                    const rEl = document.getElementById(`flow-rate-${fm.id}`);
                    const tEl = document.getElementById(`flow-total-${fm.id}`);
                    const currentName = card.getAttribute('data-flow-name') || fm.name;
                    const currentHigh = card.getAttribute('data-high-limit') || fm.high_limit;
                    const currentLow = card.getAttribute('data-low-limit') || fm.low_limit;
                    const currentUnit = card.getAttribute('data-flow-unit') || fm.flow_unit;
                    const currentTotalUnit = card.getAttribute('data-total-unit') || fm.total_unit;
                    openFlowModal(fm.id, currentName, fm.status, rEl ? rEl.textContent : fm.flow_rate, tEl ? tEl.textContent : fm.total_volume, currentUnit, currentTotalUnit, currentHigh, currentLow, fm.status_class);
                });
                
                const cardsContainer = document.getElementById('flow-meter-cards');
                if (cardsContainer) cardsContainer.appendChild(card);
            }

            // Update latest metadata attributes on the card dynamically so click handlers/modals always read fresh configuration values
            card.setAttribute('data-flow-name', fm.name);
            card.setAttribute('data-high-limit', fm.high_limit);
            card.setAttribute('data-low-limit', fm.low_limit);
            card.setAttribute('data-flow-unit', fm.flow_unit);
            card.setAttribute('data-total-unit', fm.total_unit);
            card.setAttribute('data-error-accuracy', fm.error_accuracy);
            card.setAttribute('data-slave-id', fm.slave_id);
            card.setAttribute('data-com-port', fm.com_port);

            // Update units and titles dynamically on existing cards
            const lcdUnitEl = card.querySelector('.lcd-unit-label span');
            if (lcdUnitEl && fm.flow_unit) lcdUnitEl.textContent = fm.flow_unit;
            const metricUnitEl = card.querySelector('.flow-metric-unit');
            if (metricUnitEl && fm.flow_unit) metricUnitEl.textContent = fm.flow_unit;

            // Update values
            const rateEl = document.getElementById(`flow-rate-${fm.id}`);
            const totalEl = document.getElementById(`flow-total-${fm.id}`);
            const statusEl = document.getElementById(`flow-status-${fm.id}`);
            const cardLcdEl = document.getElementById(`flow-lcd-val-${fm.id}`);
            const cardWavesEl = document.getElementById(`flow-waves-${fm.id}`);

            let flowRateVal = fm.flow_rate !== null ? fm.flow_rate : 0.0;
            if (flowRateVal < 0 || flowRateVal > 30000) flowRateVal = 0.0;

            if (rateEl) rateEl.textContent = (fm.flow_rate !== null && fm.flow_rate >= 0 && fm.flow_rate <= 30000) ? fm.flow_rate.toFixed(2) : '0.00';
            if (totalEl) totalEl.textContent = (fm.total_volume !== null && fm.total_volume >= 0) ? fm.total_volume.toFixed(2) : '0.00';
            if (statusEl) {
                statusEl.textContent = fm.status;
                statusEl.className = `tank-card-status ${fm.status_class || ''}`;
            }

            if (cardLcdEl) {
                const txt = (fm.flow_rate !== null && fm.flow_rate >= 0 && fm.flow_rate <= 30000) ? fm.flow_rate.toFixed(1) : '0.0';
                cardLcdEl.textContent = txt;
                adjustLcdFontSize(cardLcdEl, txt);
            }

            if (cardWavesEl) {
                if (flowRateVal <= 0 || fm.status === 'Offline') {
                    cardWavesEl.style.display = 'none';
                } else {
                    cardWavesEl.style.display = 'block';
                    let speed = Math.max(0.4, Math.min(4.0, 60 / flowRateVal));
                    const animElements = cardWavesEl.querySelectorAll('.wave-bubble, .flow-arrow');
                    animElements.forEach((el, idx) => {
                        el.style.animationDuration = `${speed}s`;
                        if (el.classList.contains('wave-bubble')) {
                            el.style.animationDelay = `${(speed / 8) * (idx % 8)}s`;
                        }
                    });
                }
            }

            // Update dataset attributes in case they were edited
            card.setAttribute('data-flow-name', fm.name);
            card.setAttribute('data-high-limit', fm.high_limit);
            card.setAttribute('data-low-limit', fm.low_limit);
            card.setAttribute('data-unit', fm.flow_unit);
            card.setAttribute('data-flow-rate-register', fm.flow_rate_register);
            card.setAttribute('data-total-volume-register', fm.total_volume_register);
            card.setAttribute('data-slave-id', fm.slave_id);
            card.setAttribute('data-error-accuracy', fm.error_accuracy);
            card.setAttribute('data-flow-unit', fm.flow_unit);
            card.setAttribute('data-total-unit', fm.total_unit);
            card.setAttribute('data-com-port', fm.com_port);

            // Update card class
            card.className = `flow-meter-card ${fm.status_class || ''}`;
            
            // Save to dynamic cache
            latestTelemetryCache[fm.id] = fm.flow_rate;
            
            // If modal is open for this specific flow meter, update modal in real-time
            updateFlowModalIfOpen(fm.id, fm.status, fm.flow_rate !== null ? fm.flow_rate.toFixed(2) : '--', fm.total_volume !== null ? fm.total_volume.toFixed(2) : '--', fm.status_class);
        });
        
        // Refresh summary card counters in real-time
        updateSummaryCardCounters();

        // Refresh the device summary modal in real-time if open
        const devOverlay = document.getElementById('device-summary-modal-overlay');
        if (devOverlay && devOverlay.classList.contains('show')) {
            populateDeviceSummaryModal();
        }
    })
    .catch(err => console.error('Error fetching real-time flow meter data:', err));
}

// =========================================
// Add Widget Modal Logic
// =========================================

function initAddWidgetModal(overlay) {
    const addCard = document.getElementById('add-widget-card');
    const closeBtn = document.getElementById('add-widget-close-btn');
    const cancelBtn = document.getElementById('add-widget-cancel-btn');
    const form = document.getElementById('add-widget-form');

    if (!addCard || !overlay) return;

    // Clear inline display style to let CSS control
    overlay.style.display = '';

    const showModal = () => {
        if (deviceTypeSelect) {
            deviceTypeSelect.disabled = false;
        }
        if (widgetIdInput) {
            widgetIdInput.readOnly = false;
            widgetIdInput.value = '';
        }
        if (widgetNameInput) widgetNameInput.value = '';
        const modalTitle = document.querySelector('#add-widget-modal-overlay h2');
        if (modalTitle) modalTitle.textContent = "CREATE TELEMETRY WIDGET";
        const submitBtn = document.getElementById('add-widget-submit-btn');
        if (submitBtn) submitBtn.textContent = "Create Widget";

        openOverlay(overlay);
        toggleFieldsForDeviceType();
    };

    const hideModal = () => {
        closeOverlay(overlay);
        if (form) form.reset();
        const widgetErrorAccuracy = document.getElementById('widget-error-accuracy');
        if (widgetErrorAccuracy) widgetErrorAccuracy.value = "0.0";
        const widgetFlowErrorAccuracy = document.getElementById('widget-flow-error-accuracy');
        if (widgetFlowErrorAccuracy) widgetFlowErrorAccuracy.value = "0.0";
        toggleFieldsForDeviceType();
    };

    addCard.addEventListener('click', showModal);
    if (closeBtn) closeBtn.addEventListener('click', hideModal);
    if (cancelBtn) cancelBtn.addEventListener('click', hideModal);
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) hideModal();
    });

    // Dynamic field toggling based on Device Type dropdown
    const deviceTypeSelect = document.getElementById('widget-device-type');
    const tankFieldsGroup = document.getElementById('tank-fields-group');
    const flowFieldsGroup = document.getElementById('flow-fields-group');
    const widgetIdLabel = document.getElementById('widget-id-label');
    const widgetNameLabel = document.getElementById('widget-name-label');
    const widgetIdInput = document.getElementById('widget-id-input');
    const widgetNameInput = document.getElementById('widget-name-input');
    const widgetAddressInput = document.getElementById('widget-address-input');
    const widgetFlowRateReg = document.getElementById('widget-flow-rate-reg');
    const widgetFlowTotalReg = document.getElementById('widget-flow-total-reg');

    function toggleFieldsForDeviceType() {
        if (!deviceTypeSelect) return;
        const deviceType = deviceTypeSelect.value;
        if (deviceType === 'tank') {
            if (tankFieldsGroup) tankFieldsGroup.style.display = 'block';
            if (flowFieldsGroup) flowFieldsGroup.style.display = 'none';
            if (widgetIdLabel) widgetIdLabel.innerHTML = 'Widget ID <span class="required" style="color: var(--alarm-high);">*</span>';
            if (widgetNameLabel) widgetNameLabel.innerHTML = 'Widget Name <span class="required" style="color: var(--alarm-high);">*</span>';
            if (widgetIdInput) widgetIdInput.placeholder = 'e.g. TANK 2';
            if (widgetNameInput) widgetNameInput.placeholder = 'e.g. Acid Tank';
            if (widgetAddressInput) widgetAddressInput.required = true;
            if (widgetFlowRateReg) widgetFlowRateReg.required = false;
            if (widgetFlowTotalReg) widgetFlowTotalReg.required = false;
        } else {
            if (tankFieldsGroup) tankFieldsGroup.style.display = 'none';
            if (flowFieldsGroup) flowFieldsGroup.style.display = 'block';
            if (widgetIdLabel) widgetIdLabel.innerHTML = 'Meter ID <span class="required" style="color: var(--alarm-high);">*</span>';
            if (widgetNameLabel) widgetNameLabel.innerHTML = 'Meter Name <span class="required" style="color: var(--alarm-high);">*</span>';
            if (widgetIdInput) widgetIdInput.placeholder = 'e.g. FM-01';
            if (widgetNameInput) widgetNameInput.placeholder = 'e.g. Inlet Flow';
            if (widgetAddressInput) widgetAddressInput.required = false;
            if (widgetFlowRateReg) widgetFlowRateReg.required = true;
            if (widgetFlowTotalReg) widgetFlowTotalReg.required = true;
        }
    }

    if (deviceTypeSelect) {
        deviceTypeSelect.addEventListener('change', toggleFieldsForDeviceType);
    }

    const submitBtn = document.getElementById('add-widget-submit-btn');
    if (submitBtn) {
        submitBtn.addEventListener('click', function(e) {
            e.preventDefault();
            if (!form.reportValidity()) return;

            const deviceType = deviceTypeSelect ? deviceTypeSelect.value : 'tank';
            const widgetId = widgetIdInput.value.trim();
            const name = widgetNameInput.value.trim();
            let csrftoken = document.querySelector('[name=csrfmiddlewaretoken]')?.value;
            if (!csrftoken) {
                const match = document.cookie.match(/csrftoken=([^;]+)/);
                csrftoken = match ? match[1] : '';
            }

            const isEditMode = widgetIdInput && widgetIdInput.readOnly;
            submitBtn.textContent = isEditMode ? 'Saving...' : 'Creating...';
            submitBtn.disabled = true;

            const comPort = document.getElementById('widget-com-port') ? document.getElementById('widget-com-port').value : '';

            if (deviceType === 'tank') {
                const address = widgetAddressInput.value.trim();
                const widgetStyle = document.getElementById('widget-style-input').value;
                const capacity = document.getElementById('widget-capacity-input').value;
                const highLimit = document.getElementById('widget-high-input').value;
                const lowLimit = document.getElementById('widget-low-input').value;
                const slaveId = document.getElementById('widget-slave-id-input') ? document.getElementById('widget-slave-id-input').value.trim() : '1';

                const errorAccuracyVal = document.getElementById('widget-error-accuracy') ? document.getElementById('widget-error-accuracy').value.trim() : '0.0';

                fetch('/settings/add-tank/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': csrftoken
                    },
                    body: JSON.stringify({
                        tank_id: widgetId,
                        name: name,
                        address: address,
                        widget_type: widgetStyle,
                        capacity: capacity,
                        high_limit: highLimit,
                        low_limit: lowLimit,
                        com_port: comPort,
                        slave_id: slaveId,
                        error_accuracy: errorAccuracyVal
                    })
                })
                .then(res => res.json())
                .then(data => {
                    submitBtn.textContent = isEditMode ? 'Save Changes' : 'Create Widget';
                    submitBtn.disabled = false;
                    if (data.success) {
                        alert(data.message);
                        hideModal();
                        window.location.reload();
                    } else {
                        alert('Error: ' + data.error);
                    }
                })
                .catch(err => {
                    submitBtn.textContent = isEditMode ? 'Save Changes' : 'Create Widget';
                    submitBtn.disabled = false;
                    console.error(err);
                    alert('Failed to save widget.');
                });
            } else {
                // Flow Meter
                const flowRateReg = widgetFlowRateReg.value.trim();
                const flowTotalReg = widgetFlowTotalReg.value.trim();
                const flowRateUnit = document.getElementById('widget-flow-rate-unit').value.trim();
                const flowTotalUnit = document.getElementById('widget-flow-total-unit').value.trim();
                const slaveId = document.getElementById('widget-flow-slave-id').value.trim();
                const highLimit = document.getElementById('widget-flow-high-limit').value;
                const lowLimit = document.getElementById('widget-flow-low-limit').value;

                // Capture existing data type and byte order from card attributes if editing
                const card = document.getElementById(`flow-card-${widgetId}`);
                const dataType = card ? card.getAttribute('data-data-type') : 'Float32';
                const byteOrder = card ? card.getAttribute('data-byte-order') : 'ABCD';

                const flowErrorAccuracyVal = document.getElementById('widget-flow-error-accuracy') ? document.getElementById('widget-flow-error-accuracy').value.trim() : '0.0';

                fetch('/settings/add-tank/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': csrftoken
                    },
                    body: JSON.stringify({
                        tank_id: widgetId,
                        name: name,
                        widget_type: 'flow_meter',
                        flow_rate_register: flowRateReg,
                        total_volume_register: flowTotalReg,
                        flow_unit: flowRateUnit,
                        total_unit: flowTotalUnit,
                        slave_id: slaveId,
                        high_limit: highLimit,
                        low_limit: lowLimit,
                        com_port: comPort,
                        data_type: dataType || 'Float32',
                        byte_order: byteOrder || 'ABCD',
                        error_accuracy: flowErrorAccuracyVal
                    })
                })
                .then(res => res.json())
                .then(data => {
                    submitBtn.textContent = isEditMode ? 'Save Changes' : 'Create Widget';
                    submitBtn.disabled = false;
                    if (data.success) {
                        alert(data.message);
                        hideModal();
                        window.location.reload();
                    } else {
                        alert('Error: ' + data.error);
                    }
                })
                .catch(err => {
                    submitBtn.textContent = isEditMode ? 'Save Changes' : 'Create Widget';
                    submitBtn.disabled = false;
                    console.error(err);
                    alert('Failed to save widget.');
                });
            }
        });
    }
}

// =========================================
// Theme Change Handler
// =========================================

window.addEventListener('themeChanged', function(e) {
    const themeColors = getThemeColors();
    if (trendChart) {
        if (trendChart.options.plugins.legend) {
            trendChart.options.plugins.legend.labels.color = themeColors.legendColor;
        }
        if (trendChart.options.scales.x) {
            trendChart.options.scales.x.grid.color = themeColors.gridColor;
            trendChart.options.scales.x.ticks.color = themeColors.textColor;
        }
        if (trendChart.options.scales.y) {
            trendChart.options.scales.y.grid.color = themeColors.gridColor;
            trendChart.options.scales.y.ticks.color = themeColors.textColor;
            if (trendChart.options.scales.y.title) {
                trendChart.options.scales.y.title.color = themeColors.textColor;
            }
        }
        trendChart.update();
    }
    if (modalChart) {
        if (modalChart.options.scales.x) {
            modalChart.options.scales.x.grid.color = themeColors.gridColor;
            modalChart.options.scales.x.ticks.color = themeColors.textColor;
        }
        if (modalChart.options.scales.y) {
            modalChart.options.scales.y.grid.color = themeColors.gridColor;
            modalChart.options.scales.y.ticks.color = themeColors.textColor;
        }
        modalChart.update();
    }
});
