// Khởi tạo các hàm xử lý API calls
const API = {
    async createSingleBooking(bookingData) {
        try {
            const response = await fetch('/create-single-booking/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    date: bookingData.selectedDate,
                    slots: bookingData.slots,
                    total_price: bookingData.totalAmount,
                    payment_method: bookingData.paymentMethod
                })
            });

            if (!response.ok) {
                throw new Error('Booking creation failed');
            }

            return await response.json();
        } catch (error) {
            console.error('Error creating booking:', error);
            throw error;
        }
    },

    async confirmPayment(bookingGroupId, transactionId) {
        try {
            const response = await fetch('/confirm-payment/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    booking_group_id: bookingGroupId,
                    transaction_id: transactionId,
                })
            });

            if (!response.ok) {
                throw new Error('Payment confirmation failed');
            }

            return await response.json();
        } catch (error) {
            console.error('Error confirming payment:', error);
            throw error;
        }
    }
};

document.addEventListener("DOMContentLoaded", () => {
    // Xác định trang hiện tại
    const isPaymentPage = window.location.pathname.includes("payment");
    const isBankingPage = window.location.pathname.includes("banking");

    if (isPaymentPage) {
        initializePaymentPage();
    } else if (isBankingPage) {
        initializeBankingPage();
    }
});

function initializePaymentPage() {
    // Đọc thông tin đặt sân từ localStorage
    const bookingData = JSON.parse(localStorage.getItem("bookingData"));

    if (!bookingData || bookingData.selectedTimes.length === 0) {
        alert("Không tìm thấy thông tin đặt sân! Vui lòng đặt sân trước.");
        window.location.href = "/court/";
        return;
    }

    // Hiển thị thông tin chi nhánh
    document.getElementById("selectedDate").textContent = bookingData.selectedDate;

    // Hiển thị thông tin sân và giờ theo định dạng mới
    const courtTimeDisplay = bookingData.selectedTimes
        .map((slot) => `${slot.courtNumber} - ${slot.timeStr}`)
        .join("<br>");
    document.getElementById("courtNumber").innerHTML = courtTimeDisplay;
    
    const pricePerHour = bookingData.totalAmount / bookingData.totalHours;
    document.getElementById("pricePerHour").textContent = `${pricePerHour.toLocaleString("vi-VN")} đ`;
    document.getElementById("totalTime").textContent = `${bookingData.totalHours}h00`;
    document.getElementById("totalAmount").textContent = `${bookingData.totalAmount.toLocaleString("vi-VN")} đ`;

    // Xử lý nút xác nhận thanh toán
    const btnPaymentConfirm = document.querySelector(".btn-payment-confirm");
    if (btnPaymentConfirm) {
        btnPaymentConfirm.addEventListener("click", async (e) => {
            e.preventDefault();

            const selectedMethod = document.querySelector(".payment-method.selected");
            if (!selectedMethod) {
                alert("Vui lòng chọn phương thức thanh toán!");
                return;
            }

            const isTransfer = selectedMethod.querySelector(".payment-method-name")
                .textContent.toLowerCase().includes("chuyển khoản");

            const paymentData = {
                ...bookingData,
                paymentMethod: isTransfer ? "bank_transfer" : "cash",
                paymentStatus: "pending",
                timestamp: new Date().toISOString(),
            };

            try {
                // Tạo booking trên server
                const bookingResponse = await API.createSingleBooking(paymentData);

                // Lưu thông tin booking để sử dụng ở trang banking
                localStorage.setItem("paymentData", JSON.stringify({
                    ...paymentData,
                    bookingGroupId: bookingResponse.booking_group_id
                }));
                localStorage.removeItem("bookingData");

                // Chuyển hướng dựa trên phương thức thanh toán
                window.location.href = isTransfer ? "/banking/" : "/court/";
            } catch (error) {
                console.error('Error processing booking:', error);
                alert('Có lỗi xảy ra khi xử lý đặt sân. Vui lòng thử lại!');
            }
        });
    }
}

function initializeBankingPage() {
    const paymentData = JSON.parse(localStorage.getItem("paymentData"));
    if (!paymentData) {
        alert("Không tìm thấy thông tin đặt sân!");
        window.location.href = "/court/";
        return;
    }

    // Tạo mã đơn hàng
    const orderId = `WS${Date.now()}${Math.floor(Math.random() * 1000)}`;

    // Hiển thị thông tin thanh toán
    const amountElement = document.getElementById("amount");
    if (amountElement) {
        amountElement.textContent = `${paymentData.totalAmount.toLocaleString("vi-VN")} đ`;
    }

    const transferContentElement = document.getElementById("transferContent");
    if (transferContentElement) {
        transferContentElement.textContent = orderId;
    }

    const accountHolderElement = document.getElementById("accountHolder");
    if (accountHolderElement) {
        accountHolderElement.textContent = "Pham Minh Chi";
    }

    const bankNameElement = document.getElementById("bankName");
    if (bankNameElement) {
        bankNameElement.textContent = "MB Bank";
    }

    const accountNumberElement = document.getElementById("accountNumber");
    if (accountNumberElement) {
        accountNumberElement.textContent = "0943869063";
    }

    // Tạo URL QR Code
    const qrCodeElement = document.getElementById("qrCode");
    if (qrCodeElement) {
        const qrUrl = `https://img.vietqr.io/image/MB-0943869063-compact2.png?amount=${paymentData.totalAmount}&addInfo=${orderId}&accountName=Pham Minh Chi`;
        qrCodeElement.src = qrUrl;
    }

    // Xử lý nút xác nhận thanh toán
    const confirmButton = document.getElementById("confirmButton");
    if (confirmButton) {
        confirmButton.addEventListener("click", async () => {
            try {
                // Gọi API xác nhận thanh toán
                await API.confirmPayment(paymentData.bookingGroupId, orderId);

                alert("Cảm ơn bạn đã thanh toán! Chúng tôi sẽ xác nhận và gửi thông tin qua email của bạn.");
                localStorage.removeItem("paymentData");
                window.location.href = "/court/";
            } catch (error) {
                console.error("Error confirming payment:", error);
                alert("Có lỗi xảy ra khi xác nhận thanh toán. Vui lòng thử lại.");
            }
        });
    }
}