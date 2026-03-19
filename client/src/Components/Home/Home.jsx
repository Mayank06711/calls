import React, { Component, useEffect, useRef, useState, Suspense } from "react";
import Headers from "./Hearders/Headers";
import Sidebar from "./Sidebar/Sidebar";
import { useSubscriptionColors } from "../../utils/getSubscriptionColors";
import AISidebar from "./AISidebar/AISidebar";
import { Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { AIContextProvider } from "../../context/AIContext";
import introJs from "intro.js";
import "intro.js/introjs.css";
import { Box, Button, Modal, Typography } from "@mui/material";
import { useSelector } from "react-redux";
import { LocalGasStation } from "@mui/icons-material";

// ── Error Boundary — prevents child render errors from crashing the entire page ─
class ContentErrorBoundaryClass extends Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("ContentErrorBoundary caught:", error, info?.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
          <p className="text-lg font-semibold text-gray-700 dark:text-gray-300">
            Something went wrong loading this page.
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center max-w-md">
            {this.state.error?.message || "An unexpected error occurred."}
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                this.props.onNavigateHome?.();
              }}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Go Home
            </button>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function ContentErrorBoundary({ children }) {
  const navigate = useNavigate();
  return (
    <ContentErrorBoundaryClass onNavigateHome={() => navigate("/")}>
      {children}
    </ContentErrorBoundaryClass>
  );
}

// ── Route-aware content skeleton ─────────────────────────────────────────────
const Sh = ({ className }) => (
  <div className={`animate-pulse rounded bg-gray-200 dark:bg-gray-700/40 ${className}`} />
);

const ChatSkeleton = () => (
  <div className="flex h-full">
    {/* Contact list */}
    <div className="w-80 border-r dark:border-dark-text/10 border-light-text/10 p-3 space-y-3 flex-shrink-0">
      <Sh className="w-full h-10 rounded-lg" />
      <div className="flex gap-2 mb-2">
        <Sh className="w-16 h-6 rounded-full" />
        <Sh className="w-16 h-6 rounded-full" />
      </div>
      {[...Array(8)].map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Sh className="w-10 h-10 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Sh className="w-3/5 h-3.5" />
            <Sh className="w-4/5 h-2.5" />
          </div>
        </div>
      ))}
    </div>
    {/* Message area */}
    <div className="flex-1 flex flex-col">
      <div className="p-3 border-b dark:border-dark-text/10 border-light-text/10 flex items-center gap-3">
        <Sh className="w-9 h-9 rounded-full" />
        <Sh className="w-32 h-4" />
      </div>
      <div className="flex-1 p-4 space-y-4">
        <div className="flex justify-start"><Sh className="w-48 h-8 rounded-xl" /></div>
        <div className="flex justify-end"><Sh className="w-56 h-8 rounded-xl" /></div>
        <div className="flex justify-start"><Sh className="w-64 h-12 rounded-xl" /></div>
        <div className="flex justify-end"><Sh className="w-40 h-8 rounded-xl" /></div>
        <div className="flex justify-start"><Sh className="w-52 h-8 rounded-xl" /></div>
      </div>
      <div className="p-3 border-t dark:border-dark-text/10 border-light-text/10">
        <Sh className="w-full h-10 rounded-xl" />
      </div>
    </div>
  </div>
);

