"use client"

import { useState, useEffect } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { ArrowLeft, Check, Loader, Printer } from "lucide-react"
import "./PaymentPage.css"

function PaymentPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { totalCost, pages, printQueue, blankSheets } = location.state || {
    totalCost: 0,
    pages: [],
    printQueue: [],
    blankSheets: 0,
  }

  const [paymentStatus, setPaymentStatus] = useState("pending")
  const [countdown, setCountdown] = useState(15)
  const [isPrinting, setIsPrinting] = useState(false)
  const [availablePrinters, setAvailablePrinters] = useState([])
  const [printProgress, setPrintProgress] = useState("")
  const [showPrintPreview, setShowPrintPreview] = useState(false)
  const [previewSheets, setPreviewSheets] = useState([])
  const [pendingPrint, setPendingPrint] = useState(false)

  // Initialize Razorpay and check printers when component mounts
  useEffect(() => {
    const script = document.createElement("script")
    script.src = "https://checkout.razorpay.com/v1/checkout.js"
    script.async = true
    document.body.appendChild(script)

    // Check available printers
    checkPrinters()

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script)
      }
    }
  }, [])

  // Check available printers with better error handling
  const checkPrinters = async () => {
    try {
      if (window.require) {
        const { ipcRenderer } = window.require("electron")
        const printers = await ipcRenderer.invoke("get-printers")
        setAvailablePrinters(printers)
        console.log("✅ Available printers:", printers)
      } else {
        console.log("🌐 Running in web mode - printer detection not available")
        setAvailablePrinters([{ name: "Web Browser Print", status: 0 }])
      }
    } catch (error) {
      console.error("❌ Failed to check printers:", error)
      // Set default printer so app doesn't break
      setAvailablePrinters([{ name: "Default Printer", status: 0 }])
    }
  }

  // Enhanced test print function
  const testPrint = async () => {
    try {
      setPrintProgress("Testing printer connection...")

      if (window.require) {
        const { ipcRenderer } = window.require("electron")
        const result = await ipcRenderer.invoke("test-print", {})
        console.log("Test print result:", result)

        if (result.success) {
          alert("✅ Test print sent successfully! Check your printer.")
          setPrintProgress("Test print successful!")
        } else {
          alert(`❌ Test print failed: ${result.error}`)
          setPrintProgress("Test print failed!")
        }
      } else {
        // Web fallback test
        const testWindow = window.open("", "_blank", "width=600,height=400")
        testWindow.document.write(`
          <html>
            <head>
              <title>PrinIT Test Print</title>
              <style>
                body { font-family: Arial; padding: 20px; }
                .test-box { border: 2px solid #000; padding: 20px; text-align: center; }
              </style>
            </head>
            <body>
              <div class="test-box">
                <h1>🖨️ PrinIT Test Print</h1>
                <p><strong>SUCCESS!</strong> Your printer is working.</p>
                <p>Date: ${new Date().toLocaleString()}</p>
                <p>If you can see this clearly, printing is functional!</p>
              </div>
              <script>
                window.onload = function() {
                  setTimeout(function() {
                    window.print();
                  }, 1000);
                }
              </script>
            </body>
          </html>
        `)
        testWindow.document.close()
        setPrintProgress("Web test print opened!")
      }
    } catch (error) {
      console.error("Test print error:", error)
      alert("❌ Test print failed: " + error.message)
      setPrintProgress("Test print error!")
    }
  }

  // ENHANCED: Payment handler with better error handling
  const handlePayment = () => {
    console.log("💳 PAYMENT INITIATED...")
    console.log("Total cost:", totalCost)
    console.log("Pages to print:", pages.length)
    console.log("Queue items:", printQueue.length)

    // Validate that we have something to print
    if (pages.length === 0 && printQueue.length === 0 && blankSheets === 0) {
      alert("❌ No items to print! Please add some content first.")
      return
    }

    const options = {
      key: "rzp_test_X5OHvkg69oonK2",
      amount: totalCost * 100,
      currency: "INR",
      name: "PrinIT Service",
      description: "Payment for exact format printing services",
      handler: (response) => {
        console.log("💳 PAYMENT SUCCESSFUL:", response.razorpay_payment_id)
        console.log("🔄 CHANGING STATUS TO PROCESSING...")

        // CRITICAL: Set status and start printing immediately
        setPaymentStatus("processing")
        setPrintProgress("Payment successful! Starting print process...")

        // Start printing with a small delay to ensure UI updates
        setTimeout(() => {
          console.log("🚀 STARTING PRINT PROCESS...")
          handleFastPrinting()
        }, 500)
      },
      prefill: {
        name: "Customer Name",
        email: "customer@example.com",
        contact: "",
      },
      notes: {
        address: "PrinIT Service Office",
      },
      theme: {
        color: "#000000",
      },
      modal: {
        ondismiss: () => {
          console.log("💳 PAYMENT CANCELLED BY USER")
          setPrintProgress("Payment cancelled")
        },
      },
    }

    try {
      const razorpay = new window.Razorpay(options)
      razorpay.open()
    } catch (error) {
      console.error("❌ RAZORPAY ERROR:", error)
      alert("Payment system error. Please try again.")
    }
  }

  // Generate preview data for all sheets (canvas, PDF, Word)
  const generatePrintPreview = async () => {
    let sheets = []
    // 1. Canvas pages (front only, back blank)
    for (let i = 0; i < pages.length; i++) {
      const page = pages[i]
      // Generate HTML for canvas page
      const canvasHTML = generateCanvasPageHTML(page, i + 1)
      const blob = new Blob([canvasHTML], { type: "text/html" })
      const url = URL.createObjectURL(blob)
      sheets.push({
        type: "canvas",
        label: `Canvas Page ${i + 1} (Front)`,
        url,
      })
      // Blank back side
      const blankHTML = `<!DOCTYPE html><html><head><title>Blank Back Side</title><style>@page { size: A4; margin: 0; } body { margin: 0; padding: 0; width: 210mm; height: 297mm; background: white; }</style></head><body></body></html>`
      const blankBlob = new Blob([blankHTML], { type: "text/html" })
      const blankUrl = URL.createObjectURL(blankBlob)
      sheets.push({
        type: "blank",
        label: `Canvas Page ${i + 1} (Back)`,
        url: blankUrl,
      })
    }
    // 2. PDF/Word queue
    for (let i = 0; i < printQueue.length; i++) {
      const item = printQueue[i]
      if (item.fileType === "pdf") {
        const pdfData = await item.file.arrayBuffer()
        const pdf = await window.pdfjsLib.getDocument({ data: pdfData }).promise
        const startPage = item.actualStartPage
        const endPage = item.actualEndPage
        if (!item.doubleSided) {
          // Single-sided: each page on fresh sheet
          for (let pageNum = startPage; pageNum <= endPage; pageNum++) {
            const pageHTML = await generatePDFPageHTMLNow(pdf, pageNum, item.colorMode)
            const blob = new Blob([pageHTML], { type: "text/html" })
            const url = URL.createObjectURL(blob)
            sheets.push({
              type: "pdf",
              label: `${item.file.name} - Page ${pageNum} (Front)`,
              url,
            })
            // Blank back side
            const blankHTML = `<!DOCTYPE html><html><head><title>Blank Back Side</title><style>@page { size: A4; margin: 0; } body { margin: 0; padding: 0; width: 210mm; height: 297mm; background: white; }</style></head><body></body></html>`
            const blankBlob = new Blob([blankHTML], { type: "text/html" })
            const blankUrl = URL.createObjectURL(blankBlob)
            sheets.push({
              type: "blank",
              label: `${item.file.name} - Page ${pageNum} (Back)`,
              url: blankUrl,
            })
          }
        } else {
          // Double-sided: pair pages
          const pagesToProcess = []
          for (let pageNum = startPage; pageNum <= endPage; pageNum++) {
            pagesToProcess.push(pageNum)
          }
          for (let j = 0; j < pagesToProcess.length; j += 2) {
            const frontPage = pagesToProcess[j]
            const backPage = pagesToProcess[j + 1] || null
            // Front
            const frontHTML = await generatePDFPageHTMLNow(pdf, frontPage, item.colorMode)
            const frontBlob = new Blob([frontHTML], { type: "text/html" })
            const frontUrl = URL.createObjectURL(frontBlob)
            sheets.push({
              type: "pdf",
              label: `${item.file.name} - Page ${frontPage} (Front)`,
              url: frontUrl,
            })
            // Back
            if (backPage) {
              const backHTML = await generatePDFPageHTMLNow(pdf, backPage, item.colorMode)
              const backBlob = new Blob([backHTML], { type: "text/html" })
              const backUrl = URL.createObjectURL(backBlob)
              sheets.push({
                type: "pdf",
                label: `${item.file.name} - Page ${backPage} (Back)`,
                url: backUrl,
              })
            } else {
              // Blank back
              const blankHTML = `<!DOCTYPE html><html><head><title>Blank Back Side</title><style>@page { size: A4; margin: 0; } body { margin: 0; padding: 0; width: 210mm; height: 297mm; background: white; }</style></head><body></body></html>`
              const blankBlob = new Blob([blankHTML], { type: "text/html" })
              const blankUrl = URL.createObjectURL(blankBlob)
              sheets.push({
                type: "blank",
                label: `${item.file.name} - Page ${frontPage} (Back)`,
                url: blankUrl,
              })
            }
          }
        }
      } else if (item.fileType === "word" && item.wordImagePreview) {
        // Use image preview for Word
        const wordHTML = `<!DOCTYPE html><html><head><title>Word Document - ${item.file.name}</title><style>@page { size: A4; margin: 0; } body { margin: 0; padding: 0; width: 210mm; height: 297mm; display: flex; align-items: center; justify-content: center; background: white; } img { max-width: 100%; max-height: 100%; object-fit: contain; ${item.colorMode === "bw" ? "filter: grayscale(100%);" : ""} }</style></head><body><img src='${item.wordImagePreview}' alt='Word Document' /></body></html>`
        const blob = new Blob([wordHTML], { type: "text/html" })
        const url = URL.createObjectURL(blob)
        sheets.push({
          type: "word",
          label: `${item.file.name} (Front)`,
          url,
        })
        // Blank back
        const blankHTML = `<!DOCTYPE html><html><head><title>Blank Back Side</title><style>@page { size: A4; margin: 0; } body { margin: 0; padding: 0; width: 210mm; height: 297mm; background: white; }</style></head><body></body></html>`
        const blankBlob = new Blob([blankHTML], { type: "text/html" })
        const blankUrl = URL.createObjectURL(blankBlob)
        sheets.push({
          type: "blank",
          label: `${item.file.name} (Back)`,
          url: blankUrl,
        })
      }
    }
    setPreviewSheets(sheets)
    setShowPrintPreview(true)
    setPendingPrint(true)
  }

  // ENHANCED: Fast printing with better progress tracking
  const handleFastPrinting = async () => {
    setIsPrinting(true)
    console.log("🚀 FAST PRINTING PROCESS STARTED")

    try {
      let totalItemsPrinted = 0
      const totalItems = pages.length + printQueue.length

      console.log(`📊 TOTAL ITEMS TO PRINT: ${totalItems}`)
      setPrintProgress(`Preparing to print ${totalItems} items...`)

      // STEP 1: Print Canvas Pages
      if (pages && pages.length > 0) {
        console.log(`🎨 PRINTING ${pages.length} CANVAS PAGES...`)
        setPrintProgress(`Printing canvas pages (${pages.length})...`)

        for (let i = 0; i < pages.length; i++) {
          const page = pages[i]
          console.log(`🎨 Processing Canvas Page ${page.id}...`)
          setPrintProgress(`Printing canvas page ${i + 1} of ${pages.length}...`)

          try {
            const canvasHTML = generateCanvasPageHTML(page, i + 1)
            await printPageNow(canvasHTML, `Canvas Page ${page.id}`)
            // Print a blank back side (A4) for duplex printers
            const blankA4HTML = `<!DOCTYPE html><html><head><title>Blank Back Side</title><style>@page { size: A4; margin: 0; } body { margin: 0; padding: 0; width: 210mm; height: 297mm; background: white; }</style></head><body></body></html>`
            await printPageNow(blankA4HTML, `Blank Back Side for Canvas Page ${page.id}`)
            totalItemsPrinted++

            console.log(`✅ Canvas page ${page.id} sent to printer`)
            setPrintProgress(`Canvas page ${i + 1} sent to printer...`)

            // Remove/reduce delay for faster printing
            // await new Promise((resolve) => setTimeout(resolve, 300))
          } catch (error) {
            console.error(`❌ Error printing canvas page ${page.id}:`, error)
            setPrintProgress(`Error printing canvas page ${page.id}`)
          }
        }
        console.log("✅ ALL CANVAS PAGES PROCESSED")
      }

      // STEP 2: Print PDF Queue
      if (printQueue && printQueue.length > 0) {
        console.log(`📄 PRINTING ${printQueue.length} QUEUE ITEMS...`)
        setPrintProgress(`Printing documents (${printQueue.length})...`)

        for (let i = 0; i < printQueue.length; i++) {
          const item = printQueue[i]
          console.log(`📄 Processing: ${item.file.name}`)
          setPrintProgress(`Printing document ${i + 1} of ${printQueue.length}: ${item.file.name}...`)

          try {
            if (item.fileType === "pdf") {
              await printPDFNow(item)
            } else if (item.fileType === "word") {
              await printWordNow(item)
            }
            totalItemsPrinted++

            console.log(`✅ Document ${item.file.name} sent to printer`)
            setPrintProgress(`Document ${item.file.name} sent to printer...`)

            await new Promise((resolve) => setTimeout(resolve, 300))
          } catch (error) {
            console.error(`❌ Error printing ${item.file.name}:`, error)
            setPrintProgress(`Error printing ${item.file.name}`)
          }
        }
        console.log("✅ ALL QUEUE ITEMS PROCESSED")
      }

      // SUCCESS
      console.log(`🎉 PRINTING COMPLETED! ${totalItemsPrinted}/${totalItems} items sent to printer`)
      setPrintProgress(`All ${totalItemsPrinted} items sent to printer successfully!`)

      setTimeout(() => {
        setPaymentStatus("success")
        startCountdown()
      }, 2000)
    } catch (error) {
      console.error("❌ CRITICAL PRINTING ERROR:", error)
      setPrintProgress("Printing failed! Please check your printer connection.")
      alert(
        `❌ Printing failed: ${error.message}\n\nPlease check:\n1. Printer is connected\n2. Printer has paper\n3. Printer is turned on\n\nThen try again.`,
      )
      setPaymentStatus("pending")
    } finally {
      setIsPrinting(false)
    }
  }

  // Generate canvas page HTML (optimized)
  const generateCanvasPageHTML = (page, pageNumber) => {
    const colorClass = page.colorMode === "bw" ? "bw-filter" : "color-filter"

    let itemsHTML = ""
    if (page.items && page.items.length > 0) {
      page.items.forEach((item, index) => {
        try {
          const fileURL = URL.createObjectURL(item.file)
          const xMM = (item.x / 743.75) * 210
          const yMM = (item.y / 1052.5) * 297
          const widthMM = (item.width / 743.75) * 210
          const heightMM = (item.height / 1052.5) * 297

          itemsHTML += `
          <div style="position: absolute; left: ${xMM}mm; top: ${yMM}mm; width: ${widthMM}mm; height: ${heightMM}mm; transform: rotate(${item.rotation || 0}deg);">
            <img src="${fileURL}" style="width: 100%; height: 100%; object-fit: contain;" alt="Canvas Item ${index + 1}" />
          </div>
        `
        } catch (error) {
          console.error(`Error processing canvas item ${index}:`, error)
        }
      })
    }

    return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>PrinIT Canvas Page ${pageNumber}</title>
      <style>
        @page { size: A4; margin: 0; }
        @media print { 
          body { 
            -webkit-print-color-adjust: exact !important; 
            print-color-adjust: exact !important; 
            margin: 0; 
            padding: 0; 
          } 
        }
        body { 
          margin: 0; 
          padding: 0; 
          width: 210mm; 
          height: 297mm; 
          background: white; 
          position: relative; 
          overflow: hidden;
        }
        .bw-filter { filter: grayscale(100%); }
        .color-filter { filter: none; }
      </style>
    </head>
    <body class="${colorClass}">
      ${itemsHTML}
    </body>
    </html>
  `
  }

  // ENHANCED: Print page with better error handling
  const printPageNow = async (htmlContent, description) => {
    console.log(`🖨️ PRINTING: ${description}`)

    try {
      if (window.require) {
        // Electron method
        const { ipcRenderer } = window.require("electron")

        // Send to Electron for printing
        ipcRenderer.send("silent-print-html", htmlContent)
        console.log(`✅ SENT TO ELECTRON PRINTER: ${description}`)

        // Wait a bit to ensure the print command is processed
        await new Promise((resolve) => setTimeout(resolve, 500))
      } else {
        // Web method fallback
        console.log(`🌐 WEB PRINTING: ${description}`)
        const printWindow = window.open("", "_blank", "width=794,height=1123")

        if (!printWindow) {
          throw new Error("Could not open print window - popup blocked?")
        }

        printWindow.document.write(htmlContent)
        printWindow.document.close()

        // Wait for content to load then print
        await new Promise((resolve) => {
          printWindow.onload = () => {
            setTimeout(() => {
              try {
                printWindow.print()
                console.log(`✅ WEB PRINTED: ${description}`)
                setTimeout(() => {
                  printWindow.close()
                  resolve()
                }, 2000)
              } catch (printError) {
                console.error(`❌ Web print error for ${description}:`, printError)
                printWindow.close()
                resolve() // Don't fail the whole process
              }
            }, 1000)
          }
        })
      }
    } catch (error) {
      console.error(`❌ PRINT ERROR for ${description}:`, error)
      throw error
    }
  }

  // Print PDF now (simplified for reliability)
  const printPDFNow = async (item) => {
    console.log(`📄 PRINTING PDF: ${item.file.name}`)

    try {
      const pdfData = await item.file.arrayBuffer()

      if (!window.pdfjsLib) {
        throw new Error("PDF.js not loaded - cannot process PDF")
      }

      const pdf = await window.pdfjsLib.getDocument({ data: pdfData }).promise
      const startPage = item.actualStartPage
      const endPage = item.actualEndPage

      console.log(`📄 PDF has ${pdf.numPages} pages, printing ${startPage}-${endPage}`)

      if (!item.doubleSided) {
        // Single-sided: each page on fresh sheet
        for (let pageNum = startPage; pageNum <= endPage; pageNum++) {
          console.log(`📄 Processing PDF page ${pageNum}`)
          const pageHTML = await generatePDFPageHTMLNow(pdf, pageNum, item.colorMode)
          await printPageNow(pageHTML, `PDF ${item.file.name} Page ${pageNum}`)
          await new Promise((resolve) => setTimeout(resolve, 200))
        }
      } else {
        // Double-sided: pair pages
        const pagesToProcess = []
        for (let pageNum = startPage; pageNum <= endPage; pageNum++) {
          pagesToProcess.push(pageNum)
        }

        for (let i = 0; i < pagesToProcess.length; i += 2) {
          const frontPage = pagesToProcess[i]
          const backPage = pagesToProcess[i + 1] || null

          console.log(`📄 Processing double-sided: front=${frontPage}, back=${backPage}`)
          const sheetHTML = await generateDoubleSidedHTMLNow(pdf, frontPage, backPage, item.colorMode)
          await printPageNow(sheetHTML, `PDF ${item.file.name} Pages ${frontPage}${backPage ? `-${backPage}` : ""}`)
          await new Promise((resolve) => setTimeout(resolve, 200))
        }
      }
    } catch (error) {
      console.error(`❌ PDF print error for ${item.file.name}:`, error)
      throw error
    }
  }

  // Generate PDF page HTML (optimized for speed and reliability)
  const generatePDFPageHTMLNow = async (pdf, pageNum, colorMode) => {
    try {
      const page = await pdf.getPage(pageNum)
      const scale = 3.0 // Increased for higher quality
      const viewport = page.getViewport({ scale })

      const canvas = document.createElement("canvas")
      const context = canvas.getContext("2d")
      canvas.height = viewport.height
      canvas.width = viewport.width

      await page.render({ canvasContext: context, viewport: viewport }).promise
      const imageData = canvas.toDataURL("image/png", 0.9) // Slightly compressed for speed

      return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>PDF Page ${pageNum}</title>
        <style>
          @page { size: A4; margin: 0; }
          @media print { 
            body { 
              -webkit-print-color-adjust: exact !important; 
              print-color-adjust: exact !important; 
              margin: 0; 
              padding: 0; 
            } 
          }
          body { 
            margin: 0; 
            padding: 0; 
            width: 210mm; 
            height: 297mm; 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            background: white;
          }
          img { 
            max-width: 100%; 
            max-height: 100%; 
            object-fit: contain; 
            ${colorMode === "bw" ? "filter: grayscale(100%);" : ""} 
          }
        </style>
      </head>
      <body>
        <img src="${imageData}" alt="PDF Page ${pageNum}" />
      </body>
      </html>
    `
    } catch (error) {
      console.error(`❌ Error generating PDF page ${pageNum}:`, error)
      return `
        <html>
          <body style="font-family: Arial; padding: 20px; text-align: center;">
            <h1>Error Loading PDF Page ${pageNum}</h1>
            <p>Could not render this page. Please check the PDF file.</p>
          </body>
        </html>
      `
    }
  }

  // Generate double-sided HTML (optimized)
  const generateDoubleSidedHTMLNow = async (pdf, frontPageNum, backPageNum, colorMode) => {
    try {
      // Front page
      const frontPage = await pdf.getPage(frontPageNum)
      const frontViewport = frontPage.getViewport({ scale: 3.0 }) // Increased for higher quality
      const frontCanvas = document.createElement("canvas")
      const frontContext = frontCanvas.getContext("2d")
      frontCanvas.height = frontViewport.height
      frontCanvas.width = frontViewport.width
      await frontPage.render({ canvasContext: frontContext, viewport: frontViewport }).promise
      const frontImageData = frontCanvas.toDataURL("image/png", 0.9)

      let backImageData = null
      if (backPageNum) {
        const backPage = await pdf.getPage(backPageNum)
        const backViewport = backPage.getViewport({ scale: 3.0 }) // Increased for higher quality
        const backCanvas = document.createElement("canvas")
        const backContext = backCanvas.getContext("2d")
        backCanvas.height = backViewport.height
        backCanvas.width = backViewport.width
        await backPage.render({ canvasContext: backContext, viewport: backViewport }).promise
        backImageData = backCanvas.toDataURL("image/png", 0.9)
      }

      return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>PDF Pages ${frontPageNum}${backPageNum ? `-${backPageNum}` : ""}</title>
        <style>
          @page { size: A4; margin: 0; }
          @media print { 
            body { -webkit-print-color-adjust: exact !important; margin: 0; padding: 0; }
            .page-break { page-break-after: always; }
          }
          .page { width: 210mm; height: 297mm; display: flex; align-items: center; justify-content: center; }
          img { max-width: 100%; max-height: 100%; object-fit: contain; ${colorMode === "bw" ? "filter: grayscale(100%);" : ""} }
        </style>
      </head>
      <body>
        <div class="page">
          <img src="${frontImageData}" alt="PDF Page ${frontPageNum}" />
        </div>
        ${backImageData ? `<div class="page page-break"><img src="${backImageData}" alt="PDF Page ${backPageNum}" /></div>` : ""}
      </body>
      </html>
    `
    } catch (error) {
      console.error("❌ Error generating double-sided PDF:", error)
      return `<html><body><h1>Error loading PDF pages</h1></body></html>`
    }
  }

  // Print Word document (simplified)
  const printWordNow = async (item) => {
    console.log(`📝 PRINTING WORD: ${item.file.name}`)

    try {
      let wordHTML = ""

      if (item.wordImagePreview) {
        // Use exact image preview for perfect formatting
        wordHTML = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Word Document - ${item.file.name}</title>
          <style>
            @page { size: A4; margin: 0; }
            @media print { body { -webkit-print-color-adjust: exact !important; margin: 0; padding: 0; } }
            body { margin: 0; padding: 0; width: 210mm; height: 297mm; display: flex; align-items: center; justify-content: center; }
            img { max-width: 100%; max-height: 100%; object-fit: contain; ${item.colorMode === "bw" ? "filter: grayscale(100%);" : ""} }
          </style>
        </head>
        <body>
          <img src="${item.wordImagePreview}" alt="Word Document" />
        </body>
        </html>
      `
      } else if (item.wordContent && item.wordContent.html) {
        // Fallback to HTML content
        wordHTML = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Word Document - ${item.file.name}</title>
          <style>
            @page { size: A4; margin: 1in; }
            @media print { body { -webkit-print-color-adjust: exact !important; } }
            body { 
              font-family: 'Times New Roman', serif; 
              font-size: 12pt; 
              line-height: 1.15; 
              background: white; 
              color: black; 
              ${item.colorMode === "bw" ? "filter: grayscale(100%);" : ""} 
            }
          </style>
        </head>
        <body>
          ${item.wordContent.html}
        </body>
        </html>
      `
      } else {
        throw new Error("No Word content available to print")
      }

      if (wordHTML) {
        await printPageNow(wordHTML, `Word ${item.file.name}`)
      }
    } catch (error) {
      console.error(`❌ Word print error for ${item.file.name}:`, error)
      throw error
    }
  }

  // Start countdown timer
  const startCountdown = () => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          navigate("/")
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  return (
    <div className="payment-page">
      <div className="navbar">
        <button className="back-button" onClick={() => navigate("/files")}>
          <ArrowLeft size={20} />
          <span>Back</span>
        </button>
        <div className="page-title">Payment & Fast Printing</div>
      </div>

      <div className="payment-content">
        {paymentStatus === "pending" && (
          <div className="payment-summary-container">
            <div className="payment-summary-card">
              <div className="order-details">
                {pages.length > 0 && (
                  <div className="order-section">
                    <h3>Canvas Pages ({pages.length}) - Each on Fresh A4 Sheet</h3>
                    {pages.map((page, index) => (
                      <div key={index} className="order-item">
                        <span>
                          Canvas Page {page.id} ({page.colorMode === "color" ? "Color" : "B&W"}) -{" "}
                          {page.items?.length || 0} items - Front only
                        </span>
                        <span>₹{page.colorMode === "color" ? 10 : 2}</span>
                      </div>
                    ))}
                  </div>
                )}

                {printQueue.length > 0 && (
                  <div className="order-section">
                    <h3>Documents ({printQueue.length}) - Separate from Canvas</h3>
                    {printQueue.map((item, index) => (
                      <div key={index} className="order-item">
                        <span>
                          {item.file.name.substring(0, 20)}
                          {item.file.name.length > 20 ? "..." : ""} (
                          {item.pageRange === "custom"
                            ? `Pages ${item.actualStartPage}-${item.actualEndPage}`
                            : `${item.pages} pages`}
                          , {item.colorMode === "color" ? "Color" : "B&W"},{" "}
                          {item.doubleSided ? "Double-sided" : "Single-sided"})
                          {item.fileType === "word" && " - EXACT FORMAT"}
                        </span>
                        <span>₹{item.cost}</span>
                      </div>
                    ))}
                  </div>
                )}

                {blankSheets > 0 && (
                  <div className="order-section">
                    <h3>Blank Sheets</h3>
                    <div className="order-item">
                      <span>Blank A4 Sheets ({blankSheets})</span>
                      <span>₹{blankSheets}</span>
                    </div>
                  </div>
                )}

                <div className="order-total">
                  <span>Total Amount</span>
                  <span>₹{totalCost}</span>
                </div>
              </div>

              <button className="pay-now-button" onClick={handlePayment}>
                <Printer size={16} />
                Pay & Fast Print ₹{totalCost}
              </button>
            </div>
          </div>
        )}

        {paymentStatus === "processing" && (
          <div className="processing-container">
            <div className="processing-card">
              <div className="processing-icon">
                <Loader size={48} className="spin-animation" />
              </div>
              <h2>Fast Printing in Progress</h2>
              <p>High-quality papers are printing now...</p>

              {/* Progress Display */}
              <div style={{ marginTop: "20px", padding: "16px", background: "#f0f8ff", borderRadius: "8px" }}>
                <p>
                  <strong>🖨️ Current Status:</strong>
                </p>
                <p style={{ fontStyle: "italic", color: "#2e7d32" }}>
                  {printProgress || "Initializing print process..."}
                </p>

                <div style={{ marginTop: "16px" }}>
                  <p>
                    <strong>Print Queue:</strong>
                  </p>
                  {pages.length > 0 && <p>• {pages.length} canvas pages (each on fresh A4 sheet)</p>}
                  {printQueue.length > 0 && (
                    <>
                      {printQueue.map((item, index) => (
                        <p key={index}>
                          • {item.file.name} (
                          {item.pageRange === "custom"
                            ? `Pages ${item.actualStartPage}-${item.actualEndPage}`
                            : `${item.pages} pages`}
                          , {item.colorMode === "color" ? "Color" : "B&W"},{" "}
                          {item.doubleSided ? "Double-sided" : "Single-sided"})
                        </p>
                      ))}
                    </>
                  )}
                </div>

                <p style={{ marginTop: "12px", fontWeight: "bold", color: "#2e7d32" }}>
                  ⚡ Papers are printing at high speed with perfect quality!
                </p>
              </div>
            </div>
          </div>
        )}

        {paymentStatus === "success" && (
          <div className="success-container">
            <div className="success-card">
              <div className="success-icon">
                <Check size={48} />
              </div>
              <h2>Fast Printing Successful!</h2>
              <p>All your documents have been printed with high quality and speed.</p>
              <p>Canvas pages and PDF documents printed separately with perfect formatting!</p>

              <div style={{ marginTop: "20px", padding: "16px", background: "#e8f5e8", borderRadius: "8px" }}>
                <p>
                  <strong>✅ Print Summary:</strong>
                </p>
                {pages.length > 0 && <p>• {pages.length} canvas pages printed</p>}
                {printQueue.length > 0 && <p>• {printQueue.length} documents printed</p>}
                <p>• All items sent to printer successfully</p>
                <p>• Check your printer output tray</p>
              </div>

              <div className="countdown">
                <p>
                  Redirecting to home in <span className="countdown-number">{countdown}</span> seconds
                </p>
                <div className="progress-bar">
                  <div className="progress" style={{ width: `${((15 - countdown) / 15) * 100}%` }}></div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      {showPrintPreview && (
        <div className="print-preview-modal" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 24, maxWidth: '90vw', maxHeight: '90vh', overflow: 'auto' }}>
            <h2>Print Preview</h2>
            <p>Below is exactly how your documents will be printed (front and back of each A4 sheet):</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, justifyContent: 'center' }}>
              {previewSheets.map((sheet, idx) => (
                <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 16 }}>
                  <span style={{ fontWeight: 600, marginBottom: 8 }}>{sheet.label}</span>
                  <embed src={sheet.url} type="text/html" style={{ width: 300, height: 420, border: '1px solid #ccc', borderRadius: 8, background: '#fafafa' }} />
                </div>
              ))}
            </div>
            <div style={{ textAlign: 'center', marginTop: 24 }}>
              <button style={{ padding: '12px 32px', fontSize: 18, borderRadius: 8, background: '#1976d2', color: '#fff', border: 'none', cursor: 'pointer' }} onClick={async () => {
                setShowPrintPreview(false)
                setPendingPrint(false)
                await handleFastPrinting()
              }}>Start Printing</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PaymentPage
