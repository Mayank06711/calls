import React from "react";
import { useSubscriptionColors } from "../../../../../utils/getSubscriptionColors";
import WardrobeMatchBadge from "../shared/WardrobeMatchBadge";
import { ColorDots } from "../shared/ColorDots";

function PairingCard({ pairing, index, closetItems = [] }) {
  const colors = useSubscriptionColors();

  const top = pairing.top || {};
  const bottom = pairing.bottom || {};
  const layers = pairing.layers || pairing.layerOptions || [];
  const footwear = pairing.footwear || pairing.footwearOptions || [];
  const wardrobeMatches = pairing.wardrobeMatches || [];
  const productRecs = pairing.productRecommendations || [];

  const isOwned = (name) =>
    wardrobeMatches.some(
      (m) => m.subcategory?.toLowerCase() === name?.toLowerCase()
    );

  const getProductRec = (name) =>
    productRecs.find(
      (p) => p.name?.toLowerCase() === name?.toLowerCase()
    );

  // Get photo from the pairing item directly (backend includes photoUrl) or fallback to closet match
  const findPhoto = (pairingItem) => {
    if (!pairingItem) return null;
    // Direct photo from backend pairing data
    if (pairingItem.photoUrl && pairingItem.photoUrl !== "placeholder") {
      return pairingItem.thumbnailUrl || pairingItem.photoUrl;
    }
    // Fallback: match by subcategory against closet items
    const itemName = pairingItem.name || pairingItem.subcategory;
    if (!closetItems.length || !itemName) return null;
    const match = closetItems.find(
      (ci) =>
        ci._id === pairingItem._id ||
        ci.subcategory?.toLowerCase() === itemName?.toLowerCase() ||
        ci.subcategory?.toLowerCase().includes(itemName?.toLowerCase()) ||
        itemName?.toLowerCase().includes(ci.subcategory?.toLowerCase())
    );
    if (match && match.photoUrl && match.photoUrl !== "placeholder") {
      return match.thumbnailUrl || match.photoUrl;
    }
    return null;
  };

  return (
    <div
      className="w-full rounded-xl backdrop-blur-md dark:bg-dark-primary bg-light-secondary border p-4 transition-all hover:shadow-md"
      style={{ borderColor: `${colors.fourth}30` }}
    >
      {/* Header */}
      <p className="text-[10px] font-medium dark:text-dark-text/40 text-light-text/40 mb-2">
        Pairing {index + 1}
      </p>

      {/* Top + Bottom side by side */}
      <div className="flex items-stretch gap-3 mb-3">
        <ItemBlock
          label={top.name || top.subcategory || "Top"}
          color={top.color || top.shade}
          dominantColors={top.dominantColors}
          photoUrl={findPhoto(top)}
          emoji="👕"
          colors={colors}
        />
        <span className="text-lg dark:text-dark-text/30 text-light-text/30 self-center">+</span>
        <ItemBlock
          label={bottom.name || bottom.subcategory || "Bottom"}
          color={bottom.color || bottom.shade}
          dominantColors={bottom.dominantColors}
          photoUrl={findPhoto(bottom)}
          emoji="👖"
          colors={colors}
        />
      </div>

      {/* Layers & Footwear */}
      {(layers.length > 0 || footwear.length > 0) && (
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs">
          {layers.length > 0 && (
            <div>
              <span className="dark:text-dark-text/50 text-light-text/50 font-medium">Layers: </span>
              {layers.map((l, i) => {
                const name = l.name || l.subcategory || l;
                return (
                  <span key={i} className="inline-flex items-center gap-1 mr-2">
                    <span className="dark:text-dark-text/70 text-light-text/70">{name}</span>
                    {isOwned(name) ? (
                      <WardrobeMatchBadge type="owned" />
                    ) : getProductRec(name) ? (
                      <WardrobeMatchBadge type="shop" price={getProductRec(name).price} />
                    ) : null}
                  </span>
                );
              })}
            </div>
          )}
          {footwear.length > 0 && (
            <div>
              <span className="dark:text-dark-text/50 text-light-text/50 font-medium">Shoes: </span>
              {footwear.map((f, i) => {
                const name = f.name || f.subcategory || f;
                return (
                  <span key={i} className="inline-flex items-center gap-1 mr-2">
                    <span className="dark:text-dark-text/70 text-light-text/70">{name}</span>
                    {isOwned(name) ? (
                      <WardrobeMatchBadge type="owned" />
                    ) : getProductRec(name) ? (
                      <WardrobeMatchBadge type="shop" price={getProductRec(name).price} />
                    ) : null}
                  </span>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ItemBlock({ label, color, dominantColors, photoUrl, emoji, colors }) {
  const colorName = dominantColors?.[0]?.name || color || "";
  return (
    <div
      className="flex-1 rounded-lg overflow-hidden"
      style={{ backgroundColor: `${colors.fourth}08` }}
    >
      {photoUrl ? (
        <img src={photoUrl} alt={label} className="w-full h-24 object-cover" />
      ) : (
        <div className="w-full h-24 flex items-center justify-center text-3xl opacity-30">
          {emoji}
        </div>
      )}
      <div className="p-2 text-center min-w-0">
        <p className="text-xs font-semibold dark:text-dark-text/80 text-light-text/80 truncate">
          {label}
        </p>
        <div className="flex items-center justify-center gap-1 mt-0.5 min-w-0 overflow-hidden">
          <ColorDots colors={dominantColors} max={2} size="sm" />
          {colorName && (
            <span className="text-[10px] dark:text-dark-text/40 text-light-text/40 truncate">
              {colorName}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default PairingCard;
