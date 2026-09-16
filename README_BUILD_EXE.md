# Hướng dẫn tạo ứng dụng Windows (.EXE) - Tạp Hóa Của Ong

Dự án này là phiên bản hoàn thiện của **Tạp Hóa Của Ong (Trình tải phim ngắn Hồng Quả tự động giải mã AES-128 CENC)**. 

---

## 🚀 Cách 1: Đóng gói thành file cài đặt Windows (.EXE) tự động

> **Điểm đặc biệt quan trọng:** Khi ứng dụng `.exe` được khởi chạy, **toàn bộ máy chủ backend giải mã video (`server.cjs`) sẽ tự động chạy ngầm**, mở cửa sổ ứng dụng và sẵn sàng tải phim ngay lập tức mà bạn không cần phải mở thêm bất kỳ cửa sổ dòng lệnh nào!

### Các bước thực hiện:
1. Trong Google AI Studio, chọn biểu tượng Cài đặt (bánh răng góc trên) ➔ Chọn **Export to ZIP** và giải nén trên máy tính của bạn.
2. Đảm bảo máy tính Windows đã cài đặt **Node.js** (tải miễn phí tại [https://nodejs.org](https://nodejs.org), khuyên dùng bản LTS).
3. Nhấp đúp chuột vào file:
   ```cmd
   build-exe.bat
   ```
4. Tập lệnh sẽ tự động:
   - Cài đặt các thư viện cần thiết (`npm install`)
   - Cài đặt công cụ đóng gói `electron` và `electron-builder`
   - Biên dịch toàn bộ giao diện và máy chủ giải mã backend
   - Đóng gói thành file cài đặt Windows `.exe` độc lập trong thư mục `dist-electron\` (hoặc `dist\`).
5. Bạn chỉ cần mở file `.exe` này để cài đặt và sử dụng phần mềm.

---

## ⚡ Cách 2: Khởi chạy ngay trên Windows mà không cần chờ đóng gói (.bat)

Nếu bạn muốn sử dụng ứng dụng ngay lập tức mà không cần chờ quá trình đóng gói electron:
1. Nhấp đúp chuột vào file:
   ```cmd
   chay-ngay-tren-windows.bat
   ```
2. Tập lệnh sẽ tự động cài đặt, biên dịch và khởi chạy toàn bộ máy chủ backend, đồng thời tự động bật trình duyệt web tại địa chỉ `http://localhost:3000` để bạn tải phim ngay!
