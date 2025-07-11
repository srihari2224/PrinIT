"use client"

import { useEffect, useRef, useState } from "react"
import "./VideoModal.css"
import adVideo from "../assets/images/AD-main.mp4"

// Import slideshow images
// IMPORTANT: Ensure these image files are located in your project at src/assets/images/AD-main/
import slide1 from "../assets/images/AD-main/1.png"
import slide2 from "../assets/images/AD-main/2.png"
import slide3 from "../assets/images/AD-main/3.png"
import slide4 from "../assets/images/AD-main/4.png"
import slide5 from "../assets/images/AD-main/5.jpg"

const slideImages = [slide1, slide2, slide3, slide4, slide5]

function VideoModal({ isOpen, onClose, autoPlay = true }) {
  const videoRef = useRef(null)
  const overlayRef = useRef(null)
  const [currentPhase, setCurrentPhase] = useState("video") // "video" or "slideshow"
  const [currentSlide, setCurrentSlide] = useState(0)
  const [isVideoEnded, setIsVideoEnded] = useState(false)
  const slideshowTimerRef = useRef(null)
  const phaseTimerRef = useRef(null)

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentPhase("video")
      setCurrentSlide(0)
      setIsVideoEnded(false)
    }
  }, [isOpen])

  // Handle video playback and phase transitions
  useEffect(() => {
    if (isOpen && videoRef.current && autoPlay && currentPhase === "video") {
      // Reset and play video with audio
      videoRef.current.currentTime = 0
      videoRef.current.muted = false // Enable audio
      videoRef.current.volume = 0.6 // Set volume to 70%

      videoRef.current.play().catch((error) => {
        console.log("Video autoplay failed:", error)
        // If autoplay with audio fails, try muted first
        videoRef.current.muted = true
        videoRef.current.play().catch((mutedError) => {
          console.log("Muted video autoplay also failed:", mutedError)
        })
      })
    }
  }, [isOpen, autoPlay, currentPhase])

  // Handle video end event
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleVideoEnd = () => {
      console.log("Video ended, starting slideshow...")
      setIsVideoEnded(true)
      setCurrentPhase("slideshow")
      setCurrentSlide(0) // Start slideshow from the first image
    }

    video.addEventListener("ended", handleVideoEnd)
    return () => {
      video.removeEventListener("ended", handleVideoEnd)
    }
  }, [])

  // Handle slideshow logic
  useEffect(() => {
    if (currentPhase === "slideshow" && isOpen) {
      console.log("Starting slideshow phase...")

      // Clear any existing timer
      if (slideshowTimerRef.current) {
        clearInterval(slideshowTimerRef.current)
      }

      // Start slideshow timer - 3 seconds per image
      slideshowTimerRef.current = setInterval(() => {
        setCurrentSlide((prevSlide) => {
          const nextSlide = prevSlide + 1

          if (nextSlide >= slideImages.length) {
            // Slideshow completed, switch back to video
            console.log("Slideshow completed, switching back to video...")
            setCurrentPhase("video")
            setIsVideoEnded(false) // Reset video ended state to allow it to play again
            return 0 // Reset slide index for next slideshow cycle
          }

          return nextSlide
        })
      }, 3000) // 3 seconds per slide

      return () => {
        if (slideshowTimerRef.current) {
          clearInterval(slideshowTimerRef.current)
        }
      }
    }
  }, [currentPhase, isOpen])

  // Handle escape key and body scroll
  useEffect(() => {
    const handleEscapeKey = (event) => {
      if (event.key === "Escape" && isOpen) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener("keydown", handleEscapeKey)
      document.body.style.overflow = "hidden"
    }

    return () => {
      document.removeEventListener("keydown", handleEscapeKey)
      document.body.style.overflow = "unset"
    }
  }, [isOpen, onClose])

  // Cleanup timers on unmount or close
  useEffect(() => {
    return () => {
      if (slideshowTimerRef.current) {
        clearInterval(slideshowTimerRef.current)
      }
      if (phaseTimerRef.current) {
        clearTimeout(phaseTimerRef.current)
      }
    }
  }, [])

  const handleOverlayClick = (event) => {
    // Close modal when clicking on the overlay (background)
    if (event.target === overlayRef.current) {
      handleCloseClick() // Use the unified close handler
    }
  }

  const handleVideoClick = () => {
    if (videoRef.current) {
      videoRef.current.pause()
    }
    console.log("Video clicked, transitioning to slideshow...")
    setIsVideoEnded(true) // Mark video as "ended" to trigger slideshow logic
    setCurrentPhase("slideshow")
    setCurrentSlide(0) // Start slideshow from the beginning
  }

  const handleCloseClick = () => {
    if (videoRef.current) {
      videoRef.current.pause()
    }

    // Clear all timers
    if (slideshowTimerRef.current) {
      clearInterval(slideshowTimerRef.current)
    }
    if (phaseTimerRef.current) {
      clearTimeout(phaseTimerRef.current)
    }

    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="video-modal-overlay" ref={overlayRef} onClick={handleOverlayClick}>
      <div className="video-container">
        <button className="video-close-button" onClick={handleCloseClick} aria-label="Close advertisement">
          ×
        </button>

        {/* Phase indicator */}
        <div className="phase-indicator">
          {currentPhase === "video" ? "Advertisement Video" : `Slide ${currentSlide + 1} of ${slideImages.length}`}
        </div>

        {/* Video Phase */}
        {currentPhase === "video" && (
          <video
            ref={videoRef}
            className="video-player"
            autoPlay={autoPlay}
            playsInline
            preload="auto"
            controls={false}
            onClick={handleVideoClick} // Add onClick handler here
          >
            <source src={adVideo} type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        )}

        {/* Slideshow Phase */}
        {currentPhase === "slideshow" && (
          <div className="image-slideshow">
            {slideImages.map((image, index) => (
              <img
                key={index}
                src={image || "/placeholder.svg"}
                alt={`Advertisement slide ${index + 1}`}
                className={`slide-image ${index === currentSlide ? "active" : ""}`}
              />
            ))}

            {/* Progress dots for slideshow */}
            <div className="slideshow-progress">
              {slideImages.map((_, index) => (
                <div key={index} className={`progress-dot ${index === currentSlide ? "active" : ""}`} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default VideoModal
