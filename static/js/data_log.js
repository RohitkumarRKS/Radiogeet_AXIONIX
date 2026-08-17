/* =========================================
   Data Log Page JavaScript
   ========================================= */

document.addEventListener('DOMContentLoaded', function() {
    initSidebar();
    initDataLogTableFilter();
    updateClock();
    setInterval(updateClock, 1000);
});

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

function initDataLogTableFilter() {
    const table = document.querySelector('.data-matrix-table');
    if (!table) return;

    const rows = Array.from(table.querySelectorAll('tbody tr:not(.no-records-row)'));
    const searchInput = document.getElementById('datalog-search-input');
    const tankSelect = document.getElementById('datalog-tank-select');
    const intervalSelect = document.getElementById('datalog-interval-select');
    
    const applyBtn = document.getElementById('datalog-apply-btn');
    const resetBtn = document.getElementById('datalog-reset-btn');
    const exportBtn = document.getElementById('datalog-export-btn');
    const pageSizeSelect = document.getElementById('datalog-page-size');
    
    const footerSpan = document.querySelector('.pagination-footer span');
    const paginationWrap = document.querySelector('.pagination-buttons');

    if (!rows.length) return;

    let currentPage = 1;
    let pageSize = parseInt(pageSizeSelect ? pageSizeSelect.value : '50');
    let filterAlarmsOnly = false;

    // Create a placeholder row for when search yields no results
    const noRecordsRow = document.createElement('tr');
    noRecordsRow.className = 'no-records-row';
    noRecordsRow.style.display = 'none';
    
    // Find number of columns to span
    const colCount = table.querySelectorAll('thead th').length || 10;
    noRecordsRow.innerHTML = `<td colspan="${colCount}" style="text-align: center; padding: 48px; color: var(--text-secondary);">
        <div style="font-size: 2.5rem; margin-bottom: 8px;">📊</div>
        <h4>No matching historical records found</h4>
    </td>`;
    table.querySelector('tbody').appendChild(noRecordsRow);

    function updateTable() {
        const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
        const interval = parseInt(intervalSelect ? intervalSelect.value : '10');
        const selectedDevice = tankSelect ? tankSelect.value : 'all';

        // Keep track of time buckets we've already displayed a record for
        const seenBuckets = new Set();

        // 1. Filter rows
        const matchedRows = rows.filter(row => {
            // Search filter
            const cellsText = Array.from(row.cells).map(cell => cell.textContent.toLowerCase()).join(' ');
            const matchesSearch = query === '' || cellsText.includes(query);
            if (!matchesSearch) return false;

            // Alarm filter
            if (filterAlarmsOnly) {
                let rowHasAlarm = false;
                for (let i = 1; i < row.cells.length; i++) {
                    const cellText = row.cells[i].textContent.replace('%', '').trim();
                    const levelVal = parseFloat(cellText);
                    if (!isNaN(levelVal)) {
                        // Alarm occurs if value is <= 10 or >= 90
                        if (levelVal <= 10.0 || levelVal >= 90.0) {
                            rowHasAlarm = true;
                            break;
                        }
                    }
                }
                if (!rowHasAlarm) return false;
            }

            // Interval filter
            if (interval > 1) {
                const timeText = row.cells[0].textContent; // e.g. "17 Jul 2026 12:27 PM"
                const parts = timeText.trim().split(/\s+/);
                if (parts.length >= 5) {
                    const day = parts[0];
                    const monthStr = parts[1];
                    const year = parts[2];
                    const timeParts = parts[3].split(':');
                    let hour = parseInt(timeParts[0]);
                    const minute = parseInt(timeParts[1]);
                    const ampm = parts[4].toLowerCase();
                    if (ampm === 'pm' && hour < 12) hour += 12;
                    if (ampm === 'am' && hour === 12) hour = 0;

                    // Round minute down to the nearest interval bucket
                    const roundedMinute = Math.floor(minute / interval) * interval;
                    const bucketKey = `${year}-${monthStr}-${day} ${hour}:${roundedMinute}`;
                    
                    if (seenBuckets.has(bucketKey)) {
                        return false; // already have a record for this time slot
                    }
                    seenBuckets.add(bucketKey);
                }
            }
            return true;
        });

        // 2. Hide/Show tank/meter columns dynamically
        const headers = Array.from(table.querySelectorAll('thead th'));
        headers.forEach((th, index) => {
            if (index === 0) return; // always show Date & Time column
            
            const deviceId = th.dataset.deviceId;
            const showCol = (selectedDevice === 'all' || (deviceId && deviceId.toLowerCase() === selectedDevice.toLowerCase()));
            th.style.display = showCol ? '' : 'none';
            
            rows.forEach(row => {
                if (row.cells[index]) {
                    row.cells[index].style.display = showCol ? '' : 'none';
                }
            });
        });

        // 3. Update export links (CSV, EXCEL, PDF) with current device_id and interval
        const syncExportLink = (el) => {
            if (!el) return;
            let url = new URL(el.href, window.location.origin);
            url.searchParams.set('device_id', selectedDevice);
            url.searchParams.set('interval', interval.toString());
            el.href = url.toString();
        };

        syncExportLink(exportBtn);
        syncExportLink(document.querySelector('a[href*="format=excel"]'));
        syncExportLink(document.querySelector('a[href*="format=pdf"]'));

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

    // Attach filter button actions
    if (applyBtn) {
        applyBtn.addEventListener('click', (e) => {
            e.preventDefault();
            currentPage = 1;
            filterAlarmsOnly = false;
            updateTable();
        });
    }

    if (resetBtn) {
        resetBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (tankSelect) tankSelect.value = 'all';
            if (intervalSelect) intervalSelect.value = '10';
            if (searchInput) searchInput.value = '';
            currentPage = 1;
            filterAlarmsOnly = false;
            updateTable();
        });
    }

    if (tankSelect) tankSelect.addEventListener('change', () => { currentPage = 1; updateTable(); });
    if (intervalSelect) intervalSelect.addEventListener('change', () => { currentPage = 1; updateTable(); });
    if (searchInput) searchInput.addEventListener('input', () => { currentPage = 1; updateTable(); });
    if (pageSizeSelect) pageSizeSelect.addEventListener('change', function() {
        pageSize = parseInt(this.value);
        currentPage = 1;
        updateTable();
    });

    // Initialize first render
    updateTable();
}
