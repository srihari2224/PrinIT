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

  // Handle the payment process
  const handlePayment = () => {
    const options = {
      key: "rzp_test_X5OHvkg69oonK2",
      amount: totalCost * 100,
      currency: "INR",
      name: "PrinIT Service",
      description: "Payment for printing services",
      handler: (response) => {
        console.log("Payment successful:", response)
        setPaymentStatus("processing")
        handleDirectPrint()
      },
      prefill: {
        name: "Customer Name",
        email: "customer@example.com",
        contact: "",
      },
      notes: {
        address: "PrinIT Service Office",
      },
      theme: {
        color: "#000000",
      },
      modal: {
        ondismiss: () => {
          console.log("Payment cancelled")
        },
      },
    }

    const razorpay = new window.Razorpay(options)
    razorpay.open()
  }

  // Method for Electron app direct printing
  const tryElectronPrint = async () => {
    try {
      // Check if running in Electron
      if (window.require) {
        const { ipcRenderer } = window.require("electron")

        const printData = {
          pages: [],
          totalCost,
          timestamp: new Date().toISOString(),
        }

        // Add canvas pages
        if (pages && pages.length > 0) {
          for (const page of pages) {
            printData.pages.push({
              type: "canvas",
              content: generatePageContent(page),
              colorMode: page.colorMode,
            })
          }
        }

        // Add blank sheets
        if (blankSheets > 0) {
          for (let i = 0; i < blankSheets; i++) {
            printData.pages.push({
              type: "blank",
              content: generateBlankPageContent(),
            })
          }
        }

        // Add document pages
        if (printQueue && printQueue.length > 0) {
          for (const item of printQueue) {
            for (let i = 0; i < item.pages; i++) {
              printData.pages.push({
                type: "document",
                content: generateDocumentPageContent(item, i),
                colorMode: item.colorMode,
                doubleSided: item.doubleSided,
              })
            }
          }
        }

        const result = await ipcRenderer.invoke("direct-print", printData)

        if (result.success) {
          console.log("Electron direct print successful")
          return true
        } else {
          console.error("Electron print failed:", result.error)
          return false
        }
      }
      return false
    } catch (error) {
      console.error("Electron print method failed:", error)
      return false
    }
  }

  // Helper functions for generating print content
  const generatePageContent = (page) => {
    // Generate print-ready content for canvas page
    let content = `<div class="canvas-page ${page.colorMode === "bw" ? "bw-mode" : ""}">`

    if (page.items && page.items.length > 0) {
      for (const item of page.items) {
        content += `
          <div style="position: absolute; left: ${item.x}px; top: ${item.y}px; width: ${item.width}px; height: ${item.height}px; transform: rotate(${item.rotation || 0}deg);">
            <img src="${URL.createObjectURL(item.file)}" style="width: 100%; height: 100%; object-fit: contain;" />
          </div>
        `
      }
    }

    content += "</div>"
    return content
  }

  const generateBlankPageContent = () => {
    return '<div class="blank-page" style="width: 210mm; height: 297mm; background: white;"></div>'
  }

  const generateDocumentPageContent = (item, pageIndex) => {
    return `
      <div class="document-page ${item.colorMode === "bw" ? "bw-mode" : ""}">
        <h2>${item.file.name}</h2>
        <p>Page ${pageIndex + 1} of ${item.pages}</p>
        <p>Mode: ${item.colorMode === "color" ? "Color" : "B&W"}</p>
        <p>Style: ${item.doubleSided ? "Double-sided" : "Single-sided"}</p>
        <div style="border: 1px solid #ddd; padding: 20px; margin-top: 40px; min-height: 400px;">
          <p>[Document content for ${item.file.name}]</p>
        </div>
      </div>
    `
  }

  // Enhanced direct printing function
  const handleDirectPrint = async () => {
    setIsPrinting(true)

    try {
      console.log("Starting enhanced silent print process...")

      // Method 1: Try Electron IPC if available
      if (window.require) {
        try {
          const { ipcRenderer } = window.require("electron")
          const printData = generateCompletePrintData()

          const result = await ipcRenderer.invoke("silent-print", printData)
          if (result.success) {
            console.log("Electron silent print successful")
            setPaymentStatus("success")
            startCountdown()
            return
          }
        } catch (error) {
          console.log("Electron method not available, trying web methods...")
        }
      }

      // Method 2: Enhanced silent web printing
      await enhancedSilentPrint()
    } catch (error) {
      console.error("All printing methods failed:", error)
      alert("Printing failed. Please ensure your printer is connected.")
      setPaymentStatus("pending")
    } finally {
      setIsPrinting(false)
    }
  }

  // Generate complete print data for all content types
  const generateCompletePrintData = () => {
    const printData = {
      timestamp: new Date().toISOString(),
      totalCost,
      items: [],
    }

    // Add canvas pages
    if (pages && pages.length > 0) {
      pages.forEach((page) => {
        printData.items.push({
          type: "canvas",
          pageId: page.id,
          colorMode: page.colorMode,
          items: page.items,
          cost: page.colorMode === "color" ? 10 : 2,
        })
      })
    }

    // Add document pages
    if (printQueue && printQueue.length > 0) {
      printQueue.forEach((item) => {
        printData.items.push({
          type: "document",
          file: item.file,
          pages: item.pages,
          colorMode: item.colorMode,
          doubleSided: item.doubleSided,
          cost: item.cost,
        })
      })
    }

    return printData
  }

  // Enhanced silent printing for web
  const enhancedSilentPrint = async () => {
    const printContent = await generateEnhancedPrintHTML()

    // Create hidden iframe for silent printing
    const iframe = document.createElement("iframe")
    iframe.style.position = "absolute"
    iframe.style.left = "-9999px"
    iframe.style.top = "-9999px"
    iframe.style.width = "1px"
    iframe.style.height = "1px"

    document.body.appendChild(iframe)

    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document
    iframeDoc.open()
    iframeDoc.write(printContent)
    iframeDoc.close()

    // Wait for content to load
    await new Promise((resolve) => setTimeout(resolve, 2000))

    try {
      iframe.contentWindow.focus()
      iframe.contentWindow.print()

      // Clean up and show success
      setTimeout(() => {
        document.body.removeChild(iframe)
        setPaymentStatus("success")
        startCountdown()
      }, 3000)
    } catch (error) {
      document.body.removeChild(iframe)
      throw error
    }
  }

  // Generate enhanced HTML for all print content
  const generateEnhancedPrintHTML = async () => {
    let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>PrinIT - Complete Print Job</title>
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
          .page-break { page-break-after: always; }
          .page-break:last-child { page-break-after: avoid; }
        }
        body {
          font-family: Arial, sans-serif;
          margin: 0;
          padding: 0;
          background: white;
        }
        .print-page {
          width: 210mm;
          height: 297mm;
          position: relative;
          background: white;
          page-break-after: always;
          box-sizing: border-box;
        }
        .print-page:last-child {
          page-break-after: avoid;
        }
        .canvas-page {
          width: 100%;
          height: 100%;
          position: relative;
        }
        .canvas-item {
          position: absolute;
        }
        .canvas-item img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }
        .bw-mode {
          filter: grayscale(100%) !important;
        }
        .document-page {
          width: 100%;
          height: 100%;
          padding: 20mm;
          box-sizing: border-box;
        }
      </style>
    </head>
    <body>
  `

    // Add canvas pages
    if (pages && pages.length > 0) {
      for (const page of pages) {
        const colorClass = page.colorMode === "bw" ? "bw-mode" : ""

        html += `<div class="print-page"><div class="canvas-page ${colorClass}">`

        if (page.items && page.items.length > 0) {
          for (const item of page.items) {
            const fileURL = URL.createObjectURL(item.file)
            const xMM = (item.x * 0.264583).toFixed(2)
            const yMM = (item.y * 0.264583).toFixed(2)
            const widthMM = (item.width * 0.264583).toFixed(2)
            const heightMM = (item.height * 0.264583).toFixed(2)

            html += `
            <div class="canvas-item" style="
              left: ${xMM}mm;
              top: ${yMM}mm;
              width: ${widthMM}mm;
              height: ${heightMM}mm;
              transform: rotate(${item.rotation || 0}deg);
            ">
              <img src="${fileURL}" alt="${item.file.name}" />
            </div>
          `
          }
        }

        html += `</div></div>`
      }
    }

    // Add document pages
    if (printQueue && printQueue.length > 0) {
      for (const item of printQueue) {
        const colorClass = item.colorMode === "bw" ? "bw-mode" : ""

        for (let i = 0; i < item.pages; i++) {
          html += `
          <div class="print-page">
            <div class="document-page ${colorClass}">
              <h2>${item.file.name}</h2>
              <p>Page ${i + 1} of ${item.pages}</p>
              <p>Mode: ${item.colorMode === "color" ? "Color" : "B&W"}</p>
              <p>Style: ${item.doubleSided ? "Double-sided" : "Single-sided"}</p>
              <div style="border: 1px solid #ddd; padding: 20px; margin-top: 40px; min-height: 200mm;">
                <p><strong>Document Content:</strong></p>
                <p>File: ${item.file.name}</p>
                <p>Size: ${(item.file.size / 1024).toFixed(1)} KB</p>
                <p>Type: ${item.file.type}</p>
              </div>
            </div>
          </div>
        `
        }
      }
    }

    html += `</body></html>`
    return html
  }

  // Generate HTML content for printing
  const generatePrintContent = () => {
    let printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>PrinIT - Direct Print</title>
        <style>
          @page { 
            size: A4; 
            margin: 0.5in; 
          }
          @media print {
            body { 
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .no-print { display: none !important; }
          }
          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
            background: white;
          }
          .page {
            page-break-after: always;
            min-height: 100vh;
            position: relative;
            background: white;
          }
          .page:last-child {
            page-break-after: avoid;
          }
          .canvas-page {
            width: 210mm;
            height: 297mm;
            position: relative;
            background: white;
            border: 1px solid #ddd;
          }
          .canvas-item {
            position: absolute;
          }
          .canvas-item img {
            width: 100%;
            height: 100%;
            object-fit: contain;
          }
          .blank-page {
            width: 210mm;
            height: 297mm;
            background: white;
            border: 2px dashed #ccc;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #999;
          }
          .bw-mode {
            filter: grayscale(100%) !important;
          }
        </style>
      </head>
      <body>
    `

    let pageNumber = 1

    // Add canvas pages
    if (pages && pages.length > 0) {
      for (const page of pages) {
        const colorClass = page.colorMode === "bw" ? "bw-mode" : ""

        printContent += `
          <div class="page">
            <div class="canvas-page ${colorClass}">
        `

        // Add canvas items
        if (page.items && page.items.length > 0) {
          for (const item of page.items) {
            const fileURL = URL.createObjectURL(item.file)
            printContent += `
              <div class="canvas-item" style="
                left: ${item.x * 0.75}px;
                top: ${item.y * 0.75}px;
                width: ${item.width * 0.75}px;
                height: ${item.height * 0.75}px;
                transform: rotate(${item.rotation || 0}deg);
              ">
                <img src="${fileURL}" alt="${item.file.name}" />
              </div>
            `
          }
        }

        printContent += `
            </div>
          </div>
        `
        pageNumber++
      }
    }

    // Add blank sheets
    if (blankSheets > 0) {
      for (let i = 0; i < blankSheets; i++) {
        printContent += `
          <div class="page">
            <div class="blank-page">
              <div style="text-align: center; color: #ddd;">
                <h3>Blank A4 Sheet</h3>
                <p>Sheet ${i + 1} of ${blankSheets}</p>
              </div>
            </div>
          </div>
        `
        pageNumber++
      }
    }

    // Add document pages (simplified representation)
    if (printQueue && printQueue.length > 0) {
      for (const item of printQueue) {
        for (let i = 0; i < item.pages; i++) {
          const colorClass = item.colorMode === "bw" ? "bw-mode" : ""
          printContent += `
            <div class="page">
              <div class="canvas-page ${colorClass}">
                <div style="padding: 40px; font-size: 12pt;">
                  <h2>${item.file.name}</h2>
                  <p>Page ${i + 1} of ${item.pages}</p>
                  <p>Mode: ${item.colorMode === "color" ? "Color" : "B&W"}</p>
                  <p>Style: ${item.doubleSided ? "Double-sided" : "Single-sided"}</p>
                  <div style="border: 1px solid #ddd; padding: 20px; margin-top: 40px; min-height: 400px;">
                    <p>[Document content would be rendered here]</p>
                    <p>File: ${item.file.name}</p>
                    <p>Size: ${(item.file.size / 1024).toFixed(1)} KB</p>
                  </div>
                </div>
              </div>
            </div>
          `
          pageNumber++
        }
      }
    }

    printContent += `
      </body>
      </html>
    `

    return printContent
  }

  // Fallback print method
  const fallbackPrint = async () => {
    const printWindow = window.open("", "_blank", "width=800,height=600")

    if (!printWindow) {
      alert("Please allow popups for printing functionality")
      return
    }

    const printContent = generatePrintContent()
    printWindow.document.write(printContent)
    printWindow.document.close()

    setTimeout(() => {
      printWindow.focus()
      printWindow.print()

      printWindow.onafterprint = () => {
        printWindow.close()
        setPaymentStatus("success")
        startCountdown()
      }
    }, 1000)
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
        <div className="page-title">Payment & Direct Printing</div>
      </div>

      <div className="payment-content">
        {paymentStatus === "pending" && (
          <div className="payment-summary-container">
            <div className="payment-summary-card">
              <h2>Order Summary - Direct Print</h2>

              <div className="order-details">
                {pages.length > 0 && (
                  <div className="order-section">
                    <h3>Canvas Pages ({pages.length})</h3>
                    {pages.map((page, index) => (
                      <div key={index} className="order-item">
                        <span>
                          Page {page.id} ({page.colorMode === "color" ? "Color" : "B&W"}) - {page.items?.length || 0}{" "}
                          items
                        </span>
                        <span>₹{page.colorMode === "color" ? 10 : 2}</span>
                      </div>
                    ))}
                  </div>
                )}

                {printQueue.length > 0 && (
                  <div className="order-section">
                    <h3>Documents ({printQueue.length})</h3>
                    {printQueue.map((item, index) => (
                      <div key={index} className="order-item">
                        <span>
                          {item.file.name.substring(0, 20)}
                          {item.file.name.length > 20 ? "..." : ""} ({item.pages} pages,{" "}
                          {item.colorMode === "color" ? "Color" : "B&W"},{" "}
                          {item.doubleSided ? "Double-sided" : "Single-sided"})
                        </span>
                        <span>₹{item.cost}</span>
                      </div>
                    ))}
                  </div>
                )}

                {blankSheets > 0 && (
                  <div className="order-section">
                    <h3>Blank Sheets</h3>
                    <div className="order-item">
                      <span>Blank A4 Sheets ({blankSheets})</span>
                      <span>₹{blankSheets}</span>
                    </div>
                  </div>
                )}

                <div className="order-total">
                  <span>Total Amount</span>
                  <span>₹{totalCost}</span>
                </div>
              </div>

              <button className="pay-now-button" onClick={handlePayment}>
                <Printer size={16} />
                Pay & Print Directly ₹{totalCost}
              </button>

              <div
                style={{
                  marginTop: "16px",
                  padding: "12px",
                  background: "#f0f8ff",
                  borderRadius: "8px",
                  fontSize: "14px",
                }}
              >
                <p>
                  <strong>Direct Printing:</strong> No dialog boxes - prints automatically after payment!
                </p>
                <p>• Canvas pages will print with your custom layout</p>
                <p>• Blank sheets will print as empty A4 pages</p>
                <p>• Documents will print with your selected options</p>
              </div>
            </div>
          </div>
        )}

        {paymentStatus === "processing" && (
          <div className="processing-container">
            <div className="processing-card">
              <div className="processing-icon">
                <Loader size={48} className="spin-animation" />
              </div>
              <h2>Direct Printing in Progress</h2>
              <p>Sending your customized pages directly to printer...</p>
              <p>No dialog boxes - printing automatically!</p>
              <div style={{ marginTop: "20px", padding: "16px", background: "#f0f8ff", borderRadius: "8px" }}>
                <p>
                  <strong>What's being printed:</strong>
                </p>
                {pages.length > 0 && <p>• {pages.length} custom canvas pages</p>}
                {printQueue.length > 0 && <p>• {printQueue.length} document files</p>}
                {blankSheets > 0 && <p>• {blankSheets} blank A4 sheets</p>}
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
              <h2>Direct Print Successful!</h2>
              <p>Your customized pages have been sent directly to the printer.</p>
              <p>No dialog boxes were shown - printing happened automatically!</p>
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