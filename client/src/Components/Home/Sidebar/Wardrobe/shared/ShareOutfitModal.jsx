import React, { useState, useEffect, useCallback } from "react";
import { useDispatch } from "react-redux";
import { Close, ContentCopy, Check, Send, IosShare } from "@mui/icons-material";
import { CircularProgress, IconButton } from "@mui/material";
import { useSubscriptionColors, toRgba } from "../../../../../utils/getSubscriptionColors";
import { shareOutfitThunk, sendOutfitThunk } from "../../../../../redux/thunks/wardrobe.thunks";

const SOCIAL_PLATFORMS = [
  {
    key: "whatsapp",
    label: "WhatsApp",
    icon: "https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/whatsapp.svg",
    color: "#25D366",
    buildUrl: (url, text) => `https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`,
  },
  {
    key: "twitter",
    label: "X / Twitter",
    icon: "https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/x.svg",
    color: "#000000",
    buildUrl: (url, text) => `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
  },
  {
    key: "telegram",
    label: "Telegram",
    icon: "https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/telegram.svg",
    color: "#26A5E4",
    buildUrl: (url, text) => `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
  },
];

function ShareOutfitModal({ open, onClose, outfit }) {
  const colors = useSubscriptionColors();
  const dispatch = useDispatch();

  const [shareUrl, setShareUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sendUsername, setSendUsername] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  // Generate share link on open
  useEffect(() => {
    if (!open || !outfit?._id) return;
    if (outfit.shareToken) {
      setShareUrl(`${window.location.origin}/outfit/${outfit.shareToken}`);
      return;
    }
    setLoading(true);
    dispatch(shareOutfitThunk(outfit._id)).then((result) => {
      setLoading(false);
      if (result?.success) {
        setShareUrl(`${window.location.origin}/outfit/${result.data.shareToken}`);
      }
    });
  }, [open, outfit?._id, outfit?.shareToken, dispatch]);

  // Reset state on close
  useEffect(() => {
    if (!open) {
      setCopied(false);
      setSendUsername("");
      setSending(false);
      setSent(false);
    }
  }, [open]);

  const handleCopy = useCallback(async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = shareUrl;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [shareUrl]);

  const handleNativeShare = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: outfit?.name || "Check out this outfit",
          text: `Check out this outfit on KYF Fashion AI`,
          url: shareUrl,
        });
      } catch { /* user cancelled */ }
    }
  }, [shareUrl, outfit?.name]);

  const handleSend = useCallback(async () => {
    if (!sendUsername.trim() || !outfit?._id) return;
    setSending(true);
    const result = await dispatch(sendOutfitThunk(outfit._id, sendUsername.trim()));
    setSending(false);
    if (result?.success) {
      setSent(true);
      setSendUsername("");
      setTimeout(() => setSent(false), 3000);
    }
  }, [sendUsername, outfit?._id, dispatch]);

  if (!open) return null;

  const shareText = `Check out "${outfit?.name || "this outfit"}" on KYF Fashion AI`;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40 z-50" onClick={onClose} />

      {/* Modal — bottom sheet style */}
      <div className="fixed bottom-0 left-0 right-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-3xl dark:bg-dark-primary bg-white shadow-2xl animate-slideUp">
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full dark:bg-dark-text/20 bg-light-text/20" />
        </div>

        <div className="px-5 pb-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold dark:text-dark-text text-light-text">
              Share Outfit
            </h3>
            <IconButton onClick={onClose} size="small">
              <Close className="dark:text-dark-text/50 text-light-text/50" style={{ fontSize: 20 }} />
            </IconButton>
          </div>

          {/* Outfit preview mini */}
          <div className="flex items-center gap-3 mb-5 p-3 rounded-xl" style={{ backgroundColor: toRgba(colors.fourth, 0.06) }}>
            {outfit?.flatlayUrl && (
              <img
                src={outfit.flatlayUrl}
                alt=""
                className="w-14 h-14 rounded-lg object-contain flex-shrink-0"
                style={{ backgroundColor: "#f5f5f0" }}
              />
            )}
            <div className="min-w-0">
              <p className="text-sm font-semibold dark:text-dark-text text-light-text truncate">
                {outfit?.name || "Untitled Outfit"}
              </p>
              <p className="text-[10px] dark:text-dark-text/40 text-light-text/40">
                {outfit?.items?.length || 0} items{outfit?.occasion ? ` · ${outfit.occasion}` : ""}
              </p>
            </div>
          </div>

          {/* Share link */}
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <CircularProgress size={20} style={{ color: colors.fourth }} />
              <span className="text-xs ml-2 dark:text-dark-text/50 text-light-text/50">Generating link...</span>
            </div>
          ) : shareUrl && (
            <div className="flex items-center gap-2 mb-5">
              <div
                className="flex-1 px-3 py-2.5 rounded-lg text-xs truncate dark:text-dark-text/70 text-light-text/70 select-all"
                style={{ backgroundColor: toRgba(colors.fourth, 0.08), border: `1px solid ${toRgba(colors.fourth, 0.15)}` }}
              >
                {shareUrl}
              </div>
              <button
                onClick={handleCopy}
                className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-white transition-all"
                style={{ backgroundColor: copied ? "#22c55e" : colors.fourth }}
              >
                {copied ? <Check style={{ fontSize: 18 }} /> : <ContentCopy style={{ fontSize: 16 }} />}
              </button>
            </div>
          )}

          {/* Social share buttons */}
          <div className="flex items-center gap-3 mb-5">
            {SOCIAL_PLATFORMS.map((platform) => (
              <button
                key={platform.key}
                onClick={() => window.open(platform.buildUrl(shareUrl, shareText), "_blank", "noopener")}
                disabled={!shareUrl}
                className="flex flex-col items-center gap-1.5 flex-1 py-3 rounded-xl transition-all hover:scale-[1.03] disabled:opacity-30"
                style={{ backgroundColor: toRgba(platform.color, 0.1) }}
              >
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: platform.color }}
                >
                  <img
                    src={platform.icon}
                    alt=""
                    className="w-4.5 h-4.5 invert"
                    style={{ width: 18, height: 18, filter: "brightness(0) invert(1)" }}
                  />
                </div>
                <span className="text-[10px] font-medium dark:text-dark-text/60 text-light-text/60">
                  {platform.label}
                </span>
              </button>
            ))}

            {/* Native share (mobile) */}
            {typeof navigator !== "undefined" && navigator.share && (
              <button
                onClick={handleNativeShare}
                disabled={!shareUrl}
                className="flex flex-col items-center gap-1.5 flex-1 py-3 rounded-xl transition-all hover:scale-[1.03] disabled:opacity-30"
                style={{ backgroundColor: toRgba(colors.fourth, 0.1) }}
              >
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: colors.fourth }}
                >
                  <IosShare style={{ fontSize: 18, color: "white" }} />
                </div>
                <span className="text-[10px] font-medium dark:text-dark-text/60 text-light-text/60">
                  More
                </span>
              </button>
            )}
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px dark:bg-dark-text/10 bg-light-text/10" />
            <span className="text-[10px] dark:text-dark-text/30 text-light-text/30 font-medium">or send to a friend</span>
            <div className="flex-1 h-px dark:bg-dark-text/10 bg-light-text/10" />
          </div>

          {/* Send to user */}
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs dark:text-dark-text/30 text-light-text/30">@</span>
              <input
                type="text"
                value={sendUsername}
                onChange={(e) => setSendUsername(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="username"
                className="w-full pl-7 pr-3 py-2.5 rounded-lg text-sm dark:bg-dark-secondary bg-gray-50 dark:text-dark-text text-light-text focus:outline-none focus:ring-2 transition-all"
                style={{ focusRingColor: colors.fourth }}
              />
            </div>
            <button
              onClick={handleSend}
              disabled={!sendUsername.trim() || sending}
              className="flex-shrink-0 px-4 py-2.5 rounded-lg text-sm font-medium text-white flex items-center gap-1.5 disabled:opacity-40 transition-opacity hover:opacity-90"
              style={{ backgroundColor: colors.fourth }}
            >
              {sending ? (
                <CircularProgress size={14} style={{ color: "white" }} />
              ) : (
                <Send style={{ fontSize: 16 }} />
              )}
              Send
            </button>
          </div>

          {/* Sent confirmation */}
          {sent && (
            <p className="text-xs mt-2 text-center" style={{ color: "#22c55e" }}>
              Outfit sent successfully!
            </p>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-slideUp {
          animation: slideUp 0.25s ease-out;
        }
      `}</style>
    </>
  );
}

export default ShareOutfitModal;
