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
        <button className="back-button" onClick={() => navigate("/")}>
          <ArrowLeft size={20} />
          <span>Back</span>
        </button>
        <p>Start Printing</p>
      </div>

      <div className="content-row">
        <div className="mini">
          <Spline scene="https://prod.spline.design/Pdrjcz7qIGgfRQfu/scene.splinecode" />
        </div>

        <div className="right-box">
          <div className="white-box">
            <p className="title">
              File Transfer via <span className="highlight-orange">WhatsApp</span>
            </p>

            <img className="qr-image" src="/WhatsApp Image 2025-06-12 at 15.23.17_1ba260da.jpg" alt="QR Code" />

            <h3 className="description">
              Scan the WhatsApp QR code, send your documents to <b>PrinIT@WhatsApp</b>, and instantly access them from
              the computer's folder view.
            </h3>
          </div>

          <div className="bottombox">
            <h3>
              Access <b>Files</b> from the computer's folder view
            </h3>

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
