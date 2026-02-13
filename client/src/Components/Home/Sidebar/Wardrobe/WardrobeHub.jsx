import React, { useEffect } from "react";
import {
  PersonOutline,
  CheckroomOutlined,
  StyleOutlined,
  ShuffleOutlined,
  GridViewOutlined,
  BrushOutlined,
  CollectionsOutlined,
  CalendarMonthOutlined,
  ShoppingCartOutlined,
  ArrowForward,
  AutoAwesome,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { useSubscriptionColors, toRgba } from "../../../../utils/getSubscriptionColors";
import { fetchStyleProfileThunk, fetchClosetThunk, fetchOutfitsThunk } from "../../../../redux/thunks/wardrobe.thunks";
import PremiumGate from "./shared/PremiumGate";

/* ── Section divider with gradient line ── */
function SectionLabel({ label, color }) {
  return (
    <div className="flex items-center gap-3 mb-3">
      <div className="w-1 h-4 rounded-full" style={{ backgroundColor: color }} />
      <span
        className="text-[11px] font-bold uppercase tracking-widest"
        style={{ color: toRgba(color, 0.7) }}
      >
        {label}
      </span>
      <div
        className="flex-1 h-px"
        style={{ background: `linear-gradient(to right, ${toRgba(color, 0.2)}, transparent)` }}
      />
    </div>
  );
}

function WardrobeHub() {
  const colors = useSubscriptionColors();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { hasProfile } = useSelector((state) => state.wardrobe.styleProfile);
  const { items } = useSelector((state) => state.wardrobe.closet);
  const { saved: outfits } = useSelector((state) => state.wardrobe.outfits);

  useEffect(() => {
    dispatch(fetchStyleProfileThunk());
    dispatch(fetchClosetThunk());
    dispatch(fetchOutfitsThunk());
  }, [dispatch]);

  const topCount = items.filter((i) => i.type === "Top").length;
  const bottomCount = items.filter((i) => i.type === "Bottom").length;
  const layerCount = items.filter((i) => i.type === "Outerwear").length;
  const shoeCount = items.filter((i) => i.type === "Shoes").length;

  /* ── Helper: wrap with PremiumGate when needed ── */
  const gateWrap = (gate, key, content) => {
    if (gate && gate !== "Free") {
      return <PremiumGate key={key} requiredTier={gate}>{content}</PremiumGate>;
    }
    return <React.Fragment key={key}>{content}</React.Fragment>;
  };

  /* ── Featured card (Essentials) — gradient bg + watermark icon ── */
  const renderFeaturedCard = (card) => {
    const content = (
      <div
        className="group relative overflow-hidden rounded-2xl cursor-pointer
          transition-all duration-300 hover:scale-[1.02] hover:shadow-xl"
        style={{
          background: `linear-gradient(145deg, ${toRgba(colors.fourth, 0.12)}, ${toRgba(colors.fourth, 0.04)})`,
          border: `1px solid ${toRgba(colors.fourth, 0.2)}`,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = toRgba(colors.fourth, 0.5);
          e.currentTarget.style.boxShadow = `0 8px 24px ${toRgba(colors.fourth, 0.15)}`;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = toRgba(colors.fourth, 0.2);
          e.currentTarget.style.boxShadow = "none";
        }}
        onClick={() => navigate(card.path)}
      >
        {/* Watermark icon */}
        <div className="absolute -bottom-3 -right-3 opacity-[0.04] group-hover:opacity-[0.08] transition-opacity duration-500">
          {React.cloneElement(card.icon, { style: { fontSize: 100 } })}
        </div>

        {/* Top gradient accent */}
        <div
          className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl"
          style={{ background: `linear-gradient(90deg, ${colors.fourth}, ${toRgba(colors.fourth, 0.3)})` }}
        />

        <div className="relative p-5 flex flex-col gap-2.5">
          <div className="flex items-start justify-between">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{
                background: `linear-gradient(135deg, ${toRgba(colors.fourth, 0.2)}, ${toRgba(colors.fourth, 0.08)})`,
                boxShadow: `0 2px 8px ${toRgba(colors.fourth, 0.15)}`,
              }}
            >
              {React.cloneElement(card.icon, {
                style: { color: colors.fourth, fontSize: 26 },
              })}
            </div>
            <ArrowForward
              className="opacity-0 group-hover:opacity-60 transition-all duration-300 group-hover:translate-x-0.5"
              style={{ color: colors.fourth, fontSize: 18 }}
            />
          </div>

          <div>
            <h3 className="text-sm font-bold dark:text-dark-text text-light-text">
              {card.title}
            </h3>
            <p className="text-xs dark:text-dark-text/55 text-light-text/55 mt-0.5">
              {card.description}
            </p>
          </div>

          {card.badge && (
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full w-fit
                ${card.badgePulse ? "animate-pulse" : ""}`}
              style={{
                backgroundColor: card.badgeColor === "text-green-500"
                  ? "rgba(34,197,94,0.15)" : "rgba(249,115,22,0.15)",
                color: card.badgeColor === "text-green-500" ? "#22c55e" : "#f97316",
              }}
            >
              {card.badge}
            </span>
          )}

          {card.stats && (
            <div className="flex items-center gap-2 mt-0.5">
              {card.stats.map((s) => (
                <div
                  key={s.emoji}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-md"
                  style={{ backgroundColor: toRgba(colors.fourth, 0.08) }}
                >
                  <span className="text-xs">{s.emoji}</span>
                  <span className="text-[11px] font-mono font-semibold dark:text-dark-text/60 text-light-text/60">
                    {s.count}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Hover corner glow */}
        <div
          className="absolute -bottom-6 -right-6 w-24 h-24 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-2xl"
          style={{ backgroundColor: toRgba(colors.fourth, 0.15) }}
        />
      </div>
    );
    return gateWrap(card.gate, card.key, content);
  };

  /* ── Style AI card — watermark + gradient strip + hover scale ── */
  const renderCard = (card) => {
    const content = (
      <div
        className="group relative overflow-hidden rounded-2xl backdrop-blur-md
          dark:bg-dark-primary bg-light-secondary
          cursor-pointer transition-all duration-300 hover:scale-[1.03] hover:shadow-lg"
        style={{ border: `1px solid ${toRgba(colors.fourth, 0.15)}` }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = toRgba(colors.fourth, 0.4);
          e.currentTarget.style.boxShadow = `0 6px 20px ${toRgba(colors.fourth, 0.12)}`;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = toRgba(colors.fourth, 0.15);
          e.currentTarget.style.boxShadow = "none";
        }}
        onClick={() => navigate(card.path)}
      >
        {/* Top accent strip — always visible, intensifies on hover */}
        <div
          className="absolute top-0 left-0 right-0 h-[2px] opacity-40 group-hover:opacity-100 transition-opacity duration-300"
          style={{ background: `linear-gradient(90deg, ${colors.fourth}, transparent)` }}
        />

        {/* Watermark icon in background */}
        <div className="absolute -bottom-2 -right-2 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity duration-500">
          {React.cloneElement(card.icon, { style: { fontSize: 80 } })}
        </div>

        <div className="relative p-4 flex flex-col gap-2">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center
              group-hover:scale-110 transition-transform duration-300"
            style={{
              background: `linear-gradient(135deg, ${toRgba(colors.fourth, 0.15)}, ${toRgba(colors.fourth, 0.06)})`,
            }}
          >
            {React.cloneElement(card.icon, {
              style: { color: colors.fourth, fontSize: 20 },
            })}
          </div>
          <h3 className="text-sm font-semibold dark:text-dark-text/90 text-light-text/90 group-hover:dark:text-dark-text group-hover:text-light-text transition-colors">
            {card.title}
          </h3>
          <p className="text-xs dark:text-dark-text/50 text-light-text/50 leading-relaxed">
            {card.description}
          </p>
        </div>

        <div
          className="absolute -bottom-3 -right-3 w-16 h-16 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl"
          style={{ backgroundColor: toRgba(colors.fourth, 0.1) }}
        />
      </div>
    );
    return gateWrap(card.gate, card.key, content);
  };

  /* ── Collection pill — horizontal inline style ── */
  const renderCollectionPill = (card) => {
    const content = (
      <div
        className="group flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer
          transition-all duration-300 hover:scale-[1.02]
          dark:bg-dark-primary bg-light-secondary"
        style={{ border: `1px solid ${toRgba(colors.fourth, 0.12)}` }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = toRgba(colors.fourth, 0.4);
          e.currentTarget.style.backgroundColor = toRgba(colors.fourth, 0.06);
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = toRgba(colors.fourth, 0.12);
          e.currentTarget.style.backgroundColor = "";
        }}
        onClick={() => navigate(card.path)}
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0
            group-hover:scale-110 transition-transform duration-300"
          style={{ backgroundColor: toRgba(colors.fourth, 0.1) }}
        >
          {React.cloneElement(card.icon, {
            style: { color: colors.fourth, fontSize: 16 },
          })}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-xs font-semibold dark:text-dark-text/85 text-light-text/85">
            {card.title}
          </h3>
          <p className="text-[10px] dark:text-dark-text/40 text-light-text/40 truncate">
            {card.description}
          </p>
        </div>
        <ArrowForward
          className="opacity-0 group-hover:opacity-50 transition-opacity duration-300 flex-shrink-0"
          style={{ color: colors.fourth, fontSize: 14 }}
        />
      </div>
    );
    return gateWrap(card.gate, card.key, content);
  };

  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      {/* ── Fixed Hero Header ── */}
      <div
        className="flex-shrink-0 relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${toRgba(colors.fourth, 0.08)} 0%, transparent 50%, ${toRgba(colors.fourth, 0.05)} 100%)`,
        }}
      >
        {/* Decorative circles */}
        <div
          className="absolute -top-6 -right-6 w-24 h-24 rounded-full blur-2xl"
          style={{ backgroundColor: toRgba(colors.fourth, 0.07) }}
        />

        <div className="relative px-4 sm:px-5 pt-3 pb-2.5">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{
                background: `linear-gradient(135deg, ${colors.fourth}, ${toRgba(colors.fourth, 0.7)})`,
                boxShadow: `0 3px 10px ${toRgba(colors.fourth, 0.25)}`,
              }}
            >
              <CheckroomOutlined style={{ color: "#fff", fontSize: 20 }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <h2 className="text-base font-bold dark:text-dark-text text-light-text tracking-tight leading-tight">
                  My Wardrobe
                </h2>
                <AutoAwesome style={{ color: colors.fourth, fontSize: 14 }} />
              </div>
              <p className="text-[11px] dark:text-dark-text/40 text-light-text/40 mt-0.5 truncate">
                {items.length > 0
                  ? `${items.length} items · ${outfits.length} outfits — styled by AI`
                  : "Add items, get styled by AI, build perfect outfits"}
              </p>
            </div>
          </div>

          {/* Stat pills — single row, hidden on very small screens */}
          {items.length > 0 && (
            <div className="hidden sm:flex items-center gap-1.5 mt-2">
              {[
                { emoji: "👕", count: topCount },
                { emoji: "👖", count: bottomCount },
                { emoji: "🧥", count: layerCount },
                { emoji: "👟", count: shoeCount },
              ].filter(s => s.count > 0).map((s) => (
                <div
                  key={s.emoji}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px]"
                  style={{
                    backgroundColor: toRgba(colors.fourth, 0.08),
                    border: `1px solid ${toRgba(colors.fourth, 0.15)}`,
                  }}
                >
                  <span>{s.emoji}</span>
                  <span className="font-medium dark:text-dark-text/60 text-light-text/60">{s.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bottom accent line */}
        <div
          className="h-[2px]"
          style={{ background: `linear-gradient(to right, ${colors.fourth}, ${toRgba(colors.fourth, 0.2)}, transparent)` }}
        />
      </div>

      {/* ── Scrollable content ── */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar px-4 sm:px-5 pt-5 pb-6 space-y-6">

        {/* ── Essentials ── */}
        <section>
          <SectionLabel label="Essentials" color={colors.fourth} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {renderFeaturedCard({
              key: "style-profile",
              icon: <PersonOutline />,
              title: "Style Profile",
              description: hasProfile ? "Edit your style DNA" : "Set up your style DNA",
              path: "/wardrobe/style-profile",
              badge: hasProfile ? "Complete" : "Setup Required",
              badgeColor: hasProfile ? "text-green-500" : "text-orange-500",
              badgePulse: !hasProfile,
            })}
            {renderFeaturedCard({
              key: "my-closet",
              icon: <CheckroomOutlined />,
              title: "My Closet",
              description: items.length > 0
                ? `${items.length} items in your wardrobe`
                : "Add your clothing items",
              path: "/wardrobe/my-closet",
              stats: items.length > 0
                ? [
                    { emoji: "👕", count: topCount },
                    { emoji: "👖", count: bottomCount },
                    { emoji: "🧥", count: layerCount },
                    { emoji: "👟", count: shoeCount },
                  ]
                : null,
            })}
          </div>
        </section>

        {/* ── Style AI ── */}
        <section>
          <SectionLabel label="Style AI" color={colors.fourth} />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {renderCard({
              key: "ai-suggest",
              icon: <StyleOutlined />,
              title: "AI Suggest",
              description: "AI-powered full outfit suggestion",
              path: "/wardrobe/suggest/full-outfit",
            })}
            {renderCard({
              key: "mix-match",
              icon: <ShuffleOutlined />,
              title: "Mix & Match",
              description: "Pick an item, get matches",
              path: "/wardrobe/suggest/from-item",
            })}
            {renderCard({
              key: "outfit-builder",
              icon: <BrushOutlined />,
              title: "Outfit Builder",
              description: "Free-form canvas builder",
              path: "/wardrobe/outfit-builder",
              gate: "Silver",
            })}
          </div>
        </section>

        {/* ── Collection ── */}
        <section>
          <SectionLabel label="Collection" color={colors.fourth} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {renderCollectionPill({
              key: "outfits",
              icon: <CollectionsOutlined />,
              title: "My Outfits",
              description: outfits.length > 0 ? `${outfits.length} saved outfits` : "Saved outfits",
              path: "/wardrobe/outfits",
            })}
            {renderCollectionPill({
              key: "pairings",
              icon: <GridViewOutlined />,
              title: "All Pairings",
              description: "Every possible combo",
              path: "/wardrobe/pairings",
              gate: "Silver",
            })}
            {renderCollectionPill({
              key: "outfit-log",
              icon: <CalendarMonthOutlined />,
              title: "Outfit Log",
              description: "Track what you wore",
              path: "/wardrobe/outfit-log",
              gate: "Silver",
            })}
            {renderCollectionPill({
              key: "shop",
              icon: <ShoppingCartOutlined />,
              title: "Shop",
              description: "Product picks for you",
              path: "/wardrobe/shop",
              gate: "Silver",
            })}
          </div>
        </section>
      </div>
    </div>
  );
}

export default WardrobeHub;
