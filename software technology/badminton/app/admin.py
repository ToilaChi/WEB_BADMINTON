from django.contrib import admin
from .models import User, Court, TimeSlot, CourtTimeSlot, Booking, Payment, CheckIn, BookingGroup, CourtBankAccount, FixedSchedule

class displayUser(admin.ModelAdmin):
    list_display = ('name', 'phone', 'email', 'role')
    search_fields = ('name', 'phone', 'email', 'role')

class displayCourt(admin.ModelAdmin):
    list_display = ('name', 'is_active', 'opening_time', 'closing_time', 'manager')
    search_fields = ('name', 'is_active', 'opening_time', 'closing_time', 'manager')

class displayTimeSlot(admin.ModelAdmin):
    list_display = ('start_time', 'end_time')
    search_fields = ('start_time', 'end_time')

class displayCourtTimeSlot(admin.ModelAdmin):
    list_display = ('court', 'time_slot')
    search_fields = ('court', 'time_slot')

class displayBooking(admin.ModelAdmin):
    list_display = ('court', 'time_slot', 'booking_group', 'created_at')
    search_fields = ('court', 'time_slot', 'booking_group', 'created_at')

class displayPayment(admin.ModelAdmin):
    list_display = ('amount', 'payment_method')
    search_fields = ('amount', 'payment_method')

class displayCheckIn(admin.ModelAdmin):
    list_display = ('booking', 'check_in_time')
    search_fields = ('booking', 'check_in_time')

class displayBookingGroup(admin.ModelAdmin):
    list_display = ('customer', 'booking_type')
    search_fields = ('customer', 'booking_type')

class displayCourtBankAccount(admin.ModelAdmin):
    list_display = ('court', 'bank_name', 'account_number')
    search_fields = ('court', 'bank_name', 'account_number')

class displayFixedSchedule(admin.ModelAdmin): 
    list_display = ('weekday', 'start_date', 'end_date')
    search_fields = ('weekday', 'start_date', 'end_date') 

# Register your models here.

admin.site.register(User, displayUser)
admin.site.register(Court, displayCourt)
admin.site.register(TimeSlot, displayTimeSlot)
admin.site.register(CourtTimeSlot, displayCourtTimeSlot)
admin.site.register(Booking, displayBooking)
admin.site.register(Payment, displayPayment)
admin.site.register(CheckIn, displayCheckIn)
admin.site.register(BookingGroup, displayBookingGroup)
admin.site.register(CourtBankAccount, displayCourtBankAccount)
admin.site.register(FixedSchedule, displayFixedSchedule)