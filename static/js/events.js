/* =========================================
   Events Log JavaScript
   ========================================= */

document.addEventListener('DOMContentLoaded', function() {
    initSidebar();
    initFilters();
    updateClock();
    setInterval(updateClock, 1000);
});

function initFilters() {
    const search = document.getElementById('event-search-input');
    const typeFilter = document.getElementById('event-type-filter');
    const sourceFilter = document.getElementById('event-source-filter');
    const rows = document.querySelectorAll('.event-row');

    if (!search || !typeFilter || !sourceFilter) return;

    const filterHandler = () => {
        const query = search ? search.value.trim().toLowerCase() : '';
        const type = typeFilter ? typeFilter.value : 'ALL';
        const source = sourceFilter ? sourceFilter.value : 'ALL';

        rows.forEach(row => {
            const rowType = row.getAttribute('data-type') || '';
            const rowSource = row.getAttribute('data-source') || '';
            const rowText = row.querySelector('.message-cell') ? row.querySelector('.message-cell').textContent.toLowerCase() : '';

            const matchesQuery = !query || rowText.includes(query);
            const matchesType = type === 'ALL' || rowType.toUpperCase() === type.toUpperCase();
            const matchesSource = source === 'ALL' || rowSource.toLowerCase().includes(source.toLowerCase());

            if (matchesQuery && matchesType && matchesSource) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });

        // Sync export links (EXCEL, CSV, PDF)
        const updateLinkById = (id) => {
            const btn = document.getElementById(id);
            if (btn) {
                let url = new URL(btn.href, window.location.origin);
                url.searchParams.set('event_type', type);
                url.searchParams.set('source', source);
                url.searchParams.set('q', query);
                btn.href = url.toString();
            }
        };

        updateLinkById('events-export-excel');
        updateLinkById('events-export-csv');
        updateLinkById('events-export-pdf');
    };

    search.addEventListener('input', filterHandler);
    typeFilter.addEventListener('change', filterHandler);
    sourceFilter.addEventListener('change', filterHandler);
    filterHandler();
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
