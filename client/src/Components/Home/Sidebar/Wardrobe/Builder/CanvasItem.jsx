import React, { useRef, useState, useCallback } from "react";
import { Close, Lock, LockOpen } from "@mui/icons-material";

function CanvasItem({
  item,
  closetItem,
  x,
  y,
  width,
  height,
  rotation,
  zIndex,
  locked,
  onMove,
  onResize,
  onRotate,
  onRemove,
  onBringForward,
  onToggleLock,
  canvasScale = 1,
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const [hovered, setHovered] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, startX: 0, startY: 0 });
  const resizeStart = useRef({ x: 0, y: 0, startW: 0, startH: 0 });
  const rotateStart = useRef({ angle: 0, startRotation: 0 });
  const itemRef = useRef(null);

  const handleDragStart = useCallback((e) => {
    if (locked) return;
    if (e.target.closest("[data-resize]") || e.target.closest("[data-rotate]") || e.target.closest("[data-remove]") || e.target.closest("[data-lock]")) return;
    e.stopPropagation();
    setIsDragging(true);
    onBringForward?.();
    const pointer = e.touches ? e.touches[0] : e;
    dragStart.current = {
      x: pointer.clientX,
      y: pointer.clientY,
      startX: x,
      startY: y,
    };

    const handleMove = (ev) => {
      const p = ev.touches ? ev.touches[0] : ev;
      const dx = (p.clientX - dragStart.current.x) / canvasScale;
      const dy = (p.clientY - dragStart.current.y) / canvasScale;
      onMove?.(dragStart.current.startX + dx, dragStart.current.startY + dy);
    };
    const handleEnd = () => {
      setIsDragging(false);
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleEnd);
    };
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleEnd);
  }, [x, y, onMove, onBringForward, canvasScale, locked]);

  const handleResizeStart = useCallback((e) => {
    if (locked) return;
    e.stopPropagation();
    e.preventDefault();
    setIsResizing(true);
    const pointer = e.touches ? e.touches[0] : e;
    resizeStart.current = {
      x: pointer.clientX,
      y: pointer.clientY,
      startW: width,
      startH: height,
    };

    const handleMove = (ev) => {
      const p = ev.touches ? ev.touches[0] : ev;
      const dx = (p.clientX - resizeStart.current.x) / canvasScale;
      const dy = (p.clientY - resizeStart.current.y) / canvasScale;
      const newW = Math.max(40, resizeStart.current.startW + dx);
      const newH = Math.max(40, resizeStart.current.startH + dy);
      onResize?.(newW, newH);
    };
    const handleEnd = () => {
      setIsResizing(false);
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleEnd);
    };
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleEnd);
  }, [width, height, onResize, canvasScale, locked]);

  const handleRotateStart = useCallback((e) => {
    if (locked) return;
    e.stopPropagation();
    e.preventDefault();
    setIsRotating(true);
    const rect = itemRef.current?.getBoundingClientRect();
    if (!rect) return;
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const pointer = e.touches ? e.touches[0] : e;
    const startAngle = Math.atan2(pointer.clientY - centerY, pointer.clientX - centerX) * (180 / Math.PI);
    rotateStart.current = { angle: startAngle, startRotation: rotation };

    const handleMove = (ev) => {
      const p = ev.touches ? ev.touches[0] : ev;
      const currentAngle = Math.atan2(p.clientY - centerY, p.clientX - centerX) * (180 / Math.PI);
      const delta = currentAngle - rotateStart.current.angle;
      onRotate?.(rotateStart.current.startRotation + delta);
    };
    const handleEnd = () => {
      setIsRotating(false);
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleEnd);
    };
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleEnd);
  }, [rotation, onRotate, locked]);

  const photoUrl = closetItem?.thumbnailUrl || closetItem?.photoUrl;
  const label = closetItem?.subcategory || closetItem?.type || "Item";
  const showControls = hovered || locked;

  return (
    <div
      ref={itemRef}
      className="absolute select-none"
      style={{
        left: 0,
        top: 0,
        width,
        height,
        zIndex,
        transform: `translate(${x}px, ${y}px) rotate(${rotation}deg)`,
        cursor: locked ? "default" : isDragging ? "grabbing" : "grab",
        touchAction: "none",
      }}
      onPointerDown={handleDragStart}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Image */}
      <div className={`w-full h-full rounded-lg overflow-hidden shadow-md border ${locked ? "border-amber-400/60" : "border-white/20"}`}>
        {photoUrl ? (
          <img src={photoUrl} alt={label} className="w-full h-full object-cover" draggable={false} />
        ) : (
          <div className="w-full h-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
            <span className="text-2xl">
              {closetItem?.type === "Top" ? "👕" : closetItem?.type === "Bottom" ? "👖" : closetItem?.type === "Outerwear" ? "🧥" : closetItem?.type === "Shoes" ? "👟" : "👔"}
            </span>
          </div>
        )}
      </div>

      {/* Locked border overlay */}
      {locked && (
        <div className="absolute inset-0 rounded-lg border-2 border-amber-400/50 pointer-events-none" />
      )}

      {/* Label */}
      {hovered && (
        <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap bg-black/70 text-white text-[9px] px-1.5 py-0.5 rounded">
          {label}
        </div>
      )}

      {/* Lock/Unlock button — top-left */}
      {showControls && (
        <button
          data-lock
          onClick={(e) => { e.stopPropagation(); onToggleLock?.(); }}
          className={`absolute -top-2 -left-2 w-5 h-5 rounded-full flex items-center justify-center shadow-md z-10 transition-colors ${
            locked ? "bg-amber-500 text-white" : "bg-white/90 text-gray-500 hover:bg-amber-100"
          }`}
          title={locked ? "Unlock item" : "Lock item"}
        >
          {locked ? <Lock style={{ fontSize: 10 }} /> : <LockOpen style={{ fontSize: 10 }} />}
        </button>
      )}

      {/* Remove button — top-right */}
      {hovered && (
        <button
          data-remove
          onClick={(e) => { e.stopPropagation(); onRemove?.(); }}
          className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center shadow-md hover:bg-red-600 z-10"
        >
          <Close style={{ fontSize: 12 }} />
        </button>
      )}

      {/* Resize handle — hidden when locked */}
      {!locked && (
        <div
          data-resize
          onPointerDown={handleResizeStart}
          className={`absolute -bottom-1.5 -right-1.5 w-4 h-4 rounded-full bg-white border-2 border-blue-500 cursor-se-resize shadow-sm z-10 transition-opacity ${hovered ? "opacity-100" : "opacity-0"}`}
        />
      )}

      {/* Rotate handle — hidden when locked */}
      {!locked && (
        <div
          data-rotate
          onPointerDown={handleRotateStart}
          className={`absolute -top-6 left-1/2 -translate-x-1/2 flex flex-col items-center transition-opacity ${hovered ? "opacity-100" : "opacity-0"}`}
        >
          <div className="w-3 h-3 rounded-full bg-white border-2 border-purple-500 cursor-crosshair shadow-sm z-10" />
          <div className="w-px h-3 bg-purple-400" />
        </div>
      )}
    </div>
  );
}

export default CanvasItem;
