import json
from django.shortcuts import render, redirect, get_object_or_404
from django.http import HttpResponse, JsonResponse
from datetime import datetime, date, timedelta
from django.db.models import Q, Prefetch
from app.models import Court, TimeSlot, Booking, BookingGroup, FixedSchedule, User, Payment, CourtTimeSlot
from django.contrib.auth import get_user_model
from django.contrib.auth import login, logout, authenticate, update_session_auth_hash
from django.contrib.auth.decorators import login_required, user_passes_test
from .authentication import (
    send_verification_email, validate_email, validate_password, validate_phone, LoginAttemptTracker
)
from django.contrib.auth.tokens import default_token_generator
from django.conf import settings
from django.core.mail import send_mail
from django.contrib import messages
from .forms import LoginForm, RegisterForm
from django.middleware.csrf import get_token
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt
from django.template.loader import render_to_string

User = get_user_model()
login_tracker = LoginAttemptTracker()

def home(request):
    return render(request,'app/home.html')
def base(request):
    return render(request,'app/base.html')
def court(request):
    return render(request,'app/court.html')
def instructions(request):
    return render(request,'app/instructions.html')
def payment(request):
    return render(request,'app/payment.html')    
def courtoption2(request):
    return render(request,'app/courtoption2.html')  
def banking(request):
    return render(request,'app/banking.html') 
def bookingcourt(request):
    return render(request,'app/bookingcourt.html') 
def information(request):
    return render(request,'app/information.html') 
def history(request):
    return render(request,'app/history.html') 

def is_guest(user):
    return user.is_anonymous or user.role == 'guest'

def is_customer(user):
    return user.is_authenticated and user.role == 'customer'

def register_view(request):
    if request.method == 'POST':
        form = RegisterForm(request.POST)
        if form.is_valid():
            user = form.save()
            send_verification_email(user)
            messages.success(request, 'Đăng ký thành công. Vui lòng kiểm tra email để xác thực tài khoản.')
            return redirect('login')
    else:
        form = RegisterForm()
    
    return render(request, 'app/register.html', {'form': form})

def login_view(request):
    if request.method == 'POST':
        form = LoginForm(request.POST)
        if form.is_valid():
            phone = form.cleaned_data['phone']
            password = form.cleaned_data['password']
            
            # Kiểm tra xem tài khoản có bị khóa không
            if login_tracker.is_locked(phone):  
                messages.error(request, 'Tài khoản đã bị khóa. Vui lòng sử dụng chức năng quên mật khẩu.')
                return redirect('forgot_password')

            user = authenticate(request, username=phone, password=password)
            
            if user is not None:
                if user.is_active:
                    login(request, user)
                    login_tracker.reset_attempts(phone) 
                    
                    # Kiểm tra quyền truy cập vào Admin
                    if user.is_staff:
                        return redirect('admin:index')  # Chuyển hướng đến Admin
                    else:
                        return redirect('home')  # Chuyển hướng đến trang chính
                else:
                    messages.error(request, 'Tài khoản chưa được xác thực. Vui lòng kiểm tra email.')
            else:
                # Tăng số lần thử khi đăng nhập thất bại
                attempts = login_tracker.add_attempt(phone)
                remaining_attempts = 3 - attempts
                if remaining_attempts > 0:
                    messages.error(request, f'Mật khẩu không chính xác. Còn {remaining_attempts} lần thử.')
                else:
                    messages.error(request, 'Tài khoản đã bị khóa. Vui lòng sử dụng chức năng quên mật khẩu.')
                    return redirect('forgot_password')
    else:
        form = LoginForm()
    
    return render(request, 'app/login.html', {'form': form})

@login_required
def logout_view(request):
    logout(request)
    messages.success(request, 'Đăng xuất thành công.')
    return redirect('home')

def verify_email(request, user_id, token):
    try:
        user = User.objects.get(pk=user_id) 
        if default_token_generator.check_token(user, token):
            user.is_active = True
            user.save()
            return render(request, 'app/verify_success.html')
        else:
            return render(request, 'app/verify_failed.html')
    except User.DoesNotExist:
        return render(request, 'app/verify_failed.html')  
    
