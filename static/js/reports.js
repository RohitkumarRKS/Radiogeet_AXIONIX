/* =========================================
   Reports Page JavaScript
   ========================================= */

document.addEventListener('DOMContentLoaded', function() {
    initMiniTrendChart();
    initAlarmDonutChart();
    initShortcutLinks();
    initDatePickerTriggers();
    initSidebar();
    updateClock();
    setInterval(updateClock, 1000);
});

let miniTrendChart = null;
let alarmDonutChart = null;

function getThemeColors() {
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    return {
        gridColor: isLight ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.04)',
        textColor: isLight ? '#4b5563' : '#a0aec0',
        legendColor: isLight ? '#374151' : '#a0aec0'
    };
}

function initMiniTrendChart() {
    const canvas = document.getElementById('mini-trend-chart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    
    // Use embedded DB values if available, else default to mock
    const labels = (window.chartLabels && window.chartLabels.length > 0) ? window.chartLabels : ['00:00', '02:00', '04:00', '06:00', '08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00', '24:00'];
    const datasets = (window.chartDatasets && window.chartDatasets.length > 0) ? window.chartDatasets : [
        {
            data: [70, 72, 68, 75, 80, 85, 78, 74, 82, 85, 88, 90, 85],
            borderColor: '#4CAF50',
            borderWidth: 1.5,
            pointRadius: 0,
            tension: 0.35,
            fill: false
        },
        {
            data: [50, 48, 52, 58, 60, 65, 62, 59, 61, 65, 68, 66, 68],
            borderColor: '#2196F3',
            borderWidth: 1.5,
            pointRadius: 0,
            tension: 0.35,
            fill: false
        },
        {
            data: [35, 30, 28, 33, 38, 42, 40, 37, 41, 45, 48, 50, 52],
            borderColor: '#FF9800',
            borderWidth: 1.5,
            pointRadius: 0,
            tension: 0.35,
            fill: false
        }
    ];
    
    const themeColors = getThemeColors();
    miniTrendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: {
                    grid: { color: themeColors.gridColor, drawBorder: false },
                    ticks: { color: themeColors.textColor, font: { size: 9 }, maxTicksLimit: 6 }
                },
                y: {
                    min: 0,
                    max: 100,
                    grid: { color: themeColors.gridColor, drawBorder: false },
                    ticks: { color: themeColors.textColor, font: { size: 9 }, stepSize: 25 }
                }
            }
        }
    });
}

function initAlarmDonutChart() {
    const canvas = document.getElementById('alarm-donut-chart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    
    const highAlarms = window.highAlarmsCount !== undefined ? window.highAlarmsCount : 0;
    const lowAlarms = window.lowAlarmsCount !== undefined ? window.lowAlarmsCount : 0;
    
    const hasAlarms = (highAlarms > 0 || lowAlarms > 0);
    const dataValues = hasAlarms ? [highAlarms, lowAlarms] : [1];
    const bgColors = hasAlarms ? ['#f44336', '#ff9800'] : ['#2e7d32'];
    const labels = hasAlarms ? ['High Alarms', 'Low Alarms'] : ['All Clear (No Alarms)'];
    
    alarmDonutChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: dataValues,
                backgroundColor: bgColors,
                borderColor: document.documentElement.getAttribute('data-theme') === 'light' ? '#ffffff' : '#111827',
                borderWidth: 2,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%',
            plugins: {
                legend: { display: false },
                tooltip: {
                    enabled: hasAlarms, // disable tooltips if all clear
                    backgroundColor: 'rgba(10, 14, 26, 0.95)',
                    titleColor: '#ffffff',
                    bodyColor: '#a0aec0',
                    borderColor: 'rgba(255, 255, 255, 0.05)',
                    borderWidth: 1,
                }
            }
        }
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

function initShortcutLinks() {
    const shortcuts = document.querySelectorAll('.shortcut-item');
    shortcuts.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Read active values from form elements
            const deviceSelect = document.querySelector('select[name="device_id"]');
            const dateInput = document.querySelector('input[name="date"]');
            const endDateInput = document.querySelector('input[name="end_date"]');
            
            const deviceId = deviceSelect ? deviceSelect.value : 'all';
            const dateVal = dateInput ? dateInput.value : '';
            const endDateVal = endDateInput ? endDateInput.value : '';
            
            // Extract the report type from shortcut href
            const urlObj = new URL(this.href, window.location.origin);
            const targetType = urlObj.searchParams.get('report_type') || 'daily';
            
            // Build the URL dynamically
            let newUrl = `?report_type=${targetType}&device_id=${deviceId}&date=${dateVal}`;
            if (targetType === 'custom' && endDateVal) {
                newUrl += `&end_date=${endDateVal}`;
            }
            
            window.location.href = newUrl;
        });
    });

    // Real-time export link synchronization
    const syncReportExportLinks = () => {
        const reportTypeSelect = document.querySelector('select[name="report_type"]');
        const deviceSelect = document.querySelector('select[name="device_id"]');
        const dateInput = document.querySelector('input[name="date"]');
        const endDateInput = document.querySelector('input[name="end_date"]');

        const reportType = reportTypeSelect ? reportTypeSelect.value : 'daily';
        const deviceId = deviceSelect ? deviceSelect.value : 'all';
        const dateVal = dateInput ? dateInput.value : '';
        const endDateVal = endDateInput ? endDateInput.value : '';

        const updateLink = (selector) => {
            const btn = document.querySelector(selector);
            if (btn) {
                let url = new URL(btn.href, window.location.origin);
                url.searchParams.set('report_type', reportType);
                url.searchParams.set('device_id', deviceId);
                url.searchParams.set('date', dateVal);
                url.searchParams.set('end_date', endDateVal);
                btn.href = url.toString();
            }
        };

        updateLink('a[href*="export_reports"][href*="format=excel"]');
        updateLink('a[href*="export_reports"]:not([href*="format="])');
        updateLink('a[href*="export_reports"][href*="format=pdf"]');
    };

    const inputs = document.querySelectorAll('.report-filters-bar select, .report-filters-bar input');
    inputs.forEach(input => {
        input.addEventListener('change', syncReportExportLinks);
        input.addEventListener('input', syncReportExportLinks);
    });
    syncReportExportLinks();
}

function initDatePickerTriggers() {
    const dateInputs = document.querySelectorAll('input[type="date"]');
    dateInputs.forEach(el => {
        el.addEventListener('click', () => {
            try {
                if (typeof el.showPicker === 'function') {
                    el.showPicker();
                }
            } catch (err) {
                console.warn("showPicker is not supported on this browser context", err);
            }
        });
    });
}

window.addEventListener('themeChanged', function(e) {
    const themeColors = getThemeColors();
    if (miniTrendChart) {
        if (miniTrendChart.options.scales.x) {
            miniTrendChart.options.scales.x.grid.color = themeColors.gridColor;
            miniTrendChart.options.scales.x.ticks.color = themeColors.textColor;
        }
        if (miniTrendChart.options.scales.y) {
            miniTrendChart.options.scales.y.grid.color = themeColors.gridColor;
            miniTrendChart.options.scales.y.ticks.color = themeColors.textColor;
        }
        miniTrendChart.update();
    }
    if (alarmDonutChart) {
        const isLight = e.detail.theme === 'light';
        alarmDonutChart.data.datasets[0].borderColor = isLight ? '#ffffff' : '#111827';
        alarmDonutChart.update();
    }
});
