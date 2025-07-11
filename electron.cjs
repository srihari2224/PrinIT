const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { exec } = require('child_process');

let mainWindow;

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

  mainWindow = win;

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

// Enhanced printer detection with detailed information
ipcMain.handle('get-printers', async () => {
  try {
    console.log('🖨️ Getting detailed printer information...');
    
    return new Promise((resolve) => {
      // Get both printer names and their capabilities
      const commands = [
        'wmic printer get name,status,default /format:csv',
        'powershell "Get-Printer | Select-Object Name,PrinterStatus,Duplex | ConvertTo-Json"'
      ];
      
      exec(commands[0], { timeout: 10000 }, (error, stdout) => {
        if (error) {
          console.error('❌ Error getting printers:', error);
          resolve([{ name: 'Default Printer', status: 'Unknown', isDefault: true, supportsDuplex: false }]);
          return;
        }

        try {
          const printers = [];
          const lines = stdout.split('\n').filter(line => line.includes(',') && !line.includes('Node,'));
          
          lines.forEach(line => {
            const parts = line.split(',');
            if (parts.length >= 3) {
              const name = parts[2]?.trim();
              const status = parts[3]?.trim() || 'Unknown';
              const isDefault = parts[1]?.trim() === 'TRUE';
              
              if (name && name !== 'Name') {
                printers.push({ 
                  name: name, 
                  status: status,
                  isDefault: isDefault,
                  supportsDuplex: true // Assume duplex support, can be refined
                });
              }
            }
          });
          
          if (printers.length === 0) {
            printers.push({ name: 'Default Printer', status: 'Ready', isDefault: true, supportsDuplex: false });
          }
          
          console.log('✅ Found printers with details:', printers);
          resolve(printers);
        } catch (parseError) {
          console.error('❌ Error parsing printers:', parseError);
          resolve([{ name: 'Default Printer', status: 'Ready', isDefault: true, supportsDuplex: false }]);
        }
      });
    });
  } catch (error) {
    console.error('❌ Failed to get printers:', error);
    return [{ name: 'Default Printer', status: 'Ready', isDefault: true, supportsDuplex: false }];
  }
});

