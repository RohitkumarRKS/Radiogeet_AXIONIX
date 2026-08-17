/* =========================================
   Trend Chart Page JavaScript
   ========================================= */

document.addEventListener('DOMContentLoaded', function() {
    initBigTrendChart();
    initSidebar();
    updateClock();
    setInterval(updateClock, 1000);
    initRealTimeUpdates();
});

let bigTrendChart = null;

function getThemeColors() {
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    return {
        gridColor: isLight ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.04)',
        textColor: isLight ? '#4b5563' : '#a0aec0',
        legendColor: isLight ? '#374151' : '#a0aec0'
    };
}

function initBigTrendChart() {
    const canvas = document.getElementById('big-trend-chart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    // Curated Harmonious Palette (rotated for all 25 tanks)
    const colorPalette = [
        '#4CAF50', '#2196F3', '#FF9800', '#f44336', '#9C27B0',
        '#00BCD4', '#E91E63', '#009688', '#FFEB3B', '#795548',
        '#607D8B', '#00E676', '#2979FF', '#FF9100', '#FF1744',
        '#D500F9', '#00E5FF', '#F50057', '#1DE9B6', '#FFEA00',
        '#A1887F', '#90A4AE', '#64DD17', '#29B6F6', '#FFB74D'
    ];

    // Build datasets dynamically from the legend items in the HTML
    const legendItems = document.querySelectorAll('.legend-checklist-item');
    legendItems.forEach((item, i) => {
        const dot = item.querySelector('.legend-color-dot');
        if (dot) {
            dot.style.backgroundColor = colorPalette[i % colorPalette.length];
        }
    });

    fetch('/api/historical-data/')
    .then(res => res.json())
    .then(payload => {
        const themeColors = getThemeColors();
        const labels = payload.timestamps.map(ts => {
            const d = new Date(ts);
            return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
        });
        const datasets = [];

        legendItems.forEach((item, index) => {
            const tankId = item.getAttribute('data-tank-id');
            const dataPoints = payload.datasets[tankId] || [];

            datasets.push({
                label: tankId,
                data: dataPoints,
                borderColor: colorPalette[index % colorPalette.length],
                backgroundColor: 'transparent',
                borderWidth: 1.8,
                pointRadius: 2,
                pointHoverRadius: 5,
                tension: 0.35,
                spanGaps: true,
                hidden: index >= 12
            });

            const chk = document.getElementById(`chk-${tankId}`);
            if (chk) {
                chk.checked = index < 12;
            }
        });

        bigTrendChart = new Chart(ctx, {
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
                    legend: { display: false }, // Using custom side Legend Checklist instead
                    tooltip: {
                        backgroundColor: 'rgba(10, 14, 26, 0.95)',
                        titleColor: '#ffffff',
                        bodyColor: '#a0aec0',
                        borderColor: 'rgba(76, 175, 80, 0.3)',
                        borderWidth: 1,
                        padding: 12,
                        titleFont: { family: "'Inter', sans-serif", weight: '600' },
                        bodyFont: { family: "'Inter', sans-serif" },
                    },
                },
                scales: {
                    x: {
                        offset: false,
                        grid: { color: themeColors.gridColor, drawBorder: false },
                        ticks: { color: themeColors.textColor, font: { family: "'Inter', sans-serif", size: 10 } }
                    },
                    y: {
                        min: 0,
                        grid: { color: themeColors.gridColor, drawBorder: false },
                        ticks: {
                            color: themeColors.textColor,
                            font: { family: "'Inter', sans-serif", size: 10 }
                        },
                        title: {
                            display: true,
                            text: 'Value (Level % or Flow)',
                            color: themeColors.textColor,
                            font: { family: "'Inter', sans-serif", size: 11 }
                        }
                    }
                }
            },
            plugins: [{
                id: 'limitLines',
                afterDraw: function(chart) {
                    const ctx = chart.ctx;
                    const yScale = chart.scales.y;
                    const xScale = chart.scales.x;
                    const left = xScale.left;
                    const right = xScale.right;

                    // High Limit (90%) Dotted Red Line
                    const yHigh = yScale.getPixelForValue(90);
                    ctx.save();
                    ctx.beginPath();
                    ctx.setLineDash([5, 5]);
                    ctx.moveTo(left, yHigh);
                    ctx.lineTo(right, yHigh);
                    ctx.strokeStyle = '#f44336';
                    ctx.lineWidth = 1.5;
                    ctx.stroke();

                    ctx.fillStyle = '#f44336';
                    ctx.font = 'bold 9px sans-serif';
                    ctx.fillText('High Limit (90%)', right - 90, yHigh - 5);

                    // Low Limit (10%) Dotted Orange Line
                    const yLow = yScale.getPixelForValue(10);
                    ctx.beginPath();
                    ctx.moveTo(left, yLow);
                    ctx.lineTo(right, yLow);
                    ctx.strokeStyle = '#ff9800';
                    ctx.stroke();

                    ctx.fillStyle = '#ff9800';
                    ctx.fillText('Low Limit (10%)', right - 90, yLow - 5);
                    ctx.restore();
                }
            }]
        });

        // Checklist checkboxes listeners to toggle series lines visibility
        const checkboxes = document.querySelectorAll('.legend-chk-input');
        checkboxes.forEach((chk, index) => {
            chk.addEventListener('change', function() {
                bigTrendChart.setDatasetVisibility(index, this.checked);
                bigTrendChart.update();
            });
        });

        const syncTrendExportLinks = (range, deviceId, start, end) => {
            const updateLinkById = (id) => {
                const btn = document.getElementById(id);
                if (btn) {
                    let url = new URL(btn.href, window.location.origin);
                    if (range) url.searchParams.set('range', range);
                    if (deviceId) url.searchParams.set('device_id', deviceId);
                    if (start) url.searchParams.set('start_time', start); else url.searchParams.delete('start_time');
                    if (end) url.searchParams.set('end_time', end); else url.searchParams.delete('end_time');
                    btn.href = url.toString();
                }
            };
            updateLinkById('trend-export-excel');
            updateLinkById('trend-export-csv');
            updateLinkById('trend-export-pdf');
        };

        // Fire initial export link sync on load
        syncTrendExportLinks('6H', 'all');

        // Dropdown change filter selection
        const dropdown = document.getElementById('trend-tanks-select');
        if (dropdown) {
            dropdown.addEventListener('change', function() {
                const val = this.value;
                if (val === 'all') {
                    datasets.forEach((ds, index) => {
                        const chk = document.getElementById(`chk-${ds.label}`) || document.getElementById(`chk-TANK ${index + 1}`);
                        const active = index < 12;
                        bigTrendChart.setDatasetVisibility(index, active);
                        if (chk) chk.checked = active;
                    });
                } else {
                    datasets.forEach((ds, index) => {
                        const chk = document.getElementById(`chk-${ds.label}`);
                        const active = ds.label.toLowerCase() === val.toLowerCase();
                        bigTrendChart.setDatasetVisibility(index, active);
                        if (chk) chk.checked = active;
                    });
                }
                bigTrendChart.update();

                const activePill = document.querySelector('.range-pill.active');
                const range = activePill ? activePill.textContent.trim().toUpperCase() : '6H';
                syncTrendExportLinks(range, val);
            });
        }

        // Time range pill selectors implementation
        const rangePills = document.querySelectorAll('.range-pill');
        const customCol = document.getElementById('custom-time-range-col');
        const fromInput = document.getElementById('custom-from-datetime');
        const toInput = document.getElementById('custom-to-datetime');

        const formatDateForInput = (date) => {
            const pad = (n) => n.toString().padStart(2, '0');
            return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
        };

        const triggerCustomLoad = () => {
            if (fromInput.value && toInput.value) {
                const deviceVal = dropdown ? dropdown.value : 'all';
                reloadTrendChartData('CUSTOM', fromInput.value, toInput.value);
                syncTrendExportLinks('CUSTOM', deviceVal, fromInput.value, toInput.value);
            }
        };

        if (fromInput && toInput) {
            fromInput.addEventListener('change', triggerCustomLoad);
            toInput.addEventListener('change', triggerCustomLoad);
        }

        function reloadTrendChartData(range, start, end) {
            let url = `/api/historical-data/?range=${range}`;
            if (range === 'CUSTOM') {
                if (start) url += `&start_time=${encodeURIComponent(start)}`;
                if (end) url += `&end_time=${encodeURIComponent(end)}`;
            }

            fetch(url)
            .then(res => res.json())
            .then(payload => {
                const labels = payload.timestamps.map(ts => {
                    const d = new Date(ts);
                    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
                });
                bigTrendChart.data.labels = labels;
                
                // Update dataset values
                bigTrendChart.data.datasets.forEach((ds) => {
                    ds.data = payload.datasets[ds.label] || [];
                });
                
                bigTrendChart.update();

                const deviceVal = dropdown ? dropdown.value : 'all';
                syncTrendExportLinks(range, deviceVal, start, end);
            })
            .catch(err => console.error('Error switching trend chart range:', err));
        }

        rangePills.forEach(pill => {
            pill.addEventListener('click', function() {
                rangePills.forEach(p => p.classList.remove('active'));
                this.classList.add('active');
                
                const range = this.textContent.trim().toUpperCase();
                
                if (range === 'CUSTOM') {
                    if (customCol) {
                        customCol.style.display = 'flex';
                    }
                    if (fromInput && !fromInput.value) {
                        const now = new Date();
                        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
                        fromInput.value = formatDateForInput(todayStart);
                        toInput.value = formatDateForInput(now);
                    }
                    triggerCustomLoad();
                } else {
                    if (customCol) {
                        customCol.style.display = 'none';
                    }
                    reloadTrendChartData(range);
                }
            });
        });
    })
    .catch(err => console.error('Error fetching trend chart data:', err));
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

