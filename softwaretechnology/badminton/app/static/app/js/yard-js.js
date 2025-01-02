// Xử lý sự kiện click vào slot trống
document.querySelectorAll(".slot.empty").forEach((slot) => {
  slot.addEventListener("click", () => {
    slot.classList.toggle("selected");
    slot.classList.toggle("empty");
    updateTotal();
  });
});

// Cập nhật tổng thời gian và tiền
function updateTotal() {
  const selectedSlots = document.querySelectorAll(".slot.selected").length;
  const hours = selectedSlots;
  const pricePerHour = 200000; // Giá mỗi giờ (VNĐ)
  const totalPrice = hours * pricePerHour;

  document.querySelector(
    ".total:first-child"
  ).textContent = `Đang chọn: ${hours}h00`;
  document.querySelector(
    ".total:nth-child(2)"
  ).textContent = `Tổng: ${totalPrice.toLocaleString("vi-VN")} đ`;
}

// Xử lý nút chọn ngày
document.querySelector(".date-picker").addEventListener("click", () => {
  // Thêm code xử lý chọn ngày ở đây
  // Có thể sử dụng thư viện date picker
});

// Xử lý nút tiếp theo
document.querySelector(".next-button").addEventListener("click", () => {
  const selectedSlots = document.querySelectorAll(".slot.selected");
  if (selectedSlots.length === 0) {
    alert("Vui lòng chọn ít nhất một khung giờ");
    return;
  }
  // Thêm code xử lý bước tiếp theo ở đây
});
