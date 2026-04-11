import React from "react";
import { motion } from "framer-motion";
import { ChatBubbleOutlineOutlined } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { toRgba } from "../../../../utils/getSubscriptionColors";

const CATEGORY_COLORS = {
  clothing: { bg: "#dbeafe", text: "#1d4ed8" },
  hair: { bg: "#f3e8ff", text: "#7c3aed" },
  makeup: { bg: "#fce7f3", text: "#be185d" },
};

function ItemCatalogCard({ item, colors, index = 0 }) {
  const navigate = useNavigate();
  const catColor = CATEGORY_COLORS[item.category] || CATEGORY_COLORS.clothing;
  const creatorName = item.expert?.user?.fullName || "Expert";

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.3 }}
      onClick={() => navigate(`/item-catalog/${item._id}`)}
      className="rounded-xl overflow-hidden cursor-pointer dark:bg-dark-primary bg-white hover:shadow-md transition-shadow"
      style={{ border: `1px solid ${toRgba(colors.fourth, 0.1)}` }}
    >
      {/* Image */}
      <div className="relative h-44 bg-gray-100 dark:bg-gray-800">
        <img
          src={item.images?.[0]}
          alt={item.title}
          className="w-full h-full object-cover"
        />
        {/* Category badge */}
        <span
          className="absolute top-2 left-2 text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize"
          style={{ backgroundColor: catColor.bg, color: catColor.text }}
        >
          {item.category}
        </span>
        {/* Gender badge */}
        <span className="absolute top-2 right-2 text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/80 dark:bg-gray-900/80 text-gray-700 dark:text-gray-300">
          {item.gender}
        </span>
      </div>

      {/* Info */}
      <div className="p-3">
        <h4 className="text-sm font-semibold dark:text-dark-text text-gray-900 line-clamp-2 leading-tight">
          {item.title}
        </h4>

        <div className="flex items-center justify-between mt-2">
          <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
            by {creatorName}
          </p>
          {item.suggestions?.length > 0 && (
            <div className="flex items-center gap-0.5 text-gray-400">
              <ChatBubbleOutlineOutlined sx={{ fontSize: 12 }} />
              <span className="text-[10px]">{item.suggestions.length}</span>
            </div>
          )}
        </div>

        {/* Tags preview */}
        {item.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {item.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="text-[9px] px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default ItemCatalogCard;