const GridSkeleton = ({ chips = true }) => (
  <div className="p-3 sm:p-4 h-full">
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <Sh className="w-7 h-7 rounded-full" />
        <Sh className="w-36 h-5" />
      </div>
      <div className="flex gap-2">
        <Sh className="w-7 h-7 rounded-lg" />
        <Sh className="w-7 h-7 rounded-lg" />
      </div>
    </div>
    {chips && (
      <div className="flex gap-2 mb-4">
        <Sh className="w-20 h-7 rounded-full" />
        <Sh className="w-16 h-7 rounded-full" />
        <Sh className="w-24 h-7 rounded-full" />
      </div>
    )}
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="rounded-xl overflow-hidden">
          <Sh className="w-full aspect-[4/5]" />
          <div className="p-2 space-y-1.5">
            <Sh className="w-3/4 h-3" />
            <Sh className="w-1/2 h-2.5" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

const DetailSkeleton = () => (
  <div className="p-3 sm:p-4 h-full">
    <div className="flex items-center gap-2 mb-4">
      <Sh className="w-7 h-7 rounded-full" />
      <Sh className="w-40 h-5" />
    </div>
    <div className="flex gap-4">
      <Sh className="w-72 aspect-[4/5] rounded-2xl flex-shrink-0" />
      <div className="flex-1 space-y-3 pt-1">
        <div className="flex gap-2">
          <Sh className="w-16 h-6 rounded-full" />
          <Sh className="w-20 h-6 rounded-full" />
        </div>
        <Sh className="w-1/3 h-3" />
        <Sh className="w-full h-10 rounded-lg" />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center gap-2.5 p-2 rounded-xl border dark:border-dark-text/10 border-light-text/10">
            <Sh className="w-14 h-14 rounded-lg flex-shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Sh className="w-1/4 h-3" />
              <Sh className="w-2/3 h-2.5" />
            </div>
          </div>
        ))}
        <div className="flex gap-2.5 mt-2">
          <Sh className="flex-1 h-10 rounded-xl" />
          <Sh className="w-24 h-10 rounded-xl" />
        </div>
      </div>
    </div>
  </div>
);

const WardrobeHubSkeleton = () => (
  <div className="p-3 sm:p-5 h-full">
    <div className="flex items-center gap-3 mb-1">
      <Sh className="w-9 h-9 rounded-xl" />
      <Sh className="w-44 h-6" />
    </div>
    <Sh className="w-60 h-3 mb-4" />
    <Sh className="w-full h-1 rounded-full mb-5" />
    <Sh className="w-24 h-4 mb-3" />
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mb-5">
      {[...Array(6)].map((_, i) => (
        <Sh key={i} className="h-20 rounded-xl" />
      ))}
    </div>
    <Sh className="w-20 h-4 mb-3" />
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
      {[...Array(3)].map((_, i) => (
        <Sh key={i} className="h-20 rounded-xl" />
      ))}
    </div>
  </div>
);

const NotificationSkeleton = () => (
  <div className="p-3 sm:p-4 h-full">
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <Sh className="w-6 h-6 rounded" />
        <Sh className="w-32 h-5" />
        <Sh className="w-6 h-5 rounded-full" />
      </div>
      <Sh className="w-16 h-7 rounded-lg" />
    </div>
    <Sh className="w-full h-9 rounded-lg mb-4" />
    <Sh className="w-16 h-3 mb-3" />
    <div className="space-y-2.5">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="flex items-start gap-3 p-3 rounded-xl border dark:border-dark-text/10 border-light-text/10">
          <Sh className="w-10 h-10 rounded-lg flex-shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Sh className="w-2/5 h-3.5" />
            <Sh className="w-4/5 h-2.5" />
            <Sh className="w-1/4 h-2" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

const ProfileSkeleton = () => (
  <div className="flex flex-col lg:flex-row h-full">
    <div className="lg:w-[600px] p-6 flex flex-col items-center border-r dark:border-dark-text/10 border-light-text/10">
      <Sh className="w-32 h-32 rounded-full mb-4" />
      <Sh className="w-40 h-5 mb-2" />
      <Sh className="w-24 h-3 mb-4" />
      <div className="grid grid-cols-2 gap-3 w-full max-w-xs">
        {[...Array(4)].map((_, i) => (
          <Sh key={i} className="h-16 rounded-xl" />
        ))}
      </div>
    </div>
    <div className="flex-1 p-4">
      <div className="flex gap-3 mb-4 border-b dark:border-dark-text/10 border-light-text/10 pb-3">
        {[...Array(4)].map((_, i) => (
          <Sh key={i} className="w-16 h-7 rounded-full" />
        ))}
      </div>
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <Sh key={i} className="w-full h-20 rounded-xl" />
        ))}
      </div>
    </div>
  </div>
);

