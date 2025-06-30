"use client"

import { useState, useRef, useEffect } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import {
  Plus,
  Copy,
  Trash,
  ImageIcon,
  FileText,
  FileIcon,
  Printer,
  CreditCard,
  Crop,
  RotateCcw,
  RotateCw,
  X,
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import "./FilesPage.css"

function FilesPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const files = location.state?.files || []
  const canvasRef = useRef(null)

  // State for managing pages
  const [pages, setPages] = useState([{ id: 1, items: [], colorMode: "color" }])
  const [activePage, setActivePage] = useState(1)
  const [draggingFile, setDraggingFile] = useState(null)
  const [draggingItem, setDraggingItem] = useState(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })

  

  // State for image editing
  const [selectedItem, setSelectedItem] = useState(null)
  const [cropMode, setCropMode] = useState(false)
  const [cropStart, setCropStart] = useState({ x: 0, y: 0 })
  const [cropEnd, setCropEnd] = useState({ x: 0, y: 0 })

  // PDF viewer state
  const [pdfDoc, setPdfDoc] = useState(null)
  const [currentPdfPage, setCurrentPdfPage] = useState(1)
  const [pdfCanvas, setPdfCanvas] = useState(null)
  const [allPdfPages, setAllPdfPages] = useState([])

  // State for converted documents
  const [convertedDocs, setConvertedDocs] = useState(new Map())

  // Group files by type
  const fileCategories = {
    images: files.filter((file) => file.type.startsWith("image/")),
    pdfs: [...files.filter((file) => file.type === "application/pdf"), ...Array.from(convertedDocs.values())],
    documents: files.filter(
      (file) =>
        file.type === "application/msword" ||
        file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
        file.type === "text/plain",
    ),
    others: files.filter(
      (file) =>
        !file.type.startsWith("image/") &&
        file.type !== "application/pdf" &&
        file.type !== "application/msword" &&
        file.type !== "application/vnd.openxmlformats-officedocument.wordprocessingml.document" &&
        file.type !== "text/plain",
    ),
  }

  // Initialize PDF.js
  useEffect(() => {
    const loadPDFJS = async () => {
      if (!window.pdfjsLib) {
        const script = document.createElement("script")
        script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"
        script.onload = () => {
          window.pdfjsLib.GlobalWorkerOptions.workerSrc =
            "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js"
        }
        document.head.appendChild(script)
      }
    }
    loadPDFJS()
  }, [])

  // Improved Word document to PDF conversion
  const convertWordToPDF = async (file) => {
    try {
      console.log("Converting Word document to PDF:", file.name)
      // For DOCX files, use mammoth to extract content and preserve formatting
      if (file.name.toLowerCase().endsWith(".docx")) {
        const mammoth = await import("mammoth")
        const arrayBuffer = await file.arrayBuffer()
        // Extract HTML to preserve formatting better
        const result = await mammoth.convertToHtml({ arrayBuffer })
        const htmlContent = result.value

        // Create PDF using jsPDF with better formatting
        const { jsPDF } = await import("jspdf")
        const pdf = new jsPDF({
          orientation: "portrait",
          unit: "mm",
          format: "a4",
        })

        // Create a temporary div to render HTML content
        const tempDiv = document.createElement("div")
        tempDiv.innerHTML = htmlContent
        tempDiv.style.width = "190mm" // A4 width minus margins
        tempDiv.style.fontFamily = "Arial, sans-serif"
        tempDiv.style.fontSize = "12pt"
        tempDiv.style.lineHeight = "1.4"
        tempDiv.style.padding = "10mm"
        tempDiv.style.position = "absolute"
        tempDiv.style.left = "-9999px"
        document.body.appendChild(tempDiv)

        // Use html2canvas to convert HTML to image, then to PDF
        const html2canvas = await import("html2canvas")
        const canvas = await html2canvas.default(tempDiv, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: "#ffffff",
        })

        document.body.removeChild(tempDiv)

        // Calculate dimensions to fit A4
        const imgWidth = 190 // A4 width minus margins
        const imgHeight = (canvas.height * imgWidth) / canvas.width

        // Add image to PDF - single page only
        pdf.addImage(canvas.toDataURL("image/png"), "PNG", 10, 10, imgWidth, Math.min(imgHeight, 277))

        const pdfBlob = pdf.output("blob")
        const convertedFile = new File([pdfBlob], file.name.replace(/\.(docx?|DOCX?)$/, ".pdf"), {
          type: "application/pdf",
        })

        setConvertedDocs((prev) => new Map(prev.set(file.name, convertedFile)))
        return convertedFile
      }

      // For DOC files, create a simple single-page PDF
      const { jsPDF } = await import("jspdf")
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      })

      // Add basic document info on single page
      pdf.setFontSize(14)
      pdf.text(`Document: ${file.name}`, 20, 30)
      pdf.setFontSize(12)
      pdf.text(`Size: ${(file.size / 1024).toFixed(1)} KB`, 20, 45)
      pdf.text(`Type: ${file.type}`, 20, 60)
      pdf.text("Content converted to PDF for printing", 20, 80)

      const pdfBlob = pdf.output("blob")
      const convertedFile = new File([pdfBlob], file.name.replace(/\.(docx?|DOCX?)$/, ".pdf"), {
        type: "application/pdf",
      })

      setConvertedDocs((prev) => new Map(prev.set(file.name, convertedFile)))
      return convertedFile
    } catch (error) {
      console.error("Word to PDF conversion failed:", error)
      return file
    }
  }

  // Function to get accurate PDF page count using PDF.js
  const getPDFPageCount = async (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = async function () {
        try {
          if (!window.pdfjsLib) {
            resolve(1)
            return
          }
          const pdf = await window.pdfjsLib.getDocument({ data: this.result }).promise
          resolve(pdf.numPages)
        } catch (error) {
          console.error("Error loading PDF:", error)
          resolve(1)
        }
      }
      reader.onerror = () => resolve(1)
      reader.readAsArrayBuffer(file)
    })
  }

  // Load PDF for preview and render all pages
  const loadPDFPreview = async (file) => {
    try {
      if (!window.pdfjsLib) {
        console.log("PDF.js not available")
        return
      }

      const reader = new FileReader()
      reader.onload = async function () {
        try {
          const pdf = await window.pdfjsLib.getDocument({ data: this.result }).promise
          setPdfDoc(pdf)
          setCurrentPdfPage(1)

          // Render all pages
          const pages = []
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i)
            const scale = 1.5
            const viewport = page.getViewport({ scale })

            const canvas = document.createElement("canvas")
            const context = canvas.getContext("2d")
            canvas.height = viewport.height
            canvas.width = viewport.width

            const renderContext = {
              canvasContext: context,
              viewport: viewport,
            }

            await page.render(renderContext).promise
            pages.push(canvas)
          }

          setAllPdfPages(pages)
          setPdfCanvas(pages[0])
        } catch (error) {
          console.error("Error loading PDF for preview:", error)
        }
      }
      reader.readAsArrayBuffer(file)
    } catch (error) {
      console.error("Error in loadPDFPreview:", error)
    }
  }

  // Handle PDF page navigation
  const goToPDFPage = (direction) => {
    if (!pdfDoc) return

    let newPage = currentPdfPage
    if (direction === "prev" && currentPdfPage > 1) {
      newPage = currentPdfPage - 1
    } else if (direction === "next" && currentPdfPage < pdfDoc.numPages) {
      newPage = currentPdfPage + 1
    }

    if (newPage !== currentPdfPage) {
      setCurrentPdfPage(newPage)
      setPdfCanvas(allPdfPages[newPage - 1])
    }
  }

  // Handle adding a new page
  const addNewPage = () => {
    const newPage = {
      id: pages.length + 1,
      items: [],
      colorMode: "color",
    }
    setPages([...pages, newPage])
    setActivePage(newPage.id)
  }

  // Handle duplicating a page
  const duplicatePage = () => {
    const currentPage = pages.find((page) => page.id === activePage)
    if (!currentPage) return

    const duplicatedItems = currentPage.items.map((item) => ({
      ...item,
      id: `${item.id}-dup-${Date.now()}`,
    }))

    const newPage = {
      id: pages.length + 1,
      items: duplicatedItems,
      colorMode: currentPage.colorMode,
    }

    setPages([...pages, newPage])
    setActivePage(newPage.id)
  }

  // Handle toggling color mode
  const toggleColorMode = (pageId) => {
    setPages(
      pages.map((page) =>
        page.id === pageId ? { ...page, colorMode: page.colorMode === "bw" ? "color" : "bw" } : page,
      ),
    )
  }

  // Handle deleting a page
  const deletePage = (pageId) => {
    const newPages = pages.filter((page) => page.id !== pageId)
    if (newPages.length > 0) {
      newPages.forEach((page, index) => {
        page.id = index + 1
      })
      const pageIndex = pages.findIndex((page) => page.id === pageId)
      const newActivePageId =
        pageIndex > 0 ? (pageIndex < newPages.length ? pageIndex : newPages.length) : newPages.length > 0 ? 1 : 1
      setActivePage(newActivePageId)
    } else {
      setActivePage(null)
    }
    setPages(newPages)
  }

  // Handle drag start for files
  const handleDragStart = (file) => {
    setDraggingFile(file)
  }

  // Handle drag start for canvas items
  const handleItemDragStart = (e, item) => {
    e.stopPropagation()
    const rect = e.currentTarget.getBoundingClientRect()
    setDraggingItem(item)
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    })
  }

  // Handle drag over
  const handleDragOver = (e) => {
    e.preventDefault()
  }

  // Handle drop on canvas
  const handleDrop = (e) => {
    e.preventDefault()
    const canvasRect = canvasRef.current.getBoundingClientRect()

    if (draggingFile) {
      const x = e.clientX - canvasRect.left
      const y = e.clientY - canvasRect.top

      setPages(
        pages.map((page) => {
          if (page.id === activePage) {
            return {
              ...page,
              items: [
                ...page.items,
                {
                  id: `${draggingFile.name}-${Date.now()}`,
                  file: draggingFile,
                  x,
                  y,
                  width: 200,
                  height: 200,
                  rotation: 0,
                  crop: null,
                },
              ],
            }
          }
          return page
        }),
      )
      setDraggingFile(null)
    } else if (draggingItem) {
      const x = e.clientX - canvasRect.left - dragOffset.x
      const y = e.clientY - canvasRect.top - dragOffset.y

      setPages(
        pages.map((page) => {
          if (page.id === activePage) {
            return {
              ...page,
              items: page.items.map((item) => {
                if (item.id === draggingItem.id) {
                  return { ...item, x, y }
                }
                return item
              }),
            }
          }
          return page
        }),
      )
      setDraggingItem(null)
    }
  }

  const [resizing, setResizing] = useState(null)

  // Handle resize start
  const handleResizeStart = (e, itemId, handle) => {
    e.preventDefault()
    e.stopPropagation()
    const startX = e.clientX
    const startY = e.clientY
    const item = currentPage.items.find((item) => item.id === itemId)
    if (!item) return

    const initialWidth = item.width
    const initialHeight = item.height
    const initialX = item.x
    const initialY = item.y

    setResizing({
      itemId,
      handle,
      startX,
      startY,
      initialWidth,
      initialHeight,
      initialX,
      initialY,
    })

    document.addEventListener("mousemove", handleResize)
    document.addEventListener("mouseup", handleResizeEnd)
  }

  // Handle resize
  const handleResize = (e) => {
    if (!resizing) return

    const { itemId, handle, startX, startY, initialWidth, initialHeight, initialX, initialY } = resizing

    const deltaX = e.clientX - startX
    const deltaY = e.clientY - startY

    let newWidth = initialWidth
    let newHeight = initialHeight
    let newX = initialX
    let newY = initialY

    switch (handle) {
      case "bottom-right":
        newWidth = Math.max(50, initialWidth + deltaX)
        newHeight = Math.max(50, initialHeight + deltaY)
        break
      case "bottom-left":
        newWidth = Math.max(50, initialWidth - deltaX)
        newHeight = Math.max(50, initialHeight + deltaY)
        newX = initialX + deltaX
        break
      case "top-right":
        newWidth = Math.max(50, initialWidth + deltaX)
        newHeight = Math.max(50, initialHeight - deltaY)
        newY = initialY + deltaY
        break
      case "top-left":
        newWidth = Math.max(50, initialWidth - deltaX)
        newHeight = Math.max(50, initialHeight - deltaY)
        newX = initialX + deltaX
        newY = initialY + deltaY
        break
    }

    setPages(
      pages.map((page) => {
        if (page.id === activePage) {
          return {
            ...page,
            items: page.items.map((item) => {
              if (item.id === itemId) {
                return { ...item, width: newWidth, height: newHeight, x: newX, y: newY }
              }
              return item
            }),
          }
        }
        return page
      }),
    )
  }

  // Handle resize end
  const handleResizeEnd = () => {
    setResizing(null)
    document.removeEventListener("mousemove", handleResize)
    document.removeEventListener("mouseup", handleResizeEnd)
  }

  // Handle image enlargement and compression
  const resizeImage = (itemId, action) => {
    setPages(
      pages.map((page) => {
        if (page.id === activePage) {
          return {
            ...page,
            items: page.items.map((item) => {
              if (item.id === itemId) {
                const scaleFactor = action === "enlarge" ? 1.2 : 0.8
                const newWidth = item.width * scaleFactor
                const newHeight = item.height * scaleFactor
                return { ...item, width: newWidth, height: newHeight }
              }
              return item
            }),
          }
        }
        return page
      }),
    )
  }

  // Handle rotation
  const rotateItem = (itemId, direction) => {
    setPages(
      pages.map((page) => {
        if (page.id === activePage) {
          return {
            ...page,
            items: page.items.map((item) => {
              if (item.id === itemId) {
                const newRotation = item.rotation + (direction === "clockwise" ? 90 : -90)
                return { ...item, rotation: newRotation }
              }
              return item
            }),
          }
        }
        return page
      }),
    )
  }

  // Handle crop start
  const handleCropStart = (e) => {
    if (!selectedItem || !cropMode) return

    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    setCropStart({ x, y })
    setCropEnd({ x, y })

    document.addEventListener("mousemove", handleCropMove)
    document.addEventListener("mouseup", handleCropEnd)
  }

  // Handle crop move
  const handleCropMove = (e) => {
    if (!selectedItem || !cropMode) return

    const rect = canvasRef.current.getBoundingClientRect()
    const x = Math.max(0, Math.min(selectedItem.width, e.clientX - rect.left - selectedItem.x))
    const y = Math.max(0, Math.min(selectedItem.height, e.clientY - rect.top - selectedItem.y))

    setCropEnd({ x, y })
  }

  // Handle crop end
  const handleCropEnd = () => {
    if (!selectedItem || !cropMode) return

    const cropX = Math.min(cropStart.x, cropEnd.x)
    const cropY = Math.min(cropStart.y, cropEnd.y)
    const cropWidth = Math.abs(cropEnd.x - cropStart.x)
    const cropHeight = Math.abs(cropEnd.y - cropStart.y)

    if (cropWidth > 10 && cropHeight > 10) {
      setPages(
        pages.map((page) => {
          if (page.id === activePage) {
            return {
              ...page,
              items: page.items.map((item) => {
                if (item.id === selectedItem.id) {
                  return {
                    ...item,
                    crop: {
                      x: cropX,
                      y: cropY,
                      width: cropWidth,
                      height: cropHeight,
                    },
                  }
                }
                return item
              }),
            }
          }
          return page
        }),
      )
    }

    setCropMode(false)
    document.removeEventListener("mousemove", handleCropMove)
    document.removeEventListener("mouseup", handleCropEnd)
  }

  // Handle item deletion
  const deleteItem = (pageId, itemId) => {
    setPages(
      pages.map((page) => {
        if (page.id === pageId) {
          return {
            ...page,
            items: page.items.filter((item) => item.id !== itemId),
          }
        }
        return page
      }),
    )
    if (selectedItem && selectedItem.id === itemId) {
      setSelectedItem(null)
    }
  }

  // Add state for file options modal
  const [fileOptions, setFileOptions] = useState({
    showModal: false,
    file: null,
    pageCount: 0,
    printSettings: {
      doubleSided: false,
      pageRange: "all",
      startPage: 1,
      endPage: 1,
      colorMode: "bw",
    },
  })

  // Add function to show file options with loading state
  const showFileOptions = async (file) => {
    console.log("Clicked on file:", file.name, "Type:", file.type)

    setFileOptions({
      showModal: true,
      file,
      pageCount: 0,
      printSettings: {
        doubleSided: false,
        pageRange: "all",
        startPage: 1,
        endPage: 1,
        colorMode: "bw",
      },
    })

    // Load PDF preview
    if (file.type === "application/pdf") {
      loadPDFPreview(file)
    }

    let pageCount = 1
    try {
      if (file.type === "application/pdf") {
        pageCount = await getPDFPageCount(file)
      } else {
        pageCount = 1
      }
    } catch (error) {
      console.error("Error counting pages:", error)
      pageCount = 1
    }

    setFileOptions({
      showModal: true,
      file,
      pageCount,
      printSettings: {
        doubleSided: false,
        pageRange: "all",
        startPage: 1,
        endPage: pageCount,
        colorMode: "bw",
      },
    })
  }

  // Function to calculate cost for double-sided printing
  const calculateDoubleSidedCost = (totalPages, isColor, isDoubleSided) => {
    if (!isDoubleSided) {
      return totalPages * (isColor ? 10 : 2)
    }

    if (isColor) {
      return totalPages * 10
    } else {
      const fullSheets = Math.floor(totalPages / 2)
      const remainingPages = totalPages % 2
      return fullSheets * 3 + remainingPages * 2
    }
  }

  // Add function to add file to print queue
  const addFileToPrintQueue = () => {
    let pagesToPrint = 0
    if (fileOptions.printSettings.pageRange === "all") {
      pagesToPrint = fileOptions.pageCount
    } else {
      pagesToPrint = fileOptions.printSettings.endPage - fileOptions.printSettings.startPage + 1
    }

    const itemCost = calculateDoubleSidedCost(
      pagesToPrint,
      fileOptions.printSettings.colorMode === "color",
      fileOptions.printSettings.doubleSided,
    )

    setPrintQueue([
      ...printQueue,
      {
        file: fileOptions.file,
        pages: pagesToPrint,
        doubleSided: fileOptions.printSettings.doubleSided,
        colorMode: fileOptions.printSettings.colorMode,
        cost: itemCost,
        pageRange: fileOptions.printSettings.pageRange,
        startPage: fileOptions.printSettings.startPage,
        endPage: fileOptions.printSettings.endPage,
      },
    ])

    setFileOptions({ ...fileOptions, showModal: false })
  }

  // Add print queue state
  const [printQueue, setPrintQueue] = useState([])

  // Function to calculate canvas pages cost
  const calculateCanvasPagesCost = () => {
    let totalCost = 0
    if (pages.length === 0) return 0

    let pagesToCalculate = []
    if (printSettings.pageRange === "all") {
      pagesToCalculate = pages
    } else {
      const startPage = Math.max(1, printSettings.startPage)
      const endPage = Math.min(pages.length, printSettings.endPage)
      for (let i = startPage; i <= endPage; i++) {
        const page = pages.find((p) => p.id === i)
        if (page) {
          pagesToCalculate.push(page)
        }
      }
    }

    pagesToCalculate.forEach((page) => {
      totalCost += page.colorMode === "color" ? 10 : 2
    })

    return totalCost
  }

  // Calculate total cost
  const calculateCost = () => {
    let totalCost = 0
    totalCost += calculateCanvasPagesCost()
    printQueue.forEach((item) => {
      totalCost += item.cost || 0
    })
    return totalCost
  }

  // Print settings state
  const [printSettings, setPrintSettings] = useState({
    doubleSided: false,
    pageRange: "all",
    startPage: 1,
    endPage: pages.length,
  })

  // Update print settings when pages change
  useEffect(() => {
    setPrintSettings((prev) => ({
      ...prev,
      endPage: pages.length,
    }))
  }, [pages.length])

  // Get current page
  const currentPage = pages.find((page) => page.id === activePage) || pages[0]

  // Handle item selection
  const selectItem = (item) => {
    setSelectedItem(item)
    setCropMode(false)
  }

  // Handle click outside to deselect
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (canvasRef.current && !canvasRef.current.contains(e.target)) {
        setSelectedItem(null)
        setCropMode(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  // Handle document click with conversion
  const handleDocumentClick = async (file) => {
    console.log("Converting Word document:", file.name)
    const convertedFile = await convertWordToPDF(file)
    showFileOptions(convertedFile)
  }

  return (
    <div className="files-page">
      <div className="navbar">
        <div className="logo1" onClick={() => navigate("/")}>
          <span className="home">HOME</span>
          <span className="num">25</span>
        </div>
        <div className="title">File Editor</div>
      </div>

      <div className="main-content">
        <div className="sidebar">
          <div className="file-categories">
            <div className="category-header">
              <h3>Categories</h3>
            </div>

            <div className="category">
              <div className="category-title">
                <ImageIcon size={18} />
                <span>Images ({fileCategories.images.length})</span>
              </div>
              <ul className="file-list">
                {fileCategories.images.map((file, index) => (
                  <li key={index} className="file-item" draggable onDragStart={() => handleDragStart(file)}>
                    <div className="file-preview">
                      <img
                        src={URL.createObjectURL(file) || "/placeholder.svg"}
                        alt={file.name}
                        className="thumbnail"
                      />
                    </div>
                    <div className="file-info">
                      <div className="file-name">
                        {file.name.length > 15 ? `${file.name.substring(0, 15)}...` : file.name}
                      </div>
                      <div className="file-size">{(file.size / 1024).toFixed(1)} KB</div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="category">
              <div className="category-title">
                <FileText size={18} />
                <span>PDFs ({fileCategories.pdfs.length})</span>
              </div>
              <ul className="file-list">
                {fileCategories.pdfs.map((file, index) => (
                  <li key={index} className="file-item" onClick={() => showFileOptions(file)}>
                    <div className="file-icon">
                      <FileText size={24} />
                    </div>
                    <div className="file-info">
                      <div className="file-name">
                        {file.name.length > 15 ? `${file.name.substring(0, 15)}...` : file.name}
                      </div>
                      <div className="file-size">{(file.size / 1024).toFixed(1)} KB</div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="category">
              <div className="category-title">
                <FileIcon size={18} />
                <span>Documents ({fileCategories.documents.length})</span>
              </div>
              <ul className="file-list">
                {fileCategories.documents.map((file, index) => (
                  <li key={index} className="file-item" onClick={() => handleDocumentClick(file)}>
                    <div className="file-icon">
                      <FileIcon size={24} />
                    </div>
                    <div className="file-info">
                      <div className="file-name">
                        {file.name.length > 15 ? `${file.name.substring(0, 15)}...` : file.name}
                        <span className="conversion-badge">→PDF</span>
                      </div>
                      <div className="file-size">{(file.size / 1024).toFixed(1)} KB</div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {printQueue.length > 0 && (
              <div className="print-queue">
                <div className="category-header">
                  <h3>Print Queue</h3>
                </div>
                <ul className="queue-list">
                  {printQueue.map((item, index) => (
                    <li key={index} className="queue-item">
                      <div className="file-icon">
                        {item.file.type.startsWith("image/") ? (
                          <ImageIcon size={24} />
                        ) : item.file.type === "application/pdf" ? (
                          <FileText size={24} />
                        ) : (
                          <FileIcon size={24} />
                        )}
                      </div>
                      <div className="file-info">
                        <div className="file-name">
                          {item.file.name.length > 15 ? `${item.file.name.substring(0, 15)}...` : item.file.name}
                        </div>
                        <div className="file-details">
                          {item.pages} pages • {item.colorMode === "color" ? "Color" : "B&W"} •{" "}
                          {item.doubleSided ? "Double-sided" : "Single-sided"}
                        </div>
                      </div>
                      <button
                        className="remove-button"
                        onClick={() => setPrintQueue(printQueue.filter((_, i) => i !== index))}
                      >
                        <Trash size={16} />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        <div className="canvas-area">
          <div className="canvas-toolbar">
{/* ----------------------------------------------------------------------------------------- */}
            
            <button type="button" class="Add-button" onClick={addNewPage}>
              <span class="button__text">Add Page</span>
              <span class="button__icon"><svg xmlns="http://www.w3.org/2000/svg" width="24" viewBox="0 0 24 24" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" stroke="currentColor" height="24" fill="none" class="svg"><line y2="19" y1="5" x2="12" x1="12"></line><line y2="12" y1="12" x2="19" x1="5"></line></svg></span>
            </button>

            <button class="Duplicate" onClick={duplicatePage}>
              <span> COPY Page
              </span>
            </button>

            <button class="delete-button" onClick={() => deletePage(activePage)}>
              <span class="delete-button__text">Delete</span>
              <span class="delete-button__icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                  <path d="M24 20.188l-8.315-8.209 8.2-8.282-3.697-3.697-8.212 8.318-8.31-8.203-3.666 3.666 8.321 8.24-8.206 8.313 3.666 3.666 8.237-8.318 8.285 8.203z"></path>
                </svg>
              </span>
            </button>

            <div className="color-toggle">
              <label className="switch">
                <input
                  id="input"
                  type="checkbox"
                  checked={currentPage?.colorMode === "bw"}
                  onChange={() => currentPage && toggleColorMode(activePage)}
                />
                <div className="slider round">
                  <div className="sun-moon">
                    <svg id="moon-dot-1" className="moon-dot" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="50"></circle>
                    </svg>
                    <svg id="moon-dot-2" className="moon-dot" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="50"></circle>
                    </svg>
                    <svg id="moon-dot-3" className="moon-dot" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="50"></circle>
                    </svg>
                    <svg id="light-ray-1" className="light-ray" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="50"></circle>
                    </svg>
                    <svg id="light-ray-2" className="light-ray" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="50"></circle>
                    </svg>
                    <svg id="light-ray-3" className="light-ray" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="50"></circle>
                    </svg>
                    <svg id="cloud-1" className="cloud-dark" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="50"></circle>
                    </svg>
                    <svg id="cloud-2" className="cloud-dark" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="50"></circle>
                    </svg>
                    <svg id="cloud-3" className="cloud-dark" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="50"></circle>
                    </svg>
                    <svg id="cloud-4" className="cloud-light" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="50"></circle>
                    </svg>
                    <svg id="cloud-5" className="cloud-light" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="50"></circle>
                    </svg>
                    <svg id="cloud-6" className="cloud-light" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="50"></circle>
                    </svg>
                  </div>
                  <div className="stars">
                    <svg id="star-1" className="star" viewBox="0 0 20 20">
                      <path d="M 0 10 C 10 10,10 10 ,0 10 C 10 10 , 10 10 , 10 20 C 10 10 , 10 10 , 20 10 C 10 10 , 10 10 , 10 0 C 10 10,10 10 ,0 10 Z"></path>
                    </svg>
                    <svg id="star-2" className="star" viewBox="0 0 20 20">
                      <path d="M 0 10 C 10 10,10 10 ,0 10 C 10 10 , 10 10 , 10 20 C 10 10 , 10 10 , 20 10 C 10 10 , 10 10 , 10 0 C 10 10,10 10 ,0 10 Z"></path>
                    </svg>
                    <svg id="star-3" className="star" viewBox="0 0 20 20">
                      <path d="M 0 10 C 10 10,10 10 ,0 10 C 10 10 , 10 10 , 10 20 C 10 10 , 10 10 , 20 10 C 10 10 , 10 10 , 10 0 C 10 10,10 10 ,0 10 Z"></path>
                    </svg>
                    <svg id="star-4" className="star" viewBox="0 0 20 20">
                      <path d="M 0 10 C 10 10,10 10 ,0 10 C 10 10 , 10 10 , 10 20 C 10 10 , 10 10 , 20 10 C 10 10 , 10 10 , 10 0 C 10 10,10 10 ,0 10 Z"></path>
                    </svg>
                  </div>
                </div>
              </label>
              <span className="toggle-text">{currentPage?.colorMode === "color" ? "Color" : "B&W"}</span>
            </div>


            <div class="help-container" onclick="openModal()">
              <button class="help-button">?</button>
              <span class="help-text">Get Help</span>
            </div>

            <div class="modal" id="helpModal">
              <div class="modal-content">
                <video controls>
                  <source src="your-video.mp4" type="video/mp4" />
                  Your browser does not support video.
                </video>

                <div class="review-box">
                  <label for="review">Leave a comment:</label>
                  <textarea id="review" placeholder="Write something..."></textarea>
                </div>

                <button class="close-btn" onclick="closeModal()">Close</button>
              </div>
            </div>





         

        


          </div>


{/* ------------------------------------------------------------------------------- */}
          <div className="canvas-container">
            <div className="canvas-background"></div>
            {pages.length > 0 ? (
              <>
                <div className="page-navigation">
                  {pages.map((page) => (
                    <button
                      key={page.id}
                      className={`page-button ${page.id === activePage ? "active" : ""}`}
                      onClick={() => setActivePage(page.id)}
                    >
                      {page.id}
                    </button>
                  ))}
                </div>

                <div
                  className={`a4-canvas ${currentPage?.colorMode}`}
                  ref={canvasRef}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onClick={() => setSelectedItem(null)}
                >
                  {currentPage?.items.map((item) => (
                    <div
                      key={item.id}
                      className={`canvas-item ${selectedItem && selectedItem.id === item.id ? "selected" : ""} ${
                        cropMode && selectedItem && selectedItem.id === item.id ? "crop-mode" : ""
                      }`}
                      style={{
                        left: `${item.x}px`,
                        top: `${item.y}px`,
                        width: `${item.width}px`,
                        height: `${item.height}px`,
                        transform: `rotate(${item.rotation}deg)`,
                      }}
                      onClick={(e) => {
                        e.stopPropagation()
                        selectItem(item)
                      }}
                      onMouseDown={(e) => {
                        if (cropMode && selectedItem && selectedItem.id === item.id) {
                          handleCropStart(e)
                        } else if (!cropMode) {
                          handleItemDragStart(e, item)
                        }
                      }}
                    >
                      <div className="canvas-image-container">
                        <img
                          src={URL.createObjectURL(item.file) || "/placeholder.svg"}
                          alt={item.file.name}
                          className="canvas-image"
                          style={
                            item.crop
                              ? {
                                  objectPosition: `-${item.crop.x}px -${item.crop.y}px`,
                                  width: `${(item.width / item.crop.width) * 100}%`,
                                  height: `${(item.height / item.crop.height) * 100}%`,
                                }
                              : {}
                          }
                        />
                      </div>

                      {selectedItem && selectedItem.id === item.id && cropMode && (
                        <div
                          className="crop-overlay"
                          style={{
                            left: `${Math.min(cropStart.x, cropEnd.x)}px`,
                            top: `${Math.min(cropStart.y, cropEnd.y)}px`,
                            width: `${Math.abs(cropEnd.x - cropStart.x)}px`,
                            height: `${Math.abs(cropEnd.y - cropStart.y)}px`,
                          }}
                        ></div>
                      )}

                      {selectedItem && selectedItem.id === item.id && !cropMode && (
                        <>
                          <div className="item-controls">
                            <button className="item-control-button" onClick={() => resizeImage(item.id, "enlarge")}>
                              <ZoomIn size={16} />
                            </button>
                            <button className="item-control-button" onClick={() => resizeImage(item.id, "compress")}>
                              <ZoomOut size={16} />
                            </button>
                            <button className="item-delete" onClick={() => deleteItem(activePage, item.id)}>
                              <Trash size={16} />
                            </button>
                          </div>

                          <div
                            className="resize-handle top-left"
                            onMouseDown={(e) => handleResizeStart(e, item.id, "top-left")}
                          ></div>
                          <div
                            className="resize-handle top-right"
                            onMouseDown={(e) => handleResizeStart(e, item.id, "top-right")}
                          ></div>
                          <div
                            className="resize-handle bottom-left"
                            onMouseDown={(e) => handleResizeStart(e, item.id, "bottom-left")}
                          ></div>
                          <div
                            className="resize-handle bottom-right"
                            onMouseDown={(e) => handleResizeStart(e, item.id, "bottom-right")}
                          ></div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="no-pages-message">
                <div className="no-pages-content">
                  <FileIcon size={48} />
                  <h3>No Canvas Pages</h3>
                  <p>Add a canvas page to start designing</p>
                  <button className="toolbar-button" onClick={addNewPage}>
                    <Plus size={16} />
                    <span>Add Canvas Page</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right sidebar for print settings and image editing */}
          <div className="right-sidebar">
            {selectedItem ? (
              <div className="edit-panel">
                <div className="panel-header">
                  <h3>Image Editor</h3>
                  <button className="close-button" onClick={() => setSelectedItem(null)}>
                    <X size={16} />
                  </button>
                </div>

                <div className="edit-tools">
                  <button className={`edit-button ${cropMode ? "active" : ""}`} onClick={() => setCropMode(!cropMode)}>
                    <Crop size={16} />
                    <span>Crop</span>
                  </button>
                  <button className="edit-button" onClick={() => rotateItem(selectedItem.id, "counterclockwise")}>
                    <RotateCcw size={16} />
                    <span>Rotate Left</span>
                  </button>
                  <button className="edit-button" onClick={() => rotateItem(selectedItem.id, "clockwise")}>
                    <RotateCw size={16} />
                    <span>Rotate Right</span>
                  </button>
                  <button className="edit-button" onClick={() => resizeImage(selectedItem.id, "enlarge")}>
                    <ZoomIn size={16} />
                    <span>Enlarge</span>
                  </button>
                  <button className="edit-button" onClick={() => resizeImage(selectedItem.id, "compress")}>
                    <ZoomOut size={16} />
                    <span>Compress</span>
                  </button>
                </div>

                {cropMode && (
                  <div className="crop-instructions">
                    <p>Click and drag on the image to crop</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="print-panel">
                <div className="print-options">
                  <div className="cost-summary">
                    <h4>Cost Summary</h4>
                    <div className="cost-details">
                      {/* Canvas pages */}
                      {pages.length > 0 && (
                        <div className="cost-section">
                          <h5>Canvas Pages</h5>
                          {(() => {
                            let pagesToShow = []
                            if (printSettings.pageRange === "all") {
                              pagesToShow = pages
                            } else {
                              const startPage = Math.max(1, printSettings.startPage)
                              const endPage = Math.min(pages.length, printSettings.endPage)
                              for (let i = startPage; i <= endPage; i++) {
                                const page = pages.find((p) => p.id === i)
                                if (page) {
                                  pagesToShow.push(page)
                                }
                              }
                            }
                            return pagesToShow.map((page) => (
                              <div key={page.id} className="cost-item">
                                <span>
                                  Page {page.id} ({page.colorMode === "color" ? "Color" : "B&W"}, Single-sided)
                                </span>
                                <span>₹{page.colorMode === "color" ? 10 : 2}</span>
                              </div>
                            ))
                          })()}
                        </div>
                      )}
                      {/* Print queue items */}
                      {printQueue.length > 0 && (
                        <div className="cost-section">
                          <h5>Document Pages</h5>
                          {printQueue.map((item, index) => (
                            <div key={index} className="cost-item">
                              <span>
                                {item.file.name.substring(0, 15)}
                                {item.file.name.length > 15 ? "..." : ""} ({item.pages} pages,{" "}
                                {item.colorMode === "color" ? "Color" : "B&W"},{" "}
                                {item.doubleSided ? "Double-sided" : "Single-sided"})
                              </span>
                              <span>₹{item.cost}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="total-cost">
                        <span>Total Cost:</span>
                        <span>₹{calculateCost()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Floating payment button */}
      <div className="payment-floating-container">
        <div className="payment-box">
          <div className="payment-summary">
            <div className="payment-total">
              <span>Total Cost:</span>
              <span>₹{calculateCost()}</span>
            </div>
          </div>
          <button
            className="payment-button"
            onClick={() =>
              navigate("/payment", {
                state: {
                  totalCost: calculateCost(),
                  pages: pages,
                  printQueue: printQueue,
                  blankSheets: 0,
                },
              })
            }
          >
            <span className="btn-text">Pay Now</span>
            <div className="icon-container">
              <svg viewBox="0 0 24 24" className="icon card-icon">
                <path
                  d="M20,8H4V6H20M20,18H4V12H20M20,4H4C2.89,4 2,4.89 2,6V18C2,19.11 2.89,20 4,20H20C21.11,20 22,19.11 22,18V6C22,4.89 21.11,4 20,4Z"
                  fill="currentColor"
                ></path>
              </svg>
              <svg viewBox="0 0 24 24" className="icon payment-icon">
                <path
                  d="M2,17H22V21H2V17M6.25,7H9V6H6V3H18V6H15V7H17.75L19,17H5L6.25,7M9,10H15V8H9V10M9,13H15V11H9V13Z"
                  fill="currentColor"
                ></path>
              </svg>
              <svg viewBox="0 0 24 24" className="icon dollar-icon">
                <path
                  d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"
                  fill="currentColor"
                ></path>
              </svg>
              <svg viewBox="0 0 24 24" className="icon wallet-icon default-icon">
                <path
                  d="M21,18V19A2,2 0 0,1 19,21H5C3.89,21 3,20.1 3,19V5A2,2 0 0,1 5,3H19A2,2 0 0,1 21,5V6H12C10.89,6 10,6.9 10,8V16A2,2 0 0,0 12,18M12,16H22V8H12M16,13.5A1.5,1.5 0 0,1 14.5,12A1.5,1.5 0 0,1 16,10.5A1.5,1.5 0 0,1 17.5,12A1.5,1.5 0 0,1 16,13.5Z"
                  fill="currentColor"
                ></path>
              </svg>
              <svg viewBox="0 0 24 24" className="icon check-icon">
                <path
                  d="M9,16.17L4.83,12L3.41,13.41L9,19L21,7L19.59,5.59L9,16.17Z"
                  fill="currentColor"
                ></path>
              </svg>
            </div>
          </button>
        </div>
      </div>

      {fileOptions.showModal && (
        <div className="print-modal">
          <div className="print-modal-content-large">
            <div className="modal-left">
              <h2>Print Options: {fileOptions.file.name}</h2>
              {fileOptions.pageCount === 0 ? (
                <div style={{ textAlign: "center", padding: "20px" }}>
                  <p>Analyzing document...</p>
                </div>
              ) : (
                <div className="print-options">
                  <div className="option-group">
                    <h3>Page Range</h3>
                    <div className="radio-group">
                      <label>
                        <input
                          type="radio"
                          name="filePageRange"
                          value="all"
                          checked={fileOptions.printSettings.pageRange === "all"}
                          onChange={() =>
                            setFileOptions({
                              ...fileOptions,
                              printSettings: { ...fileOptions.printSettings, pageRange: "all" },
                            })
                          }
                        />
                        All Pages (1-{fileOptions.pageCount})
                      </label>
                      <label>
                        <input
                          type="radio"
                          name="filePageRange"
                          value="custom"
                          checked={fileOptions.printSettings.pageRange === "custom"}
                          onChange={() =>
                            setFileOptions({
                              ...fileOptions,
                              printSettings: { ...fileOptions.printSettings, pageRange: "custom" },
                            })
                          }
                        />
                        Custom Range
                      </label>
                    </div>
                    {fileOptions.printSettings.pageRange === "custom" && (
                      <div className="custom-range-inputs">
                        <div className="range-input-row">
                          <div className="range-input-group">
                            <label>From:</label>
                            <input
                              type="number"
                              min="1"
                              max={fileOptions.pageCount}
                              value={fileOptions.printSettings.startPage}
                              onChange={(e) => {
                                const value = Math.max(
                                  1,
                                  Math.min(Number.parseInt(e.target.value) || 1, fileOptions.pageCount),
                                )
                                setFileOptions({
                                  ...fileOptions,
                                  printSettings: { ...fileOptions.printSettings, startPage: value },
                                })
                              }}
                              className="number-input-only"
                            />
                          </div>
                          <div className="range-input-group">
                            <label>To:</label>
                            <input
                              type="number"
                              min={fileOptions.printSettings.startPage}
                              max={fileOptions.pageCount}
                              value={fileOptions.printSettings.endPage}
                              onChange={(e) => {
                                const value = Math.max(
                                  fileOptions.printSettings.startPage,
                                  Math.min(
                                    Number.parseInt(e.target.value) || fileOptions.printSettings.startPage,
                                    fileOptions.pageCount,
                                  ),
                                )
                                setFileOptions({
                                  ...fileOptions,
                                  printSettings: { ...fileOptions.printSettings, endPage: value },
                                })
                              }}
                              className="number-input-only"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="option-group">
                    <h3>Print Options</h3>
                    <label className="container">
                      <input
                        type="checkbox"
                        checked={fileOptions.printSettings.doubleSided}
                        onChange={() =>
                          setFileOptions({
                            ...fileOptions,
                            printSettings: {
                              ...fileOptions.printSettings,
                              doubleSided: !fileOptions.printSettings.doubleSided,
                            },
                          })
                        }
                      />
                      <div className="checkmark"></div>
                      <span style={{ marginLeft: "4px" }}>Double-sided printing</span>
                    </label>

                    
                    <div className="color-toggle mt-3">
                      <label className="switch">
                        <input
                          id="input-modal"
                          type="checkbox"
                          checked={fileOptions.printSettings.colorMode === "bw"}
                          onChange={() =>
                            setFileOptions({
                              ...fileOptions,
                              printSettings: {
                                ...fileOptions.printSettings,
                                colorMode: fileOptions.printSettings.colorMode === "bw" ? "color" : "bw",
                              },
                            })
                          }
                        />
                        <div className="slider round">
                          <div className="sun-moon">
                            <svg id="moon-dot-1-modal" className="moon-dot" viewBox="0 0 100 100">
                              <circle cx="50" cy="50" r="50"></circle>
                            </svg>
                            <svg id="moon-dot-2-modal" className="moon-dot" viewBox="0 0 100 100">
                              <circle cx="50" cy="50" r="50"></circle>
                            </svg>
                            <svg id="moon-dot-3-modal" className="moon-dot" viewBox="0 0 100 100">
                              <circle cx="50" cy="50" r="50"></circle>
                            </svg>
                            <svg id="light-ray-1-modal" className="light-ray" viewBox="0 0 100 100">
                              <circle cx="50" cy="50" r="50"></circle>
                            </svg>
                            <svg id="light-ray-2-modal" className="light-ray" viewBox="0 0 100 100">
                              <circle cx="50" cy="50" r="50"></circle>
                            </svg>
                            <svg id="light-ray-3-modal" className="light-ray" viewBox="0 0 100 100">
                              <circle cx="50" cy="50" r="50"></circle>
                            </svg>
                            <svg id="cloud-1-modal" className="cloud-dark" viewBox="0 0 100 100">
                              <circle cx="50" cy="50" r="50"></circle>
                            </svg>
                            <svg id="cloud-2-modal" className="cloud-dark" viewBox="0 0 100 100">
                              <circle cx="50" cy="50" r="50"></circle>
                            </svg>
                            <svg id="cloud-3-modal" className="cloud-dark" viewBox="0 0 100 100">
                              <circle cx="50" cy="50" r="50"></circle>
                            </svg>
                            <svg id="cloud-4-modal" className="cloud-light" viewBox="0 0 100 100">
                              <circle cx="50" cy="50" r="50"></circle>
                            </svg>
                            <svg id="cloud-5-modal" className="cloud-light" viewBox="0 0 100 100">
                              <circle cx="50" cy="50" r="50"></circle>
                            </svg>
                            <svg id="cloud-6-modal" className="cloud-light" viewBox="0 0 100 100">
                              <circle cx="50" cy="50" r="50"></circle>
                            </svg>
                          </div>
                          <div className="stars">
                            <svg id="star-1-modal" className="star" viewBox="0 0 20 20">
                              <path d="M 0 10 C 10 10,10 10 ,0 10 C 10 10 , 10 10 , 10 20 C 10 10 , 10 10 , 20 10 C 10 10 , 10 10 , 10 0 C 10 10,10 10 ,0 10 Z"></path>
                            </svg>
                            <svg id="star-2-modal" className="star" viewBox="0 0 20 20">
                              <path d="M 0 10 C 10 10,10 10 ,0 10 C 10 10 , 10 10 , 10 20 C 10 10 , 10 10 , 20 10 C 10 10 , 10 10 , 10 0 C 10 10,10 10 ,0 10 Z"></path>
                            </svg>
                            <svg id="star-3-modal" className="star" viewBox="0 0 20 20">
                              <path d="M 0 10 C 10 10,10 10 ,0 10 C 10 10 , 10 10 , 10 20 C 10 10 , 10 10 , 20 10 C 10 10 , 10 10 , 10 0 C 10 10,10 10 ,0 10 Z"></path>
                            </svg>
                            <svg id="star-4-modal" className="star" viewBox="0 0 20 20">
                              <path d="M 0 10 C 10 10,10 10 ,0 10 C 10 10 , 10 10 , 10 20 C 10 10 , 10 10 , 20 10 C 10 10 , 10 10 , 10 0 C 10 10,10 10 ,0 10 Z"></path>
                            </svg>
                          </div>
                        </div>
                      </label>
                      <span className="toggle-text">
                        {fileOptions.printSettings.colorMode === "bw" ? "B&W" : "Color"}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="modal-actions">


                <button className="cancel-button" onClick={() => setFileOptions({ ...fileOptions, showModal: false })}>
                  Cancel
                </button>
                {fileOptions.pageCount > 0 && (
                  <button class="queue-button" onClick={addFileToPrintQueue} >
                    ADD to QUEUE
                  </button>
                )}
              </div>


            </div>

            <div className="modal-right">
              <div className="pdf-viewer-full">
                <div className="pdf-viewer-header">
                  <h3>Document Preview</h3>
                  {fileOptions.file?.type === "application/pdf" && pdfDoc && (
                    <div className="pdf-controls-header">
                      <button onClick={() => goToPDFPage("prev")} disabled={currentPdfPage <= 1}>
                        <ChevronLeft size={16} />
                      </button>
                      <span>
                        Page {currentPdfPage} of {pdfDoc?.numPages || 1}
                      </span>
                      <button onClick={() => goToPDFPage("next")} disabled={currentPdfPage >= (pdfDoc?.numPages || 1)}>
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  )}
                </div>

                <div className="pdf-viewer-container-full">
                  {fileOptions.file?.type === "application/pdf" && allPdfPages.length > 0 ? (
                    <div className="pdf-pages-scroll">
                      {allPdfPages.map((canvas, index) => (
                        <div key={index} className="pdf-page-full">
                          <div className="pdf-page-number-full">Page {index + 1}</div>
                          <canvas
                            ref={(canvasElement) => {
                              if (canvasElement && canvas) {
                                const ctx = canvasElement.getContext("2d")
                                canvasElement.width = canvas.width
                                canvasElement.height = canvas.height
                                ctx.drawImage(canvas, 0, 0)
                              }
                            }}
                            className="pdf-canvas-full"
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="pdf-placeholder">
                      <FileText size={48} />
                      <p>Document Preview</p>
                      <p>File: {fileOptions.file?.name}</p>
                      <p>Pages: {fileOptions.pageCount}</p>
                      <p>Size: {fileOptions.file ? (fileOptions.file.size / 1024).toFixed(1) : 0} KB</p>
                      {fileOptions.file?.name.includes("→PDF") && (
                        <p style={{ color: "#007aff", fontWeight: "bold" }}>Converted from Word document</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default FilesPage
