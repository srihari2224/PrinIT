import React from "react"
import ReactDOM from "react-dom/client"
import { BrowserRouter, Routes, Route } from "react-router-dom"
import App from "./App.jsx"
import FilesPage from "./pages/FilesPage.jsx"
import PaymentPage from "./pages/PaymentPage.jsx" // Import the new PaymentPage component
import "./index.css"

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        {/* Route for the home page (where file selection happens) */}
        <Route path="/" element={<App />} />
        {/* Route for the page that displays selected files */}
        <Route path="/files" element={<FilesPage />} />
        {/* Route for the payment and printing page */}
        <Route path="/payment" element={<PaymentPage />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
)
