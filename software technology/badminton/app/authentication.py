from django.contrib.auth.backends import ModelBackend
from django.contrib.auth import get_user_model
from django.core.mail import send_mail
from django.conf import settings
from django.contrib.auth.tokens import default_token_generator
from django.utils.crypto import get_random_string
import re

User = get_user_model()

class CustomBackend(ModelBackend):
  def authenticate(self, request, phone=None, password=None, **kwargs):
    try:
      user = User.objects.get(phone=phone)
      if user.check_password(password):
        return user
    except User.DoesNotExist:
      return None
  
  def get_user(self, user_id):
    try:
      return User.objects.get(pk=user_id)
    except User.DoesNotExist:
      return None
    
def send_verification_email(user):
  verification_token = default_token_generator.make_token(user)
  verification_url = f"{settings.SITE_URL}/verify-email/{user.id}/{verification_token}/"

  subject = "Xác nhận đăng ký tài khoản"
  message = f'''
  Xin chào {user.get_full_name()},

  Cảm ơn các bạn đã đăng ký tài khoản. Vui lòng click vào link sau để xác nhận email: {verification_url}

  Link này sẽ hết hạn sau 24h.
  '''

  send_mail(
    subject,
    message,
    settings.DEFAULT_FROM_EMAIL,
    [user.email],
    fail_silently=False
  )

def validate_password(password):
  if password is None:
    return False, "Mật khẩu không được để trống"
  if len(password) < 8:
    return False, "Mật khẩu phải có ít nhất 8 ký tự"
  if not re.search("[A-Z]", password):
    return False, "Mật khẩu phải có ít nhất 1 ký tự viết hoa"
  if not re.search("[a-z]", password):
    return False, "Mật khẩu phải có ít nhất 1 ký tự viết thường"
  if not re.search("[0-9]", password):
    return False, "Mật khẩu phải có ít nhất 1 chữ số"
  if not re.search("[!@#$%^&*]", password):
    return False, "Mật khẩu phải có ít nhất 1 ký tự đặc biệt"
  return True, "Mật khẩu hợp lệ"

def validate_phone(phone):
  if not re.match(r'^0[0-9]{9,10}$', phone):
    return False, "Số điện thoại không hợp lệ"
  if User.objects.filter(phone=phone).exists():
    return False, "Số điện thoại đã được sử dụng"
  return True, "Số điện thoại hợp lệ"

def validate_email(email):
  if User.objects.filter(email=email).exists():
    return False, "Email đã được sử dụng"
  return True, "Email hợp lệ"

class LoginAttemptTracker:
    def __init__(self):
        self.attempts = {}
        self.locked_accounts = set()
  
    def add_attempt(self, phone):
        if phone in self.attempts:
            self.attempts[phone] += 1

            if self.attempts[phone] >= 3:
              self.locked_accounts.add(phone)
        else:
            self.attempts[phone] = 1
        return self.attempts[phone]
  
    def reset_attempts(self, phone):
        if phone in self.attempts:
          del self.attempts[phone]
        
        if phone in self.locked_accounts:
          self.locked_accounts.remove(phone)
            
    def get_attempts(self, phone):
        return self.attempts.get(phone, 0)
    
    def is_locked(self, phone):
        return phone in self.locked_accounts