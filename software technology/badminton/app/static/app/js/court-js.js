// Khởi tạo các biến theo dõi  
let selectedSlots = new Set();
let totalAmount = 0;

// Hàm kiểm tra giờ đã qua
function isTimeSlotPassed(timeStr, selectedDate) {
    // Lấy thời gian hiện tại
    const currentDate = new Date();
    const selectedDateObj = new Date(selectedDate);
    
    // Nếu ngày đã qua
    if (selectedDateObj.setHours(0, 0, 0, 0) < currentDate.setHours(0, 0, 0, 0)) {
        return true;
    }

    // Nếu là ngày hiện tại, kiểm tra giờ
    if (selectedDateObj.getDate() === currentDate.getDate() && 
        selectedDateObj.getMonth() === currentDate.getMonth() && 
        selectedDateObj.getFullYear() === currentDate.getFullYear()) {
        
        // Tách giờ bắt đầu từ chuỗi time slot (format "HH:mm-HH:mm")
        const [startTimeStr] = timeStr.split("-");
        const [hours, minutes] = startTimeStr.trim().split(":").map(Number);
        
        // Tạo đối tượng Date cho thời gian bắt đầu của slot
        const slotTime = new Date(selectedDate);
        slotTime.setHours(hours, minutes, 0, 0);
        
        // Tạo đối tượng Date cho thời gian hiện tại
        const now = new Date();
        
        // So sánh với thời gian hiện tại
        // Thêm buffer 15 phút (tùy chọn)
        const bufferTime = 15; // 15 phút
        now.setMinutes(now.getMinutes() + bufferTime);
        
        return slotTime < now;
    }
    return false;
}

// Hàm lấy thông tin khung giờ từ slot  
function getSlotInfo(slot) {
    const row = slot.closest("tr");
    const courtNumber = row.querySelector(".fixed-column").textContent;
    const columnIndex = slot.cellIndex;
    const timeStr = slot.closest("table").rows[0].cells[columnIndex].querySelector("div").textContent;
    const price = parseInt(slot.dataset.price);
    const courtId = slot.dataset.courtId;
    const timeSlotId = slot.dataset.timeSlotId;
    return { courtNumber, timeStr, price, courtId, timeSlotId };
}

// Hàm cập nhật tổng tiền và thời gian  
function updateTotals() {
    const totalHours = selectedSlots.size;
    totalAmount = 0;
    const selectedTimes = [];
    const uniqueCourts = new Set();
    const slots = [];

    selectedSlots.forEach((slot) => {
        const { courtNumber, timeStr, price, courtId, timeSlotId } = getSlotInfo(slot);
        totalAmount += price;
        
        slots.push({
            court_id: courtId,
            time_slot_id: timeSlotId,
            price: price
        });

        const existingSlot = selectedTimes.find(s => s.courtNumber === courtNumber);
        if (existingSlot) {
            existingSlot.timeStr = `${existingSlot.timeStr}, ${timeStr}`;
        } else {
            selectedTimes.push({ courtNumber, timeStr, price });
        }
        uniqueCourts.add(courtNumber);
    });

    const totalTimeEl = document.querySelector(".total-time");
    const totalPriceEl = document.querySelector(".total-price-bookedprice");

    if (totalTimeEl) {
        totalTimeEl.textContent = `Đang chọn: ${totalHours}h00`;
    }

    if (totalPriceEl) {
        totalPriceEl.textContent = `Tổng: ${totalAmount.toLocaleString("vi-VN")} đ`;
    }

    const bookingData = {
        totalHours,
        totalAmount,
        selectedTimes: selectedTimes.map(slot => ({
            ...slot,
            timeStr: slot.timeStr.split(", ").sort().join(", ")
        })),
        selectedDate: localStorage.getItem("selectedDate") || new Date().toLocaleDateString("vi-VN"),
        slots: slots
    };
    localStorage.setItem("bookingData", JSON.stringify(bookingData));
}

// Hàm kiểm tra slot availability
async function checkSlotAvailability(slot) {
    const { courtId, timeSlotId } = getSlotInfo(slot);
    const selectedDate = localStorage.getItem("selectedDate");
    
    try {
        const response = await fetch('/check-availability/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify({
                court_id: courtId,
                time_slot_id: timeSlotId,
                date: selectedDate,
                booking_type: 'single'
            })
        });
        
        const data = await response.json();
        if (!data.available) {
            slot.classList.remove('empty', 'selected');
            slot.classList.add('booked');
            slot.style.cursor = 'not-allowed';
            if (selectedSlots.has(slot)) {
                selectedSlots.delete(slot);
                updateTotals();
            }
        }
    } catch (error) {
        console.error('Error checking availability:', error);
    }
}

// Khởi tạo các sự kiện  
document.addEventListener("DOMContentLoaded", () => {
    flatpickr("#calendar", {
        inline: true,
        dateFormat: "Y-m-d",
        defaultDate: localStorage.getItem("selectedDate") || "today",
        minDate: "today",
        onChange: (selectedDates, dateStr) => {
            localStorage.setItem("selectedDate", dateStr);
            window.location.href = `?date=${dateStr}`;
        },
    });

    document.querySelectorAll(".slot").forEach((slot) => {
        const row = slot.closest("tr");
        const timeCell = slot.closest("table").rows[0].cells[slot.cellIndex];
        const timeStr = timeCell.querySelector("div").textContent;
        const selectedDate = localStorage.getItem("selectedDate") || new Date().toLocaleDateString("vi-VN");

        if (isTimeSlotPassed(timeStr, selectedDate)) {
            slot.classList.remove("empty", "selected");
            slot.classList.add("passed");
            slot.style.cursor = 'not-allowed';
            return;
        }

        if (slot.classList.contains("booked")) {
            slot.style.cursor = 'not-allowed';
            return;
        }

        if (slot.classList.contains("empty")) {
            slot.addEventListener("click", async () => {
                // Kiểm tra availability trước khi cho phép chọn
                await checkSlotAvailability(slot);
                
                if (!slot.classList.contains('booked')) {
                    if (slot.classList.contains("selected")) {
                        slot.classList.remove("selected");
                        slot.classList.add("empty");
                        selectedSlots.delete(slot);
                    } else {
                        slot.classList.remove("empty");
                        slot.classList.add("selected");
                        selectedSlots.add(slot);
                    }
                    updateTotals();
                }
            });
        }
    });

    const nextButton = document.querySelector(".next-button");
    if (nextButton) {
        nextButton.addEventListener("click", async (e) => {
            e.preventDefault();
            
            if (selectedSlots.size === 0) {
                alert("Vui lòng chọn ít nhất một khung giờ trước khi tiếp tục!");
                return;
            }

            // Chuyển hướng đến trang thanh toán
            window.location.href = "/payment/";
        });
    }
});