from django.shortcuts import redirect
from django.urls import resolve, reverse
from django.contrib import messages

class RoleMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response
        # Các URL cho phép truy cập không cần đăng nhập
        self.public_urls = [
            'login',
            'register',
            'home',
            'verify_email',
            'forgot_password',
            'reset_password',
            'court_schedule_view'
        ]

    def __call__(self, request):
        # Lấy tên URL hiện tại
        current_url_name = resolve(request.path_info).url_name

        # Cho phép truy cập static files
        if request.path.startswith('/static/'):
            return self.get_response(request)

        # Kiểm tra nếu URL là public
        if current_url_name in self.public_urls:
            return self.get_response(request)

        # Kiểm tra user đã đăng nhập chưa
        if not request.user.is_authenticated:
            messages.warning(request, 'Vui lòng đăng nhập để tiếp tục.')
            return redirect('login')

        # Kiểm tra quyền truy cập theo role
        if request.user.role == 'guest':
            # Guest chỉ được xem thông tin sân
            if current_url_name not in ['court_schedule_view', 'home']:
                messages.warning(request, 'Bạn cần đăng ký tài khoản để sử dụng tính năng này.')
                return redirect('register')

        return self.get_response(request)