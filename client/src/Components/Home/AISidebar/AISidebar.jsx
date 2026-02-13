import { IconButton, Tooltip } from "@mui/material";
import React, { useState } from "react";
import CycloneIcon from "@mui/icons-material/Cyclone";
import DeleteSweepOutlined from "@mui/icons-material/DeleteSweepOutlined";
import { useSubscriptionColors, toRgba } from "../../../utils/getSubscriptionColors";
import AIAssistant from "./AIAssistant/AIAssistant";
import "ldrs/ping";

function AISidebar({ isDarkMode }) {
  const [isAIOpen, setIsAIOpen] = useState(false);
  const [chatKey, setChatKey] = useState(0);
  const colors = useSubscriptionColors();

  const handleClearChat = () => {
    setChatKey(prev => prev + 1);
  };

  return (
    <>
      {/* Mobile overlay backdrop - blurred to show content behind */}
      {isAIOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40 sm:hidden"
          onClick={() => setIsAIOpen(false)}
        />
      )}

      <aside
        className={`fixed right-0 top-16 h-[calc(100vh-4rem)] shadow-lg z-50
          ${
            isAIOpen ? "w-full sm:w-96" : "w-0"
          } transition-[width] duration-200 ease-in-out
          ${isAIOpen ? "bg-gray-800/80 backdrop-blur-md" : ""}
          `}
      >
      <div className="flex flex-col h-full">
        {/* First section with button and header */}
        <div className="relative h-12 ">
          {/* Toggle button - same spiral icon for open/close */}
          <div className="absolute top-1/2 transform -translate-y-1/2 z-40">
            <div
              className={`tour2 relative cursor-pointer ${
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
              <div className="ml-12 h-full flex items-center justify-between pr-3 relative z-10">
                <h2
                  className="text-xl font-semibold"
                  style={{ color: colors.fourth }}
                >
                  Strut AI
                </h2>
                {/* Clear chat button */}
                <Tooltip title="Clear chat" arrow>
                  <IconButton
                    size="small"
                    onClick={handleClearChat}
                    sx={{
                      color: colors.fourth,
                      opacity: 0.7,
                      '&:hover': { opacity: 1, backgroundColor: toRgba(colors.fourth, 0.15) },
                    }}
                  >
                    <DeleteSweepOutlined sx={{ fontSize: 20 }} />
                  </IconButton>
                </Tooltip>
              </div>
              <div className="absolute -right-4 -top-4 w-20 h-20 opacity-10 pointer-events-none">
                <CycloneIcon sx={{ fontSize: 80, color: colors.fourth }} />
              </div>
            </div>
          </div>
        </div>

        {/* Second section with AIAssistant */}
        <div
          className={`flex-1 overflow-hidden ${
            isAIOpen ? "opacity-100" : "opacity-0"
          } transition-opacity duration-300`}
        >
          <AIAssistant key={chatKey} />
        </div>
      </div>
    </aside>
    </>
  );
}

export default AISidebar;
