"use client"

import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { ArrowLeft, CreditCard } from "lucide-react"
import "./BlankPaper.css"

function BlankPaper() {
  const navigate = useNavigate()
  const [selectedDesign, setSelectedDesign] = useState(null)
  const [quantity, setQuantity] = useState(1)

  const designs = [
    {
      id: 1,
      name: "Margin Design",
      description: "Left, right, top margins with page number in bottom right",
      price: 1.25,
      bothSides: true,
    },
    {
      id: 2,
      name: "Graph Sheet",
      description: "Complete graph sheet pattern on A4",
      price: 2.0,
      bothSides: false,
    },
    {
      id: 3,
      name: "Ruled Lines",
      description: "Complete ruled lines on A4 sheet",
      price: 3.0,
      bothSides: true,
    },
    {
      id: 4,
      name: "Plain Sheet",
      description: "Simple blank A4 sheet",
      price: 1.0,
      bothSides: false,
    },
  ]

  const calculateTotal = () => {
    if (!selectedDesign) return 0
    return (selectedDesign.price * quantity).toFixed(2)
  }

  const handlePayment = () => {
    if (!selectedDesign) {
      alert("Please select a design first")
      return
    }

    const options = {
      key: "rzp_test_X5OHvkg69oonK2",
      amount: Math.round(calculateTotal() * 100),
      currency: "INR",
      name: "PrinIT Service",
      description: `${selectedDesign.name} - ${quantity} sheets`,
      handler: (response) => {
        console.log("Payment successful:", response)
        handleDirectPrint()
      },
      prefill: {
        name: "Customer Name",
        email: "customer@example.com",
        contact: "",
      },
      theme: {
        color: "#000000",
      },
    }

    const razorpay = new window.Razorpay(options)
    razorpay.open()
  }

  const handleDirectPrint = async () => {
    try {
      // Generate print content based on selected design
      const printContent = generateDesignPrintContent()

      // Silent print
      const printWindow = window.open("", "_blank", "width=1,height=1,left=-1000,top=-1000")
      printWindow.document.write(printContent)
      printWindow.document.close()

      setTimeout(() => {
        printWindow.focus()
        printWindow.print()
        setTimeout(() => {
          printWindow.close()
          alert(`Successfully printed ${quantity} ${selectedDesign.name} sheets!`)
          navigate("/")
        }, 2000)
      }, 1000)
    } catch (error) {
      console.error("Printing failed:", error)
      alert("Printing failed. Please try again.")
    }
  }

  const generateDesignPrintContent = () => {
    let content = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>PrinIT - Blank Design Sheets</title>
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
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
            background: white;
          }
          .page {
            width: 210mm;
            height: 297mm;
            position: relative;
            background: white;
            page-break-after: always;
            box-sizing: border-box;
          }
          .page:last-child {
            page-break-after: avoid;
          }
          
          /* Design 1: Margin Design */
          .margin-design {
            border-left: 2px solid #ff0000;
            border-right: 2px solid #0000ff;
            border-top: 2px solid #00ff00;
            padding: 20mm 15mm 15mm 25mm;
          }
          .page-number {
            position: absolute;
            bottom: 15mm;
            right: 15mm;
            font-size: 12pt;
            color: #333;
          }
          
          /* Design 2: Graph Sheet */
          .graph-design {
            background-image: 
              linear-gradient(to right, #ddd 1px, transparent 1px),
              linear-gradient(to bottom, #ddd 1px, transparent 1px);
            background-size: 5mm 5mm;
            background-position: 0 0, 0 0;
          }
          
          /* Design 3: Ruled Lines */
          .ruled-design {
            background-image: repeating-linear-gradient(
              transparent,
              transparent 7mm,
              #0066cc 7mm,
              #0066cc 7.5mm
            );
            padding: 20mm 15mm;
          }
          .ruled-design::before {
            content: '';
            position: absolute;
            left: 25mm;
            top: 0;
            bottom: 0;
            width: 2px;
            background: #ff0000;
          }
          
          /* Design 4: Plain */
          .plain-design {
            background: white;
          }
        </style>
      </head>
      <body>
    `

    // Generate pages based on quantity and design
    for (let i = 1; i <= quantity; i++) {
      // Front side
      content += `<div class="page ${getDesignClass()}">`

      if (selectedDesign.id === 1) {
        content += `<div class="page-number">Page ${i}</div>`
      }

      content += `</div>`

      // Back side for designs that support both sides
      if (selectedDesign.bothSides) {
        content += `<div class="page ${getDesignClass()}">`

        if (selectedDesign.id === 1) {
          content += `<div class="page-number">Page ${i} (Back)</div>`
        }

        content += `</div>`
      }
    }

    content += `</body></html>`
    return content
  }

  const getDesignClass = () => {
    switch (selectedDesign.id) {
      case 1:
        return "margin-design"
      case 2:
        return "graph-design"
      case 3:
        return "ruled-design"
      case 4:
        return "plain-design"
      default:
        return "plain-design"
    }
  }

  return (
    <div className="blank-paper-page">
      <div className="navbar">
        <button className="back-button" onClick={() => navigate("/")}>
          <ArrowLeft size={20} />
          <span>Back</span>
        </button>
        <div className="page-title">Blank A4 Sheet Designs</div>
      </div>

      <div className="blank-content">
        <div className="designs-grid">
          {designs.map((design) => (
            <div
              key={design.id}
              className={`design-card ${selectedDesign?.id === design.id ? "selected" : ""}`}
              onClick={() => setSelectedDesign(design)}
            >
              <div className="design-preview">
                <div className={`preview-${design.id}`}>
                  {design.id === 1 && (
                    <div className="margin-preview">
                      <div className="margin-borders"></div>
                      <div className="page-num">Page 1</div>
                    </div>
                  )}
                  {design.id === 2 && (
                    <div className="graph-preview">
                      <div className="graph-grid"></div>
                    </div>
                  )}
                  {design.id === 3 && (
                    <div className="ruled-preview">
                      <div className="ruled-lines"></div>
                      <div className="margin-line"></div>
                    </div>
                  )}
                  {design.id === 4 && <div className="plain-preview"></div>}
                </div>
              </div>

              <div className="design-info">
                <h3>{design.name}</h3>
                <p>{design.description}</p>
                <div className="design-price">
                  ₹{design.price} per sheet
                  {design.bothSides && <span className="both-sides">(Both sides)</span>}
                </div>
              </div>
            </div>
          ))}
        </div>

        {selectedDesign && (
          <div className="order-section">
            <div className="quantity-control">
              <label>Quantity:</label>
              <div className="quantity-buttons">
                <button onClick={() => setQuantity(Math.max(1, quantity - 1))} disabled={quantity <= 1}>
                  -
                </button>
                <span className="quantity-display">{quantity}</span>
                <button onClick={() => setQuantity(quantity + 1)}>+</button>
              </div>
            </div>

            <div className="order-summary">
              <div className="summary-item">
                <span>Design: {selectedDesign.name}</span>
              </div>
              <div className="summary-item">
                <span>Quantity: {quantity} sheets</span>
              </div>
              <div className="summary-item">
                <span>Price per sheet: ₹{selectedDesign.price}</span>
              </div>
              {selectedDesign.bothSides && (
                <div className="summary-item">
                  <span>Printed on both sides</span>
                </div>
              )}
              <div className="summary-total">
                <span>Total: ₹{calculateTotal()}</span>
              </div>
            </div>

            <button className="pay-print-button" onClick={handlePayment}>
              <CreditCard size={16} />
              Pay ₹{calculateTotal()} & Print
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default BlankPaper