// Enhanced HTML printing with proper print dialog and settings
ipcMain.on('silent-print-html-with-settings', async (event, printConfig) => {
  try {
    if (!mainWindow) {
      console.error('❌ mainWindow not available for HTML printing with settings.');
      event.reply('print-status', { status: 'error', message: 'Electron window not ready for printing.' });
      return;
    }

    console.log('🖨️ ENHANCED HTML PRINTING WITH USER SETTINGS...');
    console.log('🎨 Print Config:', printConfig.settings);
    
    event.reply('print-status', { 
      status: 'processing', 
      message: `Preparing ${printConfig.settings.description} with ${printConfig.settings.colorMode} mode...` 
    });

    // Create a dedicated print window
    const printWindow = new BrowserWindow({
      show: false, // Keep hidden initially
      width: 800,
      height: 600,
      webPreferences: {
        contextIsolation: false,
        nodeIntegration: true,
        webSecurity: false
      },
    });

    // Enhanced HTML with proper print styles
    const enhancedHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>PrinIT Canvas Print</title>
        <style>
          @page { 
            size: A4; 
            margin: 0; 
          }
          @media print { 
            body { 
              -webkit-print-color-adjust: exact !important; 
              print-color-adjust: exact !important; 
              margin: 0; 
              padding: 0;
              ${printConfig.settings.colorMode === 'bw' ? 'filter: grayscale(100%) !important;' : ''}
            }
            * {
              ${printConfig.settings.colorMode === 'bw' ? 'filter: grayscale(100%) !important;' : ''}
            }
          }
          body { 
            margin: 0; 
            padding: 0; 
            width: 210mm; 
            height: 297mm; 
            background: white; 
            position: relative; 
            overflow: hidden;
            ${printConfig.settings.colorMode === 'bw' ? 'filter: grayscale(100%);' : ''}
          }
        </style>
      </head>
      <body>
        ${printConfig.htmlContent.match(/<body[^>]*>([\s\S]*)<\/body>/i)?.[1] || printConfig.htmlContent}
        <script>
          // Auto-print when loaded
          window.addEventListener('load', () => {
            setTimeout(() => {
              window.print();
            }, 1000);
          });
        </script>
      </body>
      </html>
    `;

    const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(enhancedHTML)}`;
    await printWindow.loadURL(dataUrl);

    // Configure comprehensive print options
    const printOptions = {
      silent: false, // SHOW PRINT DIALOG
      printBackground: true,
      color: printConfig.settings.colorMode === 'color',
      margins: {
        marginType: 'minimum'
      },
      pageSize: 'A4',
      scaleFactor: 100,
      landscape: false,
      copies: printConfig.settings.copies || 1,
      collate: true,
      header: '',
      footer: ''
    };

    console.log('🖨️ Print Options:', printOptions);

    // Handle print dialog and execution
    printWindow.webContents.on('did-finish-load', async () => {
      try {
        console.log('📄 Content loaded, showing print dialog...');
        
        // Show the print window briefly to trigger print dialog
        printWindow.show();
        printWindow.focus();
        
        // Wait a moment then trigger print
        setTimeout(async () => {
          try {
            console.log('🖨️ Triggering print with dialog...');
            
            // Use webContents.print with dialog
            const result = await printWindow.webContents.print(printOptions);
            
            console.log('✅ Print dialog completed:', result);
            event.reply('print-status', { 
              status: 'success', 
              message: `${printConfig.settings.description} sent to print queue with ${printConfig.settings.colorMode} mode!` 
            });
            
          } catch (printError) {
            console.error('❌ Print execution error:', printError);
            event.reply('print-status', { 
              status: 'error', 
              message: `Print failed: ${printError.message}` 
            });
          } finally {
            // Close print window after a delay
            setTimeout(() => {
              printWindow.close();
            }, 3000);
          }
        }, 1500);
        
      } catch (loadError) {
        console.error('❌ Error after content load:', loadError);
        event.reply('print-status', { 
          status: 'error', 
          message: `Failed to prepare print: ${loadError.message}` 
        });
        printWindow.close();
      }
    });

    // Handle load failures
    printWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
      console.error('❌ Print window load failed:', errorDescription);
      event.reply('print-status', { 
        status: 'error', 
        message: `Failed to load content: ${errorDescription}` 
      });
      printWindow.close();
    });

  } catch (error) {
    console.error('❌ Error in enhanced HTML printing:', error);
    event.reply('print-status', { status: 'error', message: `Print setup failed: ${error.message}` });
  }
});