@require_http_methods(["GET", "POST"])
def forgot_password(request):
    if request.method == 'POST':
        email = request.POST.get('email')
        if not email:
            return JsonResponse({'error': 'Vui lòng nhập email'}, status=400)
        
        try:
            user = User.objects.get(email=email)
            # Generate password reset token
            token = default_token_generator.make_token(user)
            reset_url = f"{settings.SITE_URL}/reset-password/{user.id}/{token}/"
            
            # Send email
            try:
                send_mail(
                    'Đặt lại mật khẩu',
                    f'Click vào link sau để đặt lại mật khẩu: {reset_url}',
                    settings.DEFAULT_FROM_EMAIL,
                    [email],
                    fail_silently=False,
                )
                return JsonResponse({
                    'message': 'Email đặt lại mật khẩu đã được gửi. Vui lòng kiểm tra hộp thư của bạn.'
                })
            except Exception as e:
                return JsonResponse({
                    'error': 'Không thể gửi email. Vui lòng thử lại sau.'
                }, status=500)
                
        except User.DoesNotExist:
            return JsonResponse({
                'error': 'Email không tồn tại trong hệ thống.'
            }, status=400)
            
    return render(request, 'app/forgot_password.html')

def reset_password(request, user_id, token):
    try:
        user = User.objects.get(pk=user_id)
        if not default_token_generator.check_token(user, token):
            return render(request, 'app/reset_password_failed.html')
            
        if request.method == 'POST':
            password = request.POST.get('new_password')
            confirm_password = request.POST.get('confirm_password')
            
            if not password:
                return JsonResponse({'error': 'Mật khẩu không được để trống'}, status=400)
            
            if password != confirm_password:
                return JsonResponse({'error': 'Mật khẩu không khớp'}, status=400)
            
            is_valid_password, password_error = validate_password(password)
            if not is_valid_password:
                return JsonResponse({'error': password_error}, status=400)
            
            login_tracker.reset_attempts(user.phone)
            
            user.set_password(password)
            user.save()
            return JsonResponse({'message': 'Đặt lại mật khẩu thành công'})
            
        return render(request, 'app/reset_password.html')
        
    except User.DoesNotExist:
        return render(request, 'app/reset_password_failed.html')

@login_required
def profile_view(request):
    return render(request, 'app/information.html')

@login_required
def update_profile(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)
    
    user = request.user
    name = request.POST.get('name')
    email = request.POST.get('email')
    phone = request.POST.get('phone')

    # Validate email uniqueness
    if User.objects.exclude(pk=user.pk).filter(email=email).exists():
        return JsonResponse({'error': 'Email đã được sử dụng'}, status=400)

    # Validate phone uniqueness
    if User.objects.exclude(pk=user.pk).filter(phone=phone).exists():
        return JsonResponse({'error': 'Số điện thoại đã được sử dụng'}, status=400)

    try:
        user.name = name
        user.email = email
        user.phone = phone
        user.save()
        return JsonResponse({'message': 'Cập nhật thông tin thành công'})
    except Exception as e:
        return JsonResponse({'error': 'Có lỗi xảy ra. Vui lòng thử lại sau.'}, status=500)

