import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { ArrowBack, FingerprintOutlined } from "@mui/icons-material";
import { CircularProgress, IconButton } from "@mui/material";
import { useSubscriptionColors, toRgba } from "../../../../utils/getSubscriptionColors";
import {
  fetchStyleProfileThunk,
  fetchProfileOptionsThunk,
  updateStyleProfileThunk,
} from "../../../../redux/thunks/wardrobe.thunks";
import WizardMode from "./StyleProfile/WizardMode";
import EditMode from "./StyleProfile/EditMode";

const PROFILE_SECTIONS = [
  {
    id: "about",
    title: "About You",
    subtitle: "Let's start with the basics",
    celebration: "We know you better already!",
    fields: [
      { key: "bodyShape", label: "Body Shape", question: "What's your body shape?", tagline: "Everybody is different.", why: "Helps us pick silhouettes that flatter your shape", reactions: ["Nice! Let's find your perfect fits", "Great pick! We'll work with that", "Love it! Shape noted"], required: true },
      { key: "height", label: "Height", question: "How tall are you?", tagline: "Size matters — for fit, at least.", why: "We'll suggest the right proportions for you", reactions: ["Got it! Proportions matter", "Perfect, noted!", "Height locked in"], required: true },
      { key: "skinTone", label: "Skin Tone", question: "What's your skin tone?", tagline: "Your natural canvas.", why: "We'll match colors that complement your complexion", reactions: ["Beautiful! Let's find your colors", "Lovely! This helps a lot", "Your palette is taking shape"], required: true },
      { key: "undertone", label: "Undertone", question: "Warm, cool, or neutral?", tagline: "The hidden detail.", why: "This changes which colors make you glow", reactions: ["That changes everything!", "Now we're cooking", "Secret weapon unlocked"], required: true },
      { key: "ageGroup", label: "Age Group", question: "What's your age group?", tagline: "Style evolves with you.", why: "Trends and fits vary by life stage", reactions: ["Age is just a vibe", "Style has no age limit", "Noted! Moving on"], required: true },
    ],
  },
  {
    id: "style",
    title: "Your Style",
    subtitle: "How you like to dress",
    celebration: "Your style DNA is forming!",
    fields: [
      { key: "fitPreference", label: "Fit Preference", question: "How do you like your clothes to fit?", tagline: "Comfort meets style.", why: "Loose and flowy, or fitted and sharp?", reactions: ["That's the vibe!", "Comfort + style = you", "Fit preference locked"], required: true },
      { key: "styleVibe", label: "Style Vibe", question: "Pick your style vibe", tagline: "Your fashion fingerprint.", why: "This shapes every recommendation we make", reactions: ["You've got taste!", "We love that energy", "Your vibe is everything"], required: true },
      { key: "colorPaletteSeason", label: "Color Season", question: "What's your color season?", tagline: "Color theory, simplified.", why: "Spring, summer, autumn, or winter palette", reactions: ["Ooh, great palette!", "Colors unlocked", "Now we know your hues"], required: false },
    ],
  },
  {
    id: "details",
    title: "Fine Details",
    subtitle: "Optional — helps refine suggestions",
    celebration: "You're all set!",
    fields: [
      { key: "faceShape", label: "Face Shape", question: "What's your face shape?", tagline: "Frames your look.", why: "Helps with accessory and neckline suggestions", reactions: ["Noted! Accessories will love you", "Face shape locked in", "Great detail!"], required: false },
      { key: "hairType", label: "Hair Type", question: "What's your hair type?", tagline: "Every strand tells a story.", why: "We'll factor this into overall styling", reactions: ["Hair game strong!", "Every strand counts", "Styling just got personal"], required: false },
      { key: "hairLength", label: "Hair Length", question: "How long is your hair?", tagline: "Short, long, or in between.", why: "Affects how necklines and accessories land", reactions: ["Length noted!", "That affects necklines — smart", "Good to know!"], required: false },
      { key: "hairColor", label: "Hair Color", question: "What color is your hair?", tagline: "Your crowning detail.", why: "We'll consider color harmony head to toe", reactions: ["Head to toe harmony!", "Color coordination activated", "Looking good!"], required: false },
      { key: "eyeShape", label: "Eye Shape", question: "What's your eye shape?", tagline: "The windows to your style.", why: "Refines accessory recommendations", reactions: ["Eyes say it all!", "Detail level: expert", "Almost there!"], required: false },
      { key: "lipShape", label: "Lip Shape", question: "What's your lip shape?", tagline: "The finishing touch.", why: "Completes your style portrait", reactions: ["Final touch!", "Style portrait complete", "You nailed it!"], required: false },
    ],
  },
];

