"use client"

import { useState, useRef, useEffect } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import {
  ArrowLeft,
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
  FileIcon as FileBlank,
  X,
  MinusCircle,
  PlusCircle,
  ZoomIn,
  ZoomOut,
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
  const [blankSheets, setBlankSheets] = useState(0)

  // State for image editing
  const [selectedItem, setSelectedItem] = useState(null)
  const [cropMode, setCropMode] = useState(false)
  const [cropStart, setCropStart] = useState({ x: 0, y: 0 })
  const [cropEnd, setCropEnd] = useState({ x: 0, y: 0 })

  // Group files by type
  const fileCategories = {
    images: files.filter((file) => file.type.startsWith("image/")),
    pdfs: files.filter((file) => file.type === "application/pdf"),
    documents: files.filter(
      (file) =>
        file.type === "application/msword" ||
        file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ),
    others: files.filter(
      (file) =>
        !file.type.startsWith("image/") &&
        file.type !== "application/pdf" &&
        file.type !== "application/msword" &&
        file.type !== "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ),
  }

  // Function to get accurate PDF page count using PDF.js
  const getPDFPageCount = async (file) => {
    return new Promise((resolve) => {
      console.log("Starting PDF page count for:", file.name)

      const reader = new FileReader()
      reader.onload = async function () {
        try {
          // Ensure PDF.js is loaded
          if (!window.pdfjsLib) {
            console.log("Loading PDF.js...")
            const script = document.createElement("script")
            script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"
            script.onload = async () => {
              console.log("PDF.js loaded successfully")
              try {
                // Set worker source
                window.pdfjsLib.GlobalWorkerOptions.workerSrc =
                  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js"

                const pdf = await window.pdfjsLib.getDocument({ data: this.result }).promise
                console.log("PDF loaded, page count:", pdf.numPages)
                resolve(pdf.numPages)
              } catch (error) {
                console.error("Error loading PDF after script load:", error)
                resolve(1)
              }
            }
            script.onerror = () => {
              console.error("Failed to load PDF.js")
              resolve(1)
            }
            document.head.appendChild(script)
          } else {
            // PDF.js is already loaded
            console.log("PDF.js already loaded")
            try {
              // Set worker source if not set
              if (!window.pdfjsLib.GlobalWorkerOptions.workerSrc) {
                window.pdfjsLib.GlobalWorkerOptions.workerSrc =
                  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js"
              }

              const pdf = await window.pdfjsLib.getDocument({ data: this.result }).promise
              console.log("PDF loaded, page count:", pdf.numPages)
              resolve(pdf.numPages)
            } catch (error) {
              console.error("Error loading PDF:", error)
              resolve(1)
            }
          }
        } catch (error) {
          console.error("Error in PDF processing:", error)
          resolve(1)
        }
      }
      reader.onerror = (error) => {
        console.error("FileReader error:", error)
        resolve(1)
      }
      reader.readAsArrayBuffer(file)
    })
  }

  // Function to get Word document page count (much more accurate analysis)
  const getWordDocPageCount = async (file) => {
    return new Promise((resolve) => {
      console.log("Analyzing Word document:", file.name, "Size:", (file.size / 1024).toFixed(1), "KB")

      const reader = new FileReader()
      reader.onload = function () {
        try {
          const arrayBuffer = this.result
          const fileName = file.name.toLowerCase()

          if (fileName.endsWith(".docx")) {
            // DOCX files - more sophisticated analysis
            try {
              const uint8Array = new Uint8Array(arrayBuffer)
              const textDecoder = new TextDecoder("utf-8", { fatal: false })
              const content = textDecoder.decode(uint8Array)

              // Look for explicit page breaks
              const pageBreakPatterns = [
                /<w:br[^>]*w:type="page"[^>]*\/>/g,
                /<w:lastRenderedPageBreak\/>/g,
                /<w:pageBreakBefore\/>/g,
                /<w:sectPr>/g, // Section breaks often indicate new pages
              ]

              let explicitPageBreaks = 0
              pageBreakPatterns.forEach((pattern) => {
                const matches = content.match(pattern)
                if (matches) explicitPageBreaks += matches.length
              })

              // Count content indicators
              const paragraphs = (content.match(/<w:p[^>]*>/g) || []).length
              const textRuns = (content.match(/<w:t[^>]*>.*?<\/w:t>/g) || []).length
              const tables = (content.match(/<w:tbl>/g) || []).length
              const images = (content.match(/<w:drawing>/g) || []).length

              // Calculate content density score
              const fileSizeKB = file.size / 1024
              let estimatedPages = 1

              if (explicitPageBreaks > 0) {
                // Use explicit page breaks as primary indicator
                estimatedPages = explicitPageBreaks + 1
              } else {
                // Advanced estimation based on content analysis
                if (fileSizeKB < 25) {
                  estimatedPages = 1
                } else if (fileSizeKB < 50) {
                  // Small documents
                  estimatedPages = Math.max(1, Math.ceil(paragraphs / 20))
                } else if (fileSizeKB < 100) {
                  // Medium documents
                  const contentScore = paragraphs * 0.8 + tables * 5 + images * 3
                  estimatedPages = Math.max(1, Math.ceil(contentScore / 25))
                } else if (fileSizeKB < 300) {
                  // Large documents
                  const contentScore = paragraphs * 0.6 + tables * 4 + images * 2
                  estimatedPages = Math.max(2, Math.ceil(contentScore / 20))
                } else if (fileSizeKB < 500) {
                  // Very large documents
                  estimatedPages = Math.max(3, Math.ceil(fileSizeKB / 40))
                } else {
                  // Huge documents
                  estimatedPages = Math.max(5, Math.ceil(fileSizeKB / 50))
                }

                // Adjust for text density
                if (textRuns > 0 && paragraphs > 0) {
                  const textDensity = textRuns / paragraphs
                  if (textDensity > 4) {
                    estimatedPages = Math.ceil(estimatedPages * 1.3) // Very dense text
                  } else if (textDensity < 1.5) {
                    estimatedPages = Math.ceil(estimatedPages * 0.7) // Sparse text
                  }
                }
              }

              // Final bounds checking
              estimatedPages = Math.min(Math.max(estimatedPages, 1), 100)

              console.log(`DOCX Analysis - ${file.name}:`)
              console.log(`- Size: ${fileSizeKB.toFixed(1)}KB`)
              console.log(`- Explicit page breaks: ${explicitPageBreaks}`)
              console.log(`- Paragraphs: ${paragraphs}, Text runs: ${textRuns}`)
              console.log(`- Tables: ${tables}, Images: ${images}`)
              console.log(`- Final estimated pages: ${estimatedPages}`)

              resolve(estimatedPages)
            } catch (error) {
              console.error("Error parsing DOCX:", error)
              // Improved fallback
              const fileSizeKB = file.size / 1024
              const fallbackPages = Math.max(1, Math.min(Math.ceil(fileSizeKB / 25), 20))
              resolve(fallbackPages)
            }
          } else if (fileName.endsWith(".doc")) {
            // DOC files - binary analysis with better heuristics
            const fileSizeKB = file.size / 1024
            let estimatedPages

            // More accurate DOC estimation based on file size patterns
            if (fileSizeKB < 30) {
              estimatedPages = 1
            } else if (fileSizeKB < 60) {
              estimatedPages = 2
            } else if (fileSizeKB < 120) {
              estimatedPages = Math.ceil(fileSizeKB / 35) // ~35KB per page
            } else if (fileSizeKB < 300) {
              estimatedPages = Math.ceil(fileSizeKB / 45) // ~45KB per page
            } else if (fileSizeKB < 600) {
              estimatedPages = Math.ceil(fileSizeKB / 55) // ~55KB per page
            } else {
              estimatedPages = Math.ceil(fileSizeKB / 70) // ~70KB per page
            }

            // Binary pattern analysis for page breaks
            try {
              const uint8Array = new Uint8Array(arrayBuffer)
              let pageBreakIndicators = 0

              // Look for page break patterns in DOC binary
              for (let i = 0; i < uint8Array.length - 8; i++) {
                // Form feed character (0x0C)
                if (uint8Array[i] === 0x0c) pageBreakIndicators++

                // DOC page break signatures
                if (
                  uint8Array[i] === 0x01 &&
                  uint8Array[i + 1] === 0x00 &&
                  uint8Array[i + 2] === 0x00 &&
                  uint8Array[i + 3] === 0x00
                ) {
                  pageBreakIndicators++
                }
              }

              if (pageBreakIndicators > 0) {
                const binaryEstimate = Math.min(pageBreakIndicators + 1, estimatedPages * 1.5)
                estimatedPages = Math.max(estimatedPages, Math.ceil(binaryEstimate))
              }
            } catch (error) {
              console.log("Binary analysis failed for DOC file")
            }

            // Final bounds
            estimatedPages = Math.min(Math.max(estimatedPages, 1), 100)

            console.log(`DOC Analysis - ${file.name}:`)
            console.log(`- Size: ${fileSizeKB.toFixed(1)}KB`)
            console.log(`- Estimated pages: ${estimatedPages}`)

            resolve(estimatedPages)
          } else {
            // Other document types
            const fileSizeKB = file.size / 1024
            const estimatedPages = Math.max(1, Math.min(Math.ceil(fileSizeKB / 40), 50))
            resolve(estimatedPages)
          }
        } catch (error) {
          console.error("Error analyzing document:", error)
          // Ultimate fallback
          const fileSizeKB = file.size / 1024
          const fallbackPages = Math.max(1, Math.min(Math.ceil(fileSizeKB / 40), 20))
          resolve(fallbackPages)
        }
      }

      reader.onerror = (error) => {
        console.error("FileReader error:", error)
        const fileSizeKB = file.size / 1024
        const fallbackPages = Math.max(1, Math.min(Math.ceil(fileSizeKB / 40), 10))
        resolve(fallbackPages)
      }

      reader.readAsArrayBuffer(file)
    })
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
        page.id === pageId ? { ...page, colorMode: page.colorMode === "color" ? "bw" : "color" } : page,
      ),
    )
  }

  // Handle deleting a page
  const deletePage = (pageId) => {
    // Allow deleting even if it's the only page
    const newPages = pages.filter((page) => page.id !== pageId)

    // If we're deleting the last page, don't add a new blank page
    // This allows users to work with only blank sheets if they want
    if (newPages.length > 0) {
      // Renumber the pages to ensure sequential IDs
      newPages.forEach((page, index) => {
        page.id = index + 1
      })

      // Set active page to the previous page or the first page
      const pageIndex = pages.findIndex((page) => page.id === pageId)
      const newActivePageId =
        pageIndex > 0 ? (pageIndex < newPages.length ? pageIndex : newPages.length) : newPages.length > 0 ? 1 : 1

      setActivePage(newActivePageId)
    } else {
      // If all pages are deleted, we don't have any active page
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

      // Add the image to the current page
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

      // Move the item to the new position
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

    // Calculate new dimensions based on the handle being dragged
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

    // Update the item dimensions
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

    // Calculate crop dimensions
    const cropX = Math.min(cropStart.x, cropEnd.x)
    const cropY = Math.min(cropStart.y, cropEnd.y)
    const cropWidth = Math.abs(cropEnd.x - cropStart.x)
    const cropHeight = Math.abs(cropEnd.y - cropStart.y)

    // Apply crop if it's valid
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

    // Show modal immediately with loading state
    setFileOptions({
      showModal: true,
      file,
      pageCount: 0, // Start with 0 to show loading
      printSettings: {
        doubleSided: false,
        pageRange: "all",
        startPage: 1,
        endPage: 1,
        colorMode: "bw",
      },
    })

    let pageCount = 1

    try {
      // Get actual page count for different file types
      if (file.type === "application/pdf") {
        console.log("Counting PDF pages for:", file.name)
        pageCount = await getPDFPageCount(file)
        console.log("PDF page count:", pageCount)
      } else if (
        file.type === "application/msword" ||
        file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      ) {
        console.log("Counting Word document pages for:", file.name)
        pageCount = await getWordDocPageCount(file)
        console.log("Word document page count:", pageCount)
      } else {
        // For other file types, estimate based on file size
        const fileSizeKB = file.size / 1024
        if (fileSizeKB > 100) {
          pageCount = Math.max(1, Math.ceil(fileSizeKB / 100)) // Conservative estimate
        } else {
          pageCount = 1
        }
        console.log("Estimated page count for", file.name, ":", pageCount)
      }
    } catch (error) {
      console.error("Error counting pages:", error)
      pageCount = 1
    }

    // Update the modal with the actual page count
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
      // Single-sided printing
      return totalPages * (isColor ? 10 : 2)
    }

    // Double-sided printing
    if (isColor) {
      // Color: ₹10 per side
      return totalPages * 10
    } else {
      // B&W double-sided: ₹3 per sheet (2 pages), ₹2 for remaining single page
      const fullSheets = Math.floor(totalPages / 2)
      const remainingPages = totalPages % 2
      return fullSheets * 3 + remainingPages * 2
    }
  }

  // Add function to add file to print queue
  const addFileToPrintQueue = () => {
    // Calculate pages to print based on range
    let pagesToPrint = 0

    if (fileOptions.printSettings.pageRange === "all") {
      pagesToPrint = fileOptions.pageCount
    } else {
      pagesToPrint = fileOptions.printSettings.endPage - fileOptions.printSettings.startPage + 1
    }

    // Calculate cost using the new function
    const itemCost = calculateDoubleSidedCost(
      pagesToPrint,
      fileOptions.printSettings.colorMode === "color",
      fileOptions.printSettings.doubleSided,
    )

    // Add to print queue
    setPrintQueue([
      ...printQueue,
      {
        file: fileOptions.file,
        pages: pagesToPrint,
        doubleSided: fileOptions.printSettings.doubleSided,
        colorMode: fileOptions.printSettings.colorMode,
        cost: itemCost,
      },
    ])

    setFileOptions({ ...fileOptions, showModal: false })
  }

  // Add print queue state
  const [printQueue, setPrintQueue] = useState([])

  // Function to calculate canvas pages cost (single-sided only)
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

    // Always single-sided pricing
    pagesToCalculate.forEach((page) => {
      totalCost += page.colorMode === "color" ? 10 : 2
    })

    return totalCost
  }

  // Calculate total cost
  const calculateCost = () => {
    let totalCost = 0

    // Cost for canvas pages
    totalCost += calculateCanvasPagesCost()

    // Cost for print queue items - use pre-calculated costs
    printQueue.forEach((item) => {
      totalCost += item.cost || 0
    })

    // Cost for blank sheets
    totalCost += blankSheets * 1 // 1 Rs per blank sheet

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

  return (
    <div className="files-page">
      <div className="navbar">
        <button className="back-button" onClick={() => navigate("/")}>
          <ArrowLeft size={20} />
          <span>Back</span>
        </button>
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
                  <li key={index} className="file-item" onClick={() => showFileOptions(file)}>
                    <div className="file-icon">
                      <FileIcon size={24} />
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
                <FileBlank size={18} />
                <span>Blank A4 Sheets</span>
              </div>
              <div className="blank-sheets-control">
                <button
                  className="blank-sheet-button"
                  onClick={() => setBlankSheets(Math.max(0, blankSheets - 1))}
                  disabled={blankSheets === 0}
                >
                  <MinusCircle size={20} />
                </button>
                <div className="blank-sheet-count">{blankSheets}</div>
                <button className="blank-sheet-button" onClick={() => setBlankSheets(blankSheets + 1)}>
                  <PlusCircle size={20} />
                </button>
                <div className="blank-sheet-price">₹{blankSheets} (₹1 each)</div>
              </div>
            </div>
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

        <div className="canvas-area">
          <div className="canvas-toolbar">
            <button className="toolbar-button" onClick={addNewPage}>
              <Plus size={16} />
              <span>Add Page</span>
            </button>
            <button className="toolbar-button" onClick={duplicatePage}>
              <Copy size={16} />
              <span>Duplicate</span>
            </button>
            <button className="toolbar-button delete-button" onClick={() => deletePage(activePage)}>
              <Trash size={16} />
              <span>Delete Page</span>
            </button>
            <div className="color-toggle">
              <label className="toggle-label">
                <input
                  type="checkbox"
                  checked={currentPage?.colorMode === "color"}
                  onChange={() => currentPage && toggleColorMode(activePage)}
                />
                <span className="toggle-slider"></span>
                <span className="toggle-text">{currentPage?.colorMode === "color" ? "Color" : "B&W"}</span>
              </label>
            </div>
          </div>

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
                  <FileBlank size={48} />
                  <h3>No Canvas Pages</h3>
                  <p>You are only using blank A4 sheets</p>
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
                  <div className="option-group">
                    

                    {printSettings.pageRange === "custom" && (
                      <div className="page-range-inputs">
                        <div className="input-group">
                          <label>From:</label>
                          <input
                            type="number"
                            min="1"
                            max={pages.length}
                            value={printSettings.startPage}
                            onChange={(e) =>
                              setPrintSettings({
                                ...printSettings,
                                startPage: Math.min(Number.parseInt(e.target.value) || 1, pages.length),
                              })
                            }
                          />
                        </div>
                        <div className="input-group">
                          <label>To:</label>
                          <input
                            type="number"
                            min={printSettings.startPage}
                            max={pages.length}
                            value={printSettings.endPage}
                            onChange={(e) =>
                              setPrintSettings({
                                ...printSettings,
                                endPage: Math.min(
                                  Number.parseInt(e.target.value) || printSettings.startPage,
                                  pages.length,
                                ),
                              })
                            }
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Remove this entire section from the print-panel:
                  
                  <div className="option-group">
                    <h4>Print Options</h4>
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={printSettings.doubleSided}
                        onChange={() => setPrintSettings({ ...printSettings, doubleSided: !printSettings.doubleSided })}
                      />
                      Double-sided printing
                    </label>
                  </div>
                  */}

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

                      {/* Blank sheets */}
                      {blankSheets > 0 && (
                        <div className="cost-section">
                          <h5>Blank Sheets</h5>
                          <div className="cost-item">
                            <span>Blank A4 Sheets ({blankSheets})</span>
                            <span>₹{blankSheets}</span>
                          </div>
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
                  blankSheets: blankSheets,
                },
              })
            }
          >
            <CreditCard size={16} />
            <span id="color">Proceed to Payment</span>
          </button>
        </div>
      </div>

      {fileOptions.showModal && (
        <div className="print-modal">
          <div className="print-modal-content">
            <h2>Print Options: {fileOptions.file.name}</h2>

            {fileOptions.pageCount === 0 ? (
              <div style={{ textAlign: "center", padding: "20px" }}>
                <p>Analyzing document...</p>
                <p>Counting pages, please wait...</p>
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
                            printSettings: {
                              ...fileOptions.printSettings,
                              pageRange: "all",
                            },
                          })
                        }
                      />
                      All Pages ({fileOptions.pageCount} pages)
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
                            printSettings: {
                              ...fileOptions.printSettings,
                              pageRange: "custom",
                            },
                          })
                        }
                      />
                      Custom Range
                    </label>
                  </div>

                  {fileOptions.printSettings.pageRange === "custom" && (
                    <div className="page-range-inputs">
                      <div className="input-group">
                        <label>From:</label>
                        <input
                          type="number"
                          min="1"
                          max={fileOptions.pageCount}
                          value={fileOptions.printSettings.startPage}
                          onChange={(e) =>
                            setFileOptions({
                              ...fileOptions,
                              printSettings: {
                                ...fileOptions.printSettings,
                                startPage: Math.min(Number.parseInt(e.target.value) || 1, fileOptions.pageCount),
                              },
                            })
                          }
                        />
                      </div>
                      <div className="input-group">
                        <label>To:</label>
                        <input
                          type="number"
                          min={fileOptions.printSettings.startPage}
                          max={fileOptions.pageCount}
                          value={fileOptions.printSettings.endPage}
                          onChange={(e) =>
                            setFileOptions({
                              ...fileOptions,
                              printSettings: {
                                ...fileOptions.printSettings,
                                endPage: Math.min(
                                  Number.parseInt(e.target.value) || fileOptions.printSettings.startPage,
                                  fileOptions.pageCount,
                                ),
                              },
                            })
                          }
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="option-group">
                  <h3>Print Options</h3>
                  <label className="checkbox-label">
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
                    Double-sided printing
                  </label>

                  <div className="color-toggle mt-3">
                    <label className="toggle-label">
                      <input
                        type="checkbox"
                        checked={fileOptions.printSettings.colorMode === "color"}
                        onChange={() =>
                          setFileOptions({
                            ...fileOptions,
                            printSettings: {
                              ...fileOptions.printSettings,
                              colorMode: fileOptions.printSettings.colorMode === "color" ? "bw" : "color",
                            },
                          })
                        }
                      />
                      <span className="toggle-slider"></span>
                      <span className="toggle-text">
                        {fileOptions.printSettings.colorMode === "color" ? "Color" : "B&W"}
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            <div className="modal-actions">
              <button className="cancel-button" onClick={() => setFileOptions({ ...fileOptions, showModal: false })}>
                Cancel
              </button>
              {fileOptions.pageCount > 0 && (
                <button className="payment-button" id="queueb" onClick={addFileToPrintQueue}>
                  <Printer size={16} />
                  <span>Add to Print Queue</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default FilesPage
