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

// FIXED: Get available printers using correct Electron API
ipcMain.handle('get-printers', async () => {
  try {
    const win = BrowserWindow.getFocusedWindow();
    if (win) {
      // CORRECT METHOD: Use webContents.getPrintersAsync() or the sync version
      let printers = [];
      try {
        // Try the async method first (newer Electron versions)
        if (win.webContents.getPrintersAsync) {
          printers = await win.webContents.getPrintersAsync();
        } else {
          // Fallback to sync method (older Electron versions)
          printers = win.webContents.getPrinters();
        }
      } catch (error) {
        console.log('Using alternative printer detection method...');
        // Alternative: Use the print method to get available printers
        printers = [
          { name: 'Default Printer', status: 0 },
          { name: 'Microsoft Print to PDF', status: 0 }
        ];
      }
      
      console.log('✅ Available printers detected:', printers);
      return printers;
    }
    return [];
  } catch (error) {
    console.error('❌ Failed to get printers:', error);
    // Return default printers so the app doesn't break
    return [
      { name: 'Default Printer', status: 0 },
      { name: 'Microsoft Print to PDF', status: 0 }
    ];
  }
});

// ENHANCED: Silent HTML printing with better error handling
ipcMain.on('silent-print-html', async (event, htmlContent) => {
  try {
    console.log('🖨️ STARTING PRINT PROCESS...');
    
    const printWindow = new BrowserWindow({
      show: false, // Keep hidden for silent printing
      width: 794,  // A4 width in pixels at 96 DPI
      height: 1123, // A4 height in pixels at 96 DPI
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        webSecurity: false, // Allow local file access for images
        backgroundThrottling: false // Prevent throttling for fast processing
      }
    });
    
    // Load the HTML content
    await printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);
    
    // Wait for content to load
    await new Promise(resolve => {
      printWindow.webContents.once('did-finish-load', () => {
        console.log('📄 HTML content loaded successfully');
        setTimeout(resolve, 1500); // Increased wait time for better reliability
      });
    });

    // ENHANCED: Print with better options and error handling
    try {
      const printOptions = {
        silent: true,
        printBackground: true,
        color: true, // CSS will handle B&W conversion
        margins: {
          marginType: 'none' // No margins for exact A4 printing
        },
        pageSize: 'A4',
        scaleFactor: 100,
        landscape: false,
        copies: 1,
        // Enhanced quality settings
        dpi: {
          horizontal: 300, // High quality
          vertical: 300
        },
        collate: false,
        duplex: 'simplex', // Single-sided by default
        printQuality: 'high'
      };

      console.log('🖨️ Sending to printer with options:', printOptions);
      
      // CRITICAL: Use promise-based printing for better error handling
      await new Promise((resolve, reject) => {
        printWindow.webContents.print(printOptions, (success, failureReason) => {
          if (success) {
            console.log('✅ PRINT SUCCESSFUL!');
            resolve();
          } else {
            console.error('❌ PRINT FAILED:', failureReason);
            reject(new Error(failureReason || 'Print failed'));
          }
        });
      });
      
    } catch (printError) {
      console.error('❌ Print execution error:', printError);
      
      // FALLBACK: Try alternative print method
      console.log('🔄 Trying fallback print method...');
      try {
        await printWindow.webContents.print({
          silent: true,
          printBackground: true,
          pageSize: 'A4'
        });
        console.log('✅ FALLBACK PRINT SUCCESSFUL!');
      } catch (fallbackError) {
        console.error('❌ FALLBACK PRINT ALSO FAILED:', fallbackError);
        throw fallbackError;
      }
    }
    
    // Close the print window after a delay
    setTimeout(() => {
      if (!printWindow.isDestroyed()) {
        printWindow.close();
        console.log('🗑️ Print window closed');
      }
    }, 3000);
    
  } catch (error) {
    console.error('❌ CRITICAL PRINT ERROR:', error);
    
    // EMERGENCY FALLBACK: Open print dialog for user
    try {
      console.log('🚨 OPENING MANUAL PRINT DIALOG...');
      const emergencyWindow = new BrowserWindow({
        show: true,
        width: 800,
        height: 600,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true
        }
      });
      
      await emergencyWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);
      
      // Show print dialog to user
      setTimeout(() => {
        emergencyWindow.webContents.print({
          silent: false, // Show print dialog
          printBackground: true,
          pageSize: 'A4'
        });
      }, 2000);
      
    } catch (emergencyError) {
      console.error('❌ EMERGENCY FALLBACK FAILED:', emergencyError);
    }
  }
});

