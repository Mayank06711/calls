import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Login from "../Login/Login";
import KYFLogo from "../../assets/KYF_Logo.png";

/* ── Feature data ───────────────────────────────────────────────────────────── */
const FEATURES = [
  {
    icon: "🤖",
    title: "AI Outfit Suggestions",
    desc: "Get complete outfit recommendations for any occasion — casual, office, party, date night and more.",
    gradient: "from-green-400 to-emerald-500",
  },
  {
    icon: "👗",
    title: "Digital Wardrobe",
    desc: "Snap a photo and we auto-detect colors, categorize items, and remove backgrounds instantly.",
    gradient: "from-emerald-400 to-teal-500",
  },
  {
    icon: "💬",
    title: "Expert Stylists",
    desc: "Chat with real fashion experts for personalized style advice, trend guidance, and wardrobe audits.",
    gradient: "from-teal-400 to-cyan-500",
  },
  {
    icon: "🎨",
    title: "Color Intelligence",
    desc: "949-color palette analysis ensures your outfits are color-coordinated and seasonally appropriate.",
    gradient: "from-cyan-400 to-blue-500",
  },
  {
    icon: "📸",
    title: "Flat-Lay Generator",
    desc: "See AI-generated flat-lay images of your outfits before you wear them — share-ready visuals.",
    gradient: "from-violet-400 to-purple-500",
  },
  {
    icon: "📊",
    title: "Style Profile",
    desc: "Build your unique style DNA through our quiz. We learn your preferences and improve over time.",
    gradient: "from-pink-400 to-rose-500",
  },
];

const STATS = [
  { value: "500+", label: "Happy Users", icon: "👥" },
  { value: "4.8", label: "User Rating", icon: "⭐" },
  { value: "10+", label: "Expert Stylists", icon: "👩‍🎨" },
  { value: "Free", label: "To Get Started", icon: "🚀" },
];

/* ── Rotating headline words ───────────────────────────────────────────────── */
const ROTATING_WORDS = [
  { text: "Casual Day", color: "#059212" },
  { text: "Office Meeting", color: "#0d9488" },
  { text: "Date Night", color: "#e11d48" },
  { text: "Weekend Brunch", color: "#d97706" },
  { text: "Party Night", color: "#7c3aed" },
  { text: "Wedding", color: "#be185d" },
];

