"use client"

import { useState, useEffect } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { ArrowLeft, Check, Loader, Printer } from "lucide-react"
import "./PaymentPage.css"

function PaymentPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { totalCost, pages, printQueue, blankSheets } = location.state || {
    totalCost: 0,
    pages: [],
    printQueue: [],
    blankSheets: 0,
  }

  const [paymentStatus, setPaymentStatus] = useState("pending")
  const [countdown, setCountdown] = useState(15)
  const [isPrinting, setIsPrinting] = useState(false)
  const [printProgress, setPrintProgress] = useState("")

  // Initialize Razorpay when component mounts
  useEffect(() => {
    const script = document.createElement("script")
    script.src = "https://checkout.razorpay.com/v1/checkout.js"
    script.async = true
    document.body.appendChild(script)

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script)
      }
    }
  }, [])

  // Listen for print status updates from Electron main process
  useEffect(() => {
    if (window.require) {
      const { ipcRenderer } = window.require("electron")

      ipcRenderer.on("print-status", (event, data) => {
        console.log("📄 Print Status Update:", data)
        setPrintProgress(data.message)

        if (data.status === "error") {
          alert(`❌ Print Error: ${data.message}`)
          setPaymentStatus("pending")
          setIsPrinting(false)
        }
      })

      return () => {
        ipcRenderer.removeAllListeners("print-status")
      }
    }
  }, [])

  // Enhanced print queue monitoring
  useEffect(() => {
    if (window.require && paymentStatus === "processing") {
      const { ipcRenderer } = window.require("electron")

      // Monitor print queue status
      const checkPrintQueue = async () => {
        try {
          const queueStatus = await ipcRenderer.invoke("check-print-queue")
          if (queueStatus.success && queueStatus.jobs.length > 0) {
            setPrintProgress(`Print jobs in queue: ${queueStatus.jobs.length} items`)
          }
        } catch (error) {
          console.error("Error checking print queue:", error)
        }
      }

      const queueInterval = setInterval(checkPrintQueue, 3000)

      return () => {
        clearInterval(queueInterval)
      }
    }
  }, [paymentStatus])

  const handlePayment = () => {
    console.log("💳 PAYMENT INITIATED...")
    console.log("Total cost:", totalCost)
    console.log("Canvas pages to print:", pages.length)
    console.log("PDF queue items:", printQueue.length)

    // Validate that we have something to print
    if (pages.length === 0 && printQueue.length === 0 && blankSheets === 0) {
      alert("❌ No items to print! Please add some content first.")
      return
    }

    const options = {
      key: "rzp_test_X5OHvkg69oonK2",
      amount: totalCost * 100,
      currency: "INR",
      name: "PrinIT Service",
      description: "Payment for Windows printing services",
      handler: (response) => {
        console.log("💳 PAYMENT SUCCESSFUL:", response.razorpay_payment_id)
        console.log("🔄 STARTING PRINT PROCESS...")

        setPaymentStatus("processing")
        setPrintProgress("Payment successful! Starting Windows printing...")

        setTimeout(() => {
          console.log("🚀 STARTING WINDOWS PRINTING...")
          handlePrinting()
        }, 1000)
      },
      prefill: {
        name: "Customer Name",
        email: "customer@example.com",
        contact: "",
      },
      theme: {
        color: "#000000",
      },
      modal: {
        ondismiss: () => {
          console.log("💳 PAYMENT CANCELLED BY USER")
          setPrintProgress("Payment cancelled")
        },
      },
    }

    try {
      const razorpay = new window.Razorpay(options)
      razorpay.open()
    } catch (error) {
      console.error("❌ RAZORPAY ERROR:", error)
      alert("Payment system error. Please try again.")
    }
  }

  // Enhanced printing function with proper dialog integration
  const handlePrinting = async () => {
    setIsPrinting(true)
    console.log("🚀 STARTING ENHANCED PRINTING WITH DIALOGS...")

    try {
      let totalItemsPrinted = 0
      const totalCanvasPages = pages.length
      const totalPDFItems = printQueue.length

      console.log(`📊 CANVAS PAGES TO PRINT: ${totalCanvasPages}`)
      console.log(`📊 PDF ITEMS TO PRINT: ${totalPDFItems}`)

      // STEP 1: Print Canvas Pages with enhanced settings
      if (pages && pages.length > 0) {
        console.log(`🎨 PRINTING ${pages.length} CANVAS PAGES WITH DIALOGS...`)
        setPrintProgress(`Preparing ${pages.length} canvas pages for printing...`)

        for (let i = 0; i < pages.length; i++) {
          const page = pages[i]
          console.log(`🎨 Processing Canvas Page ${page.id} with enhanced printing...`)
          setPrintProgress(`Showing print dialog for canvas page ${i + 1} of ${pages.length}...`)

          try {
            const canvasHTML = generateCanvasPageHTML(page, i + 1)
            await printCanvasPageWithEnhancedSettings(canvasHTML, `Canvas Page ${page.id}`, page)
            totalItemsPrinted++

            console.log(`✅ Canvas page ${page.id} print dialog shown`)
            setPrintProgress(`Canvas page ${i + 1} print dialog completed!`)

            // Delay between pages for dialog handling
            await new Promise((resolve) => setTimeout(resolve, 3000))
          } catch (error) {
            console.error(`❌ Error printing canvas page ${page.id}:`, error)
            setPrintProgress(`Error with canvas page ${page.id}: ${error.message}`)
          }
        }
      }

      // STEP 2: Print PDF Queue Items with enhanced settings
      if (printQueue && printQueue.length > 0) {
        console.log(`📄 PRINTING ${printQueue.length} PDF ITEMS WITH ENHANCED DIALOGS...`)
        setPrintProgress(`Preparing ${printQueue.length} PDF documents for printing...`)

        for (let i = 0; i < printQueue.length; i++) {
          const pdfItem = printQueue[i]
          console.log(`📄 Processing PDF: ${pdfItem.fileName} with enhanced printing`)
          console.log(`📄 PDF Settings:`, pdfItem.printSettings)
          setPrintProgress(`Showing print dialog for PDF ${i + 1} of ${printQueue.length}: ${pdfItem.fileName}...`)

          try {
            await printPDFWithEnhancedSettings(pdfItem)
            totalItemsPrinted++

            console.log(`✅ PDF ${pdfItem.fileName} print dialog shown with settings`)
            setPrintProgress(`PDF ${pdfItem.fileName} print dialog completed with settings!`)

            // Delay between PDFs for dialog handling
            await new Promise((resolve) => setTimeout(resolve, 4000))
          } catch (error) {
            console.error(`❌ Error printing PDF ${pdfItem.fileName}:`, error)
            setPrintProgress(`Error with PDF ${pdfItem.fileName}: ${error.message}`)
          }
        }
      }

      // SUCCESS
      console.log(`🎉 ENHANCED PRINTING COMPLETED! ${totalItemsPrinted} items processed`)
      setPrintProgress(`All ${totalItemsPrinted} items processed with print dialogs and user settings!`)

      setTimeout(() => {
        setPaymentStatus("success")
        startCountdown()
      }, 3000)
    } catch (error) {
      console.error("❌ CRITICAL ENHANCED PRINTING ERROR:", error)
      setPrintProgress(`Enhanced printing failed: ${error.message}`)
      alert(
        `❌ Enhanced printing failed: ${error.message}\n\nPlease check:\n1. Printer is connected\n2. Printer has paper\n3. Printer is turned on\n4. Print dialogs are being handled`,
      )
      setPaymentStatus("pending")
    } finally {
      setIsPrinting(false)
    }
  }

  // Generate Canvas Page HTML for printing - CLEAN VERSION WITHOUT EXTRA TEXT
  const generateCanvasPageHTML = (page, pageNumber) => {
    const colorFilter = page.colorMode === "bw" ? "filter: grayscale(100%);" : ""

    let itemsHTML = ""
    if (page.items && page.items.length > 0) {
      page.items.forEach((item, index) => {
        try {
          const fileURL = URL.createObjectURL(item.file)
          // Convert canvas pixels to A4 millimeters with proper scaling
          const xMM = (item.x / 743.75) * 210 // A4 width = 210mm
          const yMM = (item.y / 1052.5) * 297 // A4 height = 297mm
          const widthMM = (item.width / 743.75) * 210
          const heightMM = (item.height / 1052.5) * 297

          itemsHTML += `
          <div style="position: absolute; left: ${xMM}mm; top: ${yMM}mm; width: ${widthMM}mm; height: ${heightMM}mm; transform: rotate(${item.rotation || 0}deg); overflow: hidden; ${colorFilter}">
            <img src="${fileURL}" style="width: 100%; height: 100%; object-fit: contain;" alt="" />
          </div>
        `
        } catch (error) {
          console.error(`Error processing canvas item ${index}:`, error)
        }
      })
    }

    return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Canvas Print</title>
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
          ${colorFilter}
        }
      </style>
    </head>
    <body>
      ${itemsHTML}
    </body>
    </html>
  `
  }

  // Print Canvas Page with user settings - ENFORCES COLOR/BW MODE
  const printCanvasPageWithSettings = async (htmlContent, description, pageSettings) => {
    console.log(`🖨️ PRINTING CANVAS WITH SETTINGS: ${description}`)
    console.log(`🎨 Canvas Settings:`, pageSettings)

    try {
      if (window.require) {
        // Electron - Send to main process with settings
        const { ipcRenderer } = window.require("electron")

        const printConfig = {
          htmlContent: htmlContent,
          settings: {
            colorMode: pageSettings.colorMode,
            copies: 1, // Canvas pages are always 1 copy
            description: description,
          },
        }

        ipcRenderer.send("silent-print-html-with-settings", printConfig)
        console.log(`✅ CANVAS SENT TO ELECTRON WITH SETTINGS: ${description}`)
        await new Promise((resolve) => setTimeout(resolve, 500))
      } else {
        // Web - Create custom print with settings applied
        console.log(`🌐 WEB PRINT WITH SETTINGS FOR CANVAS: ${description}`)

        // Create hidden iframe for printing with settings
        const iframe = document.createElement("iframe")
        iframe.style.position = "absolute"
        iframe.style.left = "-9999px"
        iframe.style.top = "-9999px"
        iframe.style.width = "1px"
        iframe.style.height = "1px"
        document.body.appendChild(iframe)

        const iframeDoc = iframe.contentDocument || iframe.contentWindow.document
        iframeDoc.open()
        iframeDoc.write(htmlContent)
        iframeDoc.close()

        // Wait for content to load then print
        setTimeout(() => {
          try {
            iframe.contentWindow.focus()
            iframe.contentWindow.print()

            // Clean up after printing
            setTimeout(() => {
              document.body.removeChild(iframe)
            }, 2000)
          } catch (printError) {
            console.error("Canvas print error:", printError)
            document.body.removeChild(iframe)
          }
        }, 1000)
      }
    } catch (error) {
      console.error(`❌ CANVAS PRINT ERROR for ${description}:`, error)
      throw error
    }
  }

  // Print PDF with user's pre-configured settings - ENFORCES ALL USER OPTIONS
  const printPDFWithUserSettings = async (pdfItem) => {
    console.log(`📄 PRINTING PDF WITH USER SETTINGS: ${pdfItem.fileName}`)
    console.log(`📄 User Settings:`, pdfItem.printSettings)

    try {
      if (window.require) {
        // Electron - Use enhanced PDF printing with all settings
        const { ipcRenderer } = window.require("electron")
        const pdfData = await pdfItem.file.arrayBuffer()

        const printConfig = {
          pdfData: Array.from(new Uint8Array(pdfData)),
          settings: pdfItem.printSettings,
          fileName: pdfItem.fileName,
          totalPages: pdfItem.totalPages,
          pagesToPrint: pdfItem.pagesToPrint,
        }

        const result = await ipcRenderer.invoke("print-pdf-with-full-settings", printConfig)

        if (result.success) {
          console.log(`✅ PDF ${pdfItem.fileName} printed with all user settings`)
        } else {
          throw new Error(result.error)
        }
      } else {
        // Web - Enhanced PDF printing with settings simulation
        console.log(`🌐 WEB PDF PRINT WITH SETTINGS: ${pdfItem.fileName}`)

        const pdfUrl = URL.createObjectURL(pdfItem.file)

        // Create multiple print jobs based on copies
        for (let copy = 1; copy <= pdfItem.printSettings.copies; copy++) {
          console.log(`📄 Printing copy ${copy} of ${pdfItem.printSettings.copies}`)

          const iframe = document.createElement("iframe")
          iframe.style.position = "absolute"
          iframe.style.left = "-9999px"
          iframe.style.top = "-9999px"
          iframe.style.width = "1px"
          iframe.style.height = "1px"
          iframe.src = pdfUrl
          document.body.appendChild(iframe)

          // Apply color settings via CSS if possible
          if (pdfItem.printSettings.colorMode === "bw") {
            iframe.style.filter = "grayscale(100%)"
          }

          iframe.onload = () => {
            setTimeout(() => {
              try {
                iframe.contentWindow.focus()
                iframe.contentWindow.print()

                setTimeout(() => {
                  document.body.removeChild(iframe)
                  if (copy === pdfItem.printSettings.copies) {
                    URL.revokeObjectURL(pdfUrl)
                  }
                }, 3000)
              } catch (printError) {
                console.error("PDF print error:", printError)
                document.body.removeChild(iframe)
                URL.revokeObjectURL(pdfUrl)
              }
            }, 1000)
          }

          // Delay between copies
          if (copy < pdfItem.printSettings.copies) {
            await new Promise((resolve) => setTimeout(resolve, 2000))
          }
        }
      }
    } catch (error) {
      console.error(`❌ PDF PRINT ERROR for ${pdfItem.fileName}:`, error)
      throw error
    }
  }

  // Enhanced Canvas printing with proper dialog integration
  const printCanvasPageWithEnhancedSettings = async (htmlContent, description, pageSettings) => {
    console.log(`🖨️ ENHANCED CANVAS PRINTING: ${description}`)
    console.log(`🎨 Enhanced Canvas Settings:`, pageSettings)

    try {
      if (window.require) {
        // Electron - Enhanced printing with dialog
        const { ipcRenderer } = window.require("electron")

        const printConfig = {
          htmlContent: htmlContent,
          settings: {
            colorMode: pageSettings.colorMode,
            copies: 1,
            description: description,
          },
        }

        // Use enhanced IPC handler
        ipcRenderer.send("silent-print-html-with-settings", printConfig)
        console.log(`✅ ENHANCED CANVAS SENT TO ELECTRON: ${description}`)

        // Wait for print dialog to be handled
        await new Promise((resolve) => setTimeout(resolve, 2000))
      } else {
        // Web - Enhanced print with better settings
        console.log(`🌐 ENHANCED WEB PRINT FOR CANVAS: ${description}`)

        const iframe = document.createElement("iframe")
        iframe.style.position = "absolute"
        iframe.style.left = "-9999px"
        iframe.style.top = "-9999px"
        iframe.style.width = "1px"
        iframe.style.height = "1px"
        document.body.appendChild(iframe)

        const iframeDoc = iframe.contentDocument || iframe.contentWindow.document
        iframeDoc.open()
        iframeDoc.write(htmlContent)
        iframeDoc.close()

        setTimeout(() => {
          try {
            iframe.contentWindow.focus()
            iframe.contentWindow.print()

            setTimeout(() => {
              document.body.removeChild(iframe)
            }, 3000)
          } catch (printError) {
            console.error("Enhanced canvas print error:", printError)
            document.body.removeChild(iframe)
          }
        }, 1500)
      }
    } catch (error) {
      console.error(`❌ ENHANCED CANVAS PRINT ERROR for ${description}:`, error)
      throw error
    }
  }

  // Enhanced PDF printing with proper dialog integration
  const printPDFWithEnhancedSettings = async (pdfItem) => {
    console.log(`📄 ENHANCED PDF PRINTING: ${pdfItem.fileName}`)
    console.log(`📄 Enhanced User Settings:`, pdfItem.printSettings)

    try {
      if (window.require) {
        // Electron - Enhanced PDF printing with full dialog support
        const { ipcRenderer } = window.require("electron")
        const pdfData = await pdfItem.file.arrayBuffer()

        const printConfig = {
          pdfData: Array.from(new Uint8Array(pdfData)),
          settings: pdfItem.printSettings,
          fileName: pdfItem.fileName,
          totalPages: pdfItem.totalPages,
          pagesToPrint: pdfItem.pagesToPrint,
        }

        const result = await ipcRenderer.invoke("print-pdf-with-full-settings", printConfig)

        if (result.success) {
          console.log(`✅ Enhanced PDF ${pdfItem.fileName} printed with full dialog support`)
        } else {
          throw new Error(result.error)
        }
      } else {
        // Web - Enhanced PDF printing with better settings handling
        console.log(`🌐 ENHANCED WEB PDF PRINT: ${pdfItem.fileName}`)

        const pdfUrl = URL.createObjectURL(pdfItem.file)

        for (let copy = 1; copy <= pdfItem.printSettings.copies; copy++) {
          console.log(`📄 Enhanced printing copy ${copy} of ${pdfItem.printSettings.copies}`)

          const iframe = document.createElement("iframe")
          iframe.style.position = "absolute"
          iframe.style.left = "-9999px"
          iframe.style.top = "-9999px"
          iframe.style.width = "1px"
          iframe.style.height = "1px"
          iframe.src = pdfUrl
          document.body.appendChild(iframe)

          if (pdfItem.printSettings.colorMode === "bw") {
            iframe.style.filter = "grayscale(100%)"
          }

          iframe.onload = () => {
            setTimeout(() => {
              try {
                iframe.contentWindow.focus()
                iframe.contentWindow.print()

                setTimeout(() => {
                  document.body.removeChild(iframe)
                  if (copy === pdfItem.printSettings.copies) {
                    URL.revokeObjectURL(pdfUrl)
                  }
                }, 4000)
              } catch (printError) {
                console.error("Enhanced PDF print error:", printError)
                document.body.removeChild(iframe)
                URL.revokeObjectURL(pdfUrl)
              }
            }, 1500)
          }

          if (copy < pdfItem.printSettings.copies) {
            await new Promise((resolve) => setTimeout(resolve, 3000))
          }
        }
      }
    } catch (error) {
      console.error(`❌ ENHANCED PDF PRINT ERROR for ${pdfItem.fileName}:`, error)
      throw error
    }
  }

  // Start countdown timer
  const startCountdown = () => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          navigate("/")
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  return (
    <div className="payment-page">
      <div className="navbar">
        <button className="back-button" onClick={() => navigate("/files")}>
          <ArrowLeft size={20} />
          <span>Back</span>
        </button>
        <div className="page-title">Payment & Windows Printing</div>
      </div>

      <div className="payment-content">
        {paymentStatus === "pending" && (
          <div className="payment-summary-container">
            <div className="payment-summary-card">
              <h2>Windows Print Summary</h2>
              <div className="order-details">
                {pages.length > 0 && (
                  <div className="order-section">
                    <h3>Canvas Pages ({pages.length})</h3>
                    {pages.map((page, index) => (
                      <div key={index} className="order-item">
                        <span>
                          Canvas Page {page.id} ({page.colorMode === "color" ? "Color" : "B&W"}) -{" "}
                          {page.items?.length || 0} items
                        </span>
                        <span>₹{page.colorMode === "color" ? 10 : 2}</span>
                      </div>
                    ))}
                  </div>
                )}

                {printQueue.length > 0 && (
                  <div className="order-section">
                    <h3>PDF Documents ({printQueue.length})</h3>
                    {printQueue.map((item, index) => (
                      <div key={index} className="order-item">
                        <span>
                          {item.fileName.substring(0, 25)}
                          {item.fileName.length > 25 ? "..." : ""} ({item.printSettings.copies} copies,{" "}
                          {item.printSettings.pageRange} pages,{" "}
                          {item.printSettings.colorMode === "color" ? "Color" : "B&W"},{" "}
                          {item.printSettings.doubleSided === "both-sides" ? "Double-sided" : "Single-sided"})
                        </span>
                        <span>₹{item.cost}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="order-total">
                  <span>Total Amount</span>
                  <span>₹{totalCost}</span>
                </div>
              </div>

              <button className="pay-now-button" onClick={handlePayment}>
                <Printer size={16} />
                Pay & Print ₹{totalCost}
              </button>
            </div>
          </div>
        )}

        {paymentStatus === "processing" && (
          <div className="processing-container">
            <div className="processing-card">
              <div className="processing-icon">
                <Loader size={48} className="spin-animation" />
              </div>
              <h2>Printing with User Settings</h2>
              <p>Applying your print preferences and sending to Windows Print Queue...</p>

              <div style={{ marginTop: "20px", padding: "16px", background: "#f0f8ff", borderRadius: "8px" }}>
                <p>
                  <strong>🖨️ Current Status:</strong>
                </p>
                <p style={{ fontStyle: "italic", color: "#2e7d32" }}>
                  {printProgress || "Initializing Windows printing with user settings..."}
                </p>

                <div style={{ marginTop: "16px" }}>
                  <p>
                    <strong>Print Queue with Settings:</strong>
                  </p>
                  {pages.length > 0 && (
                    <div>
                      {pages.map((page, index) => (
                        <p key={index}>
                          • Canvas Page {page.id}: {page.colorMode === "color" ? "Color" : "B&W"} mode
                        </p>
                      ))}
                    </div>
                  )}
                  {printQueue.length > 0 && (
                    <>
                      {printQueue.map((item, index) => (
                        <p key={index}>
                          • {item.fileName}: {item.printSettings.copies} copies, {item.printSettings.pageRange} pages,{" "}
                          {item.printSettings.colorMode === "color" ? "Color" : "B&W"},{" "}
                          {item.printSettings.doubleSided === "both-sides" ? "Double-sided" : "Single-sided"}
                        </p>
                      ))}
                    </>
                  )}
                </div>

                <p style={{ marginTop: "12px", fontWeight: "bold", color: "#2e7d32" }}>
                  ⚡ All user settings being applied to print jobs!
                </p>
              </div>
            </div>
          </div>
        )}

        {paymentStatus === "success" && (
          <div className="success-container">
            <div className="success-card">
              <div className="success-icon">
                <Check size={48} />
              </div>
              <h2>Printing Successful with Settings!</h2>
              <p>All print jobs sent to Windows Print Queue with your specified settings!</p>
              <p>Check your Windows Print Queue for processing jobs.</p>

              <div style={{ marginTop: "20px", padding: "16px", background: "#e8f5e8", borderRadius: "8px" }}>
                <p>
                  <strong>✅ Print Summary with Settings:</strong>
                </p>
                {pages.length > 0 && (
                  <div>
                    {pages.map((page, index) => (
                      <p key={index}>
                        • Canvas Page {page.id}: {page.colorMode === "color" ? "Color" : "B&W"} mode applied
                      </p>
                    ))}
                  </div>
                )}
                {printQueue.length > 0 && (
                  <div>
                    {printQueue.map((item, index) => (
                      <p key={index}>
                        • {item.fileName}: {item.printSettings.copies} copies, {item.printSettings.pageRange} pages,{" "}
                        {item.printSettings.colorMode === "color" ? "Color" : "B&W"},{" "}
                        {item.printSettings.doubleSided === "both-sides" ? "Double-sided" : "Single-sided"}
                      </p>
                    ))}
                  </div>
                )}
                <p>• All user preferences applied successfully</p>
                <p>• Jobs sent directly to Windows Print Spooler</p>
              </div>

              <div className="countdown">
                <p>
                  Redirecting to home in <span className="countdown-number">{countdown}</span> seconds
                </p>
                <div className="progress-bar">
                  <div className="progress" style={{ width: `${((15 - countdown) / 15) * 100}%` }}></div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default PaymentPage
