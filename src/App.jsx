"use client"

import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import VideoModal from "./components/VideoModal"
import "./App.css"

// Import images
import iphoneImage from "./assets/images/qrcode.png"
import pdfImage from "./assets/images/pdf.png";


function App() {
  const navigate = useNavigate()
  const [showVideoModal, setShowVideoModal] = useState(false)
  const inactivityTimerRef = useRef(null)
  const lastActivityRef = useRef(Date.now())

  // Track user activity
  const resetInactivityTimer = () => {
    lastActivityRef.current = Date.now()

    // Clear existing timer
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current)
    }

    // Set new timer for 30 seconds
    inactivityTimerRef.current = setTimeout(() => {
      setShowVideoModal(true)
    }, 90000) // 30 seconds
  }

  // Set up activity listeners
  useEffect(() => {
    const activityEvents = ["mousedown", "mousemove", "keypress", "scroll", "touchstart", "click"]

    const handleActivity = () => {
      if (!showVideoModal) {
        resetInactivityTimer()
      }
    }

    // Add event listeners
    activityEvents.forEach((event) => {
      document.addEventListener(event, handleActivity, true)
    })

    // Start the initial timer
    resetInactivityTimer()

    // Cleanup
    return () => {
      activityEvents.forEach((event) => {
        document.removeEventListener(event, handleActivity, true)
      })
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current)
      }
    }
  }, [showVideoModal])

  const handleCloseVideo = () => {
    setShowVideoModal(false)
    // Reset the inactivity timer after closing video
    setTimeout(() => {
      resetInactivityTimer()
    }, 1000)
  }

  return (
    <div className="main-screen">


        <div className="navibar">
          <div className="logo" onClick={() => navigate("/")}>
            <span className="home">HOME</span>
            <span className="num1">25</span>
          </div>
        </div>


        <div className="box">
              <h1 className="hover-text">
                <span className="text kiosk-text">File Uploader</span>
                {/* <span className="glassy-text meets-text">STARTS</span> */}
              </h1>
        </div>


        <div className="right-box">
          {/* QR Code Section */}
          <div className="image-section">
            <div className="image">
              <img
                className="qr-image"
                src={iphoneImage || "/placeholder.svg"}
                alt="QR Code"
              />
            </div>
          </div>

          {/* PDF Converter Trigger Section */}
          <div className="iframe-section">
            <img
              src={pdfImage}
              alt="PDF Convert"
              className="pdf-icon"
              onClick={() =>
                window.open(
                  "https://www.canva.com/features/word-to-pdf-converter/",
                  "_blank"
                )
              }
            />
          </div>

        </div>





        <div className="bottombox">
          <label htmlFor="fileUpload" className="upload-label">
            Choose Files
          </label>

          <input
            className="file-input"
            id="fileUpload"
            type="file"
            multiple
            onChange={(e) => {
              const files = Array.from(e.target.files)
              if (files.length > 0) {
                navigate("/files", { state: { files } })
              }
            }}
          />

          
          {/* <div className="blank-paper">
            <button id="blank" onClick={() => navigate("/blank-papers")}>
              Blank Papers
            </button>
          </div> */}
        </div>



      <VideoModal isOpen={showVideoModal} onClose={handleCloseVideo} autoPlay={true} />


    </div>
  )
}

export default App
