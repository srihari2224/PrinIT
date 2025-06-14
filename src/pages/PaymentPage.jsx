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

  const [paymentStatus, setPaymentStatus] = useState("pending") // pending, processing, success, failed
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
      key: "rzp_live_LyazQXwGOFAmly", // Replace with your actual live Razorpay key
      amount: totalCost * 100, // Amount in paise
      currency: "INR",
      name: "PrinIT Service",
      description: "Payment for printing services",
      handler: (response) => {
        // Payment successful
        console.log("Payment successful:", response)
        setPaymentStatus("processing")
        // Start printing process
        handlePrint()
      },
      prefill: {
        name: "Customer Name",
        email: "customer@example.com",
        contact: "9999999999",
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
          // Handle payment cancellation if needed
        },
      },
    }

    const razorpay = new window.Razorpay(options)
    razorpay.open()
  }

  // Enhanced printing function for actual A4 sheets
  const handlePrint = async () => {
    setIsPrinting(true)

    try {
      // Create a comprehensive print document
      const printWindow = window.open("", "_blank", "width=800,height=600")

      if (!printWindow) {
        alert("Please allow popups for printing functionality")
        return
      }

      // Generate comprehensive print content
      let printContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>PrinIT - Print Job</title>
          <style>
            @page {
              size: A4;
              margin: 0.5in;
            }
            
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 0;
              color: black;
            }
            
            .page {
              page-break-after: always;
              min-height: 100vh;
              padding: 20px;
              box-sizing: border-box;
              position: relative;
            }
            
            .page:last-child {
              page-break-after: avoid;
            }
            
            .canvas-page {
              border: 1px solid #ddd;
              background: white;
              display: flex;
              flex-direction: column;
              justify-content: center;
              align-items: center;
              text-align: center;
              min-height: calc(100vh - 40px);
            }
            
            .document-page {
              background: white;
              padding: 40px;
              line-height: 1.6;
            }
            
            .blank-page {
              background: white;
              border: 1px dashed #ccc;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: calc(100vh - 40px);
              color: #999;
              font-size: 18px;
            }
            
            .page-header {
              position: absolute;
              top: 10px;
              right: 10px;
              font-size: 12px;
              color: #666;
            }
            
            .canvas-content {
              max-width: 100%;
              max-height: 80%;
            }
            
            .canvas-item-info {
              margin: 10px 0;
              padding: 10px;
              border: 1px solid #eee;
              border-radius: 4px;
            }
            
            .color-mode {
              font-weight: bold;
              color: #2196f3;
            }
            
            .bw-mode {
              filter: grayscale(100%);
            }
            
            @media print {
              body { -webkit-print-color-adjust: exact; }
              .page { margin: 0; }
            }
          </style>
        </head>
        <body>
      `

      let pageNumber = 1

      // Add canvas pages with actual content
      if (pages && pages.length > 0) {
        for (const page of pages) {
          const colorClass = page.colorMode === "bw" ? "bw-mode" : ""

          printContent += `
            <div class="page">
              <div class="page-header">Page ${pageNumber} - Canvas Page ${page.id}</div>
              <div class="canvas-page ${colorClass}">
                <h2>Canvas Page ${page.id}</h2>
                <p class="${page.colorMode === "color" ? "color-mode" : ""}">
                  Mode: ${page.colorMode === "color" ? "Color" : "Black & White"}
                </p>
                
                ${
                  page.items && page.items.length > 0
                    ? page.items
                        .map(
                          (item) => `
                    <div class="canvas-item-info">
                      <p><strong>File:</strong> ${item.file.name}</p>
                      <p><strong>Position:</strong> X: ${Math.round(item.x)}px, Y: ${Math.round(item.y)}px</p>
                      <p><strong>Size:</strong> ${Math.round(item.width)}px × ${Math.round(item.height)}px</p>
                      ${item.rotation ? `<p><strong>Rotation:</strong> ${item.rotation}°</p>` : ""}
                    </div>
                  `,
                        )
                        .join("")
                    : "<p>Empty canvas page</p>"
                }
              </div>
            </div>
          `
          pageNumber++
        }
      }

      // Add document pages from print queue
      if (printQueue && printQueue.length > 0) {
        for (const item of printQueue) {
          const colorClass = item.colorMode === "bw" ? "bw-mode" : ""

          for (let i = 0; i < item.pages; i++) {
            printContent += `
              <div class="page">
                <div class="page-header">Page ${pageNumber} - Document Page ${i + 1}/${item.pages}</div>
                <div class="document-page ${colorClass}">
                  <h2>Document: ${item.file.name}</h2>
                  <p><strong>Page ${i + 1} of ${item.pages}</strong></p>
                  <p class="${item.colorMode === "color" ? "color-mode" : ""}">
                    Print Mode: ${item.colorMode === "color" ? "Color" : "Black & White"}
                  </p>
                  <p><strong>Print Style:</strong> ${item.doubleSided ? "Double-sided" : "Single-sided"}</p>
                  <p><strong>File Size:</strong> ${(item.file.size / 1024).toFixed(1)} KB</p>
                  <p><strong>File Type:</strong> ${item.file.type}</p>
                  
                  <div style="margin-top: 40px; padding: 20px; border: 1px solid #ddd; background: #f9f9f9;">
                    <p><em>This represents the content of your ${item.file.name} document.</em></p>
                    <p><em>The actual document content would be rendered here when connected to a document processing service.</em></p>
                  </div>
                </div>
              </div>
            `
            pageNumber++
          }
        }
      }

      // Add blank sheets
      if (blankSheets > 0) {
        for (let i = 0; i < blankSheets; i++) {
          printContent += `
            <div class="page">
              <div class="page-header">Page ${pageNumber} - Blank Sheet ${i + 1}/${blankSheets}</div>
              <div class="blank-page">
                <div>
                  <h3>Blank A4 Sheet</h3>
                  <p>Sheet ${i + 1} of ${blankSheets}</p>
                </div>
              </div>
            </div>
          `
          pageNumber++
        }
      }

      printContent += `
        </body>
        </html>
      `

      // Write content to print window
      printWindow.document.write(printContent)
      printWindow.document.close()

      // Wait for content to load, then print
      setTimeout(() => {
        printWindow.focus()
        printWindow.print()

        // Set success status and start countdown
        setPaymentStatus("success")

        // Start countdown timer
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

        // Close print window after printing
        printWindow.onafterprint = () => {
          printWindow.close()
        }

        return () => {
          clearInterval(timer)
        }
      }, 1000)
    } catch (error) {
      console.error("Printing error:", error)
      alert("There was an error with printing. Please try again.")
      setPaymentStatus("pending")
    } finally {
      setIsPrinting(false)
    }
  }

  return (
    <div className="payment-page">
      <div className="navbar">
        <button className="back-button" onClick={() => navigate("/files")}>
          <ArrowLeft size={20} />
          <span>Back</span>
        </button>
        <div className="page-title">Payment & Printing</div>
      </div>

      <div className="payment-content">
        {paymentStatus === "pending" && (
          <div className="payment-summary-container">
            <div className="payment-summary-card">
              <h2>Order Summary</h2>

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
                Pay & Print Now ₹{totalCost}
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
              <h2>Processing Your Print Job</h2>
              <p>Preparing your documents for printing...</p>
              <p>Please ensure your printer is connected and ready.</p>
            </div>
          </div>
        )}

        {paymentStatus === "success" && (
          <div className="success-container">
            <div className="success-card">
              <div className="success-icon">
                <Check size={48} />
              </div>
              <h2>Print Job Sent Successfully!</h2>
              <p>Your documents have been sent to the printer.</p>
              <p>Please collect your printed pages from the printer.</p>
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