window.addEventListener('themeChanged', function(e) {
    const themeColors = getThemeColors();
    if (bigTrendChart) {
        if (bigTrendChart.options.scales.x) {
            bigTrendChart.options.scales.x.grid.color = themeColors.gridColor;
            bigTrendChart.options.scales.x.ticks.color = themeColors.textColor;
        }
        if (bigTrendChart.options.scales.y) {
            bigTrendChart.options.scales.y.grid.color = themeColors.gridColor;
            bigTrendChart.options.scales.y.ticks.color = themeColors.textColor;
            if (bigTrendChart.options.scales.y.title) {
                bigTrendChart.options.scales.y.title.color = themeColors.textColor;
            }
        }
        bigTrendChart.update();
    }
});

// =========================================
// Real-Time Polling & Live Chart Updates
// =========================================
let latestTelemetryCache = {};

function fetchRealTimeTankData() {
    fetch('/api/tanks/')
    .then(res => res.json())
    .then(data => {
        if (data.tanks) {
            data.tanks.forEach(tank => {
                latestTelemetryCache[tank.id] = tank.level;
                const valEl = document.getElementById(`legend-val-${tank.id}`);
                if (valEl) {
                    valEl.textContent = tank.level !== null ? `${tank.level.toFixed(1)}%` : '--%';
                }
            });
        }
    })
    .catch(err => console.error('Error fetching real-time tank data:', err));
}

