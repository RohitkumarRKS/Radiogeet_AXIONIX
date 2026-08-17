/* =========================================
   Welcome / Setup Page JavaScript
   ========================================= */

document.addEventListener('DOMContentLoaded', function() {
    // Form verification on submit
    const form = document.getElementById('welcome-form');
    if (form) {
        form.addEventListener('submit', function(e) {
            const keyInput = document.getElementById('id_ws_key');
            if (keyInput) {
                const val = keyInput.value.trim();
                const isLifetime = (val === "RADIOGEET-AXIONIX-S3CR3T-K3Y-2026");
                const isTrial = (val === "RADIOGEET-AXIONIX-S3CR3T-K3Y-2026-3T");
                const is1Year = /^RADIOGEET-AXIONIX-KEY-2026-(0[1-9]|10)$/.test(val);
                const isSlotted = /^RADIOGEET-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(val);
                
                if (!isLifetime && !isTrial && !is1Year && !isSlotted) {
                    e.preventDefault();
                    showNotification('Invalid license activation key! Please enter the correct license key to initialize.', 'error');
                    keyInput.style.borderColor = '#F44336';
                    keyInput.focus();
                }
            }
        });
    }

    // Activate key validation button click
    const validateBtn = document.getElementById('btn-validate-key');
    if (validateBtn) {
        validateBtn.addEventListener('click', validateActivationKey);
    }

    // Form animations
    animateFormSections();
});

function validateActivationKey() {
    const keyInput = document.getElementById('id_ws_key');
    const btn = document.getElementById('btn-validate-key');
    
    if (!keyInput || !keyInput.value.trim()) {
        showNotification('Please enter an activation key.', 'error');
        keyInput.focus();
        return;
    }

    const val = keyInput.value.trim();
    const isLifetime = (val === "RADIOGEET-AXIONIX-S3CR3T-K3Y-2026");
    const isTrial = (val === "RADIOGEET-AXIONIX-S3CR3T-K3Y-2026-3T");
    const is1Year = /^RADIOGEET-AXIONIX-KEY-2026-(0[1-9]|10)$/.test(val);
    const isSlotted = /^RADIOGEET-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(val);
    const isValid = isLifetime || isTrial || is1Year || isSlotted;

    // Real validation
    btn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 6v6l4 2"/>
        </svg>
        Validating...
    `;
    btn.disabled = true;

    setTimeout(() => {
        if (isValid) {
            let badgeText = "Validated!";
            let successMsg = "Activation key validated successfully!";
            if (isLifetime) {
                badgeText = "Validated! (Lifetime)";
                successMsg = "Lifetime key validated successfully!";
            } else if (isTrial) {
                badgeText = "Validated! (3-Day Trial)";
                successMsg = "3-Day Trial key validated successfully!";
            } else if (is1Year) {
                badgeText = "Validated! (1-Year)";
                successMsg = "1-Year key validated successfully!";
            } else if (isSlotted) {
                badgeText = "Validated! (Active)";
                successMsg = "License key validated successfully!";
            }
            
            btn.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="20 6 9 17 4 12"/>
                </svg>
                ${badgeText}
            `;
            btn.style.borderColor = '#4CAF50';
            btn.style.color = '#76FF03';
            keyInput.style.borderColor = '#4CAF50';
            showNotification(successMsg, 'success');
        } else {
            btn.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
                Failed
            `;
            btn.style.borderColor = '#F44336';
            btn.style.color = '#FF6B6B';
            keyInput.style.borderColor = '#F44336';
            btn.disabled = false;
            showNotification('Invalid activation key! Please enter the correct license key.', 'error');
        }
    }, 1500);
}

function animateFormSections() {
    const sections = document.querySelectorAll('.form-section');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, { threshold: 0.1 });

    sections.forEach((section, index) => {
        section.style.opacity = '0';
        section.style.transform = 'translateY(20px)';
        section.style.transition = `all 0.5s ease ${index * 0.15}s`;
        observer.observe(section);
    });

    // Trigger immediately for visible sections
    setTimeout(() => {
        sections.forEach(section => {
            const rect = section.getBoundingClientRect();
            if (rect.top < window.innerHeight) {
                section.style.opacity = '1';
                section.style.transform = 'translateY(0)';
            }
        });
    }, 100);
}

function showNotification(message, type) {
    // Remove existing notifications
    const existing = document.querySelector('.js-notification');
    if (existing) existing.remove();

    const notification = document.createElement('div');
    notification.className = `js-notification ${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 14px 20px;
        border-radius: 8px;
        font-size: 0.88rem;
        font-weight: 500;
        z-index: 9999;
        animation: fadeIn 0.3s ease;
        box-shadow: 0 4px 16px rgba(0,0,0,0.4);
    `;

    if (type === 'success') {
        notification.style.background = 'rgba(76, 175, 80, 0.2)';
        notification.style.color = '#76FF03';
        notification.style.border = '1px solid rgba(76, 175, 80, 0.4)';
    } else {
        notification.style.background = 'rgba(244, 67, 54, 0.2)';
        notification.style.color = '#ff6b6b';
        notification.style.border = '1px solid rgba(244, 67, 54, 0.4)';
    }

    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(20px)';
        notification.style.transition = 'all 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}
