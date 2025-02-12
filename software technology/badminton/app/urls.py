from django.contrib import admin
from django.urls import path
from . import views

urlpatterns = [
    path('', views.home, name='home'),
    path('base/', views.base, name='base'),  
    path('court/', views.court_schedule_view, name='court'),  
    path('instructions/', views.instructions, name='instructions'),  
    path('payment/', views.payment, name='payment'),
    path('banking/', views.banking, name='banking'),
    path('courtoption2/', views.courtoption2, name='courtoption2'),    
    path('bookingcourt/', views.bookingcourt, name='bookingcourt'),
    path('information/', views.information, name='information'),
    path('history/', views.history, name='history'),
    path('register/', views.register_view, name='register'),
    path('login/', views.login_view, name='login'),
    path('logout/', views.logout_view, name='logout'),
    path('verify-email/<int:user_id>/<str:token>/', views.verify_email, name='verify_email'),
    path('forgot-password/', views.forgot_password, name='forgot_password'),
    path('reset-password/<int:user_id>/<str:token>/', views.reset_password, name='reset_password'),
    path('update-profile/', views.update_profile, name='update_profile'),
    path('change-password/', views.change_password, name='change_password'),
    path('check-current-password/', views.check_current_password, name='check_current_password'),
    path('create-single-booking/', views.create_single_booking, name='create_single_booking'),
    path('create-fixed-booking/', views.create_fixed_booking, name='create_fixed_booking'),
    path('confirm-payment/', views.confirm_payment, name='confirm_payment'),
    path('check-availability/', views.check_availability, name='check_availability'),
]