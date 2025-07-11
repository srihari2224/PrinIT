const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { exec } = require('child_process');

let mainWindow; // Store the main window reference

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

  mainWindow = win; // Store the reference to the main window

  if (!app.isPackaged) {
    win.loadURL('http://localhost:5173');
  } else {
    win.loadFile(path.join(__dirname, 'dist', 'index.html'));
  }

  if (!app.isPackaged) {
    win.webContents.openDevTools();
  }
}

// Create temp directory for print files
const tempDir = path.join(os.tmpdir(), 'prinit-temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

// Get printers (existing logic, should be fine)
ipcMain.handle('get-printers', async () => {
  try {
    console.log('🖨️ Getting printers...');
    
    return new Promise((resolve) => {
      exec('wmic printer get name /format:list', { timeout: 5000 }, (error, stdout) => {
        if (error) {
          console.error('❌ Error getting printers:', error);
          resolve([{ name: 'Default Printer', status: 0 }]);
          return;
        }

        try {
          const printers = [];
          const lines = stdout.split('\n').filter(line => line.includes('Name=') && line.trim() !== 'Name=');
          
          lines.forEach(line => {
            const name = line.replace('Name=', '').trim();
            if (name) {
              printers.push({ name: name, status: 0 });
            }
          });
          
          if (printers.length === 0) {
            printers.push({ name: 'Default Printer', status: 0 });
          }
          
          console.log('✅ Found printers:', printers);
          resolve(printers);
        } catch (parseError) {
          console.error('❌ Error parsing printers:', parseError);
          resolve([{ name: 'Default Printer', status: 0 }]);
        }
      });
    });
  } catch (error) {
    console.error('❌ Failed to get printers:', error);
    return [{ name: 'Default Printer', status: 0 }];
  }
});

// Print HTML content (for Canvas pages) directly using Electron's webContents.print()
ipcMain.on('silent-print-html', async (event, htmlContent) => {
  try {
    if (!mainWindow) {
      console.error('❌ mainWindow not available for printing HTML.');
      event.reply('print-status', { status: 'error', message: 'Electron window not ready for printing.' });
      return;
    }

    console.log('🖨️ Printing HTML content via Electron webContents.print()...');
    event.reply('print-status', { status: 'processing', message: 'Sending canvas page to Electron printer...' });

    // Create a temporary hidden BrowserWindow for printing HTML content
    const printWindow = new BrowserWindow({
      show: false, // Keep it hidden
      webPreferences: {
        contextIsolation: false,
        nodeIntegration: true,
      },
    });

    // Load the HTML content into the hidden window using a data URL
    const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`;
    await printWindow.loadURL(dataUrl);

    // Wait for content to load before printing
    printWindow.webContents.on('did-finish-load', async () => {
      try {
        // Print the content silently
        await printWindow.webContents.print({ silent: true, printBackground: true });
        console.log('✅ HTML content sent to printer silently via Electron webContents.print().');
        event.reply('print-status', { status: 'success', message: 'Canvas page sent to Windows Print Queue!' });
      } catch (printError) {
        console.error('❌ Error printing HTML via webContents.print():', printError);
        event.reply('print-status', { status: 'error', message: `Failed to print canvas page: ${printError.message}` });
      } finally {
        printWindow.close(); // Close the hidden window after printing
      }
    });

  } catch (error) {
    console.error('❌ Error in silent-print-html IPC handler:', error);
    event.reply('print-status', { status: 'error', message: `Print failed: ${error.message}` });
  }
});

// NEW: Print PDF files directly using Electron's webContents.print()
ipcMain.handle('print-pdf-native', async (event, pdfDataArray) => {
  try {
    if (!mainWindow) {
      console.error('❌ mainWindow not available for printing PDF.');
      return { success: false, error: 'Electron window not ready for printing.' };
    }

    console.log('📄 STARTING PDF PRINT via Electron webContents.print()...');
    
    // Convert Uint8Array back to Buffer
    const pdfBuffer = Buffer.from(pdfDataArray);
    
    // Create a data URL for the PDF
    const dataUrl = `data:application/pdf;base64,${pdfBuffer.toString('base64')}`;

    // Create a temporary hidden BrowserWindow for printing PDF content
    const printWindow = new BrowserWindow({
      show: false, // Keep it hidden
      webPreferences: {
        contextIsolation: false,
        nodeIntegration: true,
        plugins: true, // Enable PDF viewer plugin
      },
    });

    await printWindow.loadURL(dataUrl);

    await new Promise((resolve, reject) => {
      printWindow.webContents.on('did-finish-load', async () => {
        try {
          // Print the PDF content silently
          await printWindow.webContents.print({ silent: true, printBackground: true });
          console.log('✅ PDF content sent to printer silently via Electron webContents.print().');
          resolve();
        } catch (printError) {
          console.error('❌ Error printing PDF via webContents.print():', printError);
          reject(printError);
        } finally {
          printWindow.close(); // Close the hidden window after printing
        }
      });
      printWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
        console.error('❌ PDF load failed:', errorDescription);
        reject(new Error(`Failed to load PDF for printing: ${errorDescription}`));
        printWindow.close();
      });
    });
    
    return { success: true, message: 'PDF sent to Windows Print Queue!' };
    
  } catch (error) {
    console.error('❌ PDF PRINT ERROR:', error);
    return { success: false, error: error.message };
  }
});

// Test print using Electron's webContents.print()
ipcMain.handle('test-print', async (event) => {
  try {
    if (!mainWindow) {
      console.error('❌ mainWindow not available for test printing.');
      return { success: false, error: 'Electron window not ready for test printing.' };
    }

    console.log('🧪 STARTING TEST PRINT...');
    
    const testHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          @page { size: A4; margin: 1in; }
          body { 
            font-family: Arial, sans-serif; 
            font-size: 14pt; 
            text-align: center;
            margin-top: 2in;
          }
          .test-box {
            border: 3px solid #000;
            padding: 20px;
            background: #f0f0f0;
          }
        </style>
      </head>
      <body>
        <div class="test-box">
          <h1>🖨️ PrinIT TEST PRINT</h1>
          <p><strong>SUCCESS!</strong> This is a test print from PrinIT!</p>
          <p>Date: ${new Date().toLocaleString()}</p>
          <p>If you see this, printing is working!</p>
          <p>Check your Windows Print Queue!</p>
        </div>
      </body>
      </html>
    `;

    // Create a temporary hidden BrowserWindow for test printing
    const printWindow = new BrowserWindow({
      show: false, // Keep it hidden
      webPreferences: {
        contextIsolation: false,
        nodeIntegration: true,
      },
    });

    const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(testHTML)}`;
    await printWindow.loadURL(dataUrl);

    await new Promise((resolve, reject) => {
      printWindow.webContents.on('did-finish-load', async () => {
        try {
          await printWindow.webContents.print({ silent: true, printBackground: true });
          console.log('✅ Test print sent silently via Electron webContents.print().');
          resolve();
        } catch (printError) {
          console.error('❌ Error printing test HTML via webContents.print():', printError);
          reject(printError);
        } finally {
          printWindow.close();
        }
      });
    });

    return { success: true, message: 'Test print sent! Check your Windows Print Queue!' };
    
  } catch (error) {
    console.error('❌ TEST PRINT ERROR:', error);
    return { success: false, error: error.message };
  }
});

app.whenReady().then(createWindow);
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
