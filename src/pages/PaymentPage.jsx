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

  // Main printing function
  const handlePrinting = async () => {
    setIsPrinting(true)
    console.log("🚀 STARTING DIRECT PRINTING...")

    try {
      let totalItemsPrinted = 0
      const totalCanvasPages = pages.length
      const totalPDFItems = printQueue.length

      console.log(`📊 CANVAS PAGES TO PRINT: ${totalCanvasPages}`)
      console.log(`📊 PDF ITEMS TO PRINT: ${totalPDFItems}`)

      // STEP 1: Print Canvas Pages
      if (pages && pages.length > 0) {
        console.log(`🎨 PRINTING ${pages.length} CANVAS PAGES...`)
        setPrintProgress(`Starting to print ${pages.length} canvas pages...`)

        for (let i = 0; i < pages.length; i++) {
          const page = pages[i]
          console.log(`🎨 Processing Canvas Page ${page.id}...`)
          setPrintProgress(`Printing canvas page ${i + 1} of ${pages.length}...`)

          try {
            const canvasHTML = generateCanvasPageHTML(page, i + 1)
            await printCanvasPage(canvasHTML, `Canvas Page ${page.id}`)
            totalItemsPrinted++

            console.log(`✅ Canvas page ${page.id} sent to print`)
            setPrintProgress(`Canvas page ${i + 1} sent to Windows Print Queue!`)

            // Short delay between pages
            await new Promise((resolve) => setTimeout(resolve, 1000))
          } catch (error) {
            console.error(`❌ Error printing canvas page ${page.id}:`, error)
            setPrintProgress(`Error printing canvas page ${page.id}: ${error.message}`)
          }
        }
      }

      // STEP 2: Print PDF Queue Items
      if (printQueue && printQueue.length > 0) {
        console.log(`📄 PRINTING ${printQueue.length} PDF ITEMS...`)
        setPrintProgress(`Starting to print ${printQueue.length} PDF documents...`)

        for (let i = 0; i < printQueue.length; i++) {
          const pdfItem = printQueue[i]
          console.log(`📄 Processing PDF: ${pdfItem.fileName}`)
          setPrintProgress(`Printing PDF ${i + 1} of ${printQueue.length}: ${pdfItem.fileName}...`)

          try {
            await printPDF(pdfItem)
            totalItemsPrinted++

            console.log(`✅ PDF ${pdfItem.fileName} sent to print`)
            setPrintProgress(`PDF ${pdfItem.fileName} sent to Windows Print Queue!`)

            // Short delay between PDFs
            await new Promise((resolve) => setTimeout(resolve, 2000))
          } catch (error) {
            console.error(`❌ Error printing PDF ${pdfItem.fileName}:`, error)
            setPrintProgress(`Error printing PDF ${pdfItem.fileName} to print queue: ${error.message}`)
          }
        }
      }

      // SUCCESS
      console.log(`🎉 PRINTING COMPLETED! ${totalItemsPrinted} items sent to print`)
      setPrintProgress(`All ${totalItemsPrinted} items sent to Windows Print Queue! Check your print queue now.`)

      setTimeout(() => {
        setPaymentStatus("success")
        startCountdown()
      }, 2000)
    } catch (error) {
      console.error("❌ CRITICAL PRINTING ERROR:", error)
      setPrintProgress(`Printing failed: ${error.message}`)
      alert(
        `❌ Printing failed: ${error.message}\n\nPlease check:\n1. Printer is connected\n2. Printer has paper\n3. Printer is turned on`,
      )
      setPaymentStatus("pending")
    } finally {
      setIsPrinting(false)
    }
  }

  // Generate Canvas Page HTML for printing
  const generateCanvasPageHTML = (page, pageNumber) => {
    const colorClass = page.colorMode === "bw" ? "bw-filter" : "color-filter"

    let itemsHTML = ""
    if (page.items && page.items.length > 0) {
      page.items.forEach((item, index) => {
        try {
          const fileURL = URL.createObjectURL(item.file)
          // Convert canvas pixels to A4 millimeters
          const xMM = (item.x / 743.75) * 210 // A4 width = 210mm
          const yMM = (item.y / 1052.5) * 297 // A4 height = 297mm
          const widthMM = (item.width / 743.75) * 210
          const heightMM = (item.height / 1052.5) * 297

          itemsHTML += `
          <div style="position: absolute; left: ${xMM}mm; top: ${yMM}mm; width: ${widthMM}mm; height: ${heightMM}mm; transform: rotate(${item.rotation || 0}deg); overflow: hidden;">
            <img src="${fileURL}" style="width: 100%; height: 100%; object-fit: contain;" alt="Canvas Item ${index + 1}" />
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
      <title>PrinIT Canvas Page ${pageNumber}</title>
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
          font-family: Arial, sans-serif;
        }
        .bw-filter { filter: grayscale(100%); }
        .color-filter { filter: none; }
        .page-info {
          position: absolute;
          bottom: 5mm;
          right: 5mm;
          font-size: 8pt;
          color: #666;
        }
      </style>
    </head>
    <body class="${colorClass}">
      ${itemsHTML}
      <div class="page-info">PrinIT Canvas Page ${pageNumber}</div>
    </body>
    </html>
  `
  }

  // Print Canvas Page (HTML content)
  const printCanvasPage = async (htmlContent, description) => {
    console.log(`🖨️ PRINTING CANVAS: ${description}`)

    try {
      if (window.require) {
        const { ipcRenderer } = window.require("electron")
        // Send HTML content to Electron main process for printing
        ipcRenderer.send("silent-print-html", htmlContent)
        console.log(`✅ CANVAS SENT TO ELECTRON PRINTER: ${description}`)
        // Wait for a short period for the IPC message to be processed
        await new Promise((resolve) => setTimeout(resolve, 500))
      } else {
        console.log(`🌐 WEB FALLBACK FOR CANVAS: ${description}`)
        // Web fallback - open print dialog (will appear in browser if not Electron)
        const printWindow = window.open("", "_blank", "width=794,height=1123")
        if (printWindow) {
          printWindow.document.write(htmlContent)
          printWindow.document.close()
          setTimeout(() => {
            printWindow.print()
            setTimeout(() => printWindow.close(), 2000)
          }, 1000)
        }
      }
    } catch (error) {
      console.error(`❌ CANVAS PRINT ERROR for ${description}:`, error)
      throw error
    }
  }

  // Print PDF
  const printPDF = async (pdfItem) => {
    console.log(`📄 PRINTING PDF: ${pdfItem.fileName}`)

    try {
      if (window.require) {
        const { ipcRenderer } = window.require("electron")

        // Convert PDF file to array buffer
        const pdfData = await pdfItem.file.arrayBuffer()

        // Send PDF data to Electron main process for native printing
        const result = await ipcRenderer.invoke("print-pdf-native", Array.from(new Uint8Array(pdfData)))

        if (result.success) {
          console.log(`✅ PDF ${pdfItem.fileName} sent to native printer`)
        } else {
          throw new Error(result.error)
        }
      } else {
        console.log(`🌐 WEB FALLBACK FOR PDF: ${pdfItem.fileName}`)
        // Web fallback - open PDF in new window for printing
        const pdfUrl = URL.createObjectURL(pdfItem.file)
        const printWindow = window.open(pdfUrl, "_blank")
        if (printWindow) {
          setTimeout(() => {
            printWindow.print()
          }, 2000)
        }
      }
    } catch (error) {
      console.error(`❌ PDF PRINT ERROR for ${pdfItem.fileName}:`, error)
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
              <h2>Printing in Progress</h2>
              <p>Sending print jobs to your Windows Print Queue...</p>

              <div style={{ marginTop: "20px", padding: "16px", background: "#f0f8ff", borderRadius: "8px" }}>
                <p>
                  <strong>🖨️ Current Status:</strong>
                </p>
                <p style={{ fontStyle: "italic", color: "#2e7d32" }}>
                  {printProgress || "Initializing Windows printing..."}
                </p>

                <div style={{ marginTop: "16px" }}>
                  <p>
                    <strong>Print Queue Items:</strong>
                  </p>
                  {pages.length > 0 && <p>• {pages.length} canvas pages</p>}
                  {printQueue.length > 0 && (
                    <>
                      {printQueue.map((item, index) => (
                        <p key={index}>
                          • {item.fileName} ({item.printSettings.copies} copies, {item.printSettings.pageRange} pages,{" "}
                          {item.printSettings.colorMode === "color" ? "Color" : "B&W"},{" "}
                          {item.printSettings.doubleSided === "both-sides" ? "Double-sided" : "Single-sided"})
                        </p>
                      ))}
                    </>
                  )}
                </div>

                <p style={{ marginTop: "12px", fontWeight: "bold", color: "#2e7d32" }}>
                  ⚡ Jobs sent directly to Windows Print Spooler!
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
              <h2>Printing Successful!</h2>
              <p>All print jobs sent to your Windows Print Queue!</p>
              <p>Check your Windows Print Queue for processing jobs.</p>

              <div style={{ marginTop: "20px", padding: "16px", background: "#e8f5e8", borderRadius: "8px" }}>
                <p>
                  <strong>✅ Print Summary:</strong>
                </p>
                {pages.length > 0 && <p>• {pages.length} canvas pages sent (silently via Electron)</p>}
                {printQueue.length > 0 && <p>• {printQueue.length} PDF documents sent (via default PDF viewer)</p>}
                <p>• All items sent directly to Windows Print Spooler</p>
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
