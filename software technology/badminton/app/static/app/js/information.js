document.addEventListener('DOMContentLoaded', function() {
    const profileForm = document.getElementById('profile-form');
    const passwordForm = document.getElementById('password-form');
    const changePasswordBtn = document.getElementById('change-password-btn');
    const cancelPasswordBtn = document.getElementById('cancel-password-change');
    const informationBtn = document.getElementById('information-btn');

    // Validators
    const validators = {
        phone: {
            pattern: /^0[0-9]{9,10}$/,
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

    // Toggle between information and password forms
    changePasswordBtn.addEventListener('click', function(e) {
        e.preventDefault();
        profileForm.style.display = 'none';
        passwordForm.style.display = 'block';
    });

    informationBtn.addEventListener('click', function(e) {
        e.preventDefault();
        passwordForm.style.display = 'none';
        profileForm.style.display = 'block';
    });

    cancelPasswordBtn.addEventListener('click', function() {
        profileForm.style.display = 'block';
        passwordForm.style.display = 'none';
        passwordForm.reset();
        clearErrors(passwordForm);
    });

    // Async function to check current password
    async function checkCurrentPassword(currentPassword) {
        try {
            const response = await fetch('/check-current-password/', {
                method: 'POST',
                body: JSON.stringify({ current_password: currentPassword }),
                headers: {
                    'X-CSRFToken': getCsrfToken(),
                    'Content-Type': 'application/json'
                }
            });
            return response.ok;
        } catch (error) {
            showError(passwordForm, '', 'Có lỗi xảy ra khi kiểm tra mật khẩu');
            return false;
        }
    }

    // Handle profile update
    profileForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        clearErrors(this);

        const formData = new FormData(this);
        
        const phone = formData.get('phone');
        const email = formData.get('email');

        if (!validators.phone.pattern.test(phone)) {
            showError(this, 'phone', validators.phone.message);
            return;
        }

        if (!validators.email.pattern.test(email)) {
            showError(this, 'email', validators.email.message);
            return;
        }

        try {
            const response = await fetch('/update-profile/', {
                method: 'POST',
                body: formData,
                headers: {
                    'X-CSRFToken': getCsrfToken()
                }
            });

            const data = await response.json();
            
            if (response.ok) {
                showSuccess(this, 'Cập nhật thông tin thành công');
            } else {
                showError(this, '', data.error);
            }
        } catch (error) {
            showError(this, '', 'Có lỗi xảy ra. Vui lòng thử lại sau.');
        }
    });

    // Handle password change
    passwordForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        clearErrors(this);

        const formData = new FormData(this);
        const currentPassword = formData.get('current_password');
        const newPassword = formData.get('new_password');
        const confirmPassword = formData.get('confirm_password');

        // Validate current password
        const isCurrentPasswordValid = await checkCurrentPassword(currentPassword);
        if (!isCurrentPasswordValid) {
            showError(this, 'current_password', 'Mật khẩu hiện tại không chính xác');
            return;
        }

        // Validate new password
        if (!validators.password.pattern.test(newPassword)) {
            showError(this, 'new_password', validators.password.message);
            return;
        }

        if (newPassword !== confirmPassword) {
            showError(this, 'confirm_password', 'Mật khẩu không khớp');
            return;
        }

        try {
            const response = await fetch('/change-password/', {
                method: 'POST',
                body: formData,
                headers: {
                    'X-CSRFToken': getCsrfToken()
                }
            });

            const data = await response.json();
            
            if (response.ok) {
                showSuccess(this, 'Đổi mật khẩu thành công');
                this.reset();
                setTimeout(() => {
                    profileForm.style.display = 'block';
                    passwordForm.style.display = 'none';
                }, 2000);
            } else {
                showError(this, '', data.error);
            }
        } catch (error) {
            showError(this, '', 'Có lỗi xảy ra. Vui lòng thử lại sau.');
        }
    });

    // Utility functions
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
        const successDiv = form.parentElement.querySelector('.success-message');
        if (successDiv) {
            successDiv.textContent = message;
            successDiv.style.display = 'block';
            setTimeout(() => {
                successDiv.style.display = 'none';
            }, 3000);
        }
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