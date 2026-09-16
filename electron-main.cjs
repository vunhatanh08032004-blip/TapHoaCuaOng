const { app, BrowserWindow, shell } = require('electron');
const path = require('path');

let mainWindow = null;

// Đường link máy chủ Cloud Run của bạn
const CLOUD_APP_URL = 'https://ais-pre-vyrwpkgambyapctaakslvp-595248076270.asia-southeast1.run.app';

function createWindow() {
  if (mainWindow) return;

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 650,
    title: 'Tạp Hóa Của Ong',
    icon: app.isPackaged
      ? path.join(process.resourcesPath, 'Code_Generated_Image.ico')
      : path.join(__dirname, 'Code_Generated_Image.ico'),
    show: false,
    backgroundColor: '#090d16', // Màu nền tối sang trọng trong lúc tải trang
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
    },
    autoHideMenuBar: true,
  });

  // Mở cửa sổ mượt mà ngay khi trang web đã tải xong
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Khi người dùng bấm vào các link ngoài (như link Zalo, web ngoài) -> Tự động mở bằng trình duyệt mặc định của máy tính
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  // Tải trực tiếp ứng dụng từ máy chủ Google Cloud an toàn
  mainWindow.loadURL(CLOUD_APP_URL);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Khởi động ứng dụng
app.whenReady().then(() => {
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});