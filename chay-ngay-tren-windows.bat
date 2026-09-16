@echo off
chcp 65001 > nul
title Tạp Hóa Của Ong - Khởi chạy máy chủ & ứng dụng
echo =======================================================================
echo     TẠP HÓA CỦA ONG - TRÌNH TẢI PHIM NGẮN HỒNG QUẢ
echo     Khởi chạy toàn bộ máy chủ và mở ứng dụng ngay trên Windows
echo =======================================================================
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [LỖI] Máy tính của bạn chưa cài đặt Node.js!
    echo Vui lòng tải và cài đặt Node.js LTS tại: https://nodejs.org
    pause
    exit /b 1
)

if not exist "node_modules" (
    echo [1/3] Lần đầu chạy: Đang cài đặt các thư viện...
    call npm install
)

if not exist "dist\server.cjs" (
    echo [2/3] Đang biên dịch mã nguồn...
    call npm run build
)

echo.
echo [3/3] Đang khởi chạy máy chủ backend (Port 3000)...
echo Ứng dụng sẽ tự động mở trong trình duyệt của bạn sau vài giây.
echo.

start "" "http://localhost:3000"
node dist/server.cjs
pause