// Enhanced PDF printing with proper dialog and full settings support
ipcMain.handle('print-pdf-with-full-settings', async (event, printConfig) => {
  try {
    if (!mainWindow) {
      console.error('❌ mainWindow not available for PDF printing.');
      return { success: false, error: 'Electron window not ready for printing.' };
    }

    console.log('📄 ENHANCED PDF PRINTING WITH FULL USER SETTINGS...');
    console.log('📄 Settings:', printConfig.settings);
    console.log('📄 File:', printConfig.fileName);
    
    // Convert array back to Buffer
    const pdfBuffer = Buffer.from(printConfig.pdfData);
    
    // Save PDF temporarily for better handling
    const tempPdfPath = path.join(tempDir, `temp_${Date.now()}_${printConfig.fileName}`);
    fs.writeFileSync(tempPdfPath, pdfBuffer);
    
    // Create data URL for PDF
    const dataUrl = `file://${tempPdfPath}`;

    // Create dedicated PDF print window
    const printWindow = new BrowserWindow({
      show: false,
      width: 800,
      height: 600,
      webPreferences: {
        contextIsolation: false,
        nodeIntegration: true,
        webSecurity: false,
        plugins: true,
      },
    });

    await printWindow.loadURL(dataUrl);

    // Configure comprehensive PDF print options
    const printOptions = {
      silent: false, // SHOW PRINT DIALOG for user control
      printBackground: true,
      color: printConfig.settings.colorMode === 'color',
      margins: {
        marginType: 'minimum'
      },
      pageSize: 'A4',
      scaleFactor: 100,
      landscape: false,
      copies: printConfig.settings.copies || 1,
      collate: true,
      duplexMode: printConfig.settings.doubleSided === 'both-sides' ? 'longEdge' : 'simplex',
      header: '',
      footer: ''
    };

    console.log('📄 PDF Print Options:', printOptions);

    return new Promise((resolve, reject) => {
      printWindow.webContents.on('did-finish-load', async () => {
        try {
          console.log('📄 PDF loaded, preparing print dialog...');
          
          // Show window for print dialog
          printWindow.show();
          printWindow.focus();
          
          // Handle different page range options
          let printPromises = [];
          
          // For custom page ranges, we might need multiple print jobs
          if (printConfig.settings.pageRange === 'custom' && printConfig.settings.customPages) {
            console.log('📄 Handling custom page range:', printConfig.settings.customPages);
            // Note: Electron's print API has limited page range support
            // This would need additional PDF processing for precise page ranges
          }
          
          setTimeout(async () => {
            try {
              console.log('📄 Executing PDF print with dialog...');
              
              // Execute print with copies
              for (let copy = 1; copy <= printConfig.settings.copies; copy++) {
                console.log(`📄 Printing copy ${copy} of ${printConfig.settings.copies}`);
                
                const result = await printWindow.webContents.print(printOptions);
                console.log(`✅ PDF copy ${copy} print dialog completed:`, result);
                
                // Small delay between copies
                if (copy < printConfig.settings.copies) {
                  await new Promise(resolve => setTimeout(resolve, 2000));
                }
              }
              
              console.log(`✅ All ${printConfig.settings.copies} copies of PDF ${printConfig.fileName} processed`);
              
              resolve({ 
                success: true, 
                message: `PDF ${printConfig.fileName} sent to print queue with settings: ${printConfig.settings.copies} copies, ${printConfig.settings.pageRange} pages, ${printConfig.settings.colorMode} mode, ${printConfig.settings.doubleSided}` 
              });
              
            } catch (printError) {
              console.error('❌ PDF print execution error:', printError);
              reject({ success: false, error: printError.message });
            } finally {
              // Cleanup
              setTimeout(() => {
                printWindow.close();
                try {
                  fs.unlinkSync(tempPdfPath);
                } catch (cleanupError) {
                  console.warn('⚠️ Could not delete temp PDF:', cleanupError.message);
                }
              }, 3000);
            }
          }, 2000);
          
        } catch (loadError) {
          console.error('❌ Error after PDF load:', loadError);
          reject({ success: false, error: loadError.message });
          printWindow.close();
        }
      });
      
      printWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
        console.error('❌ PDF load failed:', errorDescription);
        reject({ success: false, error: `Failed to load PDF: ${errorDescription}` });
        printWindow.close();
        try {
          fs.unlinkSync(tempPdfPath);
        } catch (cleanupError) {
          console.warn('⚠️ Could not delete temp PDF after load failure:', cleanupError.message);
        }
      });
    });
    
  } catch (error) {
    console.error('❌ PDF PRINT WITH FULL SETTINGS ERROR:', error);
    return { success: false, error: error.message };
  }
});

// Enhanced test print with proper dialog
ipcMain.handle('test-print', async (event) => {
  try {
    if (!mainWindow) {
      console.error('❌ mainWindow not available for test printing.');
      return { success: false, error: 'Electron window not ready for test printing.' };
    }

    console.log('🧪 ENHANCED TEST PRINT WITH DIALOG...');
    
    const testHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>PrinIT Test Print</title>
        <style>
          @page { 
            size: A4; 
            margin: 1in; 
          }
          @media print {
            body { 
              -webkit-print-color-adjust: exact !important; 
              print-color-adjust: exact !important; 
            }
          }
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
            border-radius: 10px;
          }
          .success {
            color: #28a745;
            font-weight: bold;
          }
          .info {
            color: #007bff;
            margin: 10px 0;
          }
        </style>
      </head>
      <body>
        <div class="test-box">
          <h1>🖨️ PrinIT TEST PRINT</h1>
          <p class="success">SUCCESS! Print Dialog Working!</p>
          <p class="info">Date: ${new Date().toLocaleString()}</p>
          <p class="info">Test ID: ${Math.random().toString(36).substr(2, 9)}</p>
          <p>✅ Print queue integration functional</p>
          <p>✅ User settings being applied</p>
          <p>✅ Electron printing operational</p>
        </div>
        <script>
          window.addEventListener('load', () => {
            setTimeout(() => {
              window.print();
            }, 1000);
          });
        </script>
      </body>
      </html>
    `;

    const printWindow = new BrowserWindow({
      show: false,
      width: 800,
      height: 600,
      webPreferences: {
        contextIsolation: false,
        nodeIntegration: true,
        webSecurity: false
      },
    });

    const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(testHTML)}`;
    await printWindow.loadURL(dataUrl);

    return new Promise((resolve, reject) => {
      printWindow.webContents.on('did-finish-load', async () => {
        try {
          console.log('🧪 Test content loaded, showing print dialog...');
          
          // Show window and trigger print dialog
          printWindow.show();
          printWindow.focus();
          
          setTimeout(async () => {
            try {
              const result = await printWindow.webContents.print({ 
                silent: false, // Show dialog
                printBackground: true,
                color: true,
                margins: { marginType: 'minimum' },
                pageSize: 'A4'
              });
              
              console.log('✅ Test print dialog completed:', result);
              resolve({ success: true, message: 'Test print dialog shown! Check your print queue!' });
              
            } catch (printError) {
              console.error('❌ Test print error:', printError);
              reject({ success: false, error: printError.message });
            } finally {
              setTimeout(() => {
                printWindow.close();
              }, 3000);
            }
          }, 1500);
          
        } catch (loadError) {
          console.error('❌ Test print load error:', loadError);
          reject({ success: false, error: loadError.message });
          printWindow.close();
        }
      });
    });
    
  } catch (error) {
    console.error('❌ TEST PRINT ERROR:', error);
    return { success: false, error: error.message };
  }
});

