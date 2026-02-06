import React from "react";
import { CheckCircleOutline, ShoppingCartOutlined } from "@mui/icons-material";

function WardrobeMatchBadge({ type, price, brand }) {
  if (type === "owned") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-2 py-0.5 rounded-full">
        <CheckCircleOutline style={{ fontSize: 12 }} />
        In Closet
      </span>
    );
  }

  if (type === "shop") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/30 px-2 py-0.5 rounded-full">
        <ShoppingCartOutlined style={{ fontSize: 12 }} />
        {price ? `Shop ${brand ? brand + " " : ""}₹${price}` : "Shop"}
      </span>
    );
  }

  return null;
}

export default WardrobeMatchBadge;
