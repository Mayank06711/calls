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
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { useSubscriptionColors } from "../../../../utils/getSubscriptionColors";
import { fetchStyleProfileThunk, fetchClosetThunk, fetchOutfitsThunk } from "../../../../redux/thunks/wardrobe.thunks";
import PremiumGate from "./shared/PremiumGate";

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

  const wardrobeCards = [
    {
      icon: <PersonOutline />,
      title: "Style Profile",
      description: hasProfile ? "Edit your style DNA" : "Set up your style DNA",
      path: "/wardrobe/style-profile",
      badge: hasProfile ? "Done" : "Setup Required",
      badgeColor: hasProfile ? "text-green-500" : "text-orange-500",
      badgePulse: !hasProfile,
    },
    {
      icon: <CheckroomOutlined />,
      title: "My Closet",
      description: items.length > 0 ? `${items.length} items` : "Add your clothing items",
      path: "/wardrobe/my-closet",
      stats: items.length > 0 ? `${topCount}T ${bottomCount}B ${layerCount}L ${shoeCount}S` : null,
    },
    {
      icon: <StyleOutlined />,
      title: "AI Suggest",
      description: "AI-powered full outfit suggestion",
      path: "/wardrobe/suggest/full-outfit",
    },
    {
      icon: <ShuffleOutlined />,
      title: "Mix & Match",
      description: "Pick a top or bottom, get matches",
      path: "/wardrobe/suggest/from-item",
    },
    {
      icon: <BrushOutlined />,
      title: "Outfit Builder",
      description: "Create outfits on a free-form canvas",
      path: "/wardrobe/outfit-builder",
      gate: "Silver",
    },
    {
      icon: <CollectionsOutlined />,
      title: "My Outfits",
      description: outfits.length > 0 ? `${outfits.length} saved` : "View saved outfits",
      path: "/wardrobe/outfits",
    },
    {
      icon: <GridViewOutlined />,
      title: "All Pairings",
      description: "See every possible combo",
      path: "/wardrobe/pairings",
      gate: "Silver",
    },
    {
      icon: <CalendarMonthOutlined />,
      title: "Outfit Log",
      description: "Track what you wore",
      path: "/wardrobe/outfit-log",
      gate: "Silver",
    },
    {
      icon: <ShoppingCartOutlined />,
      title: "Shop",
      description: "Product recommendations",
      path: "/wardrobe/shop",
      gate: "Silver",
    },
  ];

  const renderCard = (card, index) => {
    const cardContent = (
      <div
        key={index}
        className="group relative overflow-hidden rounded-xl backdrop-blur-md
          dark:bg-dark-primary bg-light-secondary
          border ease-in-out cursor-pointer hover:shadow-lg"
        style={{ borderColor: `${colors.fourth}30` }}
        onMouseEnter={(e) => (e.currentTarget.style.borderColor = colors.fourth)}
        onMouseLeave={(e) => (e.currentTarget.style.borderColor = `${colors.fourth}30`)}
        onClick={() => navigate(card.path)}
      >
        {/* Background gradient overlay */}
        <div
          className="absolute inset-0
            dark:bg-gradient-to-br dark:from-dark-accent/10 dark:to-dark-accent/5
            bg-gradient-to-br from-light-accent/10 to-light-accent/5
            opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        />

        {/* Card content */}
        <div className="relative p-4 flex flex-col gap-1.5">
          {/* Icon container */}
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center mb-1 transition-all duration-300"
            style={{ backgroundColor: `${colors.fourth}20` }}
          >
            {React.cloneElement(card.icon, {
              style: { color: colors.fourth },
              className: "transition-colors duration-300",
            })}
          </div>

          {/* Text content */}
          <h3 className="text-sm font-semibold dark:text-dark-text/90 text-light-text/90 dark:group-hover:text-dark-text group-hover:text-light-text">
            {card.title}
          </h3>
          <p className="text-xs dark:text-dark-text/60 text-light-text/60 dark:group-hover:text-dark-text/80 group-hover:text-light-text/80">
            {card.description}
          </p>

          {/* Badge */}
          {card.badge && (
            <span className={`text-[10px] font-medium ${card.badgeColor} ${card.badgePulse ? "animate-pulse" : ""}`}>
              {card.badge}
            </span>
          )}

          {/* Stats */}
          {card.stats && (
            <span className="text-[9px] dark:text-dark-text/40 text-light-text/40 font-mono">
              {card.stats}
            </span>
          )}
        </div>

        {/* Hover effect corner decoration */}
        <div
          className="absolute -bottom-1 -right-1 w-10 h-10
            dark:bg-gradient-to-br dark:from-dark-accent/20 dark:to-dark-accent/10
            bg-gradient-to-br from-light-accent/20 to-light-accent/10
            rounded-tl-xl opacity-0 group-hover:opacity-100 transition-all duration-300
            transform rotate-45 translate-x-2 translate-y-2"
        />
      </div>
    );

    return cardContent;
  };

  return (
    <div className="p-2 sm:p-4 w-full h-full overflow-y-auto custom-scrollbar">
      <h2 className="text-lg font-semibold mb-4 dark:text-dark-text text-light-text">
        Wardrobe
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
        {wardrobeCards.map((card, index) => {
          if (card.gate && card.gate !== "Free") {
            return (
              <PremiumGate key={index} requiredTier={card.gate}>
                {renderCard(card, index)}
              </PremiumGate>
            );
          }
          return <React.Fragment key={index}>{renderCard(card, index)}</React.Fragment>;
        })}
      </div>
    </div>
  );
}

export default WardrobeHub;
