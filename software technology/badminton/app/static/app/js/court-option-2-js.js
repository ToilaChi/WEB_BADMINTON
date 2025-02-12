document.addEventListener('DOMContentLoaded', () => {
  // Utility function to get CSRF token
  function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
      const cookies = document.cookie.split(';');
      for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i].trim();
        if (cookie.substring(0, name.length + 1) === (name + '=')) {
          cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
          break;
        }
      }
    }
    return cookieValue;
  }

  // API function to create fixed booking
  async function createFixedBooking(bookingData) {
    try {
      const response = await fetch('/create-fixed-booking/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCookie('csrftoken')
        },
        body: JSON.stringify({
          start_date: bookingData.startDate,
          end_date: bookingData.endDate,
          weekday: bookingData.selectedDay,
          total_price: bookingData.totalPrice,
          slots: [{
            court_id: bookingData.courtId,
            time_slot_id: bookingData.timeSlotId
          }]
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Có lỗi xảy ra khi tạo đơn đặt sân');
      }
      return data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  async function checkFixedScheduleAvailability(bookingData) {
    try {
        const response = await fetch('/check-availability/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify({
                court_id: bookingData.courtId,
                time_slot_id: bookingData.timeSlotId,
                start_date: bookingData.startDate,
                end_date: bookingData.endDate,
                weekday: bookingData.selectedDay,
                booking_type: 'fixed'
            })
        });

        const data = await response.json();
        if (!data.available) {
            const conflictDates = data.conflicts.join(', ');
            throw new Error(`Có xung đột lịch vào các ngày: ${conflictDates}`);
        }
        return true;
    } catch (error) {
        throw error;
    }
  }

  const form = document.getElementById('fixedScheduleForm');
  const startDateInput = document.getElementById('startDateInput');
  const endDateInput = document.getElementById('endDateInput');
  const timeSlotSelect = document.getElementById('timeSlotSelect');
  const courtSelect = document.getElementById('courtSelect');
  const checkboxes = document.querySelectorAll('input[name="days"]');

  if (!form || !startDateInput || !endDateInput || !timeSlotSelect || !courtSelect || !checkboxes.length) {
    console.error("One or more elements not found. Check your HTML.");
    return;
  }

  const today = new Date();
  const formattedToday = today.toISOString().split('T')[0];
  startDateInput.min = formattedToday;

  startDateInput.addEventListener('change', () => {
    const startDate = new Date(startDateInput.value);
    const minEndDate = new Date(startDate);
    minEndDate.setDate(startDate.getDate() + 28);
    endDateInput.min = minEndDate.toISOString().split('T')[0];

    if (endDateInput.value && new Date(endDateInput.value) < minEndDate) {
      endDateInput.value = '';
    }
  });

  let selectedCheckbox = null;
  checkboxes.forEach(checkbox => {
    checkbox.addEventListener('change', () => {
      if (checkbox.checked) {
        if (selectedCheckbox && selectedCheckbox !== checkbox) {
          selectedCheckbox.checked = false;
        }
        selectedCheckbox = checkbox;
      } else if (selectedCheckbox === checkbox) {
        selectedCheckbox = null;
      }
    });
  });

  const weekdayMap = {
    0: 'Monday',
    1: 'Tuesday',
    2: 'Wednesday',
    3: 'Thursday',
    4: 'Friday',
    5: 'Saturday',
    6: 'Sunday'
  };

  const calculateDaysBetweenDates = (start, end) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffTime = Math.abs(endDate - startDate);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getDaysBetweenDates = (startDate, endDate, selectedDayValue) => {
    const days = {};
    days[selectedDayValue] = 0;

    const start = new Date(startDate);
    const end = new Date(endDate);

    for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
      if (date.getDay() === (selectedDayValue === 6 ? 0 : selectedDayValue + 1)) {
        days[selectedDayValue]++;
      }
    }

    return days;
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const selectedDay = selectedCheckbox ? parseInt(selectedCheckbox.value) : null;
    
    if (!courtSelect.value || 
        !timeSlotSelect.value || 
        !startDateInput.value || 
        !endDateInput.value || 
        selectedDay === null) {
      alert('Vui lòng điền đầy đủ thông tin!');
      return;
    }

    const selectedTimeSlot = timeSlotSelect.options[timeSlotSelect.selectedIndex];
    const pricePerSession = parseFloat(selectedTimeSlot?.dataset.price) || 300000;

    const daysBetweenDates = calculateDaysBetweenDates(startDateInput.value, endDateInput.value);
    if (daysBetweenDates < 0) {
      alert('Ngày kết thúc không thể trước ngày bắt đầu!');
      return;
    }

    const selectedDayLabel = checkboxes[selectedDay].parentElement.textContent.trim();
    const daysCount = getDaysBetweenDates(startDateInput.value, endDateInput.value, selectedDay);
    const totalSessions = daysCount[selectedDay];
    const totalPrice = totalSessions * pricePerSession;

    try {
      const bookingData = {
        courtId: courtSelect.value,
        courtName: courtSelect.options[courtSelect.selectedIndex].text,
        timeSlotId: timeSlotSelect.value,
        timeSlotText: selectedTimeSlot?.text,
        startDate: startDateInput.value,
        endDate: endDateInput.value,
        selectedDay: selectedDay,
        selectedDays: [selectedDayLabel],
        daysSummary: [selectedDayLabel],
        totalSessions: totalSessions,
        pricePerSession: pricePerSession,
        totalPrice: totalPrice
      };

      // Kiểm tra availability trước khi tạo booking
      await checkFixedScheduleAvailability(bookingData);
      
      // Tạo booking nếu không có xung đột
      const response = await createFixedBooking(bookingData);
      
      // Lưu booking_group_id từ response
      bookingData.bookingGroupId = response.booking_group_id;
      
      localStorage.setItem('bookingData', JSON.stringify(bookingData));
      window.location.href = '/bookingcourt/';
    } catch (error) {
      alert(error.message);
    }
  });
});