const SubscriptionSkeleton = () => (
  <div className="p-6 max-w-5xl mx-auto h-full">
    <div className="text-center mb-8">
      <Sh className="w-48 h-7 mx-auto mb-2" />
      <Sh className="w-72 h-4 mx-auto" />
    </div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="rounded-2xl border dark:border-dark-text/10 border-light-text/10 p-5 space-y-3">
          <Sh className="w-20 h-5 rounded-full" />
          <Sh className="w-16 h-8" />
          <Sh className="w-full h-3" />
          <div className="space-y-2 pt-2">
            {[...Array(5)].map((_, j) => (
              <div key={j} className="flex items-center gap-2">
                <Sh className="w-4 h-4 rounded-full flex-shrink-0" />
                <Sh className="w-full h-3" />
              </div>
            ))}
          </div>
          <Sh className="w-full h-10 rounded-xl mt-2" />
        </div>
      ))}
    </div>
  </div>
);

// const ReelsSkeleton = () => (
//   <div className="flex flex-col items-center justify-center h-full p-6">
//     <Sh className="w-20 h-20 rounded-2xl mb-4" />
//     <Sh className="w-48 h-6 mb-2" />
//     <Sh className="w-64 h-3 mb-6" />
//     <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-lg">
//       {[...Array(4)].map((_, i) => (
//         <Sh key={i} className="h-28 rounded-xl" />
//       ))}
//     </div>
//   </div>
// );

const ContentSkeleton = () => {
  const { pathname } = useLocation();
  const p = pathname.replace(/\/$/, "");

  if (p === "" || p === "/chats" || p.startsWith("/chats/"))
    return <ChatSkeleton />;
  if (/^\/wardrobe\/outfits\/[^/]+$/.test(p) || p === "/wardrobe/style-profile")
    return <DetailSkeleton />;
  if (p === "/wardrobe")
    return <WardrobeHubSkeleton />;
  if (p === "/wardrobe/my-closet" || p === "/wardrobe/outfits" || p === "/wardrobe/pairings" || p === "/wardrobe/shop")
    return <GridSkeleton />;
  if (p === "/wardrobe/outfit-builder" || p.startsWith("/wardrobe/suggest"))
    return <GridSkeleton chips={false} />;
  if (p === "/notifications")
    return <NotificationSkeleton />;
  if (p.startsWith("/profile"))
    return <ProfileSkeleton />;
  // if (p === "/reels")
  //   return <ReelsSkeleton />;
  if (p.startsWith("/stylist"))
    return <WardrobeHubSkeleton />;
  if (p.startsWith("/subscriptions"))
    return <SubscriptionSkeleton />;
  return <GridSkeleton chips={false} />;
};

