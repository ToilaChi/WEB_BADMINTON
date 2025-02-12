document.addEventListener('DOMContentLoaded', function () {
    // Validation Rules
    const validators = {
        phone: {
            pattern: /^(0|\+84)[0-9]{9}$/,
            message: 'Số điện thoại không hợp lệ'
        },
        email: {
            pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
            message: 'Email không hợp lệ'
        },
        password: {
            pattern: /^(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9])(?=.*[!@#$%^&*]).{8,}$/,
            message: 'Mật khẩu phải có ít nhất 8 ký tự, bao gồm chữ hoa, chữ thường, số và ký tự đặc biệt'
        }
    };

    // Form Handlers
    const forms = {
        'login-form': handleLogin,
        'registration-form': handleRegistration,
        'forgot-password-form': handleForgotPassword,
        'reset-password-form': handleResetPassword
    };

    // Attach form submit handlers
    Object.keys(forms).forEach(formId => {
        const form = document.getElementById(formId);
        if (form) {
            form.addEventListener('submit', function (e) {
                e.preventDefault();
                forms[formId](this);
            });
        }
    });

    // Registration Form Handler
    async function handleRegistration(form) {
        const formData = new FormData(form);

        // Validate fields
        const phone = formData.get('phone');
        const email = formData.get('email');
        const password = formData.get('password');
        const password2 = formData.get('password2');

        // Reset error messages
        clearErrors(form);

        // Validation checks
        if (!validators.phone.pattern.test(phone)) {
            showError(form, 'phone', validators.phone.message);
            return;
        }

        if (!validators.email.pattern.test(email)) {
            showError(form, 'email', validators.email.message);
            return;
        }

        if (!validators.password.pattern.test(password)) {
            showError(form, 'password', validators.password.message);
            return;
        }

        if (password !== password2) {
            showError(form, 'password2', 'Mật khẩu không khớp');
            return;
        }

        try {
            const response = await fetch('/register/', {
                method: 'POST',
                body: formData,
                headers: {
                    'X-CSRFToken': getCsrfToken()
                }
            });

            const data = await response.json();

            if (response.ok) {
                showSuccess(form, data.message);
                setTimeout(() => {
                    window.location.href = '/login/';
                }, 2000);
            } else {
                showError(form, '', data.error);
            }
        } catch (error) {
            showError(form, '', 'Có lỗi xảy ra. Vui lòng thử lại sau.');
        }
    }

    // Login Form Handler
    async function handleLogin(form) {
        const formData = new FormData(form);

        try {
            const response = await fetch('/login/', {
                method: 'POST',
                body: formData,
                headers: {
                    'X-CSRFToken': getCsrfToken()
                }
            });

            const data = await response.json();

            if (response.ok) {
                window.location.href = '/';
            } else {
                showError(form, '', data.error);
            }
        } catch (error) {
            showError(form, '', 'Có lỗi xảy ra. Vui lòng thử lại sau.');
        }
    }

    // Forgot Password Handler
    async function handleForgotPassword(form) {
        const formData = new FormData(form);

        try {
            const response = await fetch('/forgot-password/', {
                method: 'POST',
                body: formData,
                headers: {
                    'X-CSRFToken': getCsrfToken()
                }
            });

            const data = await response.json();

            if (response.ok) {
                showSuccess(form, data.message);
            } else {
                showError(form, '', data.error);
            }
        } catch (error) {
            showError(form, '', 'Có lỗi xảy ra. Vui lòng thử lại sau.');
        }
    }

    // Reset Password Handler
    async function handleResetPassword(form) {
        const formData = new FormData(form);
        const password = formData.get('new_password');
        const confirmPassword = formData.get('confirm_password');
    
        // Reset error messages
        clearErrors(form);
    
        // Validate password match
        if (password !== confirmPassword) {
            showError(form, 'confirm_password', 'Mật khẩu không khớp');
            return;
        }
    
        // Validate password pattern
        if (!validators.password.pattern.test(password)) {
            showError(form, 'new_password', validators.password.message);
            return;
        }
    
        try {
            const response = await fetch(window.location.href, {
                method: 'POST',
                body: formData,
                headers: {
                    'X-CSRFToken': getCsrfToken()
                }
            });
    
            const data = await response.json();
            
            if (response.ok) {
                showSuccess(form, 'Đặt lại mật khẩu thành công');
                setTimeout(() => {
                    window.location.href = '/login/';
                }, 2000);
            } else {
                showError(form, '', data.error);
            }
        } catch (error) {
            showError(form, '', 'Có lỗi xảy ra. Vui lòng thử lại sau.');
        }
    }

    // Utility Functions
    function showError(form, field, message) {
        const errorElement = field ?
            form.querySelector(`#${field} + .error-message`) :
            form.querySelector('.error-message');

        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
        }
    }

    function showSuccess(form, message) {
        const successDiv = document.createElement('div');
        successDiv.className = 'success-message';
        successDiv.textContent = message;
        form.appendChild(successDiv);
    }

    function clearErrors(form) {
        form.querySelectorAll('.error-message').forEach(error => {
            error.textContent = '';
            error.style.display = 'none';
        });
    }

    function getCsrfToken() {
        return document.querySelector('[name=csrfmiddlewaretoken]').value;
    }
});