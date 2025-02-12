const form = document.querySelector('form');
const formId = form.getAttribute('id');

// Các trường nhập liệu chung (cả login và register)
const phone = document.getElementById('phone');
const password = document.getElementById('password');

// Các trường chỉ có trong register form
const email = document.getElementById('email');
const password2 = document.getElementById('password2');

// Hiển thị lỗi
function showError(input, message) {
  const formControl = input.parentElement;
  formControl.className = 'form-control error';
  const small = formControl.querySelector('small');
  small.innerText = message;
}

// Hiển thị thành công
function showSuccess(input) {
  const formControl = input.parentElement;
  formControl.className = 'form-control success';
  const small = formControl.querySelector('small');
  small.innerText = '';
}

// Kiểm tra số điện thoại hợp lệ
function checkPhone(input) {
  const phoneRe = /^[0-9]{11}$/; // Số điện thoại phải chứa đúng 11 chữ số
  if (phoneRe.test(input.value.trim())) {
    showSuccess(input);
  } else {
    showError(input, 'Phone number must be 11 digits');
  }
}

// Kiểm tra trường bắt buộc
function checkRequired(inputArr) {
  let isRequired = false;
  inputArr.forEach(function (input) {
    if (input && input.value.trim() === '') {
      showError(input, `${input.placeholder} is required`);
      isRequired = true;
    } else {
      showSuccess(input);
    }
  });

  return isRequired;
}

// Kiểm tra độ dài
function checkLength(input, min, max) {
  if (input.value.length < min) {
    showError(
      input,
      `${input.placeholder} must be at least ${min} characters`
    );
  } else if (input.value.length > max) {
    showError(
      input,
      `${input.placeholder} must be less than ${max} characters`
    );
  } else {
    showSuccess(input);
  }
}

// Kiểm tra mật khẩu khớp
function checkPasswordsMatch(input1, input2) {
  if (input1.value !== input2.value) {
    showError(input2, 'Passwords do not match');
  }
}

// Lắng nghe sự kiện submit
form.addEventListener('submit', function (e) {
  e.preventDefault();

  // Với login form
  if (formId === 'login-form') {
    if (!checkRequired([phone, password])) {
      checkPhone(phone);
    }
  }

  // Với register form
  if (formId === 'register-form') {
    if (!checkRequired([phone, email, password, password2])) {
      checkPhone(phone);
      checkLength(password, 6, 25);
      checkPasswordsMatch(password, password2);
    }
  }
});

// Lắng nghe sự kiện focus (khi người dùng click vào ô input)
const inputs = document.querySelectorAll('input'); // Chọn tất cả input fields

inputs.forEach(input => {
  input.addEventListener('focus', function () {
    const formControl = input.parentElement;
    formControl.className = 'form-control'; // Gỡ bỏ class error hoặc success
    const small = formControl.querySelector('small');
    small.innerText = ''; // Xóa thông báo lỗi
  });
});
