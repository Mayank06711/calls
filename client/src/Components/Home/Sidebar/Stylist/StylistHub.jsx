import React from "react";
import { motion } from "framer-motion";
import {
  CheckroomOutlined,
  ContentCutOutlined,
  FaceRetouchingNaturalOutlined,
  CelebrationOutlined,
  AutoFixHighOutlined,
  ArrowForward,
  AutoAwesome,
  EventNoteOutlined,
  AccountBalanceWalletOutlined,
  CalendarMonthOutlined,
  EditCalendarOutlined,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { useSubscriptionColors, toRgba } from "../../../../utils/getSubscriptionColors";

const STYLIST_CATEGORIES = [
  {
    key: "clothing",
    icon: <CheckroomOutlined />,
    title: "Clothing Expert",
    description: "Personalized fashion advice, outfit reviews, and style recommendations from certified stylists.",
    path: "/stylist/clothing",
  },
  {
    key: "hair",
    icon: <ContentCutOutlined />,
    title: "Hair Expert",
    description: "Find your ideal hairstyle, get cut recommendations, and hair care tips from professionals.",
    path: "/stylist/hair",
  },
  {
    key: "makeup",
    icon: <FaceRetouchingNaturalOutlined />,
    title: "Makeup Expert",
    description: "Makeup guidance, product picks, and techniques tailored to your features and skin tone.",
    path: "/stylist/makeup",
  },
  {
    key: "wedding",
    icon: <CelebrationOutlined />,
    title: "Wedding & Event",
    description: "Complete event styling for weddings, functions, and special occasions — bridal, groom & guest looks.",
    path: "/stylist/wedding",
  },
  {
    key: "makeover",
    icon: <AutoFixHighOutlined />,
    title: "Complete Makeover",
    description: "Full transformation — clothing, hair, makeup & accessories. Your personal style team, all in one place.",
    path: "/stylist/makeover",
    featured: true,
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4 },
  },
};

function SectionLabel({ label, color }) {
  return (
    <div className="flex items-center gap-3 mb-3">
      <div className="w-1 h-4 rounded-full" style={{ backgroundColor: color }} />
      <span
        className="text-[11px] font-bold uppercase tracking-widest"
        style={{ color: toRgba(color, 0.7) }}
      >
        {label}
      </span>
      <div
        className="flex-1 h-px"
        style={{ background: `linear-gradient(to right, ${toRgba(color, 0.2)}, transparent)` }}
      />
    </div>
  );
}

const QUICK_LINKS = [
  {
    key: "bookings",
    icon: <EventNoteOutlined />,
    title: "My Bookings",
    description: "View upcoming & past sessions",
    path: "/stylist/bookings",
  },
  {
    key: "credits",
    icon: <AccountBalanceWalletOutlined />,
    title: "Credits",
    description: "Buy credits & view transactions",
    path: "/stylist/credits",
  },
];

const EXPERT_LINKS = [
  {
    key: "expert-bookings",
    icon: <CalendarMonthOutlined />,
    title: "Client Bookings",
    description: "Manage your received bookings",
    path: "/expert-bookings",
  },
  {
    key: "expert-schedule",
    icon: <EditCalendarOutlined />,
    title: "My Schedule",
    description: "Set your availability & slots",
    path: "/expert-schedule",
  },
];

