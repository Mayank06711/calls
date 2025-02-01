import React from "react";
import { Box, Container,Gritd2, useTheme } from "@mui/material";
import ChatSection from "../Chat/ChatSection";
import VideoCall from "../VideoCall/VideoCall";
import SubscriptionPanel from "../Subscription/SubscriptionPanel";
import NotificationPanel from "../Notifications/NotificationPanel";
import UserProfile from "../User/UserProfile";
import AIAssistant from "../AI/AIAssistant";
import ReelsSection from "../Reels/ReelsSection";

function Home() {
  return <UserProfile />;
}

export default Home;