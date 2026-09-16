@echo off
chcp 65001 > nul
title Tạp Hóa Của Ong - Đóng gói ứng dụng Windows (.EXE)
echo =======================================================================
echo     TẠP HÓA CỦA ONG - ĐÓNG GÓI ỨNG DỤNG WINDOWS (.EXE) ĐỘC LẬP
echo     Trình tải phim ngắn Hồng Quả tự động giải mã AES-128 CENC
echo =======================================================================
echo.

:: Kiểm tra Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [LỖI] Máy tính của bạn chưa cài đặt Node.js!
    echo Vui lòng tải và cài đặt Node.js LTS tại: https://nodejs.org
    echo Sau khi cài đặt xong, hãy mở lại file này.
    pause
    exit /b 1
)

echo [Bước 1/4] Kiểm tra và cài đặt các thư viện cần thiết...
call npm install

echo.
echo [Bước 2/4] Cài đặt công cụ đóng gói Electron Desktop...
call npm install --save-dev electron@28.3.3 electron-builder@24.13.3

echo.
echo [Bước 3/4] Biên dịch giao diện người dùng và máy chủ giải mã (server)...
call npm run build

if %errorlevel% neq 0 (
    echo [LỖI] Quá trình biên dịch thất bại! Vui lòng kiểm tra thông báo lỗi ở trên.
    pause
    exit /b 1
)

echo.
echo [Bước 4/4] Đang đóng gói thành file cài đặt Windows (.exe)...
echo Máy chủ backend (server.cjs) sẽ được tích hợp tự động vào ứng dụng.
call npx electron-builder --win --x64

if %errorlevel% neq 0 (
    echo [LỖI] Quá trình đóng gói .exe thất bại!
    pause
    exit /b 1
)

echo.
echo =======================================================================
echo   ĐÓNG GÓI HOÀN TẤT THÀNH CÔNG!
echo   File cài đặt .exe của bạn đã được tạo tại thư mục:
echo   --^> dist-electron\ (hoặc dist\)
echo.
echo   Khi bạn mở file .exe, toàn bộ máy chủ backend sẽ tự động chạy ngầm
echo   và mở cửa sổ ứng dụng để bạn sử dụng ngay lập tức!
echo =======================================================================
pause