function RotatingWord() {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % ROTATING_WORDS.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <span className="inline-grid align-bottom">
      {/* All words stacked in same grid cell — invisible ones size the container to the widest */}
      {ROTATING_WORDS.map((w) => (
        <span
          key={w.text}
          className="invisible"
          style={{ gridColumn: 1, gridRow: 1 }}
          aria-hidden="true"
        >
          {w.text}
        </span>
      ))}
      {/* Visible rotating word in same cell */}
      <AnimatePresence mode="wait">
        <motion.span
          key={ROTATING_WORDS[index].text}
          style={{ gridColumn: 1, gridRow: 1, color: ROTATING_WORDS[index].color }}
          initial={{ y: 30, opacity: 0, rotateX: -90 }}
          animate={{ y: 0, opacity: 1, rotateX: 0 }}
          exit={{ y: -30, opacity: 0, rotateX: 90 }}
          transition={{ duration: 0.4, ease: "easeInOut" }}
        >
          {ROTATING_WORDS[index].text}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

/* ── Why KYF accordion item ────────────────────────────────────────────────── */
function WhyKYFItem({ item, index }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      className="rounded-2xl bg-white border border-gray-100 overflow-hidden hover:border-green-200 transition-colors"
      initial={{ opacity: 0, y: 15 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1, duration: 0.4 }}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-4 p-4 sm:p-5 text-left"
      >
        <span className="text-2xl shrink-0">{item.icon}</span>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm sm:text-base font-semibold text-gray-900">{item.title}</h3>
          <p className="text-xs text-gray-400 mt-0.5">{item.summary}</p>
        </div>
        <motion.svg
          className="w-5 h-5 text-gray-300 shrink-0"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <path d="M19 9l-7 7-7-7" />
        </motion.svg>
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <p className="px-4 sm:px-5 pb-4 sm:pb-5 pl-[60px] sm:pl-[68px] text-xs sm:text-sm text-gray-500 leading-relaxed">
              {item.detail}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ── Floating outfit cards (right side of hero) ───────────────────────────── */
const FLOAT_CARDS = [
  { emoji: "👔", label: "Shirts", x: 10, y: 20, delay: 0 },
  { emoji: "👖", label: "Jeans", x: 55, y: 55, delay: 0.3 },
  { emoji: "👟", label: "Sneakers", x: 15, y: 75, delay: 0.6 },
  { emoji: "🧥", label: "Jackets", x: 60, y: 10, delay: 0.9 },
  { emoji: "👜", label: "Bags", x: 70, y: 80, delay: 0.4 },
];

/* ── Testimonial data ──────────────────────────────────────────────────────── */
const TESTIMONIALS = [
  {
    name: "Ananya R.",
    location: "Mumbai",
    role: "Marketing Professional",
    quote: "KYF completely changed how I get dressed for work. The AI suggestions are spot-on for my body type and the flat-lay previews save me so much time every morning.",
    rating: 5,
  },
  {
    name: "Rohit M.",
    location: "Bangalore",
    role: "Software Engineer",
    quote: "I never thought I needed a style app until I tried KYF. The color intelligence feature is incredible — it taught me which colors actually work together.",
    rating: 5,
  },
  {
    name: "Priya K.",
    location: "Delhi",
    role: "Freelance Designer",
    quote: "The expert chat feature is what sets KYF apart. Getting real advice from actual stylists, not just AI, made all the difference for my wedding shopping.",
    rating: 5,
  },
  {
    name: "Arjun S.",
    location: "Pune",
    role: "Business Analyst",
    quote: "Uploaded my entire wardrobe in one evening. Now I get outfit suggestions in under 2 seconds. The digital closet is a game-changer.",
    rating: 4,
  },
  {
    name: "Meera T.",
    location: "Chennai",
    role: "College Student",
    quote: "As a student on a budget, KYF helps me make the most of the clothes I already have. Love the occasion-based suggestions!",
    rating: 5,
  },
];

/* ── Expert showcase data ─────────────────────────────────────────────────── */
const EXPERTS = [
  {
    name: "Priya S.",
    title: "Fashion Consultant",
    specializations: ["Personal Styling", "Bridal & Wedding"],
    experience: "8+ years",
    accentColor: "#059212",
    tagline: "Helping you find your signature look",
  },
  {
    name: "Vikram R.",
    title: "Wardrobe Consultant",
    specializations: ["Men's Fashion", "Corporate & Workwear"],
    experience: "5+ years",
    accentColor: "#0d9488",
    tagline: "Dress for the career you want",
  },
  {
    name: "Neha M.",
    title: "Color Analyst",
    specializations: ["Color & Image Analysis", "Ethnic & Traditional"],
    experience: "6+ years",
    accentColor: "#7c3aed",
    tagline: "Colors that celebrate your skin tone",
  },
  {
    name: "Arjun D.",
    title: "Trend Stylist",
    specializations: ["Streetwear & Trends", "Sustainable Fashion"],
    experience: "4+ years",
    accentColor: "#d97706",
    tagline: "Sustainable style that turns heads",
  },
];

/* ── Why KYF trust data ───────────────────────────────────────────────────── */
const WHY_KYF = [
  {
    icon: "🔒",
    title: "Your Data, Your Control",
    summary: "Photos stay private. We never share your wardrobe data.",
    detail: "All wardrobe photos are stored securely on our cloud with encryption. We never sell or share your personal style data with third parties. You can delete your entire wardrobe at any time.",
  },
  {
    icon: "💰",
    title: "No Hidden Costs",
    summary: "Free tier is genuinely free. Upgrade only when you want more.",
    detail: "Our free plan includes full AI outfit suggestions, digital wardrobe management, and basic color analysis. Premium plans add expert chat, advanced analytics, and priority generation. No credit card needed to start.",
  },
  {
    icon: "🤝",
    title: "Real Experts, Not Bots",
    summary: "Every stylist is verified with professional credentials.",
    detail: "Expert stylists go through a multi-step verification process including credential checks, portfolio review, and specialization validation. You can see their ratings, experience, and specializations before chatting.",
  },
  {
    icon: "⚡",
    title: "AI That Actually Works",
    summary: "949-color recognition, 11 occasions, under 2 seconds.",
    detail: "Our AI uses CIEDE2000 color-difference algorithms with 949 reference colors for precise color matching. Outfit generation considers color harmony, occasion appropriateness, seasonal relevance, and your personal style DNA.",
  },
];

/* ── How it works steps ─────────────────────────────────────────────────────── */
const STEPS = [
  { num: "1", icon: "📷", title: "Upload Your Closet", desc: "Snap photos of your clothes. AI removes backgrounds & detects colors automatically.", accent: "from-green-400 to-emerald-500" },
  { num: "2", icon: "🎯", title: "Pick an Occasion", desc: "Select from 11 occasions — Casual, Office, Party, Date Night, Wedding, and more.", accent: "from-emerald-400 to-teal-500" },
  { num: "3", icon: "✨", title: "Get Styled Instantly", desc: "AI generates complete outfits with flat-lay visuals. Save favorites & track your style.", accent: "from-teal-400 to-cyan-500" },
];

/* ── Main Component ─────────────────────────────────────────────────────────── */
function LandingPage() {
  const [showLogin, setShowLogin] = useState(false);
  const dismissedRef = React.useRef(false);

  // Auto-show login popup once after 5 seconds (skip if user already dismissed)
  useEffect(() => {
    if (dismissedRef.current) return;
    const timer = setTimeout(() => {
      if (!dismissedRef.current) setShowLogin(true);
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  const handleCloseLogin = () => {
    dismissedRef.current = true;
    setShowLogin(false);
  };

  return (
    <div className="relative w-full min-h-screen overflow-y-auto overflow-x-hidden bg-white">
      {/* ── HERO SECTION ──────────────────────────────────────────────────── */}
      <section className="relative min-h-0 lg:min-h-screen flex flex-col overflow-hidden">
        {/* Animated mesh gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-green-50 via-white to-emerald-50" />
        <motion.div
          className="absolute w-[600px] h-[600px] bg-green-200/30 rounded-full blur-[100px]"
          style={{ top: "-10%", right: "-5%" }}
          animate={{ x: [0, 30, 0], y: [0, -20, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute w-[500px] h-[500px] bg-emerald-200/25 rounded-full blur-[100px]"
          style={{ bottom: "-15%", left: "-10%" }}
          animate={{ x: [0, -25, 0], y: [0, 30, 0], scale: [1, 1.15, 1] }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute w-[300px] h-[300px] bg-teal-100/30 rounded-full blur-[80px]"
          style={{ top: "40%", left: "30%" }}
          animate={{ x: [0, 40, 0], y: [0, -30, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
        {/* Subtle dot grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: "radial-gradient(circle, #059212 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />

        {/* ── Navbar ────────────────────────────────────────────────────────── */}
        <motion.nav
          className="relative z-20 w-full px-5 sm:px-8 py-4 sm:py-5"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            {/* Left — Logo + brand */}
            <div className="flex items-center gap-2.5">
              <img src={KYFLogo} alt="KYF" className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg shadow-sm" />
              <span className="text-base sm:text-lg font-bold text-gray-900 tracking-tight">
                Know Your Fashion
              </span>
            </div>

            {/* Right — CTA */}
            <motion.button
              onClick={() => setShowLogin(true)}
              className="px-5 sm:px-6 py-2 sm:py-2.5 rounded-xl text-white font-semibold text-sm"
              style={{ background: "linear-gradient(135deg, #059212, #06D001)" }}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
            >
              Get Started
            </motion.button>
          </div>
        </motion.nav>

        {/* Hero content — split layout (centered on desktop, compact on mobile) */}
        <div className="py-6 sm:py-0 sm:flex-1 sm:flex sm:items-center sm:pb-20">
        <div className="relative z-10 w-full max-w-6xl mx-auto px-5 flex flex-col lg:flex-row items-center gap-6 lg:gap-16">

          {/* Left — text content */}
          <div className="flex-1 text-center lg:text-left max-w-xl lg:max-w-none">

            {/* Headline with rotating word */}
            <motion.h1
              className="text-3xl sm:text-4xl md:text-5xl lg:text-[3.4rem] font-extrabold text-gray-900 leading-[1.15] mb-3 sm:mb-5"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.7 }}
            >
              Know What to Wear
              <br />
              for Your Next <RotatingWord />
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              className="text-sm sm:text-base md:text-lg text-gray-500 max-w-md mb-5 sm:mb-8 leading-relaxed mx-auto lg:mx-0"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
            >
              Upload your closet, get AI-styled outfits in seconds,
              and chat with real fashion experts — all in one place.
            </motion.p>

            {/* CTAs */}
            <motion.div
              className="flex flex-col sm:flex-row items-center lg:items-start gap-3 mb-3 sm:mb-4"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6, type: "spring", stiffness: 200 }}
            >
              <motion.button
                onClick={() => setShowLogin(true)}
                className="group relative px-8 sm:px-10 py-3 sm:py-3.5 rounded-2xl text-white font-semibold text-base sm:text-lg overflow-hidden"
                style={{ background: "linear-gradient(135deg, #059212, #06D001)" }}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
              >
                <span className="relative z-10">Get Started — It's Free</span>
                <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </motion.button>
              <motion.button
                onClick={() => setShowLogin(true)}
                className="group px-6 sm:px-8 py-3 sm:py-3.5 rounded-2xl font-semibold text-sm sm:text-base border-2 border-green-200 text-green-700 bg-green-50/50 hover:bg-green-100/60 transition-colors"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                <span className="mr-1.5">📊</span> Take Style Quiz
              </motion.button>
            </motion.div>
            <motion.button
              type="button"
              onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}
              className="text-sm font-medium text-gray-500 hover:text-green-600 transition-colors underline underline-offset-4 mb-5 sm:mb-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
            >
              See how it works
            </motion.button>

            {/* Glass stat cards — desktop/tablet only */}
            <motion.div
              className="hidden sm:flex flex-wrap justify-center lg:justify-start gap-3"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1, duration: 0.8 }}
            >
              {STATS.map((s, i) => (
                <motion.div
                  key={i}
                  className="px-4 py-2.5 rounded-2xl bg-white/60 backdrop-blur-sm border border-white/80 shadow-sm hover:shadow-md transition-shadow"
                  whileHover={{ y: -2 }}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm">{s.icon}</span>
                    <p className="text-lg font-bold text-green-600 leading-tight">{s.value}</p>
                  </div>
                  <p className="text-[10px] text-gray-400 leading-tight">{s.label}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>

          {/* Mobile — 2×2 bento stat grid */}
          <motion.div
            className="sm:hidden grid grid-cols-2 gap-2.5 w-full max-w-xs mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1, duration: 0.7 }}
          >
            {STATS.map((s, i) => (
              <div key={i} className={`rounded-2xl backdrop-blur-sm shadow-sm p-3 text-center ${i === 3 ? "bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-200/60" : "bg-white/60 border border-white/80"}`}>
                <span className="text-2xl leading-none">{s.icon}</span>
                <p className="text-lg font-bold text-green-600 leading-tight mt-0.5">{s.value}</p>
                <p className="text-[9px] text-gray-400">{s.label}</p>
              </div>
            ))}
          </motion.div>

          {/* Right — floating outfit cards (hidden on mobile) */}
          <motion.div
            className="hidden lg:block relative w-[340px] h-[400px] shrink-0"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5, duration: 0.8 }}
          >
            {FLOAT_CARDS.map((card, i) => (
              <motion.div
                key={card.label}
                className="absolute w-[100px] h-[100px] rounded-2xl bg-white/70 backdrop-blur-md border border-white/80 shadow-lg flex flex-col items-center justify-center gap-1 cursor-default"
                style={{ left: `${card.x}%`, top: `${card.y}%` }}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.8 + card.delay, type: "spring", stiffness: 200 }}
                whileHover={{ scale: 1.1, rotate: 3 }}
              >
                <motion.span
                  className="text-3xl"
                  animate={{ y: [0, -4, 0] }}
                  transition={{ duration: 3, delay: i * 0.5, repeat: Infinity, ease: "easeInOut" }}
                >
                  {card.emoji}
                </motion.span>
                <span className="text-[10px] font-medium text-gray-500">{card.label}</span>
              </motion.div>
            ))}
            {/* Central connecting glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 bg-green-400/20 rounded-full blur-xl" />
            {/* AI badge in center */}
            <motion.div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center shadow-xl shadow-green-500/30"
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            >
              <span className="text-white font-bold text-xs" style={{ transform: "rotate(0deg)" }}>AI</span>
            </motion.div>
          </motion.div>
        </div>
        </div>

        {/* Scroll indicator (desktop only) */}
        <motion.div
          className="hidden lg:block absolute bottom-6 left-1/2 -translate-x-1/2"
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-300">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </motion.div>
      </section>

      {/* ── TRUST LOGOS STRIP ────────────────────────────────────────────── */}
      <div className="py-5 sm:py-6 px-4 sm:px-5 bg-gray-50/50 border-y border-gray-100/80">
        <div className="max-w-5xl mx-auto">
          <p className="text-center text-[10px] sm:text-xs text-gray-300 uppercase tracking-widest mb-3 font-medium">
            Powered By
          </p>
          <div className="flex items-center justify-center gap-6 sm:gap-10 flex-wrap opacity-40 grayscale hover:opacity-60 hover:grayscale-0 transition-all duration-500">
            {["React", "MongoDB", "TensorFlow", "Cloudinary", "Razorpay"].map((name, i) => (
              <motion.span
                key={name}
                className="text-sm sm:text-base font-bold text-gray-400 tracking-tight"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                {name}
              </motion.span>
            ))}
          </div>
        </div>
      </div>

      {/* ── FEATURES SECTION — Bento Grid ────────────────────────────────── */}
      <section id="features" className="pt-8 sm:pt-14 pb-8 sm:pb-14 px-4 sm:px-5 bg-gray-50/50">
        <div className="max-w-5xl mx-auto">
          <motion.div
            className="text-center mb-6 sm:mb-10"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-3">
              Everything You Need to{" "}
              <span className="text-green-600">Dress Better</span>
            </h2>
            <p className="text-sm sm:text-base text-gray-500 max-w-lg mx-auto">
              From AI styling to expert consultations — your complete fashion companion
            </p>
          </motion.div>

          {/* Bento grid — asymmetric, magazine-style */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 auto-rows-auto sm:auto-rows-[180px]">

            {/* ─ Card 1: AI Outfit Suggestions — HERO card, 2-col span ─ */}
            <motion.div
              className="relative col-span-1 sm:col-span-2 sm:row-span-2 rounded-3xl overflow-hidden bg-gradient-to-br from-green-600 via-emerald-600 to-teal-600 p-5 sm:p-8 flex flex-col justify-between group cursor-default"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              whileHover={{ scale: 1.01 }}
            >
              {/* Decorative circles */}
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-md group-hover:scale-125 transition-transform duration-700" />
              <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-white/5 rounded-full" />
              <div>
                <span className="inline-block text-xs font-semibold text-white/70 bg-white/10 backdrop-blur-sm px-3 py-1 rounded-full mb-3">POWERED BY AI</span>
                <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">AI Outfit Suggestions</h3>
                <p className="text-sm text-white/75 max-w-xs leading-relaxed">
                  Complete outfit recommendations for any occasion — casual, office, party, date night and more.
                </p>
              </div>
              {/* Mini outfit preview */}
              <div className="flex items-end gap-2 mt-3">
                {["👔", "👖", "👞", "🧥"].map((e, i) => (
                  <motion.div
                    key={i}
                    className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center text-lg sm:text-xl border border-white/10"
                    initial={{ y: 20, opacity: 0 }}
                    whileInView={{ y: 0, opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.3 + i * 0.1, duration: 0.4 }}
                  >
                    {e}
                  </motion.div>
                ))}
                <motion.div
                  className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-white/25 backdrop-blur-sm flex items-center justify-center text-white font-bold text-xs border border-white/20"
                  initial={{ y: 20, opacity: 0 }}
                  whileInView={{ y: 0, opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.7, duration: 0.4 }}
                >
                  +AI
                </motion.div>
              </div>
            </motion.div>

            {/* ─ Card 2: Digital Wardrobe — top-right ─ */}
            <motion.div
              className="relative col-span-1 sm:col-span-2 lg:col-span-2 rounded-3xl overflow-hidden bg-white border border-gray-100 p-5 sm:p-6 group cursor-default hover:border-emerald-200 transition-colors"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1, duration: 0.5 }}
              whileHover={{ y: -3 }}
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-emerald-50 to-transparent rounded-bl-full" />
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-xl shadow-sm shrink-0">
                  👗
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-1">Digital Wardrobe</h3>
                  <p className="text-xs sm:text-sm text-gray-500 leading-relaxed">
                    Snap a photo and we auto-detect colors, categorize items, and remove backgrounds instantly.
                  </p>
                </div>
              </div>
              {/* Mini upload animation hint */}
              <div className="flex gap-1.5 mt-3 ml-[60px]">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="w-8 h-10 rounded-lg bg-gray-50 border border-dashed border-gray-200 group-hover:border-emerald-300 transition-colors flex items-center justify-center">
                    <span className="text-[10px] text-gray-300 group-hover:text-emerald-400 transition-colors">+</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* ─ Card 3: Color Intelligence — visual with color dots ─ */}
            <motion.div
              className="relative col-span-1 lg:col-span-2 rounded-3xl overflow-hidden bg-white border border-gray-100 p-5 sm:p-6 group cursor-default hover:border-cyan-200 transition-colors"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2, duration: 0.5 }}
              whileHover={{ y: -3 }}
            >
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-xl shadow-sm shrink-0">
                  🎨
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-1">Color Intelligence</h3>
                  <p className="text-xs sm:text-sm text-gray-500 leading-relaxed">
                    949-color palette analysis ensures perfectly color-coordinated outfits.
                  </p>
                </div>
              </div>
              {/* Color swatch row */}
              <div className="flex items-center gap-1.5 mt-3 ml-[60px] flex-wrap">
                {["#1e3a5f", "#8b2252", "#d4a017", "#2e8b57", "#cc5500", "#4a90d9", "#9b59b6", "#e74c3c", "#1abc9c"].map((c, i) => (
                  <motion.div
                    key={c}
                    className="w-5 h-5 sm:w-6 sm:h-6 rounded-full shadow-sm border border-white ring-1 ring-black/5"
                    style={{ backgroundColor: c }}
                    initial={{ scale: 0 }}
                    whileInView={{ scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.4 + i * 0.05, type: "spring", stiffness: 300 }}
                    whileHover={{ scale: 1.35, zIndex: 10 }}
                  />
                ))}
                <span className="text-[10px] text-gray-400 ml-1">+940</span>
              </div>
            </motion.div>

            {/* ─ Card 4: Expert Stylists — with chat bubble ─ */}
            <motion.div
              className="relative col-span-1 rounded-3xl overflow-hidden bg-gradient-to-br from-gray-900 to-gray-800 p-5 sm:p-6 group cursor-default"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3, duration: 0.5 }}
              whileHover={{ y: -3 }}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">💬</span>
                <h3 className="text-sm sm:text-base font-semibold text-white">Expert Stylists</h3>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed mb-3">
                Chat with real fashion experts for personalized advice.
              </p>
              {/* Mini chat bubble */}
              <div className="bg-white/10 backdrop-blur-sm rounded-xl rounded-tl-sm px-3 py-2 max-w-[90%]">
                <p className="text-[10px] text-white/80 italic">"Try tan loafers with that navy blazer"</p>
              </div>
              <span className="absolute bottom-3 right-4 w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            </motion.div>

            {/* ─ Card 5: Flat-Lay Generator ─ */}
            <motion.div
              className="relative col-span-1 rounded-3xl overflow-hidden bg-white border border-gray-100 p-5 sm:p-6 group cursor-default hover:border-violet-200 transition-colors"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.35, duration: 0.5 }}
              whileHover={{ y: -3 }}
            >
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center text-xl shadow-sm mb-2">
                📸
              </div>
              <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-1">Flat-Lay Generator</h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                AI-generated flat-lay images of your outfits — share-ready visuals.
              </p>
              {/* Decorative frame */}
              <div className="absolute bottom-3 right-3 w-12 h-12 rounded-lg border-2 border-dashed border-violet-200 group-hover:border-violet-400 transition-colors flex items-center justify-center">
                <span className="text-[10px] text-violet-300 group-hover:text-violet-500 transition-colors">IMG</span>
              </div>
            </motion.div>

            {/* ─ Card 6: Style Profile — wide bottom card ─ */}
            <motion.div
              className="relative col-span-1 sm:col-span-2 rounded-3xl overflow-hidden bg-gradient-to-r from-green-50 via-emerald-50 to-teal-50 border border-green-100 p-5 sm:p-6 group cursor-default"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4, duration: 0.5 }}
              whileHover={{ y: -3 }}
            >
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center text-xl shadow-sm shrink-0">
                  📊
                </div>
                <div className="flex-1">
                  <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-1">Style Profile</h3>
                  <p className="text-xs sm:text-sm text-gray-500 leading-relaxed">
                    Build your unique style DNA through our quiz. We learn your preferences and improve over time.
                  </p>
                </div>
              </div>
              {/* Style DNA bar visualization */}
              <div className="flex items-center gap-1 mt-3 ml-[60px]">
                {[40, 65, 30, 85, 55, 70, 45, 90, 35, 60, 75, 50].map((h, i) => (
                  <motion.div
                    key={i}
                    className="flex-1 rounded-full bg-gradient-to-t from-green-400 to-emerald-300"
                    style={{ maxWidth: 8 }}
                    initial={{ height: 0 }}
                    whileInView={{ height: `${h * 0.35}px` }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.5 + i * 0.04, duration: 0.5, ease: "easeOut" }}
                  />
                ))}
                <span className="text-[10px] text-green-500 font-medium ml-2">Your DNA</span>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS SECTION ─────────────────────────────────────────── */}
      <section className="py-8 sm:py-14 px-4 sm:px-5 bg-white overflow-hidden">
        <div className="max-w-5xl mx-auto">
          <motion.div
            className="text-center mb-6 sm:mb-10"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-block text-xs font-semibold text-green-600 bg-green-50 px-3 py-1 rounded-full mb-3">
              LOVED BY USERS
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900">
              What Our <span className="text-green-600">Users Say</span>
            </h2>
          </motion.div>

          <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide md:grid md:grid-cols-3 md:overflow-visible md:pb-0">
            {TESTIMONIALS.slice(0, 3).map((t, i) => (
              <motion.div
                key={i}
                className="min-w-[280px] md:min-w-0 snap-center flex-shrink-0 md:flex-shrink bg-gray-50 rounded-3xl p-5 sm:p-6 border border-gray-100 hover:border-green-200 transition-colors"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15, duration: 0.5 }}
                whileHover={{ y: -3 }}
              >
                {/* Star rating */}
                <div className="flex gap-0.5 mb-3">
                  {Array.from({ length: 5 }, (_, j) => (
                    <svg
                      key={j}
                      className={`w-4 h-4 ${j < t.rating ? "text-yellow-400" : "text-gray-200"}`}
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>

                <p className="text-sm text-gray-600 leading-relaxed mb-4 line-clamp-4">
                  &ldquo;{t.quote}&rdquo;
                </p>

                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                    {t.name.split(" ").map((n) => n[0]).join("")}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{t.name}</p>
                    <p className="text-[10px] text-gray-400">{t.role} &middot; {t.location}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div
            className="mt-6 text-center"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.5 }}
          >
            <p className="text-xs text-gray-400">
              Rated <span className="font-semibold text-green-600">4.8/5</span> by 500+ users
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── EXPERT SHOWCASE ──────────────────────────────────────────────── */}
      <section className="py-8 sm:py-14 px-4 sm:px-5 bg-gray-50/50">
        <div className="max-w-5xl mx-auto">
          <motion.div
            className="text-center mb-6 sm:mb-10"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-block text-xs font-semibold text-green-600 bg-green-50 px-3 py-1 rounded-full mb-3">
              REAL EXPERTS
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900">
              Meet Your <span className="text-green-600">Style Experts</span>
            </h2>
            <p className="text-sm sm:text-base text-gray-500 max-w-lg mx-auto mt-2">
              Certified fashion professionals ready to transform your wardrobe
            </p>
          </motion.div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {EXPERTS.map((expert, i) => (
              <motion.div
                key={i}
                className="relative rounded-3xl bg-white border border-gray-100 p-4 sm:p-5 text-center group cursor-default hover:border-green-200 transition-colors overflow-hidden"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                whileHover={{ y: -4 }}
              >
                <div
                  className="absolute top-0 left-0 right-0 h-1 rounded-t-3xl"
                  style={{ background: `linear-gradient(90deg, ${expert.accentColor}, ${expert.accentColor}88)` }}
                />
                <div
                  className="w-14 h-14 sm:w-16 sm:h-16 rounded-full mx-auto mb-3 flex items-center justify-center text-white font-bold text-lg sm:text-xl shadow-lg"
                  style={{ background: `linear-gradient(135deg, ${expert.accentColor}, ${expert.accentColor}cc)` }}
                >
                  {expert.name.split(" ").map((n) => n[0]).join("")}
                </div>
                <h3 className="text-sm sm:text-base font-semibold text-gray-900">{expert.name}</h3>
                <p className="text-[10px] sm:text-xs text-gray-400 mb-2">{expert.title} &middot; {expert.experience}</p>
                <p className="text-[10px] text-gray-500 italic mb-3 leading-relaxed">&ldquo;{expert.tagline}&rdquo;</p>
                <div className="flex flex-wrap justify-center gap-1">
                  {expert.specializations.map((spec, j) => (
                    <span key={j} className="text-[9px] px-2 py-0.5 rounded-full bg-gray-50 text-gray-500 border border-gray-100">
                      {spec}
                    </span>
                  ))}
                </div>
                <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              </motion.div>
            ))}
          </div>

          <motion.p
            className="text-center text-xs text-gray-400 mt-6"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            All experts are verified fashion professionals with relevant certifications
          </motion.p>
        </div>
      </section>

      {/* ── HOW IT WORKS — Connected Timeline ─────────────────────────────── */}
      <section className="pt-6 sm:pt-8 pb-8 sm:pb-16 px-4 sm:px-5 bg-white overflow-hidden">
        <div className="max-w-5xl mx-auto">
          <motion.div
            className="text-center mb-6 sm:mb-10"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-block text-xs font-semibold text-green-600 bg-green-50 px-3 py-1 rounded-full mb-3">HOW IT WORKS</span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900">
              Styled in <span className="text-green-600">3 Simple Steps</span>
            </h2>
          </motion.div>

          <div className="relative">
            {/* Connecting line (hidden on mobile) */}
            <div className="hidden md:block absolute top-14 left-[16.67%] right-[16.67%] h-0.5">
              <motion.div
                className="h-full bg-gradient-to-r from-green-300 via-emerald-300 to-teal-300 rounded-full"
                initial={{ scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3, duration: 0.8, ease: "easeOut" }}
                style={{ transformOrigin: "left" }}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8">
              {STEPS.map((step, i) => (
                <motion.div
                  key={i}
                  className="relative flex flex-row md:flex-col items-start md:items-center text-left md:text-center group gap-4 md:gap-0"
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.2, duration: 0.5 }}
                >
                  {/* Step icon with number badge */}
                  <div className="relative md:mb-5 shrink-0">
                    <motion.div
                      className={`w-14 h-14 md:w-[72px] md:h-[72px] rounded-2xl bg-gradient-to-br ${step.accent} flex items-center justify-center text-2xl md:text-3xl shadow-lg group-hover:shadow-xl transition-shadow`}
                      whileHover={{ rotate: [0, -5, 5, 0], scale: 1.05 }}
                      transition={{ duration: 0.4 }}
                    >
                      {step.icon}
                    </motion.div>
                    {/* Number badge */}
                    <div className="absolute -top-1.5 -right-1.5 md:-top-2 md:-right-2 w-6 h-6 md:w-7 md:h-7 rounded-full bg-gray-900 text-white text-[10px] md:text-xs font-bold flex items-center justify-center shadow-md ring-2 ring-white">
                      {step.num}
                    </div>
                  </div>

                  {/* Card body */}
                  <div className="bg-gray-50 rounded-2xl p-4 md:p-5 w-full group-hover:bg-green-50/50 transition-colors">
                    <h3 className="text-sm md:text-base font-semibold text-gray-900 mb-1 md:mb-2">{step.title}</h3>
                    <p className="text-xs md:text-sm text-gray-500 leading-relaxed">{step.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── WHY KYF — Trust Section ──────────────────────────────────────── */}
      <section className="py-8 sm:py-14 px-4 sm:px-5 bg-gray-50/50">
        <div className="max-w-3xl mx-auto">
          <motion.div
            className="text-center mb-6 sm:mb-10"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-block text-xs font-semibold text-green-600 bg-green-50 px-3 py-1 rounded-full mb-3">
              WHY KYF
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900">
              Built on <span className="text-green-600">Trust</span>
            </h2>
          </motion.div>

          <div className="space-y-3">
            {WHY_KYF.map((item, i) => (
              <WhyKYFItem key={i} item={item} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* ── EXPERT CHAT + CTA ──────────────────────────────────────────── */}
      <section className="relative pt-10 sm:pt-20 pb-6 sm:pb-10 px-4 sm:px-5 bg-gradient-to-b from-white via-green-50/40 to-emerald-50/60 overflow-hidden">
        {/* Background accents */}
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-green-100/60 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-emerald-100/50 rounded-full blur-[100px]" />

        <div className="relative max-w-5xl mx-auto flex flex-col md:flex-row items-center gap-8 lg:gap-12">
          <motion.div
            className="flex-1 text-center md:text-left"
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            <span className="inline-block text-xs font-semibold text-green-700 bg-green-100 px-3 py-1 rounded-full mb-4">HUMAN + AI</span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Talk to Real{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-emerald-500">Fashion Experts</span>
            </h2>
            <p className="text-sm sm:text-base text-gray-500 leading-relaxed mb-6 max-w-md">
              Not just AI — connect with certified fashion consultants for
              personalized advice. Get wardrobe audits, trend guidance,
              and style transformations from real professionals.
            </p>
            <motion.button
              onClick={() => setShowLogin(true)}
              className="group px-8 py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold text-sm shadow-lg shadow-green-500/20 hover:shadow-green-500/30 transition-all"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              Start Chatting with an Expert
              <span className="inline-block ml-1.5 group-hover:translate-x-1 transition-transform">&rarr;</span>
            </motion.button>

            {/* Trust indicators */}
            <div className="flex items-center gap-3 sm:gap-4 mt-5 sm:mt-6 justify-center md:justify-start flex-wrap">
              {[
                { icon: "🎓", label: "Certified Stylists" },
                { icon: "💬", label: "Real-time Chat" },
                { icon: "🔒", label: "Private & Secure" },
              ].map((t, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <span className="text-sm">{t.icon}</span>
                  <span className="text-[10px] text-gray-500">{t.label}</span>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            className="flex-shrink-0 flex flex-col items-center gap-3"
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2, duration: 0.7 }}
          >
            {/* Chat preview mockup — phone frame */}
            <div className="relative w-56 sm:w-72">
              <div className="bg-gray-200 rounded-[20px] p-1.5 shadow-2xl ring-1 ring-black/5">
                {/* Notch */}
                <div className="w-20 h-1 bg-gray-300 rounded-full mx-auto mb-1" />
                <div className="bg-white rounded-2xl overflow-hidden">
                  {/* Chat header */}
                  <div className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600">
                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm">👩‍🎨</div>
                    <div>
                      <p className="text-xs font-medium text-white">Priya S.</p>
                      <p className="text-[9px] text-white/60">Fashion Consultant</p>
                    </div>
                    <span className="ml-auto w-1.5 h-1.5 rounded-full bg-green-300 animate-pulse" />
                  </div>
                  {/* Messages */}
                  <div className="p-3 space-y-2 min-h-[140px] bg-gray-50">
                    <motion.div
                      className="bg-white rounded-xl rounded-tl-sm px-3 py-2 text-[11px] text-gray-700 max-w-[85%] shadow-sm"
                      initial={{ x: -20, opacity: 0 }}
                      whileInView={{ x: 0, opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.5, duration: 0.4 }}
                    >
                      Try pairing that navy blazer with white chinos and tan loafers for the meeting!
                    </motion.div>
                    <motion.div
                      className="bg-green-500 rounded-xl rounded-tr-sm px-3 py-2 text-[11px] text-white max-w-[65%] ml-auto shadow-sm"
                      initial={{ x: 20, opacity: 0 }}
                      whileInView={{ x: 0, opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.8, duration: 0.4 }}
                    >
                      What about the shoes?
                    </motion.div>
                    <motion.div
                      className="bg-white rounded-xl rounded-tl-sm px-3 py-2 text-[11px] text-gray-700 max-w-[85%] shadow-sm"
                      initial={{ x: -20, opacity: 0 }}
                      whileInView={{ x: 0, opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: 1.1, duration: 0.4 }}
                    >
                      Go with your brown Oxfords — they complement the navy perfectly. 👌
                    </motion.div>
                  </div>
                  {/* Input bar */}
                  <div className="px-3 pb-3 bg-gray-50">
                    <div className="flex items-center gap-2 bg-white rounded-full px-3 py-2 border border-gray-200">
                      <span className="text-gray-400 text-xs flex-1">Type a message...</span>
                      <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                        <span className="text-white text-[10px]">&uarr;</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* ── Integrated CTA ── */}
        <motion.div
          className="relative mt-8 sm:mt-14 text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="w-16 h-px bg-gradient-to-r from-transparent via-green-300 to-transparent mx-auto mb-6" />
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            Ready to Transform Your Style?
          </h2>
          <p className="text-sm sm:text-base text-gray-500 mb-4 max-w-md mx-auto">
            Start free, upgrade when you need more. It takes 30 seconds.
          </p>
          {/* Pricing hint strip */}
          <div className="flex items-center justify-center gap-2 sm:gap-3 mb-6 flex-wrap">
            {[
              { plan: "Free", price: "₹0", highlight: false },
              { plan: "Silver", price: "₹2/day", highlight: false },
              { plan: "Gold", price: "₹5/day", highlight: true },
              { plan: "Platinum", price: "₹8/day", highlight: false },
            ].map((p, i) => (
              <div
                key={i}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium border ${
                  p.highlight
                    ? "bg-green-50 border-green-200 text-green-700"
                    : "bg-white border-gray-100 text-gray-500"
                }`}
              >
                <span className="font-bold">{p.plan}</span>
                <span className="ml-1 text-gray-400">{p.price}</span>
              </div>
            ))}
          </div>
          <motion.button
            onClick={() => setShowLogin(true)}
            className="group px-10 py-3.5 rounded-2xl text-white font-semibold text-lg shadow-xl shadow-green-500/25 hover:shadow-green-500/40 transition-all"
            style={{ background: "linear-gradient(135deg, #059212, #06D001)" }}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
          >
            Get Started — It's Free
            <span className="inline-block ml-2 group-hover:translate-x-1 transition-transform">&rarr;</span>
          </motion.button>
        </motion.div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer className="py-5 sm:py-6 px-4 sm:px-5 border-t border-gray-100 bg-gray-50/50">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <img src={KYFLogo} alt="KYF" className="w-6 h-6 rounded-md" />
            <span className="text-xs font-medium text-gray-500">Know Your Fashion</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-400">
            <a href="/terms" className="hover:text-green-600 transition-colors">Terms</a>
            <a href="/privacy" className="hover:text-green-600 transition-colors">Privacy</a>
            <span>&copy; {new Date().getFullYear()} KYF</span>
          </div>
        </div>
      </footer>

      {/* ── Login Modal ───────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showLogin && (
          <Login asModal onClose={handleCloseLogin} />
        )}
      </AnimatePresence>
    </div>
  );
}

export default LandingPage;