function StylistHub() {
  const colors = useSubscriptionColors();
  const navigate = useNavigate();
  const isExpert = useSelector((state) => state.auth.userInfo?.isExpert);

  const featuredCard = STYLIST_CATEGORIES.find((c) => c.featured);
  const regularCards = STYLIST_CATEGORIES.filter((c) => !c.featured);
  const links = isExpert ? EXPERT_LINKS : QUICK_LINKS;

  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      {/* ── Fixed Hero Header ── */}
      <div
        className="flex-shrink-0 relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${toRgba(colors.fourth, 0.08)} 0%, transparent 50%, ${toRgba(colors.fourth, 0.05)} 100%)`,
        }}
      >
        <div
          className="absolute -top-6 -right-6 w-24 h-24 rounded-full blur-2xl"
          style={{ backgroundColor: toRgba(colors.fourth, 0.07) }}
        />

        <div className="relative px-4 sm:px-5 pt-3 pb-2.5">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{
                background: `linear-gradient(135deg, ${colors.fourth}, ${toRgba(colors.fourth, 0.7)})`,
                boxShadow: `0 3px 10px ${toRgba(colors.fourth, 0.25)}`,
              }}
            >
              <AutoAwesome style={{ color: "#fff", fontSize: 20 }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <h2 className="text-base font-bold dark:text-dark-text text-light-text tracking-tight leading-tight">
                  Stylist Hub
                </h2>
                <AutoAwesome style={{ color: colors.fourth, fontSize: 14 }} />
              </div>
              <p className="text-[11px] dark:text-dark-text/40 text-light-text/40 mt-0.5 truncate">
                {isExpert
                  ? "Manage your client sessions and schedule"
                  : "Connect with verified experts for personalized style guidance"}
              </p>
            </div>
          </div>
        </div>

        {/* Quick-access navigation — always visible without scrolling */}
        <div className="px-4 sm:px-5 pb-2.5 flex items-center gap-2 flex-wrap">
          {isExpert ? (
            <>
              <button
                onClick={() => navigate("/expert-bookings")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all hover:scale-[1.03]"
                style={{
                  backgroundColor: toRgba(colors.fourth, 0.1),
                  color: colors.fourth,
                  border: `1px solid ${toRgba(colors.fourth, 0.15)}`,
                }}
              >
                <CalendarMonthOutlined style={{ fontSize: 14 }} />
                Client Bookings
              </button>
              <button
                onClick={() => navigate("/expert-schedule")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all hover:scale-[1.03]"
                style={{
                  backgroundColor: toRgba(colors.fourth, 0.1),
                  color: colors.fourth,
                  border: `1px solid ${toRgba(colors.fourth, 0.15)}`,
                }}
              >
                <EditCalendarOutlined style={{ fontSize: 14 }} />
                My Schedule
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => navigate("/stylist/bookings")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all hover:scale-[1.03]"
                style={{
                  backgroundColor: toRgba(colors.fourth, 0.1),
                  color: colors.fourth,
                  border: `1px solid ${toRgba(colors.fourth, 0.15)}`,
                }}
              >
                <EventNoteOutlined style={{ fontSize: 14 }} />
                My Bookings
              </button>
              <button
                onClick={() => navigate("/stylist/credits")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all hover:scale-[1.03]"
                style={{
                  backgroundColor: toRgba(colors.fourth, 0.1),
                  color: colors.fourth,
                  border: `1px solid ${toRgba(colors.fourth, 0.15)}`,
                }}
              >
                <AccountBalanceWalletOutlined style={{ fontSize: 14 }} />
                Credits
              </button>
            </>
          )}
        </div>

        <div
          className="h-[2px]"
          style={{ background: `linear-gradient(to right, ${colors.fourth}, ${toRgba(colors.fourth, 0.2)}, transparent)` }}
        />
      </div>

      {/* ── Scrollable content ── */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar px-4 sm:px-5 pt-5 pb-6 space-y-6">

        {/* ── Featured: Complete Makeover (users only) ── */}
        {!isExpert && <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <SectionLabel label="Premium" color={colors.fourth} />
          <div
            className="group relative overflow-hidden rounded-2xl cursor-pointer
              transition-all duration-300 hover:scale-[1.02] hover:shadow-xl"
            style={{
              background: `linear-gradient(145deg, ${toRgba(colors.fourth, 0.15)}, ${toRgba(colors.fourth, 0.05)})`,
              border: `1px solid ${toRgba(colors.fourth, 0.25)}`,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = toRgba(colors.fourth, 0.5);
              e.currentTarget.style.boxShadow = `0 8px 24px ${toRgba(colors.fourth, 0.15)}`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = toRgba(colors.fourth, 0.25);
              e.currentTarget.style.boxShadow = "none";
            }}
            onClick={() => navigate(featuredCard.path)}
          >
            <div
              className="absolute -top-0 right-4 px-3 py-0.5 rounded-b-lg text-[10px] font-bold text-white tracking-wide"
              style={{ backgroundColor: colors.fourth }}
            >
              RECOMMENDED
            </div>

            <div className="absolute -bottom-3 -right-3 opacity-[0.04] group-hover:opacity-[0.08] transition-opacity duration-500">
              {React.cloneElement(featuredCard.icon, { style: { fontSize: 120 } })}
            </div>

            <div
              className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl"
              style={{ background: `linear-gradient(90deg, ${colors.fourth}, ${toRgba(colors.fourth, 0.3)})` }}
            />

            <div className="relative p-5 flex flex-col gap-2.5">
              <div className="flex items-start justify-between">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{
                    background: `linear-gradient(135deg, ${toRgba(colors.fourth, 0.2)}, ${toRgba(colors.fourth, 0.08)})`,
                    boxShadow: `0 2px 8px ${toRgba(colors.fourth, 0.15)}`,
                  }}
                >
                  {React.cloneElement(featuredCard.icon, {
                    style: { color: colors.fourth, fontSize: 26 },
                  })}
                </div>
                <ArrowForward
                  className="opacity-0 group-hover:opacity-60 transition-all duration-300 group-hover:translate-x-0.5"
                  style={{ color: colors.fourth, fontSize: 18 }}
                />
              </div>
              <div>
                <h3 className="text-sm font-bold dark:text-dark-text text-light-text">
                  {featuredCard.title}
                </h3>
                <p className="text-xs dark:text-dark-text/55 text-light-text/55 mt-0.5">
                  {featuredCard.description}
                </p>
              </div>
            </div>

            <div
              className="absolute -bottom-6 -right-6 w-24 h-24 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-2xl"
              style={{ backgroundColor: toRgba(colors.fourth, 0.15) }}
            />
          </div>
        </motion.section>}

        {/* ── Expert Categories (users only) ── */}
        {!isExpert && <section>
          <SectionLabel label="Find Your Expert" color={colors.fourth} />
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 gap-3"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {regularCards.map((card) => (
              <motion.div key={card.key} variants={itemVariants}>
                <div
                  className="group relative overflow-hidden rounded-2xl backdrop-blur-md
                    dark:bg-dark-primary bg-light-secondary
                    cursor-pointer transition-all duration-300 hover:scale-[1.03] hover:shadow-lg"
                  style={{ border: `1px solid ${toRgba(colors.fourth, 0.15)}` }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = toRgba(colors.fourth, 0.4);
                    e.currentTarget.style.boxShadow = `0 6px 20px ${toRgba(colors.fourth, 0.12)}`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = toRgba(colors.fourth, 0.15);
                    e.currentTarget.style.boxShadow = "none";
                  }}
                  onClick={() => navigate(card.path)}
                >
                  <div
                    className="absolute top-0 left-0 right-0 h-[2px] opacity-40 group-hover:opacity-100 transition-opacity duration-300"
                    style={{ background: `linear-gradient(90deg, ${colors.fourth}, transparent)` }}
                  />

                  <div className="absolute -bottom-2 -right-2 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity duration-500">
                    {React.cloneElement(card.icon, { style: { fontSize: 80 } })}
                  </div>

                  <div className="relative p-4 flex flex-col gap-2">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center
                        group-hover:scale-110 transition-transform duration-300"
                      style={{
                        background: `linear-gradient(135deg, ${toRgba(colors.fourth, 0.15)}, ${toRgba(colors.fourth, 0.06)})`,
                      }}
                    >
                      {React.cloneElement(card.icon, {
                        style: { color: colors.fourth, fontSize: 20 },
                      })}
                    </div>
                    <h3 className="text-sm font-semibold dark:text-dark-text/90 text-light-text/90 group-hover:dark:text-dark-text group-hover:text-light-text transition-colors">
                      {card.title}
                    </h3>
                    <p className="text-xs dark:text-dark-text/50 text-light-text/50 leading-relaxed">
                      {card.description}
                    </p>
                  </div>

                  <div
                    className="absolute -bottom-3 -right-3 w-16 h-16 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl"
                    style={{ backgroundColor: toRgba(colors.fourth, 0.1) }}
                  />
                </div>
              </motion.div>
            ))}
          </motion.div>
        </section>}

        {/* ── Quick Links: Bookings & Credits ── */}
        <section>
          <SectionLabel label={isExpert ? "Manage" : "Your Account"} color={colors.fourth} />
          <motion.div
            className="grid grid-cols-2 gap-3"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {links.map((link) => (
              <motion.div key={link.key} variants={itemVariants}>
                <div
                  className="group relative overflow-hidden rounded-2xl backdrop-blur-md
                    dark:bg-dark-primary bg-light-secondary
                    cursor-pointer transition-all duration-300 hover:scale-[1.03] hover:shadow-lg"
                  style={{ border: `1px solid ${toRgba(colors.fourth, 0.15)}` }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = toRgba(colors.fourth, 0.4);
                    e.currentTarget.style.boxShadow = `0 4px 16px ${toRgba(colors.fourth, 0.12)}`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = toRgba(colors.fourth, 0.15);
                    e.currentTarget.style.boxShadow = "none";
                  }}
                  onClick={() => navigate(link.path)}
                >
                  <div
                    className="absolute top-0 left-0 right-0 h-[2px] opacity-40 group-hover:opacity-100 transition-opacity duration-300"
                    style={{ background: `linear-gradient(90deg, ${colors.fourth}, transparent)` }}
                  />
                  <div className="relative p-3.5 flex flex-col gap-2">
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center
                        group-hover:scale-110 transition-transform duration-300"
                      style={{
                        background: `linear-gradient(135deg, ${toRgba(colors.fourth, 0.15)}, ${toRgba(colors.fourth, 0.06)})`,
                      }}
                    >
                      {React.cloneElement(link.icon, {
                        style: { color: colors.fourth, fontSize: 18 },
                      })}
                    </div>
                    <h3 className="text-[13px] font-semibold dark:text-dark-text/90 text-light-text/90 leading-tight">
                      {link.title}
                    </h3>
                    <p className="text-[11px] dark:text-dark-text/45 text-light-text/45 leading-snug">
                      {link.description}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </section>
      </div>
    </div>
  );
}

export default StylistHub;