function Home() {
  const darkMode = useSelector((state) => state.auth.isDarkMode);

  const [isDarkMode, setIsDarkMode] = useState(
    localStorage.getItem("isDarkMode") === "true"
  );
  console.log(
    "daaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaark moffffffffffffffffffffd",
    darkMode,
    isDarkMode
  );
  const location = useLocation();
  const mainContentRef = useRef(null);
  console.log("laction path name",location.pathname);

  const [showTourModal, setShowTourModal] = useState(true);
  const colors = useSubscriptionColors();
  const isAlreadyVerified =
    localStorage.getItem("isAlreadyVerified") === "true";
  const isTourCompleted = localStorage.getItem("isTourCompleted") === "true";

  useEffect(() => {
    try {
      if (location && location.pathname) {
        console.log("Current path:", location.pathname);
        if (mainContentRef.current) {
          mainContentRef.current.scrollTo({
            top: 0,
            behavior: 'instant'
          });
        }
      }
    } catch (error) {
      console.error("Scroll error:", error);
    }
  }, [location?.pathname]);

  useEffect(() => {
    if (darkMode !== null) {
      localStorage.setItem("isDarkMode", darkMode);
      setIsDarkMode(darkMode);
    } // Optionally update document body/html class for global theme
    document.documentElement.classList.toggle("dark", isDarkMode);
  }, [darkMode]);

  useEffect(() => {
    localStorage.setItem("isDarkMode", isDarkMode);
    document.documentElement.classList.toggle("dark", isDarkMode);
  }, [isDarkMode]);

  useEffect(() => {
    if (!isTourCompleted && !isAlreadyVerified && !showTourModal) {
      startTour();
    }
  }, [isAlreadyVerified, isTourCompleted, showTourModal]);

  const handleStartTour = () => {
    setShowTourModal(false);
  };

  const handleSkipTour = () => {
    setShowTourModal(false);
    localStorage.setItem("isTourCompleted", "true");
  };

  const startTour = () => {
    const intro = introJs();
    intro.setOptions({
      steps: [
        {
          element: document.querySelector(".tour1"),
          intro:
            "Use the search bar to quickly find contacts, conversations, or specific content within the application.",
          position: "bottom",
          title: "Search",
        },
        {
          element: document.querySelector(".tour2"),
          intro:
            "Meet your AI assistant! It can help answer questions, summarize information, and provide intelligent suggestions to boost your productivity.",
          position: "left",
          title: "AI Assistant",
        },
        {
          element: document.querySelector(".tour3"),
          intro:
            "This is your sidebar navigation menu. It provides quick access to all main sections of the application.",
          position: "right",
          title: "Navigation Menu",
        },
        {
          element: document.querySelector(".tour4"),
          intro:
            "This is your chat section where you can communicate with contacts. Send messages, share files, and keep conversations organized.",
          position: "right",
          title: "Chat",
        },
        {
          element: document.querySelector(".tour5"),
          intro:
            "Manage your subscription here. Upgrade to access premium features or check your current plan details.",
          position: "right",
          title: "Subscription",
        },
        // {
        //   element: document.querySelector(".tour6"),
        //   intro:
        //     "Browse through reels to discover short-form content from your network and industry influencers.",
        //   position: "right",
        //   title: "Reels",
        // },
        {
          element: document.querySelector(".tour7"),
          intro:
            "Customize your experience through the settings panel. Adjust notifications, privacy controls, and application preferences.",
          position: "right",
          title: "Settings",
        },
        {
          element: document.querySelector(".tour8"),
          intro:
            "Use this button to securely log out of your account when you're finished.",
          position: "top",
          title: "Logout",
        },
        {
          element: document.querySelector(".tour9"),
          intro:
            "View and edit your profile information. Keep your details up-to-date to make the most of our networking features.",
          position: "bottom",
          title: "Profile",
        },
        {
          element: document.querySelector(".tour10"),
          intro:
            "View and edit your profile information. Keep your details up-to-date to make the most of our networking features.",
          position: "bottom",
          title: "Account",
        },
        {
          element: document.querySelector(".tour11"),
          intro:
            "Welcome to your dashboard! Here you can view recent activities, upcoming calls, and key statistics at a glance.",
          position: "left",
          title: "Dashboard",
        },
      ],
      showProgress: false, // Hide progress dots
      showBullets: false, // Hide bullets
      exitOnOverlayClick: false, // Prevent closing on overlay click
      disableInteraction: true, // Prevent user interaction during the tour
      nextLabel: "Next →",
      prevLabel: "← Back",
      doneLabel: "Finish",
      showProgress: true,
      tooltipClass: isDarkMode
        ? "introjs-tooltip-dark"
        : "introjs-tooltip-light",
      highlightClass: isDarkMode
        ? "introjs-highlight-dark"
        : "introjs-highlight-light",
    });

    const style = document.createElement("style");
    style.textContent = `
      .introjs-tooltip-dark {
        color: white; 
        border: 1px solid #e5e7eb;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
         background-color: rgba(255, 255, 255, 0.1) !important;
        backdrop-filter: blur(8px) !important;
        -webkit-backdrop-filter: blur(8px) !important;
      }
      
      .introjs-tooltip-light {
       
        color: var(--introjs-tooltip-color);
        border: 1px solid #e5e7eb;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
         background-color: rgba(255, 255, 255, 0.3) !important;
        backdrop-filter: blur(8px) !important;
        -webkit-backdrop-filter: blur(8px) !important;
      }
      
      .introjs-button {
        background-color: var(--introjs-button-bg) !important;
        color: ${isDarkMode ? colors.second : colors.fourth}!important;
        text-shadow: none !important;
        border-radius: 4px !important;
        font-weight: 500 !important;
        transition: background-color 0.3s ease, color 0.3s ease;
      }
      
      .introjs-button:hover {
        background-color: ${colors.fourth} !important;
        color: ${isDarkMode ? "#fff" : "#000"}!important;
      }
      
      .introjs-highlight-dark {
        background-color: #ffffff !important;
        box-shadow: 0 0 0 100000px rgba(0, 0, 0, 0.6) !important;
        border: 1px solid white !important;
      }
      
      .introjs-highlight-light {
        box-shadow: 0 0 0 100000px rgba(0, 0, 0, 0.5) !important;
        border: 1px solid #6366f1 !important;
        background-color: rgba()
      }
      
      .introjs-helperLayer {
        background-color: transparent !important;
        border:1px solid rgba(255,255,255,0.3) !important;
      }
      
      .introjs-tooltiptext {
        padding: 12px !important;
      }  
      .introjs-tooltip-title{
      color:${isDarkMode ? colors.second : colors.fourth} !important;
      }
        
    `;
    document.head.appendChild(style);

    intro.start();

    intro.oncomplete(() => {
      localStorage.setItem("isTourCompleted", "true"); // Mark tour as completed
    });

    intro.onexit(() => {
      localStorage.setItem("isTourCompleted", "true"); // Mark tour as completed when exited
    });
  };

  // Modal style with subscription colors
  const modalStyle = {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: 400,
    bgcolor: isDarkMode
      ? "rgba(17, 24, 39, 0.95)"
      : "rgba(255, 255, 255, 0.95)",
    border: `2px solid ${colors.fourth}`,
    boxShadow: 24,
    p: 4,
    borderRadius: 2,
    backdropFilter: "blur(8px)",
    outline: "none",
  };

  return (
    <AIContextProvider>
    <div
      className={`h-screen w-full overflow-hidden ${
        isDarkMode ? "bg-gray-900 text-white" : "bg-gray-50 text-gray-900"
      }`}
    >
      {/* Tour Confirmation Modal */}
      <Modal
        open={!isTourCompleted && !isAlreadyVerified && showTourModal}
        aria-labelledby="tour-modal-title"
        aria-describedby="tour-modal-description"
      >
        <Box sx={modalStyle}>
          <Typography
            id="tour-modal-title"
            variant="h6"
            component="h2"
            sx={{
              color: isDarkMode ? colors.second : colors.fourth,
              fontWeight: "bold",
              mb: 2,
            }}
          >
            Welcome to the Application!
          </Typography>
          <Typography
            id="tour-modal-description"
            sx={{
              mb: 3,
              color: isDarkMode ? "#ffffff" : "#000000",
            }}
          >
            Would you like to take a quick tour to learn about the main features
            and sections of our application?
          </Typography>
          <Box sx={{ display: "flex", justifyContent: "space-between", mt: 2 }}>
            <Button
              onClick={handleSkipTour}
              sx={{
                color: isDarkMode ? colors.second : colors.fourth,
                "&:hover": {
                  backgroundColor: "rgba(0, 0, 0, 0.05)",
                },
              }}
            >
              Skip Tour
            </Button>
            <Button
              onClick={handleStartTour}
              variant="contained"
              sx={{
                backgroundColor: colors.fourth,
                color: isDarkMode ? "#000000" : "#ffffff",
                "&:hover": {
                  backgroundColor: colors.second,
                  color: isDarkMode ? "#ffffff" : "#000000",
                },
              }}
            >
              Start Tour
            </Button>
          </Box>
        </Box>
      </Modal>

      {/* Header */}
      <Headers isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode} />

      {/* Sidebar */}
      <Sidebar isDarkMode={isDarkMode} />

      {/* Main Content — fixed positioning fills exactly the visible viewport gap */}
      <div  ref={mainContentRef} className={`fixed top-16 left-16 right-0 bottom-0 overflow-x-hidden scrollbar-hide ${
        location.pathname === '/' || location.pathname === '/chats' || location.pathname.startsWith('/chats/') ? 'overflow-hidden' : 'overflow-y-auto'
      }`}
        style={{ scrollBehavior: 'instant' }}
      >
        <ContentErrorBoundary>
          <Suspense fallback={<ContentSkeleton />}>
            <Outlet />
          </Suspense>
        </ContentErrorBoundary>
      </div>

      {/* AI Assistant Panel */}
      <AISidebar isDarkMode={isDarkMode} />
    </div>
    </AIContextProvider>
  );
}

export default Home;
