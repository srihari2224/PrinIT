"use client"

import { useNavigate } from "react-router-dom"
import "./App.css"

// Import images
import iphoneImage from "./assets/images/iphonee.jpg"

function App() {
  const navigate = useNavigate() // Initialize the navigate function

  return (
    <div className="main-screen">
      <div className="navibar">
        <div class="logo" onClick={() => navigate("/")}>
          <span class="home">HOME</span>
          <span class="num1">25</span>
        </div>
      </div>

      <div className="content-row">
        <div className="right-box">
          <div className="text-and-image">
            <div className="box">
              <h1 className="hover-text">
                <span className="text kiosk-text">PRINTING </span>
                <span className="glassy-text meets-text">starts</span>
              </h1>
            </div>

            <div className="image">
              <img className="qr-image" src={iphoneImage || "/placeholder.svg"} alt="QR Code" />
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
            <div class="blank-paper">
              <button id="blank" onClick={() => navigate("/blank-papers")}>
                {" "}
                Blank Papers
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
