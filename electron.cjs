const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: false,
      nodeIntegration: true,
      enableRemoteModule: true,
    },
  });

  if (!app.isPackaged) {
    // Dev mode: still hits Vite server
    win.loadURL('http://localhost:5173');
  } else {
    // Prod mode: load the build folder
    win.loadFile(path.join(__dirname, 'dist', 'index.html'));
  }

  // Remove DevTools in production to avoid autofill errors
  if (!app.isPackaged) {
    win.webContents.openDevTools();
  }
}

// Enhanced silent printing with Canon MF240 compatibility
ipcMain.handle('silent-print', async (event, printData) => {
  try {
    const win = BrowserWindow.getFocusedWindow();
    if (win) {
      // Canon MF240 compatible settings
      const printOptions = {
        silent: true,
        printBackground: true,
        color: false, // Canon MF240 is typically B&W
        margins: {
          marginType: 'minimum' // Changed from 'none' for Canon compatibility
        },
        pageSize: 'A4',
        scaleFactor: 100,
        landscape: false,
        copies: 1,
        // Add device-specific settings
        deviceName: 'Canon MF240', // Specify your printer
        dpi: {
          horizontal: 600,
          vertical: 600
        }
      };
      
      console.log('Attempting to print with Canon MF240 settings...');
      await win.webContents.print(printOptions);
      
      return { success: true };
    }
    return { success: false, error: 'No window found' };
  } catch (error) {
    console.error('Silent print failed:', error);
    
    // Fallback: Try with basic settings
    try {
      console.log('Trying fallback print settings...');
      await win.webContents.print({
        silent: false, // Show dialog as fallback
        printBackground: true,
        margins: { marginType: 'default' }
      });
      return { success: true, fallback: true };
    } catch (fallbackError) {
      return { success: false, error: fallbackError.message };
    }
  }
});

// Alternative method for Canon MF240
ipcMain.on('silent-print-html', async (event, htmlContent) => {
  try {
    const printWindow = new BrowserWindow({
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
      }
    });
    
    await printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);
    
    // Wait for content to load
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Canon MF240 specific settings
    const printOptions = {
      silent: true,
      printBackground: true,
      color: false, // Canon MF240 is B&W
      margins: {
        marginType: 'minimum',
        top: 0.5,
        bottom: 0.5,
        left: 0.5,
        right: 0.5
      },
      pageSize: 'A4',
      scaleFactor: 100,
      deviceName: 'Canon MF240'
    };
    
    await printWindow.webContents.print(printOptions);
    printWindow.close();
    
    console.log('Canon MF240 print job sent successfully');
  } catch (error) {
    console.error('HTML print failed:', error);
    
    // Fallback: Try system print dialog
    try {
      await printWindow.webContents.print({ silent: false });
      printWindow.close();
    } catch (fallbackError) {
      console.error('Fallback print also failed:', fallbackError);
      printWindow.close();
    }
  }
});

// Add printer detection
ipcMain.handle('get-printers', async () => {
  try {
    const win = BrowserWindow.getFocusedWindow();
    if (win) {
      const printers = await win.webContents.getPrinters();
      console.log('Available printers:', printers);
      return printers;
    }
    return [];
  } catch (error) {
    console.error('Failed to get printers:', error);
    return [];
  }
});

app.whenReady().then(createWindow);
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
