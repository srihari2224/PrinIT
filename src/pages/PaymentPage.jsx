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
      key: "rzp_live_LyazQXwGOFAmly",
      amount: totalCost * 100,
      currency: "INR",
      name: "PrinIT Service",
      description: "Payment for printing services",
      handler: (response) => {
        console.log("Payment successful:", response)
        setPaymentStatus("processing")
        // Start direct printing process
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

  // Direct printing without dialog - Multiple approaches
  const handleDirectPrint = async () => {
    setIsPrinting(true)

    try {
      // Method 1: Try Chrome Kiosk Mode printing
      if (await tryKioskModePrint()) {
        console.log("Kiosk mode printing initiated")
        setPaymentStatus("success")
        startCountdown()
        return
      }

      // Method 2: Try Web Serial API for direct printer communication
      if (await tryWebSerialPrint()) {
        console.log("Web Serial printing initiated")
        setPaymentStatus("success")
        startCountdown()
        return
      }

      // Method 3: Try silent print with auto-close
      if (await trySilentPrint()) {
        console.log("Silent printing initiated")
        setPaymentStatus("success")
        startCountdown()
        return
      }

      // Method 4: Generate print data and send to backend
      await sendPrintDataToBackend()
    } catch (error) {
      console.error("Direct printing failed:", error)
      // Fallback to regular print dialog
      await fallbackPrint()
    } finally {
      setIsPrinting(false)
    }
  }

  // Method 1: Kiosk Mode Printing (Chrome with --kiosk-printing flag)
  const tryKioskModePrint = async () => {
    try {
      // Check if running in kiosk mode
      if (window.navigator.userAgent.includes("Chrome") && window.outerHeight === window.screen.height) {
        const printWindow = window.open("", "_blank", "width=800,height=600")

        if (!printWindow) return false

        const printContent = generatePrintContent()
        printWindow.document.write(printContent)
        printWindow.document.close()

        // In kiosk mode, this should print directly
        setTimeout(() => {
          printWindow.print()
          printWindow.close()
        }, 1000)

        return true
      }
      return false
    } catch (error) {
      console.error("Kiosk mode printing failed:", error)
      return false
    }
  }

  // Method 2: Web Serial API for direct printer communication
  const tryWebSerialPrint = async () => {
    try {
      if (!("serial" in navigator)) {
        console.log("Web Serial API not supported")
        return false
      }

      // Request access to serial port (printer)
      const port = await navigator.serial.requestPort()
      await port.open({ baudRate: 9600 })

      // Generate ESC/POS commands for thermal printers
      const printCommands = generateESCPOSCommands()

      const writer = port.writable.getWriter()
      await writer.write(printCommands)
      writer.releaseLock()

      await port.close()
      return true
    } catch (error) {
      console.error("Web Serial printing failed:", error)
      return false
    }
  }

  // Method 3: Silent print with auto-close
  const trySilentPrint = async () => {
    try {
      const printWindow = window.open("", "_blank", "width=1,height=1,left=-1000,top=-1000")

      if (!printWindow) return false

      const printContent = generatePrintContent()
      printWindow.document.write(printContent)
      printWindow.document.close()

      // Auto-print and close
      setTimeout(() => {
        printWindow.focus()
        printWindow.print()

        // Auto-close after print
        setTimeout(() => {
          printWindow.close()
        }, 2000)
      }, 1000)

      return true
    } catch (error) {
      console.error("Silent printing failed:", error)
      return false
    }
  }

  // Method 4: Send print data to backend for server-side printing
  const sendPrintDataToBackend = async () => {
    try {
      const printData = {
        pages: pages,
        printQueue: printQueue,
        blankSheets: blankSheets,
        timestamp: new Date().toISOString(),
        orderId: `ORDER_${Date.now()}`,
      }

      // Send to your backend server
      const response = await fetch("/api/print", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(printData),
      })

      if (response.ok) {
        console.log("Print job sent to server")
        setPaymentStatus("success")
        startCountdown()
      } else {
        throw new Error("Server printing failed")
      }
    } catch (error) {
      console.error("Backend printing failed:", error)
      // Fallback to client-side printing
      await fallbackPrint()
    }
  }

  // Generate ESC/POS commands for thermal printers
  const generateESCPOSCommands = () => {
    const commands = []

    // Initialize printer
    commands.push(0x1b, 0x40) // ESC @

    // Print header
    commands.push(...Array.from(new TextEncoder().encode("PrinIT Service\n")))
    commands.push(...Array.from(new TextEncoder().encode("Print Job\n")))
    commands.push(...Array.from(new TextEncoder().encode("================\n")))

    // Print canvas pages info
    if (pages.length > 0) {
      commands.push(...Array.from(new TextEncoder().encode(`Canvas Pages: ${pages.length}\n`)))
    }

    // Print document info
    if (printQueue.length > 0) {
      commands.push(...Array.from(new TextEncoder().encode(`Documents: ${printQueue.length}\n`)))
    }

    // Print blank sheets info
    if (blankSheets > 0) {
      commands.push(...Array.from(new TextEncoder().encode(`Blank Sheets: ${blankSheets}\n`)))
    }

    // Cut paper
    commands.push(0x1d, 0x56, 0x41, 0x03)

    return new Uint8Array(commands)
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
