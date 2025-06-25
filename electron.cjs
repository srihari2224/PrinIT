const { app, BrowserWindow } = require('electron');
const path = require('path');

const isDev = !app.isPackaged;
const VITE_DEV_SERVER = 'http://localhost:5173';

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    win.loadURL(VITE_DEV_SERVER);
    win.webContents.openDevTools(); // optional
  } else {
    win.loadFile(path.join(__dirname, 'dist/index.html'));
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
