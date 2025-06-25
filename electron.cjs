// electron.cjs
const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (!app.isPackaged) {
    // Dev mode: still hits Vite server
    win.loadURL('http://localhost:5173');
  } else {
    // Prod mode: load the build folder
    win.loadFile(path.join(__dirname, 'dist', 'index.html'));
  }

  // Always open DevTools for visibility—remove after confirming it works
  win.webContents.openDevTools();
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
