import React from "react";
import { CheckCircleOutline, ShoppingCartOutlined } from "@mui/icons-material";

function WardrobeMatchBadge({ type, price, brand, size = "default" }) {
  if (type === "owned") {
    if (size === "dot") {
      return (
        <span
          className="inline-block w-2.5 h-2.5 rounded-full bg-green-500"
          title="In your closet"
        />
      );
    }
    return (
      <span
        className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-500/90 text-white"
        title="In your closet"
      >
        <CheckCircleOutline style={{ fontSize: 12 }} />
      </span>
    );
  }

  if (type === "shop") {
    if (size === "dot") {
      return (
        <span
          className="inline-block w-2.5 h-2.5 rounded-full bg-orange-500"
          title={price ? `Shop ₹${price}` : "Shop"}
        />
      );
    }
    return (
      <span
        className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-orange-500/90 text-white"
        title={price ? `Shop ${brand ? brand + " " : ""}₹${price}` : "Shop"}
      >
        <ShoppingCartOutlined style={{ fontSize: 12 }} />
      </span>
    );
  }

  return null;
}

export default WardrobeMatchBadge;
