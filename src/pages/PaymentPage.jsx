"use client"

import { useState, useEffect } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { ArrowLeft, Check, Loader } from "lucide-react"
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
      document.body.removeChild(script)
    }
  }, [])

  // Handle the payment process
  const handlePayment = () => {
    const options = {
      key: "rzp_live_YOUR_LIVE_KEY_HERE", // Replace with your actual live Razorpay key
      amount: totalCost * 100, // Amount in paise
      currency: "INR",
      name: "Print Service",
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
        address: "Print Service Office",
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

  // Handle the printing process
  const handlePrint = () => {
    setIsPrinting(true)

    // Create a hidden iframe for printing
    const printFrame = document.createElement("iframe")
    printFrame.style.position = "absolute"
    printFrame.style.top = "-9999px"
    printFrame.style.left = "-9999px"
    document.body.appendChild(printFrame)

    // Generate content for printing
    const printDocument = printFrame.contentDocument
    printDocument.open()
    printDocument.write(`
      <html>
        <head>
          <title>Print Document</title>
          <style>
            body { font-family: Arial, sans-serif; }
            .page { page-break-after: always; height: 100vh; padding: 20px; }
            .page-content { border: 1px solid #ddd; height: 100%; display: flex; align-items: center; justify-content: center; }
            .blank-page { text-align: center; color: #999; }
          </style>
        </head>
        <body>
    `)

    // Add canvas pages
    pages.forEach((page, index) => {
      printDocument.write(`
        <div class="page">
          <div class="page-content">
            <div>Canvas Page ${index + 1} - ${page.colorMode === "color" ? "Color" : "B&W"}</div>
          </div>
        </div>
      `)
    })

    // Add print queue items
    printQueue.forEach((item) => {
      for (let i = 0; i < item.pages; i++) {
        printDocument.write(`
          <div class="page">
            <div class="page-content">
              <div>Document: ${item.file.name} - Page ${i + 1} - ${item.colorMode === "color" ? "Color" : "B&W"}</div>
            </div>
          </div>
        `)
      }
    })

    // Add blank sheets
    for (let i = 0; i < blankSheets; i++) {
      printDocument.write(`
        <div class="page">
          <div class="page-content blank-page">
            <div>Blank A4 Sheet</div>
          </div>
        </div>
      `)
    }

    printDocument.write(`
        </body>
      </html>
    `)
    printDocument.close()

    // Trigger print after a short delay to ensure content is loaded
    setTimeout(() => {
      printFrame.contentWindow.print()

      // Start countdown after print dialog is shown
      setPaymentStatus("success")

      // Start countdown
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer)
            // Navigate back to home after countdown
            navigate("/")
            return 0
          }
          return prev - 1
        })
      }, 1000)

      // Clean up
      return () => {
        clearInterval(timer)
        document.body.removeChild(printFrame)
      }
    }, 1000)
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
                    <h3>Canvas Pages</h3>
                    {pages.map((page, index) => (
                      <div key={index} className="order-item">
                        <span>
                          Page {page.id} ({page.colorMode === "color" ? "Color" : "B&W"})
                        </span>
                        <span>₹{page.colorMode === "color" ? 10 : 2}</span>
                      </div>
                    ))}
                  </div>
                )}

                {printQueue.length > 0 && (
                  <div className="order-section">
                    <h3>Documents</h3>
                    {printQueue.map((item, index) => (
                      <div key={index} className="order-item">
                        <span>
                          {item.file.name.substring(0, 15)}
                          {item.file.name.length > 15 ? "..." : ""} ({item.pages} pages,{" "}
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
                Pay Now ₹{totalCost}
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
              <p>Please wait while we prepare your documents for printing...</p>
            </div>
          </div>
        )}

        {paymentStatus === "success" && (
          <div className="success-container">
            <div className="success-card">
              <div className="success-icon">
                <Check size={48} />
              </div>
              <h2>Printing in Progress!</h2>
              <p>Your documents are being printed.</p>
              <div className="countdown">
                <p>
                  Redirecting to home in <span className="countdown-number">{countdown}</span> seconds
                </p>
                <div className="progress-bar">
                  <div className="progress" style={{ width: `${(countdown / 15) * 100}%` }}></div>
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
