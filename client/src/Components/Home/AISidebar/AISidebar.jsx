import { IconButton } from "@mui/material";
import React, { useState } from "react";
import CycloneIcon from "@mui/icons-material/Cyclone";
import { useSubscriptionColors } from "../../../utils/getSubscriptionColors";
import AIAssistant from "./AIAssistant/AIAssistant";
import { RiAddBoxFill } from "react-icons/ri";
import { FaShareAltSquare } from "react-icons/fa";
import "ldrs/ping";
import zIndex from "@mui/material/styles/zIndex";

function AISidebar({ isDarkMode }) {
  const [isAIOpen, setIsAIOpen] = useState(false);
  const colors = useSubscriptionColors();
  return (
    <aside
      className={`fixed right-0 top-16 h-[calc(100vh-4rem)] ${
        isDarkMode ? "bg-gray-800" : "bg-white"
      } shadow-lg 
        ${
          isAIOpen ? "w-96" : "w-0"
        } transition-[width] duration-200 ease-in-out`}
    >
      <div className="flex flex-col ">
        {/* First section with button and header */}
        <div className="relative h-12 ">
          <div className="absolute top-1/2 transform -translate-y-1/2 z-40 ">
            <div
              className={`relative cursor-pointer ${
                !isAIOpen ? "-left-10" : "left-1"
              } transition-all duration-700`}
              onClick={() => setIsAIOpen(!isAIOpen)}
            >
              <IconButton className="shadow-md relative z-10 bg-white/10">
                <CycloneIcon sx={{ color: "#FF55BB", zIndex: 20 }} />
              </IconButton>
              <l-ping
                size="50"
                speed="4"
                color={colors.third}
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  zIndex: 5,
                  pointerEvents: "none",
                }}
              ></l-ping>
            </div>
          </div>

          <div
            className={`p-1 absolute top-0 ${
              !isAIOpen && "opacity-0"
            } transition-opacity duration-200 w-full z-20`}
          >
            <div
              className="relative overflow-hidden rounded-tl-2xl rounded-br-2xl h-12"
              style={{
                background: `linear-gradient(135deg, ${colors.first} 0%, ${colors.second} 50%, ${colors.third} 100%)`,
              }}
            >
              <div className="ml-12 h-full flex items-center">
                <h2
                  className="text-xl font-semibold"
                  style={{ color: colors.fourth }}
                >
                  Strut AI
                </h2>
              </div>
              <div className="absolute -right-4 -top-4 w-20 h-20 opacity-10">
                <CycloneIcon sx={{ fontSize: 80, color: colors.fourth }} />
              </div>
            </div>
          </div>
        </div>

        {/* Second section with AIAssistant */}
        <div
          className={`flex-1 ${
            isAIOpen ? "opacity-100" : "opacity-0"
          } transition-opacity duration-300`}
        >
          <AIAssistant />
        </div>
      </div>
    </aside>
  );
}

export default AISidebar;
