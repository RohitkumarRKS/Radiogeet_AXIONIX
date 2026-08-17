/* =========================================
   Alarms Page JavaScript
   ========================================= */

document.addEventListener('DOMContentLoaded', function() {
    initSidebar();
    initAlarmsTableFilter();
    updateClock();
    setInterval(updateClock, 1000);
});

function initAlarmSettings() {
    const editButtons = document.querySelectorAll('.edit-btn');
    editButtons.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            const row = this.closest('tr');
            const tankId = row.cells[0].textContent.trim();
            const currentHigh = row.cells[2].textContent.trim();
            const currentLow = row.cells[3].textContent.trim();

            const newHigh = prompt(`Enter High Alarm Limit (%) for ${tankId}:`, currentHigh);
            if (newHigh === null) return;
            const newLow = prompt(`Enter Low Alarm Limit (%) for ${tankId}:`, currentLow);
            if (newLow === null) return;

            const csrftoken = document.querySelector('[name=csrfmiddlewaretoken]')?.value || '';

            fetch('/alarms/set-limits/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': csrftoken
                },
                body: JSON.stringify({
                    tank_id: tankId,
                    high_limit: parseFloat(newHigh),
                    low_limit: parseFloat(newLow)
                })
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
                alert("Failed to update alarm settings.");
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

function initAlarmsTableFilter() {
    const table = document.querySelector('.events-table');
    if (!table) return;

    const rows = Array.from(table.querySelectorAll('tbody tr:not(.no-records-row)'));
    const searchInput = document.getElementById('alarm-search-input');
    const typeSelect = document.getElementById('alarm-type-select');
    const statusSelect = document.getElementById('alarm-status-select');
    const pageSizeSelect = document.getElementById('alarm-page-size');
    
    const footerSpan = document.querySelector('.pagination-footer span');
    const paginationWrap = document.querySelector('.pagination-buttons');

    if (!rows.length) return;

    let currentPage = 1;
    let pageSize = parseInt(pageSizeSelect ? pageSizeSelect.value : '10');

    // Create a placeholder row for when search yields no results
    const noRecordsRow = document.createElement('tr');
    noRecordsRow.className = 'no-records-row';
    noRecordsRow.style.display = 'none';
    noRecordsRow.innerHTML = `<td colspan="9" style="text-align: center; padding: 24px; color: var(--text-muted);">No matching alarms found</td>`;
    table.querySelector('tbody').appendChild(noRecordsRow);

    function updateTable() {
        const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
        const selectedType = typeSelect ? typeSelect.value.toLowerCase() : 'all';
        const selectedStatus = statusSelect ? statusSelect.value.toLowerCase() : 'all';

        // Sync export links (EXCEL, CSV, PDF)
        const updateLinkById = (id) => {
            const btn = document.getElementById(id);
            if (btn) {
                let url = new URL(btn.href, window.location.origin);
                url.searchParams.set('alarm_type', selectedType);
                url.searchParams.set('status', selectedStatus);
                url.searchParams.set('q', query);
                btn.href = url.toString();
            }
        };

        updateLinkById('alarms-export-excel');
        updateLinkById('alarms-export-csv');
        updateLinkById('alarms-export-pdf');

        // Filter rows
        const matchedRows = rows.filter(row => {
            const timeVal = row.cells[0].textContent.toLowerCase();
            const tankId = row.cells[1].textContent.toLowerCase();
            const tankName = row.cells[2].textContent.toLowerCase();
            const alarmType = row.cells[3].textContent.toLowerCase();
            const message = row.cells[6].textContent.toLowerCase();
            const status = row.cells[7].textContent.toLowerCase().trim();

            const matchesSearch = query === '' || 
                tankId.includes(query) || 
                tankName.includes(query) || 
                message.includes(query) || 
                timeVal.includes(query);
            
            const matchesType = selectedType === 'all' || alarmType.includes(selectedType);
            const matchesStatus = selectedStatus === 'all' || status === selectedStatus;

            return matchesSearch && matchesType && matchesStatus;
        });

        // Calculate paging boundaries
        const totalEntries = matchedRows.length;
        const totalPages = Math.ceil(totalEntries / pageSize) || 1;
        if (currentPage > totalPages) currentPage = totalPages;
        if (currentPage < 1) currentPage = 1;

        const startIdx = (currentPage - 1) * pageSize;
        const endIdx = startIdx + pageSize;

        // Hide all rows first
        rows.forEach(row => row.style.display = 'none');
        noRecordsRow.style.display = 'none';

        if (totalEntries === 0) {
            noRecordsRow.style.display = '';
            if (footerSpan) footerSpan.textContent = 'Showing 0 to 0 of 0 entries';
        } else {
            // Show only rows in active page slice
            matchedRows.slice(startIdx, endIdx).forEach(row => {
                row.style.display = '';
            });
            const visibleEnd = Math.min(endIdx, totalEntries);
            if (footerSpan) {
                footerSpan.textContent = `Showing ${startIdx + 1} to ${visibleEnd} of ${totalEntries} entries`;
            }
        }

        renderPaginationControls(totalPages);
    }

    function renderPaginationControls(totalPages) {
        if (!paginationWrap) return;
        
        // Remove existing numeric buttons, keeping navigation indicators
        const buttons = Array.from(paginationWrap.querySelectorAll('.pag-btn'));
        buttons.forEach(btn => btn.remove());

        // Recreate navigation buttons
        const createBtn = (text, pageNum, disabled, isActive = false) => {
            const btn = document.createElement('button');
            btn.className = `pag-btn${isActive ? ' active' : ''}`;
            btn.textContent = text;
            btn.disabled = disabled;
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                currentPage = pageNum;
                updateTable();
            });
            return btn;
        };

        // Insert first & prev
        paginationWrap.insertBefore(createBtn('«', 1, currentPage === 1), pageSizeSelect);
        paginationWrap.insertBefore(createBtn('<', currentPage - 1, currentPage === 1), pageSizeSelect);

        // Insert pages
        let startPage = Math.max(1, currentPage - 2);
        let endPage = Math.min(totalPages, startPage + 4);
        if (endPage - startPage < 4) {
            startPage = Math.max(1, endPage - 4);
        }

        for (let i = startPage; i <= endPage; i++) {
            paginationWrap.insertBefore(createBtn(i.toString(), i, false, i === currentPage), pageSizeSelect);
        }

        // Insert next & last
        paginationWrap.insertBefore(createBtn('>', currentPage + 1, currentPage === totalPages), pageSizeSelect);
        paginationWrap.insertBefore(createBtn('»', totalPages, currentPage === totalPages), pageSizeSelect);
    }

    // Attach filter listeners
    if (searchInput) searchInput.addEventListener('input', () => { currentPage = 1; updateTable(); });
    if (typeSelect) typeSelect.addEventListener('change', () => { currentPage = 1; updateTable(); });
    if (statusSelect) statusSelect.addEventListener('change', () => { currentPage = 1; updateTable(); });
    if (pageSizeSelect) pageSizeSelect.addEventListener('change', function() {
        pageSize = parseInt(this.value);
        currentPage = 1;
        updateTable();
    });

    // Initialize first render
    updateTable();
}