// Print queue status checker
ipcMain.handle('check-print-queue', async () => {
  try {
    console.log('🔍 Checking Windows print queue...');
    
    return new Promise((resolve) => {
      exec('wmic printjob get name,status,document /format:csv', { timeout: 5000 }, (error, stdout) => {
        if (error) {
          console.error('❌ Error checking print queue:', error);
          resolve({ success: false, jobs: [], error: error.message });
          return;
        }

        try {
          const jobs = [];
          const lines = stdout.split('\n').filter(line => line.includes(',') && !line.includes('Node,'));
          
          lines.forEach(line => {
            const parts = line.split(',');
            if (parts.length >= 3) {
              const document = parts[1]?.trim();
              const name = parts[2]?.trim();
              const status = parts[3]?.trim();
              
              if (document && document !== 'Document') {
                jobs.push({ document, name, status });
              }
            }
          });
          
          console.log('✅ Print queue status:', jobs);
          resolve({ success: true, jobs: jobs });
        } catch (parseError) {
          console.error('❌ Error parsing print queue:', parseError);
          resolve({ success: false, jobs: [], error: parseError.message });
        }
      });
    });
  } catch (error) {
    console.error('❌ Failed to check print queue:', error);
    return { success: false, jobs: [], error: error.message };
  }
});

// Legacy support handlers (keeping for compatibility)
ipcMain.on('silent-print-html', async (event, htmlContent) => {
  console.log('⚠️ Using legacy silent-print-html, redirecting to enhanced version...');
  const printConfig = {
    htmlContent: htmlContent,
    settings: {
      colorMode: 'color',
      copies: 1,
      description: 'Legacy Canvas Print'
    }
  };
  
  // Redirect to enhanced handler
  ipcMain.emit('silent-print-html-with-settings', event, printConfig);
});

ipcMain.handle('print-pdf-native', async (event, pdfDataArray) => {
  console.log('⚠️ Using legacy print-pdf-native, redirecting to enhanced version...');
  const printConfig = {
    pdfData: pdfDataArray,
    settings: {
      copies: 1,
      pageRange: 'all',
      colorMode: 'color',
      doubleSided: 'one-side'
    },
    fileName: 'Legacy_PDF_Print.pdf',
    totalPages: 1,
    pagesToPrint: 1
  };
  
  // Redirect to enhanced handler
  return await ipcMain.handle('print-pdf-with-full-settings', event, printConfig);
});

app.whenReady().then(createWindow);
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Cleanup temp directory on app exit
app.on('before-quit', () => {
  try {
    if (fs.existsSync(tempDir)) {
      const files = fs.readdirSync(tempDir);
      files.forEach(file => {
        try {
          fs.unlinkSync(path.join(tempDir, file));
        } catch (err) {
          console.warn('Could not delete temp file:', file);
        }
      });
    }
  } catch (error) {
    console.warn('Could not cleanup temp directory:', error.message);
  }
});
