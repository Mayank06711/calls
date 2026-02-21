import React, { useEffect, useState, useCallback, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  ArrowBack,
  FingerprintOutlined,
  Person,
  CloudUpload,
  AutoAwesome,
} from "@mui/icons-material";
import { CircularProgress, IconButton, LinearProgress } from "@mui/material";
import { useSubscriptionColors, toRgba } from "../../../../utils/getSubscriptionColors";
import { uploadFile } from "../../../../utils/cloudinaryUtils";
import {
  fetchStyleProfileThunk,
  fetchProfileOptionsThunk,
  updateStyleProfileThunk,
  fetchStyleDnaThunk,
  analyzeStyleDnaThunk,
  generateUploadUrlThunk,
} from "../../../../redux/thunks/wardrobe.thunks";
import { showNotification } from "../../../../redux/actions/notification.actions";
import WizardMode from "./StyleProfile/WizardMode";
import EditMode from "./StyleProfile/EditMode";
import { useAIContext } from "../../../../context/AIContext";
import { buildWardrobeBaseContext } from "../../../../utils/wardrobeAIContext";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 5 * 1024 * 1024;

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

const ALL_FIELDS = PROFILE_SECTIONS.flatMap((s) => s.fields);
const REQUIRED_FIELDS = ALL_FIELDS.filter((f) => f.required);

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
  const { data: styleDnaData, analyzing } = useSelector(
    (state) => state.wardrobe.styleDna
  );
  const userInfo = useSelector((s) => s.userInfo);
  const userData = userInfo?.data || {};
  const hasPhoto = !!(userData?.photo?.url || userData?.photo?.thumbnailUrl);

  const [formData, setFormData] = useState({});
  const [uploading, setUploading] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [wizardData, setWizardData] = useState(null); // frozen snapshot { fields, sections }
  const fileInputRef = useRef(null);
  const formDataRef = useRef({});
  const autoEnteredRef = useRef(false);
  formDataRef.current = formData;

  // Snapshot unfilled fields/sections ONCE and enter wizard mode.
  // The snapshot never changes during the wizard, preventing WizardMode's
  // internal step counter from going out of sync with a shrinking array.
  const enterWizard = useCallback((currentData) => {
    const fields = ALL_FIELDS.filter((f) => !currentData[f.key]);
    const sections = PROFILE_SECTIONS.map((s) => ({
      ...s,
      fields: s.fields.filter((f) => !currentData[f.key]),
    })).filter((s) => s.fields.length > 0);
    setWizardData({ fields, sections });
    setShowWizard(true);
  }, []);

  // ── AI context ──────────────────────────────────────────────────
  const { setAIPageContext, clearAIPageContext } = useAIContext();
  const wardrobeState = useSelector((s) => s.wardrobe);
  useEffect(() => {
    const base = buildWardrobeBaseContext(wardrobeState);
    let desc;
    if (!hasProfile) {
      desc = analyzing
        ? "User is setting up their style profile. AI photo analysis is currently running."
        : "User is setting up their style profile for the first time. They can analyze a photo or fill fields manually.";
    } else {
      const filled = ALL_FIELDS.filter((f) => formData[f.key]).length;
      const pct = Math.round((filled / ALL_FIELDS.length) * 100);
      desc = `User is editing their style profile (${pct}% complete, ${filled}/${ALL_FIELDS.length} fields).`;
      if (styleDnaData) desc += " AI photo analysis completed.";
    }
    setAIPageContext({ page: "wardrobe/style-profile", description: `${base} ${desc}` });
    return () => clearAIPageContext();
  }, [hasProfile, analyzing, styleDnaData, formData, wardrobeState.closet?.items?.length, setAIPageContext, clearAIPageContext]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    dispatch(fetchProfileOptionsThunk());
    dispatch(fetchStyleProfileThunk());
    dispatch(fetchStyleDnaThunk());
  }, [dispatch]);

  // Populate form when profile data or Style DNA loads
  useEffect(() => {
    if (profileData) {
      setFormData(profileData);
    } else if (styleDnaData?.meta?.autoFillMapping) {
      const mapping = styleDnaData.meta.autoFillMapping;
      setFormData(mapping);
      // Auto-enter wizard if returning user with analysis but no saved profile
      if (!autoEnteredRef.current && !hasProfile) {
        autoEnteredRef.current = true;
        enterWizard(mapping);
      }
    }
  }, [profileData, styleDnaData, hasProfile, enterWizard]);

  // After analysis completes, merge auto-fill mapping
  const prevAnalyzingRef = useRef(false);
  useEffect(() => {
    if (prevAnalyzingRef.current && !analyzing && styleDnaData?.meta?.autoFillMapping) {
      const mapping = styleDnaData.meta.autoFillMapping;
      const merged = { ...formDataRef.current, ...mapping };
      setFormData(merged);
      if (hasProfile) {
        // Re-analysis on existing profile — auto-save the updated values
        dispatch(updateStyleProfileThunk(merged));
      } else {
        enterWizard(merged);
      }
    }
    prevAnalyzingRef.current = analyzing;
  }, [analyzing, styleDnaData, enterWizard, hasProfile, dispatch]);

  // ── Analyze handlers ──────────────────────────────────────────────

  const handleAnalyzeResult = useCallback((result) => {
    if (result?.success && !result.skipped) {
      dispatch(showNotification("Photo analyzed! Fill the remaining fields below.", 200));
    } else if (result?.skipped) {
      const msg = result.reason === "multiple_people"
        ? "Multiple people detected. Please upload a solo photo."
        : "No face detected. Try a clear portrait.";
      dispatch(showNotification(msg, 400));
    }
  }, [dispatch]);

  const handleAnalyzeProfile = useCallback(async () => {
    const result = await dispatch(analyzeStyleDnaThunk());
    handleAnalyzeResult(result);
  }, [dispatch, handleAnalyzeResult]);

  const handleUploadAndAnalyze = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      dispatch(showNotification("Please upload a JPEG, PNG, or WebP image.", 400));
      return;
    }
    if (file.size > MAX_SIZE) {
      dispatch(showNotification("Image must be under 5MB.", 400));
      return;
    }

    try {
      setUploading(true);
      const urlResult = await dispatch(generateUploadUrlThunk({ fileName: file.name, contentType: file.type }));
      if (!urlResult?.success) throw new Error("Failed to get upload URL");
      const imageUrl = await uploadFile(file, urlResult.data);
      setUploading(false);
      const result = await dispatch(analyzeStyleDnaThunk(imageUrl));
      handleAnalyzeResult(result);
    } catch (err) {
      setUploading(false);
      dispatch(showNotification(err.message || "Upload failed.", 400));
    }
  }, [dispatch, handleAnalyzeResult]);

  // ── Form handlers ─────────────────────────────────────────────────

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

  const isBusy = analyzing || uploading;

  if (loading || optionsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <CircularProgress style={{ color: colors.fourth }} />
      </div>
    );
  }

  // ── Returning users with existing profile → EditMode ──────────────
  if (hasProfile) {
    return (
      <div className="w-full h-full overflow-hidden flex flex-col">
        <ProfileHeader colors={colors} navigate={navigate} hasProfile={hasProfile} />

        {/* Re-analyze bar */}
        <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleUploadAndAnalyze} />
        {isBusy ? (
          <div
            className="flex-shrink-0 px-4 py-2 flex items-center justify-center gap-2"
            style={{ borderBottom: `1px solid ${toRgba(colors.fourth, 0.1)}` }}
          >
            <CircularProgress size={12} style={{ color: colors.fourth }} />
            <span className="text-[11px]" style={{ color: colors.fourth }}>
              {uploading ? "Uploading photo..." : "Re-analyzing your photo..."}
            </span>
          </div>
        ) : (
          <div
            className="flex-shrink-0 px-4 py-1.5 flex items-center justify-center gap-4"
            style={{ borderBottom: `1px solid ${toRgba(colors.fourth, 0.08)}` }}
          >
            {hasPhoto && (
              <button
                onClick={handleAnalyzeProfile}
                className="text-[11px] font-medium flex items-center gap-1 transition-opacity hover:opacity-70"
                style={{ color: toRgba(colors.fourth, 0.5) }}
              >
                <Person style={{ fontSize: 13 }} />
                Re-analyze profile photo
              </button>
            )}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="text-[11px] font-medium flex items-center gap-1 transition-opacity hover:opacity-70"
              style={{ color: toRgba(colors.fourth, 0.5) }}
            >
              <CloudUpload style={{ fontSize: 13 }} />
              Upload new photo
            </button>
          </div>
        )}

        <EditMode
          sections={PROFILE_SECTIONS}
          formData={formData}
          onChipSelect={handleChipSelect}
          getOptionsForField={getOptionsForField}
          onSave={handleSave}
          saving={saving}
          allRequiredFilled={allRequiredFilled}
          completionPct={completionPct}
          styleDna={styleDnaData}
        />
      </div>
    );
  }

  // ── New users: show analyze options first, then wizard for remaining fields ──

  // Show wizard if user chose to skip analysis or analysis completed
  if (showWizard && wizardData) {
    // All fields already filled by analysis? (unlikely but handle it)
    if (wizardData.fields.length === 0) {
      return (
        <div className="w-full h-full overflow-hidden flex flex-col">
          <ProfileHeader colors={colors} navigate={navigate} hasProfile={hasProfile} />
          <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
            <AutoAwesome style={{ color: colors.fourth, fontSize: 48 }} className="mb-3" />
            <h2 className="text-xl font-bold dark:text-dark-text text-light-text mb-2">All fields filled!</h2>
            <p className="text-sm dark:text-gray-400 text-gray-500 mb-4">Your style profile is ready to save.</p>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: colors.fourth }}
            >
              {saving ? <CircularProgress size={14} style={{ color: "white" }} /> : "Save Profile"}
            </button>
          </div>
        </div>
      );
    }

    // Fields that were pre-filled before entering wizard (from analysis)
    const preFilledFields = ALL_FIELDS.filter(
      (f) => !wizardData.fields.some((wf) => wf.key === f.key)
    );

    return (
      <div className="w-full h-full overflow-hidden flex flex-col">
        <ProfileHeader colors={colors} navigate={navigate} hasProfile={hasProfile} />

        {/* Auto-filled summary strip */}
        {preFilledFields.length > 0 && (
          <div className="flex-shrink-0 px-4 py-2">
            <p className="text-[10px] dark:text-gray-500 text-gray-400 mb-1.5 text-center">
              Auto-filled from analysis — {wizardData.fields.length} field{wizardData.fields.length !== 1 ? "s" : ""} remaining
            </p>
            <div className="flex flex-wrap gap-1.5 justify-center">
              {preFilledFields.map((f) => (
                <span
                  key={f.key}
                  className="px-2 py-0.5 rounded-full text-[9px] font-semibold"
                  style={{ backgroundColor: toRgba(colors.fourth, 0.12), color: colors.fourth }}
                >
                  {f.label}: {formData[f.key]}
                </span>
              ))}
            </div>
          </div>
        )}

        <WizardMode
          sections={wizardData.sections}
          allFields={wizardData.fields}
          formData={formData}
          onChipSelect={handleChipSelect}
          getOptionsForField={getOptionsForField}
          onSave={handleSave}
          saving={saving}
          requiredFields={REQUIRED_FIELDS}
        />
      </div>
    );
  }

  // ── Landing: analyze or skip ──────────────────────────────────────

  return (
    <div className="w-full h-full overflow-hidden flex flex-col">
      <ProfileHeader colors={colors} navigate={navigate} hasProfile={hasProfile} />

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleUploadAndAnalyze}
      />

      <div className="flex-1 flex flex-col items-center justify-center px-6">
        {/* Busy state: uploading or analyzing */}
        {isBusy && (
          <div className="w-full max-w-sm">
            <div
              className="p-5 rounded-2xl text-center"
              style={{ backgroundColor: toRgba(colors.fourth, 0.06), border: `1px solid ${toRgba(colors.fourth, 0.2)}` }}
            >
              <AutoAwesome
                className={analyzing ? "animate-spin" : ""}
                style={{ color: colors.fourth, fontSize: 32 }}
              />
              <p className="text-sm font-medium dark:text-dark-text text-light-text mt-2">
                {uploading ? "Uploading photo..." : "Analyzing your photo..."}
              </p>
              <LinearProgress
                sx={{
                  mt: 2, borderRadius: 4, height: 5,
                  backgroundColor: toRgba(colors.fourth, 0.15),
                  "& .MuiLinearProgress-bar": { backgroundColor: colors.fourth },
                }}
              />
              {analyzing && (
                <p className="text-xs dark:text-gray-500 text-gray-400 mt-2">
                  Running AI pipeline: body, face, skin, hair, color season...
                </p>
              )}
            </div>
          </div>
        )}

        {/* Analyze options */}
        {!isBusy && (
          <div className="w-full max-w-md">
            <div
              className="p-6 rounded-2xl text-center"
              style={{ backgroundColor: toRgba(colors.fourth, 0.04), border: `1px dashed ${toRgba(colors.fourth, 0.25)}` }}
            >
              <AutoAwesome style={{ color: colors.fourth, fontSize: 40 }} className="mb-3" />
              <h3 className="text-lg font-bold dark:text-dark-text text-light-text mb-1">
                Set Up Your Style Profile
              </h3>
              <p className="text-sm dark:text-gray-400 text-gray-500 mb-5">
                Analyze a photo to auto-fill your body shape, skin tone, color season, and more.
                Or fill everything manually.
              </p>

              <div className="flex flex-col gap-3">
                {/* Option 1: Profile photo */}
                {hasPhoto && (
                  <button
                    onClick={handleAnalyzeProfile}
                    className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-medium text-white transition-opacity hover:opacity-90"
                    style={{ backgroundColor: colors.fourth }}
                  >
                    <Person style={{ fontSize: 18 }} />
                    Analyze My Profile Photo
                  </button>
                )}

                {/* Option 2: Upload photo */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-medium transition-opacity hover:opacity-90"
                  style={{
                    backgroundColor: hasPhoto ? toRgba(colors.fourth, 0.1) : colors.fourth,
                    color: hasPhoto ? colors.fourth : "#fff",
                    border: hasPhoto ? `1px solid ${toRgba(colors.fourth, 0.3)}` : "none",
                  }}
                >
                  <CloudUpload style={{ fontSize: 18 }} />
                  Upload a Photo to Analyze
                </button>

                {/* Option 3: Skip, fill manually */}
                <button
                  onClick={() => enterWizard(formData)}
                  className="text-xs font-medium mt-1 transition-opacity hover:opacity-70"
                  style={{ color: toRgba(colors.fourth, 0.5) }}
                >
                  Skip — I'll fill it manually
                </button>
              </div>

              <p className="text-[10px] dark:text-gray-500 text-gray-400 mt-4">
                Uploading here won't change your profile picture. Use a clear solo portrait.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Shared header ─────────────────────────────────────────────────────────────

function ProfileHeader({ colors, navigate, hasProfile }) {
  return (
    <div className="flex-shrink-0">
      <div
        className="px-3 sm:px-4 pt-2 pb-2"
        style={{ background: `linear-gradient(135deg, ${toRgba(colors.fourth, 0.06)} 0%, transparent 60%)` }}
      >
        <div className="flex items-center gap-2">
          <IconButton onClick={() => navigate("/wardrobe")} size="small">
            <ArrowBack style={{ color: colors.fourth }} />
          </IconButton>
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: `linear-gradient(135deg, ${colors.fourth}, ${toRgba(colors.fourth, 0.6)})` }}
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
  );
}

export default StyleProfile;
