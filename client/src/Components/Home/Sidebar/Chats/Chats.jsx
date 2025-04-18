import React, { useState } from "react";
import { Search, VideoCall, Call, FilterList } from "@mui/icons-material";
import { IconButton, Tabs, Tab, Avatar, Chip } from "@mui/material";
import { useSubscriptionColors } from "../../../../utils/getSubscriptionColors";

function ChatSection() {
  const colors = useSubscriptionColors();
  const [selectedTab, setSelectedTab] = useState("users");
  const [searchQuery, setSearchQuery] = useState("");

  // Dummy data for demonstration
  const users = [
    { id: 1, name: "John Doe", type: "expert", status: "online" },
    { id: 2, name: "Jane Smith", type: "user", status: "offline" },
    { id: 3, name: "Mike Johnson", type: "expert", status: "online" },
  ];

  // Add example messages
  const messages = [
    {
      id: 1,
      text: "Hey, how are you?",
      sender: "user", 
      timestamp: "09:41",
    },
    {
      id: 2,
      text: "I'm good! Thanks for asking. I was wondering if you could help me with my style choices for an upcoming event.",
      sender: "other",
      timestamp: "09:42",
    },
    {
      id: 3,
      text: "Of course! What kind of event is it?",
      sender: "user",
      timestamp: "09:42",
    },
    {
      id: 4,
      text: "It's a formal wedding ceremony. I need help choosing between a navy blue suit and a charcoal grey one. What would you recommend?",
      sender: "other",
      timestamp: "09:43",
    },
    {
      id: 5,
      text: "Both are excellent choices! For a wedding, I'd lean towards the navy blue suit. It's versatile, photographs well, and has a slightly more celebratory feel than charcoal grey. Plus, you can easily dress it up with different accessories.",
      sender: "user",
      timestamp: "09:45",
    },
    {
      id: 6,
      text: "That makes sense! What color shirt would you suggest with the navy suit?",
      sender: "other",
      timestamp: "09:46",
    },
    {
      id: 7,
      text: "A crisp white shirt is always a classic choice. It creates a clean, sophisticated look.",
      sender: "user",
      timestamp: "09:47",
    },
    {
      id: 8,
      text: "Perfect! And for the tie?",
      sender: "other",
      timestamp: "09:48",
    },
    {
      id: 9,
      text: "For a wedding, I'd suggest a silk tie in either burgundy or blush pink. Both colors complement navy beautifully and are appropriate for the occasion.",
      sender: "user",
      timestamp: "09:49",
    },
    {
      id: 10,
      text: "I have a burgundy tie that might work. What about shoes?",
      sender: "other",
      timestamp: "09:50",
    },
    {
      id: 11,
      text: "Brown or black oxford shoes would work well. If you go with brown, make sure it's a darker shade to maintain the formal look.",
      sender: "user",
      timestamp: "09:51",
    },
    {
      id: 12,
      text: "I have dark brown oxfords. Should I match the belt color?",
      sender: "other",
      timestamp: "09:52",
    },
    {
      id: 13,
      text: "Yes, absolutely! Always match your leather accessories - belt and shoes should be the same color.",
      sender: "user",
      timestamp: "09:53",
    },
    {
      id: 14,
      text: "What about pocket square suggestions?",
      sender: "other",
      timestamp: "09:54",
    },
    {
      id: 15,
      text: "A white silk pocket square with a presidential fold would look elegant. Alternatively, you could choose one with subtle burgundy accents to tie in with the tie.",
      sender: "user",
      timestamp: "09:55",
    },
    {
      id: 16,
      text: "That's really helpful! Any recommendations for cufflinks?",
      sender: "other",
      timestamp: "09:56",
    },
    {
      id: 17,
      text: "Silver or mother-of-pearl cufflinks would be perfect. Keep them simple and elegant - you don't want them to be too flashy.",
      sender: "user",
      timestamp: "09:57",
    },
    {
      id: 18,
      text: "Should I wear a watch?",
      sender: "other",
      timestamp: "09:58",
    },
    {
      id: 19,
      text: "Yes, a dress watch with a leather strap matching your shoes and belt would complete the look perfectly.",
      sender: "user",
      timestamp: "09:59",
    },
    {
      id: 20,
      text: "I have a silver-toned watch with a dark brown leather strap. Would that work?",
      sender: "other",
      timestamp: "10:00",
    },
    {
      id: 21,
      text: "That's perfect! The silver tone will complement your cufflinks too.",
      sender: "user",
      timestamp: "10:01",
    },
    {
      id: 22,
      text: "You've been incredibly helpful! I feel much more confident about my outfit now.",
      sender: "other",
      timestamp: "10:02",
    },
    {
      id: 23,
      text: "Happy to help! Don't forget to try everything on together before the big day.",
      sender: "user",
      timestamp: "10:03",
    },
    {
      id: 24,
      text: "Will do! One last question - any tips for the day of the wedding?",
      sender: "other",
      timestamp: "10:04",
    },
    {
      id: 25,
      text: "Make sure your suit is pressed, shoes are polished, and bring a tide pen just in case! And most importantly, carry yourself with confidence - you're going to look great!",
      sender: "user",
      timestamp: "10:05",
    },
  ];

  return (
    <div className="flex h-full w-full bg-light-primary dark:bg-dark-primary text-light-text dark:text-dark-text">
      {/* Users Panel */}
      <div className="w-96 border-r border-light-primary dark:border-dark-primary bg-light-secondary dark:bg-dark-secondary">
        {/* Search Bar */}
        <div className="p-2 border-b border-light-secondary dark:border-dark-secondary">
          <div className="flex items-center bg-light-primary dark:bg-dark-primary rounded-full px-3 py-1">
            <IconButton size="small">
              <Search className="text-light-text dark:text-dark-text opacity-50" />
            </IconButton>
            <input
              type="text"
              placeholder="Search expert or users..."
              className="ml-1 bg-transparent border-none outline-none w-full text-light-text dark:text-dark-text placeholder-light-text/50 dark:placeholder-dark-text/50"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* User Type Tabs */}
        <div className="border-b border-light-secondary/10 dark:border-dark-secondary/10">
          <Tabs
            value={selectedTab}
            onChange={(e, newValue) => setSelectedTab(newValue)}
            variant="fullWidth"
            sx={{
              minHeight: "32px", // Reduced overall tabs height
              "& .MuiTab-root": {
                color: "inherit",
                opacity: 0.7,
                minHeight: "30px", // Minimum height for individual tabs
                padding: "4px 12px",
                fontSize: "0.875rem",
                textTransform: "none", // Prevents all-caps
                "&.Mui-selected": {
                  color: colors.fourth,
                  opacity: 1,
                },
              },
              "& .MuiTabs-indicator": {
                backgroundColor: colors.fourth,
                height: "2px",
              },
              "& .MuiTabs-flexContainer": {
                height: "32px",
              },
            }}
          >
            <Tab
              label="All Users"
              value="users"
              disableRipple
              sx={{
                minWidth: "50px",
                flex: 1,
              }}
            />
            <Tab
              label="Experts"
              value="experts"
              disableRipple
              sx={{
                minWidth: "50px",
                flex: 1,
              }}
            />
          </Tabs>
        </div>

        {/* Users List */}
        <div className="overflow-y-auto h-[calc(100vh-160px)] p-2 scrollbar-hide">
          {" "}
          {/* Reduced from 180px to 140px due to smaller header/tabs */}
          {users.map((user) => (
            <div
              key={user.id}
              className="flex items-center p-2 cursor-pointer hover:bg-light-accent/5 dark:hover:bg-dark-accent/5 transition-colors duration-200"
            >
              <Avatar
                sx={{
                  bgcolor: colors.third,
                  width: 32, // Smaller avatar
                  height: 32, // Smaller avatar
                  fontSize: "0.875rem", // Smaller font for initials
                }}
              >
                {user.name[0]}
              </Avatar>
              <div className="ml-2 flex-1">
                {" "}
                {/* Reduced margin */}
                <div className="flex items-center justify-between">
                  <p className="font-medium text-sm">
                    {" "}
                    {/* Reduced font size */}
                    {user.name}
                  </p>
                  <Chip
                    label={user.type}
                    size="small"
                    sx={{
                      backgroundColor: colors.second,
                      color: "white",
                      fontSize: "0.65rem", // Even smaller font
                      height: "18px", // Reduced height
                      "& .MuiChip-label": {
                        padding: "0 6px", // Reduced padding
                      },
                    }}
                  />
                </div>
                <p className="text-xs text-light-text/70 dark:text-dark-text/70">
                  {" "}
                  {/* Smaller status text */}
                  {user.status}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Chat Header hii*/}
        <div className="px-4 py-2 border-b border-light-secondary dark:border-dark-secondary bg-light-secondary dark:bg-dark-secondary flex items-center  ">
          <div className="w-1/2 flex items-center">
            <Avatar sx={{ bgcolor: colors.third }}>J</Avatar>
            <div className="ml-3">
              <p className="font-medium">John Doe</p>
              <p className="text-xs text-light-text/70 dark:text-dark-text/70">
                Online
              </p>
            </div>
          </div>
          <div className="w-1/2 flex items-center space-x-4">
            <IconButton
              sx={{ color: colors.fourth }}
              className="hover:bg-light-accent/5 dark:hover:bg-dark-accent/5"
              onClick={() => console.log("Video call")}
            >
              <VideoCall />
            </IconButton>
            <IconButton
              sx={{ color: colors.fourth }}
              className="hover:bg-light-accent/5 dark:hover:bg-dark-accent/5"
              onClick={() => console.log("Voice call")}
            >
              <Call />
            </IconButton>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 p-8 overflow-y-auto bg-light-primary dark:bg-dark-primary scrollbar-hide">
          <div className="space-y-2">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.sender === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[75%] break-words rounded-lg px-3 py-2 ${
                    message.sender === "user"
                      ? "bg-light-accent/5 dark:bg-dark-accent/10 rounded-br-none"
                      : "bg-light-secondary/50 dark:bg-dark-secondary/50 rounded-bl-none"
                  }`}
                >
                  <p className="text-sm text-light-text dark:text-dark-text">
                    {message.text}
                  </p>
                  <p
                    className={`text-[10px] mt-1 ${
                      message.sender === "user"
                        ? "text-light-text/50 dark:text-dark-text/50 text-right"
                        : "text-light-text/50 dark:text-dark-text/50"
                    }`}
                  >
                    {message.timestamp}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Message Input - Updated styling */}
        <div className="h-14 flex items-center bg-light-secondary dark:bg-dark-secondary px-4 py-2 border-t border-light-secondary/20 dark:border-dark-secondary/20">
          <input
            type="text"
            placeholder="Type a message..."
            className="flex-1 bg-transparent border-none outline-none text-sm text-light-text dark:text-dark-text placeholder-light-text/50 dark:placeholder-dark-text/50"
          />
          <IconButton
            size="small"
            className="text-light-text/70 dark:text-dark-text/70 hover:bg-light-accent/5 dark:hover:bg-dark-accent/5"
          >
            <FilterList />
          </IconButton>
        </div>
      </div>
    </div>
  );
}

export default ChatSection;
