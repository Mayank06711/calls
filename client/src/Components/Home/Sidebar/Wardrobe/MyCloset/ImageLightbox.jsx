import React, { useEffect } from "react";
import { Close } from "@mui/icons-material";
import { IconButton } from "@mui/material";

function ImageLightbox({ src, alt, onClose, item, scoped = false, showNobg = false }) {
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const hasDetails = item && (item.color || item.dominantColors?.length > 0 || item.brand || item.pattern || item.fabric || item.season || item.occasions?.length > 0 || item.notes);

  // When scoped, the parent provides the overlay backdrop — this just renders content
  if (scoped) {
    return (
      <div
        className="flex flex-col items-center gap-4 max-w-[90%] max-h-[90%] cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <div className="absolute top-3 right-3 z-10">
          <IconButton
            onClick={onClose}
            className="!bg-white/10 hover:!bg-white/20"
            size="medium"
          >
            <Close style={{ color: "white" }} />
          </IconButton>
        </div>

        {/* Full image */}
        <div
          className="rounded-lg shadow-2xl overflow-hidden"
          style={showNobg ? {
            backgroundImage: "linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)",
            backgroundSize: "20px 20px",
            backgroundPosition: "0 0, 0 10px, 10px -10px, -10px 0px",
            backgroundColor: "#fff",
          } : {}}
        >
          <img
            src={src}
            alt={alt || ""}
            className="max-w-full max-h-[70vh] object-contain"
          />
        </div>

        {/* Item details panel */}
        {hasDetails && (
          <div className="w-full max-w-lg rounded-xl px-5 py-3 bg-white/10 backdrop-blur-md">
            <div className="flex items-center gap-3 mb-2">
              <p className="text-white text-sm font-semibold">{item.subcategory}</p>
              {item.type && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/15 text-white/70">
                  {item.type}
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {item.dominantColors?.length > 0 ? (
                <ColorSwatches colors={item.dominantColors} />
              ) : item.color ? (
                <DetailChip label="Color" value={item.color} />
              ) : null}
              {item.brand && <DetailChip label="Brand" value={item.brand} />}
              {item.pattern && <DetailChip label="Pattern" value={item.pattern} />}
              {item.fabric && <DetailChip label="Fabric" value={item.fabric} />}
              {item.season && item.season !== "All" && <DetailChip label="Season" value={item.season} />}
              {item.occasions?.length > 0 && <DetailChip label="Occasions" value={item.occasions.join(", ")} />}
            </div>
            {item.notes && (
              <p className="text-white/60 text-xs mt-2 leading-relaxed">{item.notes}</p>
            )}
          </div>
        )}
      </div>
    );
  }

  // Default: fixed overlay mode (used by other pages if needed)
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 cursor-pointer"
      onClick={onClose}
    >
      <div className="absolute top-4 right-4 z-10">
        <IconButton
          onClick={onClose}
          className="!bg-white/10 hover:!bg-white/20"
          size="medium"
        >
          <Close style={{ color: "white" }} />
        </IconButton>
      </div>

      <div
        className="flex flex-col items-center gap-4 max-w-[90vw] cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={src}
          alt={alt || ""}
          className="max-w-[90vw] max-h-[75vh] object-contain rounded-lg shadow-2xl"
        />
        {hasDetails && (
          <div className="w-full max-w-lg rounded-xl px-5 py-3 bg-white/10 backdrop-blur-md">
            <div className="flex items-center gap-3 mb-2">
              <p className="text-white text-sm font-semibold">{item.subcategory}</p>
              {item.type && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/15 text-white/70">
                  {item.type}
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {item.dominantColors?.length > 0 ? (
                <ColorSwatches colors={item.dominantColors} />
              ) : item.color ? (
                <DetailChip label="Color" value={item.color} />
              ) : null}
              {item.brand && <DetailChip label="Brand" value={item.brand} />}
              {item.pattern && <DetailChip label="Pattern" value={item.pattern} />}
              {item.fabric && <DetailChip label="Fabric" value={item.fabric} />}
              {item.season && item.season !== "All" && <DetailChip label="Season" value={item.season} />}
              {item.occasions?.length > 0 && <DetailChip label="Occasions" value={item.occasions.join(", ")} />}
            </div>
            {item.notes && (
              <p className="text-white/60 text-xs mt-2 leading-relaxed">{item.notes}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function DetailChip({ label, value }) {
  return (
    <span className="text-[11px] text-white/80">
      <span className="text-white/40">{label}:</span> {value}
    </span>
  );
}

function ColorSwatches({ colors }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] text-white/80">
      <span className="text-white/40">Colors:</span>
      {colors.slice(0, 3).map((c, i) => (
        <span key={i} className="inline-flex items-center gap-1">
          <span
            style={{
              display: "inline-block",
              width: 10,
              height: 10,
              borderRadius: "50%",
              backgroundColor: c.hex,
              border: "1px solid rgba(255,255,255,0.3)",
            }}
          />
          <span className="text-white/70">{c.name}</span>
        </span>
      ))}
    </span>
  );
}

export default ImageLightbox;