// Flat lists derived from sections for validation/compat
const ALL_FIELDS = PROFILE_SECTIONS.flatMap((s) => s.fields);
const REQUIRED_FIELDS = ALL_FIELDS.filter((f) => f.required);
const OPTIONAL_FIELDS = ALL_FIELDS.filter((f) => !f.required);

function StyleProfile() {
  const colors = useSubscriptionColors();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { data: profileData, loading, saving, hasProfile } = useSelector(
    (state) => state.wardrobe.styleProfile
  );
  const { data: options, loading: optionsLoading } = useSelector(
    (state) => state.wardrobe.profileOptions
  );

  const [formData, setFormData] = useState({});

  useEffect(() => {
    dispatch(fetchProfileOptionsThunk());
    dispatch(fetchStyleProfileThunk());
  }, [dispatch]);

  // Populate form when profile data loads
  useEffect(() => {
    if (profileData) {
      setFormData(profileData);
    }
  }, [profileData]);

  const handleChipSelect = (fieldKey, value) => {
    setFormData((prev) => ({ ...prev, [fieldKey]: value }));
  };

  const handleSave = async () => {
    const missing = REQUIRED_FIELDS.filter((f) => !formData[f.key]);
    if (missing.length > 0) return;

    const result = await dispatch(updateStyleProfileThunk(formData));
    if (result?.success && !hasProfile) {
      navigate("/wardrobe/my-closet");
    }
  };

  const getOptionsForField = (key) => {
    if (!options) return [];
    return options.required?.[key]
      || options.optionalTier1?.[key]
      || options.optionalTier2?.[key]
      || options[key]
      || [];
  };

  const allRequiredFilled = REQUIRED_FIELDS.every((f) => formData[f.key]);
  const filledCount = ALL_FIELDS.filter((f) => formData[f.key]).length;
  const completionPct = Math.round((filledCount / ALL_FIELDS.length) * 100);

  if (loading || optionsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <CircularProgress style={{ color: colors.fourth }} />
      </div>
    );
  }

  return (
    <div className="w-full h-full overflow-hidden flex flex-col">
      {/* Fixed Header */}
      <div className="flex-shrink-0">
        <div
          className="px-3 sm:px-4 pt-2 pb-2"
          style={{
            background: `linear-gradient(135deg, ${toRgba(colors.fourth, 0.06)} 0%, transparent 60%)`,
          }}
        >
          <div className="flex items-center gap-2">
            <IconButton onClick={() => navigate("/wardrobe")} size="small">
              <ArrowBack style={{ color: colors.fourth }} />
            </IconButton>
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{
                background: `linear-gradient(135deg, ${colors.fourth}, ${toRgba(colors.fourth, 0.6)})`,
              }}
            >
              <FingerprintOutlined style={{ color: "#fff", fontSize: 16 }} />
            </div>
            <div>
              <h2 className="text-sm font-bold dark:text-dark-text text-light-text tracking-tight">
                Style DNA
              </h2>
              <p className="text-[10px] dark:text-dark-text/40 text-light-text/40">
                {hasProfile ? "Powers your AI outfit suggestions" : "Helps AI style outfits just for you"}
              </p>
            </div>
          </div>
        </div>
        <div
          className="h-[2px]"
          style={{ background: `linear-gradient(to right, ${colors.fourth}, ${toRgba(colors.fourth, 0.15)}, transparent)` }}
        />
      </div>

      {/* Mode switch: Wizard for new users, Edit for returning users */}
      {hasProfile ? (
        <EditMode
          sections={PROFILE_SECTIONS}
          formData={formData}
          onChipSelect={handleChipSelect}
          getOptionsForField={getOptionsForField}
          onSave={handleSave}
          saving={saving}
          allRequiredFilled={allRequiredFilled}
          completionPct={completionPct}
        />
      ) : (
        <WizardMode
          sections={PROFILE_SECTIONS}
          allFields={ALL_FIELDS}
          formData={formData}
          onChipSelect={handleChipSelect}
          getOptionsForField={getOptionsForField}
          onSave={handleSave}
          saving={saving}
          requiredFields={REQUIRED_FIELDS}
        />
      )}
    </div>
  );
}

export default StyleProfile;
