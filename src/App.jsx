"use client"

import { useNavigate } from "react-router-dom"
import { ArrowLeft } from "lucide-react"
import "./App.css"
import Spline from "@splinetool/react-spline"

function App() {
  const navigate = useNavigate() // Initialize the navigate function

  return (
    <div className="main-screen">
      <div className="navibar">
        <img className="Clogo" src="" onClick={() => navigate("/")}></img>
        {/* <button className="back-button" onClick={() => navigate("/")}>
          <ArrowLeft size={20} />
          <span>Back</span>
        </button> */}
        <p>Start Printing</p>
      </div>

      <div className="content-row">
        <div className="mini">
          
        </div>

        <div className="right-box">
          <div className="white-box">
            

            <img className="qr-image" src="/iphonee.jpg" alt="QR Code" />

            
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
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
