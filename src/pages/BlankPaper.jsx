"use client"

import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { ArrowLeft, CreditCard, Plus, Minus, ShoppingCart } from "lucide-react"
import "./BlankPaper.css"

function BlankPaper() {
  const navigate = useNavigate()
  const [cart, setCart] = useState([])

  const designs = [
    {
      id: 1,
      name: "Margin Design",
      description: "Left and top margins only",
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
      description: "Complete ruled lines on A4 sheet with left margin",
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

  const addToCart = (design, quantity = 1) => {
    const existingItem = cart.find((item) => item.design.id === design.id)

    if (existingItem) {
      setCart(
        cart.map((item) => (item.design.id === design.id ? { ...item, quantity: item.quantity + quantity } : item)),
      )
    } else {
      setCart([...cart, { design, quantity }])
    }
  }

  const updateCartQuantity = (designId, newQuantity) => {
    if (newQuantity <= 0) {
      setCart(cart.filter((item) => item.design.id !== designId))
    } else {
      setCart(cart.map((item) => (item.design.id === designId ? { ...item, quantity: newQuantity } : item)))
    }
  }

  const calculateTotal = () => {
    return cart.reduce((total, item) => total + item.design.price * item.quantity, 0).toFixed(2)
  }

  const getTotalSheets = () => {
    return cart.reduce((total, item) => total + item.quantity, 0)
  }

  const handlePayment = () => {
    if (cart.length === 0) {
      alert("Please add items to cart first")
      return
    }

    // Initialize Razorpay
    const script = document.createElement("script")
    script.src = "https://checkout.razorpay.com/v1/checkout.js"
    script.onload = () => {
      const options = {
        key: "rzp_test_X5OHvkg69oonK2",
        amount: Math.round(calculateTotal() * 100),
        currency: "INR",
        name: "PrinIT Service",
        description: `Blank Sheets - ${getTotalSheets()} sheets`,
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
    document.head.appendChild(script)
  }

  const handleDirectPrint = async () => {
    try {
      const printContent = generateDesignPrintContent()

      // Silent printing without dialog
      const printWindow = window.open("", "_blank", "width=1,height=1,left=-1000,top=-1000")
      printWindow.document.write(printContent)
      printWindow.document.close()

      setTimeout(() => {
        printWindow.focus()
        printWindow.print()
        setTimeout(() => {
          printWindow.close()
          alert(`Successfully printed ${getTotalSheets()} blank sheets!`)
          setCart([])
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
            size: A4 portrait; 
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
          
          /* Design 1: Margin Design - Only left and top margins */
          .margin-design {
            border-left: 1px solid #000000;
            border-top: 1px solid #000000;
            position: relative;
          }
          
          /* Design 2: Graph Sheet */
          .graph-design {
            background-image: 
              linear-gradient(to right, #ccc 0.5px, transparent 0.5px),
              linear-gradient(to bottom, #ccc 0.5px, transparent 0.5px);
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
            position: relative;
          }
          .ruled-design::before {
            content: '';
            position: absolute;
            left: 25mm;
            top: 0;
            bottom: 0;
            width: 1px;
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

    let pageNumber = 1
    cart.forEach((item) => {
      for (let i = 1; i <= item.quantity; i++) {
        // Front side
        content += `<div class="page ${getDesignClass(item.design.id)}"></div>`

        // Back side for designs that support both sides
        if (item.design.bothSides) {
          content += `<div class="page ${getDesignClass(item.design.id)}"></div>`
        }

        pageNumber++
      }
    })

    content += `</body></html>`
    return content
  }

  const getDesignClass = (designId) => {
    switch (designId) {
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
            <div key={design.id} className="design-card">
              <div className="design-preview">
                <div className="a4-sheet-preview">
                  {design.id === 1 && (
                    <div className="margin-sheet">
                      <div className="left-margin"></div>
                      <div className="top-margin"></div>
                    </div>
                  )}
                  {design.id === 2 && (
                    <div className="graph-sheet">
                      <div className="graph-pattern"></div>
                    </div>
                  )}
                  {design.id === 3 && (
                    <div className="ruled-sheet">
                      <div className="ruled-lines"></div>
                      <div className="left-margin-line"></div>
                    </div>
                  )}
                  {design.id === 4 && <div className="plain-sheet"></div>}
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

              <div className="add-to-cart-section">
                <div className="quantity-selector">
                  <button className="qty-btn" onClick={() => addToCart(design, 1)}>
                    <Plus size={16} />
                  </button>
                  <span className="qty-display">
                    {cart.find((item) => item.design.id === design.id)?.quantity || 0}
                  </span>
                  <button
                    className="qty-btn"
                    onClick={() => {
                      const currentItem = cart.find((item) => item.design.id === design.id)
                      if (currentItem) {
                        updateCartQuantity(design.id, currentItem.quantity - 1)
                      }
                    }}
                    disabled={!cart.find((item) => item.design.id === design.id)}
                  >
                    <Minus size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {cart.length > 0 && (
          <div className="cart-section">
            <div className="cart-header">
              <ShoppingCart size={20} />
              <h3>Cart ({getTotalSheets()} sheets)</h3>
            </div>

            <div className="cart-items">
              {cart.map((item) => (
                <div key={item.design.id} className="cart-item">
                  <div className="cart-item-info">
                    <span className="item-name">{item.design.name}</span>
                    <span className="item-details">
                      {item.quantity} × ₹{item.design.price} = ₹{(item.quantity * item.design.price).toFixed(2)}
                      {item.design.bothSides && " (Both sides)"}
                    </span>
                  </div>
                  <div className="cart-item-controls">
                    <button
                      className="cart-qty-btn"
                      onClick={() => updateCartQuantity(item.design.id, item.quantity - 1)}
                    >
                      <Minus size={14} />
                    </button>
                    <span className="cart-qty">{item.quantity}</span>
                    <button
                      className="cart-qty-btn"
                      onClick={() => updateCartQuantity(item.design.id, item.quantity + 1)}
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="cart-total">
              <div className="total-line">
                <span>Total: ₹{calculateTotal()}</span>
              </div>
            </div>

            <button className="pay-print-button" onClick={handlePayment}>
              <CreditCard size={16} />
              Pay ₹{calculateTotal()} & Print Directly
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default BlankPaper
