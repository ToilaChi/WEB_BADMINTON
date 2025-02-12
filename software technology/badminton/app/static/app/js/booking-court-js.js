document.addEventListener("DOMContentLoaded", () => {
    const isPaymentPage = window.location.pathname.includes("bookingcourt");
    const isBankingPage = window.location.pathname.includes("banking");

    if (isPaymentPage) {
        initializeBookingPage();
    } else if (isBankingPage) {
        initializePayPage();
    }
});

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

// API function to confirm payment
async function confirmPayment(bookingGroupId, transactionId) {
    try {
        const response = await fetch('/confirm-payment/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify({
                booking_group_id: bookingGroupId,
                transaction_id: transactionId
            })
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'Có lỗi xảy ra khi xác nhận thanh toán');
        }
        return data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

function initializeBookingPage() {
    try {
        const bookingData = JSON.parse(localStorage.getItem("bookingData"));

        if (!bookingData) {
            console.error("No booking data found");
            alert("Không tìm thấy thông tin đặt sân! Vui lòng đặt sân trước.");
            window.location.href = "/courtoption2/";
            return;
        }

        const updateElement = (elementId, value, formatter = null) => {
            const element = document.getElementById(elementId);
            if (element) {
                element.textContent = formatter ? formatter(value) : (value || "N/A");
            } else {
                console.warn(`Element ${elementId} not found`);
            }
        };

        updateElement("courtNumber", bookingData.courtName);
        updateElement("timeSlot", bookingData.timeSlotText);
        updateElement("startDate", bookingData.startDate, formatDate);
        updateElement("endDate", bookingData.endDate, formatDate);
        updateElement("daysSummary", bookingData.daysSummary?.[0]);
        updateElement("pricePerSession", bookingData.pricePerSession, formatCurrency);
        updateElement("totalSessions", bookingData.totalSessions);
        updateElement("totalAmount", bookingData.totalPrice, formatCurrency);

        const userElements = {
            name: document.querySelector('.payment-form-value:nth-of-type(1)'),
            phone: document.querySelector('.payment-form-value:nth-of-type(2)'),
            email: document.querySelector('.payment-form-value:nth-of-type(3)')
        };

        if (userElements.name && userElements.phone && userElements.email) {
            bookingData.userName = userElements.name.textContent.trim();
            bookingData.userPhone = userElements.phone.textContent.trim();
            bookingData.userEmail = userElements.email.textContent.trim();
        }

        const btnPaymentConfirm = document.querySelector(".btn-payment-confirm");
        if (btnPaymentConfirm) {
            btnPaymentConfirm.addEventListener("click", (e) => {
                e.preventDefault();

                const paymentData = {
                    ...bookingData,
                    paymentMethod: "banking",
                    paymentStatus: "pending",
                    timestamp: new Date().toISOString(),
                };

                try {
                    localStorage.setItem("paymentData", JSON.stringify(paymentData));
                    localStorage.removeItem("bookingData");
                    window.location.href = "/banking/";
                } catch (error) {
                    console.error("Error saving payment data:", error);
                    alert("Có lỗi xảy ra khi lưu thông tin thanh toán. Vui lòng thử lại.");
                }
            });
        }
    } catch (error) {
        console.error("Error in initializeBookingPage:", error);
        alert("Có lỗi xảy ra khi xử lý thông tin đặt sân. Vui lòng thử lại.");
        window.location.href = "/courtoption2/";
    }
}

function formatDate(dateString) {
    if (!dateString) return "N/A";
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    } catch (error) {
        console.error("Error formatting date:", error);
        return "N/A";
    }
}

function formatCurrency(amount) {
    if (!amount) return "0 đ";
    try {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND'
        }).format(amount);
    } catch (error) {
        console.error("Error formatting currency:", error);
        return "0 đ";
    }
}

function initializePayPage() {
    try {
        const paymentData = JSON.parse(localStorage.getItem("paymentData"));
        console.log("Payment Data:", paymentData);

        if (!paymentData) {
            console.error("No payment data found");
            alert("Không tìm thấy thông tin thanh toán!");
            window.location.href = "/courtoption2/";
            return;
        }

        const orderId = `WS${Date.now()}${Math.floor(Math.random() * 1000)}`;

        const updateElement = (elementId, value) => {
            const element = document.getElementById(elementId);
            if (element) {
                element.textContent = value;
            }
        };

        updateElement("amount", formatCurrency(paymentData.totalPrice));
        updateElement("transferContent", orderId);
        updateElement("accountHolder", "Pham Minh Chi");
        updateElement("bankName", "MB Bank");
        updateElement("accountNumber", "0943869063");

        const qrCodeElement = document.getElementById("qrCode");
        if (qrCodeElement) {
            const qrUrl = `https://img.vietqr.io/image/MB-0943869063-compact2.png?amount=${paymentData.totalPrice}&addInfo=${orderId}&accountName=Pham Minh Chi`;
            qrCodeElement.src = qrUrl;
        }

        const confirmButton = document.getElementById("confirmButton");
        if (confirmButton) {
            confirmButton.addEventListener("click", async () => {
                try {
                    // Gọi API xác nhận thanh toán
                    await confirmPayment(paymentData.bookingGroupId, orderId);

                    const finalPaymentData = {
                        ...paymentData,
                        orderId,
                        paymentStatus: "completed",
                        completedAt: new Date().toISOString(),
                    };

                    localStorage.setItem("paymentData", JSON.stringify(finalPaymentData));
                    alert("Thanh toán thành công! Chúng tôi sẽ gửi xác nhận qua email của bạn.");
                    window.location.href = "/court";
                } catch (error) {
                    console.error("Error confirming payment:", error);
                    alert("Có lỗi xảy ra khi xác nhận thanh toán. Vui lòng thử lại.");
                }
            });
        }
    } catch (error) {
        console.error("Error in initializePayPage:", error);
        alert("Có lỗi xảy ra khi xử lý thông tin thanh toán. Vui lòng thử lại.");
        window.location.href = "/courtoption2/";
    }
}