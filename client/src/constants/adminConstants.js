import { MdDashboard, MdPeople, MdSubscriptions, MdFeedback, MdReportProblem, MdDevices, MdNotifications, MdCheckroom, MdAdminPanelSettings } from "react-icons/md";
import { FaUserTie } from "react-icons/fa";

export const ADMIN_SIDEBAR_ITEMS = [
  { icon: MdDashboard, label: "Dashboard", path: "/admin" },
  { icon: MdPeople, label: "Users", path: "/admin/users" },
  { icon: FaUserTie, label: "Experts", path: "/admin/experts", permission: "canManageExperts" },
  { icon: MdSubscriptions, label: "Subscriptions", path: "/admin/subscriptions", permission: "canManageSubscriptions" },
  { icon: MdFeedback, label: "Feedback", path: "/admin/feedback" },
  { icon: MdReportProblem, label: "Complaints", path: "/admin/complaints" },
  { icon: MdNotifications, label: "Notifications", path: "/admin/notifications", permission: "canSendNotifications" },
  { icon: MdDevices, label: "Sessions", path: "/admin/sessions", permission: "canViewAnalytics" },
  { icon: MdCheckroom, label: "Wardrobe", path: "/admin/wardrobe", permission: "canViewAnalytics" },
  { icon: MdAdminPanelSettings, label: "Admin Team", path: "/admin/team", permission: "canManageAdmins" },
];

// Position hierarchy: agent < operationshead < superadmin
// agent:          Moderation — block users, review experts, send notifications, view reports
// operationshead: Operations — everything agent can + delete users, manage subscriptions
// superadmin:     Owner      — everything + create/deactivate admins, change positions
export const ADMIN_POSITIONS = {
  SUPERADMIN: "superadmin",
  OPERATIONS_HEAD: "operationshead",
  AGENT: "agent",
};

export const ADMIN_POSITION_LABELS = {
  superadmin: "Super Admin",
  operationshead: "Operations Head",
  agent: "Agent",
};

export const ADMIN_PERMISSIONS = [
  "canBlockUsers",
  "canManageExperts",
  "canSendNotifications",
  "canViewAnalytics",
  "canAccessReports",
  "canManageContent",
  "canDeleteUsers",
  "canManageSubscriptions",
  "canManageAdmins",
];

export const ADMIN_TOKEN_KEY = "adminToken";
export const ADMIN_ID_KEY = "adminId";
export const ADMIN_INFO_KEY = "adminInfo";