let currentDetailAlarmId = null;

function toggleMuteAlarm(alarmId, btn) {
    const csrftoken = document.querySelector('[name=csrfmiddlewaretoken]')?.value || getCookie('csrftoken') || '';
    fetch('/api/acknowledge-alarm/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrftoken
        },
        body: JSON.stringify({ alarm_id: alarmId })
    })
    .then(res => res.json())
    .then(data => {
        if (data.status === 'success') {
            const row = btn.closest('tr');
            const badge = row.querySelector('.status-badge');
            if (data.acknowledged) {
                btn.textContent = '🔇';
                if (badge) {
                    badge.textContent = 'Acknowledged';
                    badge.className = 'status-badge ack';
                }
            } else {
                btn.textContent = '🔊';
                if (badge) {
                    badge.textContent = 'Active';
                    badge.className = 'status-badge active';
                }
            }
            window.location.reload();
        } else {
            alert('Failed to update alarm acknowledgment status.');
        }
    })
    .catch(err => {
        console.error(err);
        alert('Network error updating acknowledgment status.');
    });
}

function viewAlarmDetail(alarmId) {
    currentDetailAlarmId = alarmId;
    fetch(`/api/alarm-detail/${alarmId}/`)
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                document.getElementById('detail-device-id').textContent = data.device_id;
                document.getElementById('detail-device-name').textContent = data.device_name;
                document.getElementById('detail-device-type').textContent = data.device_type;
                document.getElementById('detail-alarm-type').textContent = data.alarm_type;
                document.getElementById('detail-severity').textContent = data.severity;
                document.getElementById('detail-value').textContent = data.level;
                document.getElementById('detail-limits').textContent = `High: ${data.high_limit} | Low: ${data.low_limit}`;
                document.getElementById('detail-message').textContent = data.message;
                document.getElementById('detail-timestamp').textContent = data.timestamp;
                
                const statusEl = document.getElementById('detail-status');
                statusEl.textContent = data.status;
                
                const headerBox = document.getElementById('detail-modal-header');
                const titleText = document.getElementById('detail-alarm-title');
                
                if (data.severity === 'HIGH') {
                    headerBox.style.background = '#ef4444';
                    titleText.textContent = 'CRITICAL ALARM (HIGH)';
                } else {
                    headerBox.style.background = '#f59e0b';
                    titleText.textContent = 'WARNING ALARM (LOW)';
                }
                
                if (data.acknowledged) {
                    statusEl.style.color = '#E040FB';
                    statusEl.style.fontWeight = 'bold';
                    document.getElementById('detail-ack-btn').textContent = "Unmute / Active";
                } else {
                    statusEl.style.color = '#ff3b30';
                    statusEl.style.fontWeight = 'bold';
                    document.getElementById('detail-ack-btn').textContent = "Mute / Acknowledge";
                }
                
                document.getElementById('alarm-detail-modal').style.display = 'flex';
            } else {
                alert('Failed to fetch alarm details.');
            }
        })
        .catch(err => {
            console.error(err);
            alert('Error loading alarm detail popup.');
        });
}

function closeAlarmDetail() {
    document.getElementById('alarm-detail-modal').style.display = 'none';
}

function acknowledgeDetailAlarm() {
    if (!currentDetailAlarmId) return;
    const btn = document.getElementById('detail-ack-btn');
    btn.disabled = true;
    
    const csrftoken = document.querySelector('[name=csrfmiddlewaretoken]')?.value || getCookie('csrftoken') || '';
    fetch('/api/acknowledge-alarm/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrftoken
        },
        body: JSON.stringify({ alarm_id: currentDetailAlarmId })
    })
    .then(res => res.json())
    .then(data => {
        if (data.status === 'success') {
            closeAlarmDetail();
            window.location.reload();
        } else {
            alert('Failed to change alarm acknowledgment state.');
        }
    })
    .catch(err => {
        console.error(err);
        alert('Network error.');
    })
    .finally(() => {
        btn.disabled = false;
    });
}

function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

