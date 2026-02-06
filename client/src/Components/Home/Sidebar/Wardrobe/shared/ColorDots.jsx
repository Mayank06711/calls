import React from "react";

/**
 * Renders small colored circles from a dominantColors array.
 * @param {Object[]} colors - Array of {hex, name, colorFamily, percentage}
 * @param {number} max - Max dots to show (default 3)
 * @param {"sm"|"md"} size - Dot size: sm=8px, md=10px
 */
export function ColorDots({ colors, max = 3, size = "sm" }) {
  if (!colors || colors.length === 0) return null;

  const dotSize = size === "md" ? 10 : 8;
  const visible = colors.slice(0, max);

  return (
    <span className="inline-flex items-center gap-[3px]">
      {visible.map((c, i) => (
        <span
          key={i}
          title={c.name || c.colorFamily || ""}
          style={{
            display: "inline-block",
            width: dotSize,
            height: dotSize,
            borderRadius: "50%",
            backgroundColor: c.hex,
            border: "1px solid rgba(255,255,255,0.3)",
            flexShrink: 0,
          }}
        />
      ))}
    </span>
  );
}

/**
 * Renders a thin horizontal color palette bar from an outfit's colorPalette.
 * @param {Object[]} palette - Array of {hex, name, slot, colorFamily}
 */
export function ColorPaletteBar({ palette }) {
  if (!palette || palette.length === 0) return null;

  return (
    <div className="flex w-full rounded-full overflow-hidden" style={{ height: 6 }}>
      {palette.map((c, i) => (
        <div
          key={i}
          title={`${c.slot}: ${c.name || c.hex}`}
          className="flex-1"
          style={{ backgroundColor: c.hex }}
        />
      ))}
    </div>
  );
}

/**
 * Renders a detailed color palette with swatches and labels.
 * @param {Object[]} palette - Array of {hex, name, slot, colorFamily, colorType}
 */
export function ColorPaletteDetail({ palette }) {
  if (!palette || palette.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5 sm:gap-2">
      {palette.map((c, i) => (
        <div key={i} className="flex items-center gap-1 sm:gap-1.5 min-w-0">
          <span
            style={{
              display: "inline-block",
              width: 12,
              height: 12,
              borderRadius: "50%",
              backgroundColor: c.hex,
              border: "1px solid rgba(0,0,0,0.1)",
              flexShrink: 0,
            }}
          />
          <div className="flex flex-col min-w-0">
            <span className="text-[9px] dark:text-dark-text/70 text-light-text/70 leading-tight truncate">
              {c.name}
            </span>
            <span className="text-[7px] dark:text-dark-text/40 text-light-text/40 leading-tight capitalize">
              {c.slot}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

export default ColorDots;
