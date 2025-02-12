const registrationForm = document.querySelector('form');  
const registrationFormId = registrationForm.getAttribute('id');  

// Các trường nhập liệu chung (cả login và register)  
const registrationPhone = document.getElementById('phone');  
const registrationPassword = document.getElementById('password');  

// Các trường chỉ có trong register form  
const registrationEmail = document.getElementById('email');  
const registrationPassword2 = document.getElementById('password2');  

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
    showError(input, 'Số điện thoại phải chứa 11 chữ số');  
  }  
}  

// Kiểm tra trường bắt buộc  
function checkRequired(inputArr) {  
  let isRequired = false;  
  inputArr.forEach(function (input) {  
    if (input && input.value.trim() === '') {  
      showError(input, `${input.placeholder} là bắt buộc`);  
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
      `${input.placeholder} phải có ít nhất ${min} ký tự`  
    );  
  } else if (input.value.length > max) {  
    showError(  
      input,  
      `${input.placeholder} phải ít hơn ${max} ký tự`  
    );  
  } else {  
    showSuccess(input);  
  }  
}  

// Kiểm tra mật khẩu khớp  
function checkPasswordsMatch(input1, input2) {  
  if (input1.value !== input2.value) {  
    showError(input2, 'Mật khẩu không khớp');  
  }  
}  

// Lắng nghe sự kiện submit  
registrationForm.addEventListener('submit', function (e) {  
  e.preventDefault();  

  // Với đăng ký form  
  if (registrationFormId === 'register-form') {  
    if (!checkRequired([registrationPhone, registrationEmail, registrationPassword, registrationPassword2])) {  
      checkPhone(registrationPhone);  
      checkLength(registrationPassword, 6, 25);  
      checkPasswordsMatch(registrationPassword, registrationPassword2);  
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