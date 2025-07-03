"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { ArrowLeft, RotateCcw, History, Printer, FileText } from "lucide-react"
import "./AdminPage.css"

function AdminPage() {
  const navigate = useNavigate()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [phoneNumber, setPhoneNumber] = useState("")
  const [otp, setOtp] = useState("")
  const [otpSent, setOtpSent] = useState(false)
  const [loading, setLoading] = useState(false)

  // Admin data state
  const [adminData, setAdminData] = useState({
    totalPages: 200,
    usedPages: 100,
    remainingPages: 100,
    history: [
      { date: "2024-01-15", pages: 25, type: "PDF Print", user: "User001" },
      { date: "2024-01-14", pages: 15, type: "Canvas Print", user: "User002" },
      { date: "2024-01-14", pages: 30, type: "Document Print", user: "User003" },
      { date: "2024-01-13", pages: 20, type: "Image Print", user: "User004" },
      { date: "2024-01-12", pages: 10, type: "Blank Sheets", user: "User005" },
    ],
  })

  // Load admin data from localStorage on component mount
  useEffect(() => {
    const savedData = localStorage.getItem("adminData")
    if (savedData) {
      setAdminData(JSON.parse(savedData))
    }
  }, [])

  // Save admin data to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("adminData", JSON.stringify(adminData))
  }, [adminData])

  const handleSendOTP = () => {
    if (phoneNumber === "8919022539") {
      setLoading(true)
      // Simulate OTP sending
      setTimeout(() => {
        setOtpSent(true)
        setLoading(false)
        alert("OTP sent to your phone number!")
      }, 1000)
    } else {
      alert("Invalid phone number!")
    }
  }

  const handleVerifyOTP = () => {
    // For demo purposes, accept any 4-digit OTP
    if (otp.length === 4) {
      setLoading(true)
      setTimeout(() => {
        setIsAuthenticated(true)
        setLoading(false)
      }, 1000)
    } else {
      alert("Please enter a valid 4-digit OTP")
    }
  }

  const handleReset = () => {
    if (window.confirm("Are you sure you want to reset the page count to 200/200?")) {
      setAdminData((prev) => ({
        ...prev,
        usedPages: 0,
        remainingPages: 200,
        history: [
          { date: new Date().toISOString().split("T")[0], pages: 0, type: "System Reset", user: "Admin" },
          ...prev.history,
        ],
      }))
    }
  }

  const addTestPrint = (pages, type) => {
    if (adminData.remainingPages >= pages) {
      setAdminData((prev) => ({
        ...prev,
        usedPages: prev.usedPages + pages,
        remainingPages: prev.remainingPages - pages,
        history: [
          {
            date: new Date().toISOString().split("T")[0],
            pages,
            type,
            user: `TestUser${Math.floor(Math.random() * 1000)}`,
          },
          ...prev.history,
        ],
      }))
    } else {
      alert("Not enough pages remaining!")
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="admin-login">
        <div className="login-container">
          <button className="back-button" onClick={() => navigate("/")}>
            <ArrowLeft size={20} />
            <span>Back</span>
          </button>

          <div className="login-card">
            <h2>Admin Access</h2>
            <p>Enter your phone number to receive OTP</p>

            {!otpSent ? (
              <div className="login-form">
                <input
                  type="tel"
                  placeholder="Enter phone number"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="login-input"
                />
                <button
                  onClick={handleSendOTP}
                  disabled={loading || phoneNumber.length !== 10}
                  className="login-button"
                >
                  {loading ? "Sending..." : "Send OTP"}
                </button>
              </div>
            ) : (
              <div className="login-form">
                <input
                  type="text"
                  placeholder="Enter 4-digit OTP"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  className="login-input"
                />
                <button onClick={handleVerifyOTP} disabled={loading || otp.length !== 4} className="login-button">
                  {loading ? "Verifying..." : "Verify OTP"}
                </button>
                <button
                  onClick={() => {
                    setOtpSent(false)
                    setOtp("")
                  }}
                  className="resend-button"
                >
                  Resend OTP
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="admin-page">
      <div className="admin-header">
        <button className="back-button" onClick={() => navigate("/")}>
          <ArrowLeft size={20} />
          <span>Back</span>
        </button>
        <h1>Admin Dashboard</h1>
        <button className="logout-button" onClick={() => setIsAuthenticated(false)}>
          Logout
        </button>
      </div>

      <div className="admin-content">
        {/* Stats Cards */}
        <div className="stats-grid">
          <div className="stat-card total">
            <div className="stat-icon">
              <FileText size={32} />
            </div>
            <div className="stat-info">
              <h3>Total Pages</h3>
              <p className="stat-number">{adminData.totalPages}</p>
            </div>
          </div>

          <div className="stat-card used">
            <div className="stat-icon">
              <Printer size={32} />
            </div>
            <div className="stat-info">
              <h3>Pages Used</h3>
              <p className="stat-number">{adminData.usedPages}</p>
            </div>
          </div>

          <div className="stat-card remaining">
            <div className="stat-icon">
              <FileText size={32} />
            </div>
            <div className="stat-info">
              <h3>Pages Remaining</h3>
              <p className="stat-number">{adminData.remainingPages}</p>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="progress-section">
          <h3>
            Page Usage: {adminData.totalPages}/{adminData.usedPages}
          </h3>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${(adminData.usedPages / adminData.totalPages) * 100}%` }}
            ></div>
          </div>
          <p>
            {adminData.usedPages} pages used out of {adminData.totalPages}
          </p>
        </div>

        {/* Controls */}
        <div className="admin-controls">
          <button className="reset-button" onClick={handleReset}>
            <RotateCcw size={20} />
            Reset to 200/200
          </button>

          <div className="test-buttons">
            <h4>Test Print Jobs:</h4>
            <button onClick={() => addTestPrint(5, "Test PDF")} className="test-btn">
              Add 5 Pages
            </button>
            <button onClick={() => addTestPrint(10, "Test Canvas")} className="test-btn">
              Add 10 Pages
            </button>
            <button onClick={() => addTestPrint(20, "Test Document")} className="test-btn">
              Add 20 Pages
            </button>
          </div>
        </div>

        {/* History */}
        <div className="history-section">
          <div className="history-header">
            <History size={24} />
            <h3>Print History</h3>
          </div>

          <div className="history-list">
            {adminData.history.map((entry, index) => (
              <div key={index} className="history-item">
                <div className="history-date">{entry.date}</div>
                <div className="history-details">
                  <span className="history-type">{entry.type}</span>
                  <span className="history-user">by {entry.user}</span>
                </div>
                <div className="history-pages">{entry.pages} pages</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminPage