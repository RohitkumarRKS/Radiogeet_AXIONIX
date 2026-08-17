/* =========================================
   Auth Pages JavaScript (Login + Signup)
   ========================================= */

document.addEventListener('DOMContentLoaded', function() {
    // Password toggle visibility
    initPasswordToggles();

    // Form validation
    initFormValidation();
});

function initPasswordToggles() {
    document.querySelectorAll('.password-toggle').forEach(btn => {
        btn.addEventListener('click', function() {
            const input = this.parentElement.querySelector('input');
            const isPassword = input.type === 'password';
            input.type = isPassword ? 'text' : 'password';
            
            // Toggle icon
            this.innerHTML = isPassword
                ? `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                     <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                     <line x1="1" y1="1" x2="23" y2="23"/>
                   </svg>`
                : `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                     <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                     <circle cx="12" cy="12" r="3"/>
                   </svg>`;
        });
    });
}

function initFormValidation() {
    const signupForm = document.getElementById('signup-form');
    if (signupForm) {
        signupForm.addEventListener('submit', function(e) {
            const password = document.getElementById('id_password');
            const confirmPassword = document.getElementById('id_confirm_password');
            const agreeTerms = document.getElementById('id_agree_terms');

            // Password match check
            if (password && confirmPassword && password.value !== confirmPassword.value) {
                e.preventDefault();
                showAuthNotification('Passwords do not match!', 'error');
                confirmPassword.focus();
                return false;
            }

            // Password strength check
            if (password && password.value.length < 8) {
                e.preventDefault();
                showAuthNotification('Password must be at least 8 characters long.', 'error');
                password.focus();
                return false;
            }

            // Terms check
            if (agreeTerms && !agreeTerms.checked) {
                e.preventDefault();
                showAuthNotification('Please agree to the Terms & Conditions.', 'error');
                return false;
            }
        });
    }

    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            const username = document.getElementById('id_username_email');
            const password = document.getElementById('id_login_password');

            if (!username.value.trim()) {
                e.preventDefault();
                showAuthNotification('Please enter your username or email.', 'error');
                username.focus();
                return false;
            }

            if (!password.value.trim()) {
                e.preventDefault();
                showAuthNotification('Please enter your password.', 'error');
                password.focus();
                return false;
            }
        });
    }
}

function showAuthNotification(message, type) {
    const existing = document.querySelector('.auth-notification');
    if (existing) existing.remove();

    const notification = document.createElement('div');
    notification.className = `auth-notification ${type}`;
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
        font-family: 'Inter', sans-serif;
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
