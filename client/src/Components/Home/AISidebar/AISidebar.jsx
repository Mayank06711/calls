import { IconButton } from '@mui/material';
import React, { useState } from 'react'
import CycloneIcon from "@mui/icons-material/Cyclone";
import { useSubscriptionColors } from '../../../utils/getSubscriptionColors';
import AIAssistant from './AIAssistant/AIAssistant';
import { RiAddBoxFill } from "react-icons/ri";
import { FaShareAltSquare } from "react-icons/fa";




function AISidebar({isDarkMode}) {
    const [isAIOpen, setIsAIOpen] = useState(false);
    const colors = useSubscriptionColors();
  return (
    <aside
        className={`fixed right-0 top-16 h-[calc(100vh-4rem)] ${
          isDarkMode ? "bg-gray-800" : "bg-white"
        } shadow-lg 
        ${isAIOpen ? "w-96" : "w-0"} transition-[width] duration-200 ease-in-out`}
      >
        <div className="relative">
          <IconButton
            className={`absolute ${
              !isAIOpen ? "-left-10" : "left-1"
            } top-6 transform -translate-y-1/2 bg-transparent transition-all duration-500 shadow-md z-40`}
            onClick={() => setIsAIOpen(!isAIOpen)}
           
          >
            <CycloneIcon sx={{ color: colors.fourth }} />
          </IconButton>
          
          <div className={`p-1 absolute top-0 ${!isAIOpen && 'opacity-0'} transition-opacity duration-200 w-full z-20`}>
            <div className="relative overflow-hidden  rounded-tl-2xl rounded-br-2xl " 
                 style={{background: `linear-gradient(135deg, ${colors.first} 0%, ${colors.second} 50%, ${colors.third} 100%)`}}>
              <div className="ml-12">
                <h2 className=" text-xl font-semibold my-2" style={{color:colors.fourth}}>Strut AI</h2>
              </div>
              <div className="absolute -right-4 -top-4 w-20 h-20 opacity-10">
                <CycloneIcon sx={{ fontSize: 80, color: colors.fourth }} />
              </div>
            </div>
          </div>
        </div>
        
        <div
          className={`p-1 ${
            isAIOpen ? "opacity-100" : "opacity-0"
          } transition-opacity duration-300`}
        >
          <AIAssistant />
        </div>
      </aside>
  )
}

export default AISidebar