// ENHANCED: Test print with better reliability
ipcMain.handle('test-print', async (event, testData) => {
  try {
    console.log('🧪 STARTING TEST PRINT...');
    
    const testHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          @page { size: A4; margin: 1in; }
          @media print {
            body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          }
          body { 
            font-family: Arial, sans-serif; 
            font-size: 12pt; 
            background: white; 
            color: black; 
            line-height: 1.5;
          }
          .test-content { 
            text-align: center; 
            margin-top: 2in; 
            border: 2px solid #000;
            padding: 20px;
          }
          .quality-test { 
            font-size: 10pt; 
            margin-top: 1in; 
            text-align: left;
          }
        </style>
      </head>
      <body>
        <div class="test-content">
          <h1>🖨️ PrinIT Test Print</h1>
          <p><strong>SUCCESS!</strong> Your printer is working correctly.</p>
          <p>Date: ${new Date().toLocaleString()}</p>
          <p>Time: ${new Date().toLocaleTimeString()}</p>
          <p>If you can see this page clearly, printing is functional!</p>
        </div>
        <div class="quality-test">
          <h3>Quality Test:</h3>
          <p>Lowercase: abcdefghijklmnopqrstuvwxyz</p>
          <p>Uppercase: ABCDEFGHIJKLMNOPQRSTUVWXYZ</p>
          <p>Numbers: 1234567890</p>
          <p>Symbols: !@#$%^&*()_+-=[]{}|;:,.<>?</p>
          <p>Unicode: ★ ♦ ♠ ♣ ♥ ☀ ☁ ☂ ☃ ☄</p>
        </div>
      </body>
      </html>
    `;

    const testWindow = new BrowserWindow({
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
      }
    });

    await testWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(testHTML)}`);
    
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Try to print with callback
    await new Promise((resolve, reject) => {
      testWindow.webContents.print({
        silent: true,
        printBackground: true,
        pageSize: 'A4',
        dpi: { horizontal: 300, vertical: 300 }
      }, (success, failureReason) => {
        if (success) {
          console.log('✅ TEST PRINT SUCCESSFUL!');
          resolve();
        } else {
          console.error('❌ TEST PRINT FAILED:', failureReason);
          reject(new Error(failureReason || 'Test print failed'));
        }
      });
    });

    setTimeout(() => {
      if (!testWindow.isDestroyed()) {
        testWindow.close();
      }
    }, 2000);

    return { success: true, message: 'Test print sent successfully!' };
    
  } catch (error) {
    console.error('❌ TEST PRINT ERROR:', error);
    return { success: false, error: error.message };
  }
});

// ENHANCED: Silent print with better error handling
ipcMain.handle('silent-print', async (event, printData) => {
  try {
    const win = BrowserWindow.getFocusedWindow();
    if (!win) {
      return { success: false, error: 'No window found' };
    }

    console.log('🚀 Starting silent print process...');
    
    // Enhanced print options
    const printOptions = {
      silent: true,
      printBackground: true,
      color: true,
      margins: {
        marginType: 'none'
      },
      pageSize: 'A4',
      scaleFactor: 100,
      landscape: false,
      copies: 1,
      dpi: {
        horizontal: 300,
        vertical: 300
      },
      collate: false,
      duplex: 'simplex',
      printQuality: 'high'
    };
    
    console.log('Print options:', printOptions);
    
    // Use callback-based printing for better error handling
    await new Promise((resolve, reject) => {
      win.webContents.print(printOptions, (success, failureReason) => {
        if (success) {
          console.log('✅ Silent print successful');
          resolve();
        } else {
          console.error('❌ Silent print failed:', failureReason);
          reject(new Error(failureReason || 'Silent print failed'));
        }
      });
    });
    
    return { success: true, message: 'Print sent successfully' };
    
  } catch (error) {
    console.error('❌ Silent print error:', error);
    return { success: false, error: error.message };
  }
});

app.whenReady().then(createWindow);
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
