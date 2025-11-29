// DOM Elements
const form = document.getElementById('resetPasswordForm');
const newPasswordInput = document.getElementById('newPassword');
const confirmPasswordInput = document.getElementById('confirmPassword');
const submitBtn = document.getElementById('submitBtn');
const alertBox = document.getElementById('alert');
const loadingSection = document.getElementById('loadingSection');
const errorSection = document.getElementById('errorSection');
const formSection = document.getElementById('formSection');
const successSection = document.getElementById('successSection');
const greetingTitle = document.getElementById('greetingTitle');

// Get token from URL
const urlParams = new URLSearchParams(window.location.search);
const token = urlParams.get('token');

/**
 * Validates the reset token with the backend
 */
async function validateToken() {
    if (!token) {
        showError('Token de recuperación no válido. Por favor usa el enlace que recibiste en tu correo electrónico.');
        return;
    }

    try {
        const response = await fetch(`/api/auth/validate-reset-token?token=${encodeURIComponent(token)}`);
        const data = await response.json();

        if (response.ok && data.status === 'success' && data.data.valid) {
            // Token is valid - show form with personalized greeting
            loadingSection.classList.remove('show');
            formSection.style.display = 'block';
            
            if (data.data.user && data.data.user.name) {
                greetingTitle.textContent = `¡Hola ${data.data.user.name}! Crea tu Nueva Contraseña`;
            }
        } else {
            showError('El enlace de recuperación ha expirado o no es válido. Por favor solicita uno nuevo desde la aplicación móvil.');
        }
    } catch (error) {
        console.error('Error validating token:', error);
        showError('Error de conexión. Por favor verifica tu conexión a internet e intenta nuevamente.');
    }
}

/**
 * Shows error section with message
 */
function showError(message) {
    loadingSection.classList.remove('show');
    errorSection.classList.add('show');
    document.getElementById('errorMessage').textContent = message;
}

/**
 * Shows alert message
 */
function showAlert(message, type) {
    alertBox.textContent = message;
    alertBox.className = `alert alert-${type} show`;
    
    if (type === 'success') {
        setTimeout(() => {
            alertBox.classList.remove('show');
        }, 3000);
    }
}

/**
 * Sets loading state for submit button
 */
function setLoading(loading) {
    if (loading) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="loading"></span>Actualizando...';
    } else {
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Restablecer Contraseña';
    }
}

/**
 * Checks password strength and updates UI
 */
function checkPasswordStrength(password) {
    const strengthFill = document.getElementById('strengthFill');
    const strengthText = document.getElementById('strengthText');
    
    if (password.length === 0) {
        strengthFill.className = 'strength-fill';
        strengthText.textContent = '';
        return;
    }

    let strength = 0;
    if (password.length >= 6) strength++;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;

    if (strength <= 2) {
        strengthFill.className = 'strength-fill strength-weak';
        strengthText.textContent = 'Débil';
        strengthText.style.color = '#ef4444';
    } else if (strength <= 3) {
        strengthFill.className = 'strength-fill strength-medium';
        strengthText.textContent = 'Media';
        strengthText.style.color = '#f59e0b';
    } else {
        strengthFill.className = 'strength-fill strength-strong';
        strengthText.textContent = 'Fuerte';
        strengthText.style.color = '#10b981';
    }
}

/**
 * Validates password requirements
 */
function validateRequirements() {
    const password = newPasswordInput.value;
    const confirm = confirmPasswordInput.value;

    // Length requirement
    const lengthReq = document.getElementById('req-length');
    if (password.length >= 6) {
        lengthReq.className = 'valid';
    } else {
        lengthReq.className = 'invalid';
    }

    // Match requirement
    const matchReq = document.getElementById('req-match');
    if (password && confirm && password === confirm) {
        matchReq.className = 'valid';
    } else {
        matchReq.className = 'invalid';
    }
}

/**
 * Handles password reset form submission
 */
async function handleFormSubmit(e) {
    e.preventDefault();
    
    const newPassword = newPasswordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    // Validations
    if (newPassword.length < 6) {
        showAlert('❌ La contraseña debe tener al menos 6 caracteres', 'error');
        return;
    }

    if (newPassword !== confirmPassword) {
        showAlert('❌ Las contraseñas no coinciden', 'error');
        return;
    }

    setLoading(true);

    try {
        const response = await fetch('/api/auth/reset-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                token,
                newPassword 
            }),
        });

        const data = await response.json();

        if (response.ok && data.status === 'success') {
            // Show success section
            formSection.style.display = 'none';
            successSection.classList.add('show');
        } else {
            let errorMessage = data.message || 'Error al restablecer la contraseña';
            
            if (errorMessage.includes('expired') || errorMessage.includes('Invalid')) {
                errorMessage = '❌ El enlace ha expirado o no es válido. Por favor solicita uno nuevo desde la aplicación móvil.';
            }
            
            showAlert(errorMessage, 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showAlert(
            '❌ Error de conexión. Por favor verifica tu conexión a internet e intenta nuevamente.',
            'error'
        );
    } finally {
        setLoading(false);
    }
}

/**
 * Initializes event listeners
 */
function initializeEventListeners() {
    // Toggle password visibility
    document.querySelectorAll('.toggle-password').forEach(button => {
        button.addEventListener('click', () => {
            const targetId = button.dataset.target;
            const input = document.getElementById(targetId);
            
            if (input.type === 'password') {
                input.type = 'text';
                button.textContent = '🙈';
            } else {
                input.type = 'password';
                button.textContent = '👁️';
            }
        });
    });

    // Real-time validation
    newPasswordInput.addEventListener('input', () => {
        checkPasswordStrength(newPasswordInput.value);
        validateRequirements();
    });

    confirmPasswordInput.addEventListener('input', validateRequirements);

    // Form submission
    form.addEventListener('submit', handleFormSubmit);
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    initializeEventListeners();
    validateToken();
});
