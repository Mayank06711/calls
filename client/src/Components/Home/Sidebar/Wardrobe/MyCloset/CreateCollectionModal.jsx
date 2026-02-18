import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Close } from "@mui/icons-material";
import { CircularProgress } from "@mui/material";
import { useSubscriptionColors, toRgba } from "../../../../../utils/getSubscriptionColors";
import { createCollectionThunk, updateCollectionThunk } from "../../../../../redux/thunks/wardrobe.thunks";

const EMOJI_OPTIONS = ["📁", "👔", "👗", "🏖️", "🏋️", "💼", "🎉", "❄️", "☀️", "🌙", "💖", "🔥"];
const COLOR_OPTIONS = ["#6366f1", "#ec4899", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ef4444", "#14b8a6"];

function CreateCollectionModal({ onClose, editCollection }) {
  const dispatch = useDispatch();
  const colors = useSubscriptionColors();
  const creating = useSelector((state) => state.wardrobe.collections.creating);

  const [name, setName] = useState(editCollection?.name || "");
  const [description, setDescription] = useState(editCollection?.description || "");
  const [emoji, setEmoji] = useState(editCollection?.emoji || "📁");
  const [color, setColor] = useState(editCollection?.color || "");

  const handleSubmit = async () => {
    if (!name.trim()) return;
    const payload = { name: name.trim(), emoji, description: description.trim() || undefined, color: color || undefined };

    let result;
    if (editCollection) {
      result = await dispatch(updateCollectionThunk(editCollection._id, payload));
    } else {
      result = await dispatch(createCollectionThunk(payload));
    }
    if (result?.success) onClose();
  };

  return (
    <>
      <div className="absolute inset-0 z-50 bg-black/40" onClick={onClose} />
      <div
        className="absolute z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-sm rounded-2xl shadow-2xl dark:bg-dark-primary bg-light-secondary border p-4"
        style={{ borderColor: toRgba(colors.fourth, 0.2) }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold dark:text-dark-text text-light-text">
            {editCollection ? "Edit Collection" : "New Collection"}
          </h3>
          <button onClick={onClose} className="dark:text-dark-text/40 text-light-text/40 hover:opacity-70">
            <Close style={{ fontSize: 18 }} />
          </button>
        </div>

        {/* Name */}
        <label className="block text-[11px] font-medium dark:text-dark-text/60 text-light-text/60 mb-1">Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={50}
          placeholder="e.g. Work, Summer, Date Night"
          className="w-full px-3 py-2 rounded-lg text-sm border dark:bg-dark-primary/50 bg-white dark:text-dark-text text-light-text outline-none focus:ring-1 mb-3"
          style={{ borderColor: toRgba(colors.fourth, 0.3), '--tw-ring-color': colors.fourth }}
          autoFocus
        />

        {/* Description */}
        <label className="block text-[11px] font-medium dark:text-dark-text/60 text-light-text/60 mb-1">Description (optional)</label>
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={200}
          placeholder="Short description"
          className="w-full px-3 py-2 rounded-lg text-sm border dark:bg-dark-primary/50 bg-white dark:text-dark-text text-light-text outline-none focus:ring-1 mb-3"
          style={{ borderColor: toRgba(colors.fourth, 0.3), '--tw-ring-color': colors.fourth }}
        />

        {/* Emoji picker */}
        <label className="block text-[11px] font-medium dark:text-dark-text/60 text-light-text/60 mb-1">Icon</label>
        <div className="flex flex-wrap gap-1.5 mb-3">
          {EMOJI_OPTIONS.map((e) => (
            <button
              key={e}
              onClick={() => setEmoji(e)}
              className={`w-8 h-8 rounded-lg flex items-center justify-center text-base border transition-all ${
                emoji === e ? "ring-2" : ""
              }`}
              style={{
                borderColor: emoji === e ? colors.fourth : toRgba(colors.fourth, 0.15),
                '--tw-ring-color': colors.fourth,
                backgroundColor: emoji === e ? toRgba(colors.fourth, 0.1) : "transparent",
              }}
            >
              {e}
            </button>
          ))}
        </div>

        {/* Color picker */}
        <label className="block text-[11px] font-medium dark:text-dark-text/60 text-light-text/60 mb-1">Color (optional)</label>
        <div className="flex flex-wrap gap-1.5 mb-4">
          {COLOR_OPTIONS.map((c) => (
            <button
              key={c}
              onClick={() => setColor(color === c ? "" : c)}
              className={`w-7 h-7 rounded-full border-2 transition-all ${
                color === c ? "ring-2 ring-offset-1 scale-110" : ""
              }`}
              style={{
                backgroundColor: c,
                borderColor: color === c ? c : "transparent",
                '--tw-ring-color': c,
              }}
            />
          ))}
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={!name.trim() || creating}
          className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          style={{ backgroundColor: color || colors.fourth }}
        >
          {creating && <CircularProgress size={14} style={{ color: "white" }} />}
          {editCollection ? "Save Changes" : "Create Collection"}
        </button>
      </div>
    </>
  );
}

export default CreateCollectionModal;
