from django.db import models
from django.contrib.auth.models import AbstractUser
from django.core.validators import MinValueValidator
from django.core.exceptions import ValidationError
from datetime import time, datetime, timedelta

class User(AbstractUser):
    phone = models.CharField(max_length=11, blank=False, unique=True)
    name = models.CharField(max_length=100, default='')
    role = models.CharField(max_length=20, choices=[
        ('guest', 'Guest'),
        ('customer', 'Customer'),
        ('court_manager', 'Court Manager'),
        ('court_staff', 'Court Staff'),
        ('system_admin', 'System Admin')
    ])
    groups = models.ManyToManyField(
        'auth.Group',
        related_name='custom_user_groups',
        blank=True
    )
    user_permissions = models.ManyToManyField(
        'auth.Permission',
        related_name='custom_user_permissions',
        blank=True
    )
    
    class Meta:
        db_table = 'users'
        permissions = [
            ("can_book_court", "Can book court"),
            ("can_manage_court", "Can manage court"),
            ("can_manage_system", "Can manage system"),
            ("can_check_in", "Can check in customers"),
        ]
        verbose_name = 'Người Dùng'
        verbose_name_plural = 'Người Dùng'

class Court(models.Model):
    name = models.CharField(max_length=100)
    address = models.TextField(default='')  # Thêm địa chỉ để tìm kiếm theo vị trí
    is_active = models.BooleanField(default=True)
    opening_time = models.TimeField(default=time(5, 0))
    closing_time = models.TimeField(default=time(0, 0))
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    time_slots = models.ManyToManyField('TimeSlot', through='CourtTimeSlot')
    manager = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='managed_courts')

    class Meta:
        db_table = 'courts'
        verbose_name = 'Sân'
        verbose_name_plural = 'Sân'

    def __str__(self):
        return self.name

class TimeSlot(models.Model):
    start_time = models.TimeField()
    end_time = models.TimeField()
    SLOT_TYPES = (
        ('regular', 'Regular Booking'),
        ('fixed', 'Fixed Schedule'),
    )
    slot_type = models.CharField(max_length=10, choices=SLOT_TYPES)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'time_slots'
        ordering = ['start_time']  # Thêm ordering để dễ quản lý
        verbose_name = 'Khung giờ'
        verbose_name_plural = 'Khung giờ'

    def __str__(self):
        return f"{self.start_time} - {self.end_time} - {self.slot_type}"

    def clean(self):
        if self.start_time >= self.end_time:
            raise ValidationError("End time must be after start time")

class CourtTimeSlot(models.Model):
    court = models.ForeignKey(Court, on_delete=models.CASCADE)
    time_slot = models.ForeignKey(TimeSlot, on_delete=models.CASCADE)
    price_override = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)  # Cho phép override giá theo từng sân

    class Meta:
        db_table = 'court_time_slots'
        unique_together = ('court', 'time_slot')
        verbose_name = 'Khung giờ sân'
        verbose_name_plural = 'Khung giờ sân'

    def get_price(self):
        return self.price_override if self.price_override else self.time_slot.price

    def __str__(self):
        return f"{self.court.name} - {self.time_slot.start_time} - {self.time_slot.end_time}"

class BookingGroup(models.Model):
    customer = models.ForeignKey(User, on_delete=models.CASCADE)
    booking_date = models.DateField()
    BOOKING_TYPES = (
        ('single', 'Single Booking'),
        ('fixed', 'Fixed Schedule'),
    )
    booking_type = models.CharField(max_length=10, choices=BOOKING_TYPES)
    total_price = models.DecimalField(max_digits=10, decimal_places=2)
    is_paid = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'booking_groups'
        verbose_name = 'Nhóm đặt sân'
        verbose_name_plural = 'Nhóm đặt sân'

    def clean(self):
        # Kiểm tra payment status trước khi cho phép booking
        if self.is_paid and self.payment.payment_status != 'completed':
            raise ValidationError("Cannot mark as paid without completed payment")
    
    def __str__ (self):
        return f"{self.customer.name} - {self.booking_type}"

