"use client"

import { useState } from "react"
import { useNavigate } from "react-router-dom"
import "./StartPage.css"

function StartPage() {
  const navigate = useNavigate()
  const [showPolicyModal, setShowPolicyModal] = useState(false)
  const [modalContent, setModalContent] = useState({ title: "", content: "" })

  const handlePolicyClick = (type) => {
    let content = {}

    switch (type) {
      case "contact":
        content = {
          title: "Contact Us",
          content: `
            📧 Email: support@prinit.com
            📞 Phone: +91 8919022539
            📍 Address: 123 Print Street, Digital City, India
            
            🕒 Business Hours:
            Monday - Friday: 9:00 AM - 6:00 PM
            Saturday: 10:00 AM - 4:00 PM
            Sunday: Closed
            
            We're here to help you with all your printing needs. Feel free to reach out for any queries or support!
          `,
        }
        break
      case "shipping":
        content = {
          title: "Shipping Policy",
          content: `
            📦 Instant Print Service
            • Documents are printed immediately after payment
            • No shipping required - collect your prints on-site
            
            🚚 Delivery Options (Coming Soon):
            • Same-day delivery within city limits
            • Express delivery: 2-4 hours
            • Standard delivery: Next business day
            
            📋 Print Quality Guarantee:
            • High-quality prints using premium paper
            • Color accuracy guaranteed
            • Reprints available if quality issues occur
          `,
        }
        break
      case "terms":
        content = {
          title: "Terms and Conditions",
          content: `
            📋 Service Terms:
            • Payment required before printing
            • File formats: PDF, DOC, DOCX, JPG, PNG supported
            • Maximum file size: 50MB per document
            
            💳 Payment Terms:
            • Secure payment via Razorpay
            • All major cards and UPI accepted
            • No refunds for completed print jobs
            
            📄 Usage Policy:
            • Users responsible for copyright compliance
            • No printing of illegal or offensive content
            • PrinIT reserves right to refuse service
          `,
        }
        break
      case "cancellation":
        content = {
          title: "Cancellations and Refunds",
          content: `
            ❌ Cancellation Policy:
            • Orders can be cancelled before printing starts
            • No cancellation once printing has begun
            • Cancellation requests via phone/email
            
            💰 Refund Policy:
            • Full refund for cancelled orders
            • Refunds processed within 3-5 business days
            • No refunds for completed print jobs
            
            🔄 Reprint Policy:
            • Free reprint for quality issues
            • Report issues within 24 hours
            • Original receipt required for reprints
          `,
        }
        break
      case "privacy":
        content = {
          title: "Privacy Policy",
          content: `
            🔒 Data Protection:
            • Your documents are automatically deleted after printing
            • No permanent storage of user files
            • Secure file transfer and processing
            
            📊 Information We Collect:
            • Payment information (processed securely)
            • Print job details for service delivery
            • Basic usage analytics (anonymous)
            
            🛡️ Your Rights:
            • Right to data deletion
            • Right to access your information
            • Right to opt-out of communications
            
            Contact us for any privacy concerns.
          `,
        }
        break
      default:
        content = { title: "", content: "" }
    }

    setModalContent(content)
    setShowPolicyModal(true)
  }

  return (
    <div className="start-page">






      <div className="start-header">
        <div className="heading-container" onClick={() => navigate("/main")}>
          <h1>KIOSK meets</h1>
          <h1 className="gradient-text">Printing Papers</h1>
        </div>
        <div className="verified-footer">
          <img src="/verified.png" className="verified-icon" alt="Verified" />
          <span>Verified by NIT C</span>
        </div>
      </div>



      <div className="subject" >

        <div className="left"></div>
        <div className="right"></div>

      </div>

      <div className="pathways"></div>
















      {/* Main Content */}
      <div className="start-content">
        <div className="hero-section">
          {/* <h2 className="hero-title">Fast & Easy Printing</h2>
          <p className="hero-description">
            Upload your documents, customize your print settings, and get instant high-quality prints
          </p> */}

          {/* <button className="start-printing-btn" >
            Start Printing
          </button> */}
        </div>

        {/* <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">📄</div>
            <h3>Multiple Formats</h3>
            <p>Support for PDF, Word, Images and more</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">🎨</div>
            <h3>Custom Layout</h3>
            <p>Arrange and edit your documents on A4 canvas</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">💳</div>
            <h3>Secure Payment</h3>
            <p>Safe and secure payment with Razorpay</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">⚡</div>
            <h3>Instant Print</h3>
            <p>Get your documents printed immediately</p>
          </div> */}
        {/* </div> */}
      </div>

    



















      <footer className="start-footer">
        <div className="footer-links">
          <button onClick={() => handlePolicyClick("contact")} className="footer-link">
            Contact Us
          </button>
          <button onClick={() => handlePolicyClick("shipping")} className="footer-link">
            Shipping Policy
          </button>
          <button onClick={() => handlePolicyClick("terms")} className="footer-link">
            Terms and Conditions
          </button>
          <button onClick={() => handlePolicyClick("cancellation")} className="footer-link">
            Cancellations and Refunds
          </button>
          <button onClick={() => handlePolicyClick("privacy")} className="footer-link">
            Privacy Policy
          </button>
        </div>

        {/* <div className="admin-access">
          <button className="admin-btn" onClick={() => navigate("/admin")}>
            Admin Access
          </button>
        </div> */}

        <div className="footer-bottom">
          <p>&copy; 2025 PrinIT. All rights reserved.</p>
        </div>
      </footer>

      {/* Policy Modal */}
      {showPolicyModal && (
        <div className="modal-overlay" onClick={() => setShowPolicyModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{modalContent.title}</h3>
              <button className="modal-close" onClick={() => setShowPolicyModal(false)}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <pre className="modal-text">{modalContent.content}</pre>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default StartPage