@login_required
def check_current_password(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        current_password = data.get('current_password')
        
        if request.user.check_password(current_password):
            return JsonResponse({'status': 'success'})
        else:
            return JsonResponse({'status': 'error'}, status=400)

@login_required
def change_password(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)

    user = request.user
    current_password = request.POST.get('current_password')
    new_password = request.POST.get('new_password')

    if not user.check_password(current_password):
        return JsonResponse({'error': 'Mật khẩu hiện tại không đúng'}, status=400)

    # Validate new password
    is_valid_password, password_error = validate_password(new_password)
    if not is_valid_password:
        return JsonResponse({'error': password_error}, status=400)

    try:
        user.set_password(new_password)
        user.save()
        update_session_auth_hash(request, user)  # Giữ người dùng đăng nhập
        return JsonResponse({'message': 'Đổi mật khẩu thành công'})
    except Exception as e:
        return JsonResponse({'error': 'Có lỗi xảy ra. Vui lòng thử lại sau.'}, status=500)

def court_schedule_view(request):
    selected_date = request.GET.get('date', date.today().strftime('%Y-%m-%d'))
    selected_date = datetime.strptime(selected_date, '%Y-%m-%d').date()
    weekday = selected_date.weekday()

    # Lấy active courts
    courts = Court.objects.filter(is_active=True)
    
    # Chỉ lấy time slots loại regular
    regular_time_slots = TimeSlot.objects.filter(
        is_active=True, 
        slot_type='regular'
    ).order_by('start_time')

    # Lấy tất cả fixed bookings
    fixed_bookings = Booking.objects.filter(
        booking_group__booking_type='fixed',
        booking_group__is_paid=True,
        booking_group__fixedschedule__weekday=weekday,
        booking_group__fixedschedule__start_date__lte=selected_date,
        booking_group__fixedschedule__end_date__gte=selected_date
    ).select_related('time_slot', 'court')

    # Lấy single bookings
    single_bookings = Booking.objects.filter(
        booking_group__booking_date=selected_date,
        booking_group__booking_type='single',
        booking_group__is_paid=True
    ).select_related('time_slot', 'court')

    court_schedule = []
    for court in courts:
        court_slots = []
        for time_slot in regular_time_slots:
            # Kiểm tra xem single có match với fixed không
            is_booked_fixed = any(
                booking.court_id == court.id and 
                booking.time_slot.start_time == time_slot.start_time and
                booking.time_slot.end_time == time_slot.end_time
                for booking in fixed_bookings
            )

            # Kiểm tra xem khung giờ đã được đặt bởi single booking chưa
            is_booked_single = any(
                booking.court_id == court.id and 
                booking.time_slot_id == time_slot.id
                for booking in single_bookings
            )

            slot_info = {
                'time_slot': time_slot,
                'is_booked': is_booked_fixed or is_booked_single,
                'status': 'booked' if (is_booked_fixed or is_booked_single) else 'empty',
                'price': time_slot.price
            }
            court_slots.append(slot_info)

        court_schedule.append({
            'court': court,
            'slots': court_slots
        })

    context = {
        'court_schedule': court_schedule,
        'time_slots': regular_time_slots,
        'selected_date': selected_date,
    }

    return render(request, 'app/court.html', context)

def courtoption2(request):
    courts = Court.objects.filter(is_active=True)
    # Chỉ lấy time slots loại fixed
    time_slots = TimeSlot.objects.filter(
        is_active=True,
        slot_type='fixed'
    ).order_by('start_time')
    weekdays = [
        {'value': i, 'label': label} for i, label in FixedSchedule.WEEKDAYS #Use choices from model
    ]

    court_schedule = []
    for court in courts:
        court_slots = []
        for time_slot in time_slots:
          court_slots.append({
              'time_slot' : time_slot
          })
        court_schedule.append({
            'court': court,
            'slots' : court_slots
        })

    context = {
        'court_schedule': court_schedule,
        'time_slots': time_slots,
        'weekdays': weekdays,
    }

    return render(request, 'app/courtoption2.html', context)

@csrf_exempt
@login_required
def create_single_booking(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)
    
    try:
        data = json.loads(request.body)
        selected_date = datetime.strptime(data['date'], '%Y-%m-%d').date()
        
        # Create booking group
        booking_group = BookingGroup.objects.create(
            customer=request.user,
            booking_date=selected_date,
            booking_type='single',
            total_price=data['total_price'],
            is_paid=False
        )
        
        # Create individual bookings
        for slot in data['slots']:
            court = Court.objects.get(id=slot['court_id'])
            time_slot = TimeSlot.objects.get(id=slot['time_slot_id'])
            
            # Validate availability again before creating booking
            if Booking.objects.filter(
                court=court,
                time_slot=time_slot,
                booking_group__booking_date=selected_date,
                booking_group__is_paid=True
            ).exists():
                raise ValueError(f"Court {court.name} is already booked for {time_slot}")
            
            Booking.objects.create(
                booking_group=booking_group,
                court=court,
                time_slot=time_slot
            )
        
        # Create payment record
        Payment.objects.create(
            booking_group=booking_group,
            payment_method=data.get('payment_method', 'bank_transfer'),
            amount=data['total_price'],
            payment_status='pending'
        )
        
        return JsonResponse({
            'success': True,
            'booking_group_id': booking_group.id
        })
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)

@csrf_exempt
@login_required
def create_fixed_booking(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)
    
    try:
        data = json.loads(request.body)
        start_date = datetime.strptime(data['start_date'], '%Y-%m-%d').date()
        end_date = datetime.strptime(data['end_date'], '%Y-%m-%d').date()
        
        # Create booking group
        booking_group = BookingGroup.objects.create(
            customer=request.user,
            booking_date=start_date,  # Use start_date as booking_date
            booking_type='fixed',
            total_price=data['total_price'],
            is_paid=False
        )
        
        # Create fixed schedule
        fixed_schedule = FixedSchedule.objects.create(
            booking_group=booking_group,
            start_date=start_date,
            end_date=end_date,
            weekday=data['weekday']
        )
        
        # Create bookings for the fixed schedule
        for slot in data['slots']:
            court = Court.objects.get(id=slot['court_id'])
            time_slot = TimeSlot.objects.get(id=slot['time_slot_id'])
            
            Booking.objects.create(
                booking_group=booking_group,
                court=court,
                time_slot=time_slot
            )
        
        # Create payment record
        Payment.objects.create(
            booking_group=booking_group,
            payment_method=data.get('payment_method', 'bank_transfer'),
            amount=data['total_price'],
            payment_status='pending'
        )
        
        return JsonResponse({
            'success': True,
            'booking_group_id': booking_group.id
        })
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)