function fetchRealTimeFlowData() {
    fetch('/api/flow-meters/')
    .then(res => res.json())
    .then(data => {
        if (data.flow_meters) {
            data.flow_meters.forEach(fm => {
                latestTelemetryCache[fm.id] = fm.flow_rate;
                const valEl = document.getElementById(`legend-val-${fm.id}`);
                if (valEl) {
                    valEl.textContent = fm.flow_rate !== null ? `${fm.flow_rate.toFixed(1)} ${fm.flow_unit || 'L/min'}` : `-- ${fm.flow_unit || 'L/min'}`;
                }
            });
        }
        if (data.virtual_fms) {
            data.virtual_fms.forEach(fm => {
                latestTelemetryCache[fm.id] = fm.flow_rate;
                const valEl = document.getElementById(`legend-val-${fm.id}`);
                if (valEl) {
                    valEl.textContent = fm.flow_rate !== null ? `${fm.flow_rate.toFixed(1)} ${fm.flow_unit || 'L/min'}` : `-- ${fm.flow_unit || 'L/min'}`;
                }
            });
        }
    })
    .catch(err => console.error('Error fetching real-time flow data:', err));
}

function initRealTimeUpdates() {
    // Poll tank data every 1 second
    setInterval(fetchRealTimeTankData, 1000);
    // Poll flow meter data every 1 second
    setInterval(fetchRealTimeFlowData, 1000);
    
    // Live update big trend chart every 5 seconds (matching Modbus daemon scan cycle)
    setInterval(updateTrendChartLive, 5000);

    // Initial fetch
    fetchRealTimeTankData();
    fetchRealTimeFlowData();
}

function updateTrendChartLive() {
    if (!bigTrendChart || !document.getElementById('big-trend-chart')) return;
    
    // Do not update live if the user is currently viewing a CUSTOM historical search
    const activePill = document.querySelector('.range-pill.active');
    if (activePill && activePill.textContent.trim().toUpperCase() === 'CUSTOM') {
        return;
    }

    if (Object.keys(latestTelemetryCache).length === 0) return;

    const nowStr = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
    
    bigTrendChart.data.labels.push(nowStr);
    while (bigTrendChart.data.labels.length > 300) {
        bigTrendChart.data.labels.shift();
    }
    
    bigTrendChart.data.datasets.forEach(dataset => {
        const val = latestTelemetryCache[dataset.label];
        dataset.data.push(val !== undefined && val !== null ? val : null);
        while (dataset.data.length > bigTrendChart.data.labels.length) {
            dataset.data.shift();
        }
    });
    
    bigTrendChart.update();
}
