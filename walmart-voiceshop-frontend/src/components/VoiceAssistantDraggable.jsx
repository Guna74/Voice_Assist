import React, { useRef, useState, useEffect } from "react";
import "./VoiceAssistantDraggable.css";

export default function VoiceAssistantDraggable({ children }) {
  // Start at top right, open by default
  const [position, setPosition] = useState({
    x: window.innerWidth - 360, // right side
    y: 100                      // just below the nav bar
  });

  const [isOpen, setIsOpen] = useState(true);
  const [dragging, setDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  // For mobile tap vs drag on close button
  const [touchStart, setTouchStart] = useState({ x: 0, y: 0 });

  const BOX_OPEN_WIDTH = 340;
  const BOX_CLOSED_WIDTH = 90;

  // Toggle open/close and keep right edge fixed
  const handleToggle = () => {
    setIsOpen((prevOpen) => {
      if (prevOpen) {
        setPosition(pos => ({
          x: pos.x + (BOX_OPEN_WIDTH - BOX_CLOSED_WIDTH),
          y: pos.y
        }));
      } else {
        setPosition(pos => ({
          x: pos.x - (BOX_OPEN_WIDTH - BOX_CLOSED_WIDTH),
          y: pos.y
        }));
      }
      return !prevOpen;
    });
  };

  // Drag handlers (mouse)
  const handleMouseDown = (e) => {
    setDragging(true);
    const box = e.currentTarget;
    const rect = box.getBoundingClientRect();
    dragOffset.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
    document.body.style.userSelect = "none";
  };

  const handleMouseMove = (e) => {
    if (!dragging) return;
    let newX = e.clientX - dragOffset.current.x;
    let newY = e.clientY - dragOffset.current.y;
    newX = Math.max(0, Math.min(newX, window.innerWidth - (isOpen ? 340 : 90)));
    newY = Math.max(0, Math.min(newY, window.innerHeight - (isOpen ? 400 : 90)));
    setPosition({ x: newX, y: newY });
  };

  const handleMouseUp = () => {
    setDragging(false);
    document.body.style.userSelect = "";
  };

  // Drag handlers (touch)
  const handleTouchStart = (e) => {
    setDragging(true);
    const touch = e.touches[0];
    const box = e.currentTarget;
    const rect = box.getBoundingClientRect();
    dragOffset.current = {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top
    };
  };

  const handleTouchMove = (e) => {
    if (!dragging) return;
    const touch = e.touches[0];
    let newX = touch.clientX - dragOffset.current.x;
    let newY = touch.clientY - dragOffset.current.y;
    newX = Math.max(0, Math.min(newX, window.innerWidth - (isOpen ? 340 : 90)));
    newY = Math.max(0, Math.min(newY, window.innerHeight - (isOpen ? 400 : 90)));
    setPosition({ x: newX, y: newY });
  };

  const handleTouchEnd = () => {
    setDragging(false);
  };

  // Attach drag listeners
  useEffect(() => {
    if (dragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      window.addEventListener("touchmove", handleTouchMove);
      window.addEventListener("touchend", handleTouchEnd);
    } else {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
    // eslint-disable-next-line
  }, [dragging, isOpen]);

  // --- Mobile-friendly close button handlers ---
  const handleCloseTouchStart = (e) => {
    if (e.touches && e.touches.length === 1) {
      setTouchStart({
        x: e.touches[0].clientX,
        y: e.touches[0].clientY
      });
    }
    e.stopPropagation();
  };

  const handleCloseTouchEnd = (e) => {
    if (e.changedTouches && e.changedTouches.length === 1) {
      const endX = e.changedTouches[0].clientX;
      const endY = e.changedTouches[0].clientY;
      const dx = endX - touchStart.x;
      const dy = endY - touchStart.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < 10) {
        // It was a tap, not a drag: collapse the box
        handleToggle();
      }
    }
    e.stopPropagation();
  };

  return (
    <div
      className={`vad-box${isOpen ? " open" : ""}`}
      style={{
        left: position.x,
        top: position.y,
        position: "fixed",
        zIndex: 2002,
        cursor: dragging ? "grabbing" : "grab"
      }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      aria-label="Drag voice assistant"
    >
      <div className="vad-header">
        <button
          className="vad-mic-btn"
          onClick={(e) => {
            e.stopPropagation();
            handleToggle();
          }}
          onTouchStart={handleCloseTouchStart}
          onTouchEnd={handleCloseTouchEnd}
          tabIndex={0}
          aria-label={isOpen ? "Close assistant" : "Open assistant"}
        >
          {isOpen ? "×" : "🎤"}
        </button>
      </div>
      {isOpen && (
        <div className="vad-content">
          {children}
        </div>
      )}
    </div>
  );
}