class Booking(models.Model):
    booking_group = models.ForeignKey(BookingGroup, on_delete=models.CASCADE, related_name='bookings')
    court = models.ForeignKey(Court, on_delete=models.CASCADE)
    time_slot = models.ForeignKey(TimeSlot, on_delete=models.CASCADE)
    is_checked_in = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'bookings'
        verbose_name = 'Đặt sân'
        verbose_name_plural = 'Đặt sân'

    def __str__(self):
        return f"{self.booking_group.customer.name} - {self.court.name}"

    def clean(self):
        # Kiểm tra xung đột với regular bookings
        conflicting_regular = Booking.objects.filter(
            court=self.court,
            time_slot=self.time_slot,
            booking_group__booking_date=self.booking_group.booking_date,
            booking_group__is_paid=True
        ).exclude(id=self.id).exists()

        # Kiểm tra xung đột với fixed schedules
        if self.booking_group.booking_type == 'single':
            booking_date = self.booking_group.booking_date
            weekday = booking_date.weekday()
            
            conflicting_fixed = FixedSchedule.objects.filter(
                booking_group__bookings__court=self.court,
                booking_group__bookings__time_slot=self.time_slot,
                start_date__lte=booking_date,
                end_date__gte=booking_date,
                weekday=weekday,
                booking_group__is_paid=True
            ).exists()

            if conflicting_regular or conflicting_fixed:
                raise ValidationError("This time slot is already booked")

class FixedSchedule(models.Model):
    booking_group = models.OneToOneField(BookingGroup, on_delete=models.CASCADE)
    start_date = models.DateField()
    end_date = models.DateField()
    WEEKDAYS = (
        (0, 'Thứ 2'),
        (1, 'Thứ 3'),
        (2, 'Thứ 4'),
        (3, 'Thứ 5'),
        (4, 'Thứ 6'),
        (5, 'Thứ 7'),
        (6, 'Chủ nhật'),
    )
    weekday = models.IntegerField(choices=WEEKDAYS)

    class Meta:
        db_table = 'fixedschedules'
        verbose_name = 'Lịch cố định'
        verbose_name_plural = 'Lịch cố định'

    def __str__(self):
        return f"{self.booking_group.customer.name} - {self.start_date} - {self.end_date}"

    def clean(self):
        if self.start_date >= self.end_date:
            raise ValidationError("End date must be after start date")

        if self.start_date < datetime.now().date():
            raise ValidationError("Start date cannot be in the past")

        # Kiểm tra xung đột cho tất cả các ngày trong khoảng thời gian
        current_date = self.start_date
        while current_date <= self.end_date:
            if current_date.weekday() == self.weekday:
                # Kiểm tra xung đột với regular bookings
                conflicting_regular = Booking.objects.filter(
                    court=self.booking_group.bookings.first().court,
                    time_slot=self.booking_group.bookings.first().time_slot,
                    booking_group__booking_date=current_date,
                    booking_group__is_paid=True
                ).exists()

                # Kiểm tra xung đột với fixed schedules khác
                conflicting_fixed = FixedSchedule.objects.filter(
                    booking_group__bookings__court=self.booking_group.bookings.first().court,
                    booking_group__bookings__time_slot=self.booking_group.bookings.first().time_slot,
                    start_date__lte=current_date,
                    end_date__gte=current_date,
                    weekday=self.weekday,
                    booking_group__is_paid=True
                ).exclude(id=self.id).exists()

                if conflicting_regular or conflicting_fixed:
                    raise ValidationError(f"Conflict found for date {current_date}")

            current_date += timedelta(days=1)

class Payment(models.Model):
    booking_group = models.OneToOneField(BookingGroup, on_delete=models.CASCADE)
    PAYMENT_METHODS = (
        ('bank_transfer', 'Bank Transfer'),
        ('cash', 'Cash'),
    )
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHODS)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    transaction_id = models.CharField(max_length=100, blank=True)
    payment_status = models.CharField(max_length=20, choices=[
        ('pending', 'Pending'),
        ('completed', 'Completed'),
        ('failed', 'Failed')
    ], default='pending')
    paid_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'payments'
        verbose_name = 'Thanh toán'
        verbose_name_plural = 'Thanh toán'

    def __str__(self):
        return f"{self.booking_group.customer.name}"

class CourtBankAccount(models.Model):
    court = models.ForeignKey(Court, on_delete=models.CASCADE)
    bank_name = models.CharField(max_length=100)
    account_number = models.CharField(max_length=50)
    account_holder = models.CharField(max_length=100)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'courtbankaccount'
        verbose_name = 'Tài khoản ngân hàng'
        verbose_name_plural = 'Tài khoản ngân hàng'

    def __str__(self):
        return f"{self.court.name} - {self.bank_name}"

class CheckIn(models.Model):
    booking = models.ForeignKey(Booking, on_delete=models.CASCADE)
    checked_in_by = models.ForeignKey(User, on_delete=models.CASCADE)
    check_in_time = models.DateTimeField()

    class Meta:
        db_table = 'checkins'
        verbose_name = 'Check in'
        verbose_name_plural = 'Check in'

    def __str__(self):
        return f"{self.booking.booking_group.customer.name} - {self.booking.court.name}"