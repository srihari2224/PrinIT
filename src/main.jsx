import React from "react"
import ReactDOM from "react-dom/client"
// 1️⃣ Remove BrowserRouter import:
import { HashRouter as Router, Routes, Route } from "react-router-dom"
import StartPage from "./pages/StartPage.jsx"
import App from "./App.jsx"
import FilesPage from "./pages/FilesPage.jsx"
import PaymentPage from "./pages/PaymentPage.jsx"
import AdminPage from "./pages/AdminPage.jsx"
import BlankPaper from "./pages/BlankPaper.jsx"
import "./index.css"

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    {/* 2️⃣ Use HashRouter here */}
    <Router>
      <Routes>
        {/* Route for the start page */}
        <Route path="/" element={<StartPage />} />
        {/* Route for the main page (where file selection happens) */}
        <Route path="/main" element={<App />} />
        {/* Route for the page that displays selected files */}
        <Route path="/files" element={<FilesPage />} />
        {/* Route for the payment and printing page */}
        <Route path="/payment" element={<PaymentPage />} />
        {/* Route for the admin page */}
        <Route path="/admin" element={<AdminPage />} />
        {/* Route for the blank papers page */}
        <Route path="/blank-papers" element={<BlankPaper />} />
      </Routes>
    </Router>
  </React.StrictMode>
)
