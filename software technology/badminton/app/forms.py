from django import forms
from django.contrib.auth import get_user_model
from django.core.validators import RegexValidator
from .authentication import validate_password 

User = get_user_model()

class LoginForm(forms.Form):
    phone = forms.CharField(
        max_length=11,
        validators=[
            RegexValidator(
                regex=r'^(0|\+84)[0-9]{9}$',
                message='Số điện thoại không hợp lệ'
            )
        ],
        widget=forms.TextInput(attrs={
            'class': 'form-control',
            'placeholder': 'Số điện thoại'
        })
    )
    password = forms.CharField(
        widget=forms.PasswordInput(attrs={
            'class': 'form-control',
            'placeholder': 'Mật khẩu'
        })
    )

class RegisterForm(forms.ModelForm):
    name = forms.CharField(
        max_length=100,
        widget=forms.TextInput(attrs={
            'class': 'form-control',
            'placeholder': 'Họ và tên'
        })
    )
    phone = forms.CharField(
        max_length=11,
        validators=[
            RegexValidator(
                regex=r'^(0|\+84)[0-9]{9}$',
                message='Số điện thoại không hợp lệ'
            )
        ],
        widget=forms.TextInput(attrs={
            'class': 'form-control',
            'placeholder': 'Số điện thoại'
        })
    )
    email = forms.EmailField(
        widget=forms.EmailInput(attrs={
            'class': 'form-control',
            'placeholder': 'Email'
        })
    )
    password = forms.CharField(
        widget=forms.PasswordInput(attrs={
            'class': 'form-control',
            'placeholder': 'Mật khẩu'
        })
    )
    password2 = forms.CharField(
        widget=forms.PasswordInput(attrs={
            'class': 'form-control',
            'placeholder': 'Xác nhận mật khẩu'
        })
    )

    class Meta:
        model = User
        fields = ('name', 'phone', 'email', 'password')

    def clean_phone(self):
        phone = self.cleaned_data.get('phone')
        if User.objects.filter(phone=phone).exists():
            raise forms.ValidationError('Số điện thoại đã được sử dụng')
        return phone

    def clean_email(self):
        email = self.cleaned_data.get('email')
        if User.objects.filter(email=email).exists():
            raise forms.ValidationError('Email đã được sử dụng')
        return email

    def clean_password(self):
        password = self.cleaned_data.get('password')
        is_valid, error_message = validate_password(password)
        if not is_valid:
            raise forms.ValidationError(error_message)
        return password

    def clean(self):
        cleaned_data = super().clean()
        password = cleaned_data.get('password')
        password2 = cleaned_data.get('password2')
        if password and password2 and password != password2:
            raise forms.ValidationError('Mật khẩu không khớp')
        return cleaned_data

    def save(self, commit=True):
        user = super().save(commit=False)
        user.username = self.cleaned_data['phone']  # Sử dụng phone làm username
        user.set_password(self.cleaned_data['password'])
        user.role = 'customer'  # Set default role
        user.is_active = False  # Người dùng cần xác thực email
        if commit:
            user.save()
        return user