@csrf_exempt
@login_required
def confirm_payment(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)
    
    try:
        data = json.loads(request.body)
        booking_group = get_object_or_404(BookingGroup, id=data['booking_group_id'])
        
        # Verify that the booking belongs to the current user
        if booking_group.customer != request.user:
            return JsonResponse({'error': 'Unauthorized'}, status=403)
        
        payment = get_object_or_404(Payment, booking_group=booking_group)
        
        # Update payment status
        payment.payment_status = 'completed'
        payment.transaction_id = data.get('transaction_id')
        payment.paid_at = datetime.now()
        payment.save()
        
        # Update booking group
        booking_group.is_paid = True
        booking_group.save()
        
        # Send confirmation email
        send_booking_confirmation_email(booking_group)
        
        return JsonResponse({'success': True})
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)

def send_booking_confirmation_email(booking_group):
    subject = 'Xác nhận đặt sân thành công'
    
    # Prepare booking details
    booking_details = []
    for booking in booking_group.bookings.all():
        detail = {
            'court_name': booking.court.name,
            'time': f"{booking.time_slot.start_time} - {booking.time_slot.end_time}"
        }
        booking_details.append(detail)
    
    # Additional details for fixed bookings
    fixed_schedule = None
    if booking_group.booking_type == 'fixed':
        fixed_schedule = FixedSchedule.objects.get(booking_group=booking_group)
    
    context = {
        'customer_name': booking_group.customer.name,
        'booking_type': 'Đặt sân cố định' if booking_group.booking_type == 'fixed' else 'Đặt sân theo ngày',
        'booking_date': booking_group.booking_date,
        'booking_details': booking_details,
        'total_price': booking_group.total_price,
        'payment_method': booking_group.payment.get_payment_method_display(),
        'transaction_id': booking_group.payment.transaction_id,
        'fixed_schedule': {
            'start_date': fixed_schedule.start_date,
            'end_date': fixed_schedule.end_date,
            'weekday': dict(FixedSchedule.WEEKDAYS)[fixed_schedule.weekday]
        } if fixed_schedule else None
    }
    
    # Render email templates
    html_content = render_to_string('email/booking_confirmation.html', context)
    text_content = render_to_string('email/booking_confirmation.txt', context)
    
    # Send email
    send_mail(
        subject=subject,
        message=text_content,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[booking_group.customer.email],
        html_message=html_content,
        fail_silently=False
    )

@require_http_methods(["POST"])
def check_availability(request):
    data = json.loads(request.body)
    court_id = data.get('court_id')
    time_slot_id = data.get('time_slot_id')
    booking_date = data.get('date')
    booking_type = data.get('booking_type', 'single')
    
    if booking_type == 'single':
        conflicts = Booking.objects.filter(
            court_id=court_id,
            time_slot_id=time_slot_id,
            booking_group__booking_date=booking_date,
            booking_group__is_paid=True
        ).exists()
        
        fixed_conflicts = FixedSchedule.objects.filter(
            booking_group__bookings__court_id=court_id,
            booking_group__bookings__time_slot_id=time_slot_id,
            start_date__lte=booking_date,
            end_date__gte=booking_date,
            weekday=datetime.strptime(booking_date, '%Y-%m-%d').weekday(),
            booking_group__is_paid=True
        ).exists()
        
        return JsonResponse({
            'available': not (conflicts or fixed_conflicts)
        })
    
    elif booking_type == 'fixed':
        start_date = datetime.strptime(data.get('start_date'), '%Y-%m-%d').date()
        end_date = datetime.strptime(data.get('end_date'), '%Y-%m-%d').date()
        weekday = int(data.get('weekday'))
        
        conflicts = []
        current_date = start_date
        while current_date <= end_date:
            if current_date.weekday() == weekday:
                if (Booking.objects.filter(court_id=court_id, 
                                        time_slot_id=time_slot_id,
                                        booking_group__booking_date=current_date,
                                        booking_group__is_paid=True).exists() or
                    FixedSchedule.objects.filter(
                        booking_group__bookings__court_id=court_id,
                        booking_group__bookings__time_slot_id=time_slot_id,
                        start_date__lte=current_date,
                        end_date__gte=current_date,
                        weekday=weekday,
                        booking_group__is_paid=True
                    ).exists()):
                    conflicts.append(current_date.strftime('%Y-%m-%d'))
            current_date += timedelta(days=1)
            
        return JsonResponse({
            'available': len(conflicts) == 0,
            'conflicts': conflicts
        })