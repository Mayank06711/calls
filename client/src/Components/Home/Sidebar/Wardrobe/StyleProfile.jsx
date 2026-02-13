import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { ArrowBack } from "@mui/icons-material";
import { CircularProgress, IconButton } from "@mui/material";
import { useSubscriptionColors, toRgba } from "../../../../utils/getSubscriptionColors";
import {
  fetchStyleProfileThunk,
  fetchProfileOptionsThunk,
  updateStyleProfileThunk,
} from "../../../../redux/thunks/wardrobe.thunks";

const REQUIRED_FIELDS = [
  { key: "bodyShape", label: "Body Shape" },
  { key: "height", label: "Height" },
  { key: "skinTone", label: "Skin Tone" },
  { key: "undertone", label: "Undertone" },
  { key: "ageGroup", label: "Age Group" },
  { key: "fitPreference", label: "Fit Preference" },
  { key: "styleVibe", label: "Style Vibe" },
];

const OPTIONAL_FIELDS = [
  { key: "faceShape", label: "Face Shape" },
  { key: "hairType", label: "Hair Type" },
  { key: "hairLength", label: "Hair Length" },
  { key: "hairColor", label: "Hair Color" },
  { key: "eyeShape", label: "Eye Shape" },
  { key: "lipShape", label: "Lip Shape" },
  { key: "colorPaletteSeason", label: "Color Palette Season" },
];

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
  const [showOptional, setShowOptional] = useState(false);

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
    // Validate required fields
    const missing = REQUIRED_FIELDS.filter((f) => !formData[f.key]);
    if (missing.length > 0) return;

    const result = await dispatch(updateStyleProfileThunk(formData));
    if (result?.success && !hasProfile) {
      navigate("/wardrobe/my-closet");
    }
  };

  const getOptionsForField = (key) => {
    if (!options) return [];
    // Server returns { required: { bodyShape: [...] }, optionalTier1: { faceShape: [...] }, ... }
    // Each option is { value, description }
    return options.required?.[key]
      || options.optionalTier1?.[key]
      || options.optionalTier2?.[key]
      || options[key]
      || [];
  };

  const allRequiredFilled = REQUIRED_FIELDS.every((f) => formData[f.key]);

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
      <div className="flex-shrink-0 px-2 sm:px-4 pt-2 sm:pt-4 pb-2 dark:bg-dark-primary bg-light-secondary border-b dark:border-dark-text/10 border-light-text/10">
        <div className="flex items-center gap-2">
          <IconButton onClick={() => navigate("/wardrobe")} size="small">
            <ArrowBack style={{ color: colors.fourth }} />
          </IconButton>
          <h2 className="text-lg font-semibold dark:text-dark-text text-light-text">
            Style Profile
          </h2>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-2 sm:p-4">
      {/* First-time setup banner */}
      {!hasProfile && (
        <div
          className="rounded-xl border p-4 mb-4"
          style={{ borderColor: toRgba(colors.fourth, 0.4), backgroundColor: toRgba(colors.fourth, 0.08) }}
        >
          <p className="text-sm font-medium dark:text-dark-text/80 text-light-text/80 mb-1">
            Welcome! Let's set up your style profile.
          </p>
          <p className="text-xs dark:text-dark-text/50 text-light-text/50">
            Select the options that best describe you — tap any option to see its description. This helps our AI suggest outfits tailored to your body, preferences, and vibe.
          </p>
        </div>
      )}

      {/* Form card */}
      <div
        className="rounded-xl backdrop-blur-md dark:bg-dark-primary bg-light-secondary border p-4 sm:p-6"
        style={{ borderColor: toRgba(colors.fourth, 0.3) }}
      >
        <h3 className="text-base font-semibold mb-4 dark:text-dark-text/90 text-light-text/90">
          Your Style DNA
        </h3>

        {/* Required fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {REQUIRED_FIELDS.map((field) => (
            <div key={field.key}>
              <label className="block text-xs font-medium mb-2 dark:text-dark-text/60 text-light-text/60">
                {field.label} <span className="text-red-400">*</span>
              </label>
              <div className="flex flex-wrap gap-1.5">
                {getOptionsForField(field.key).map((opt) => {
                  const optValue = opt.value || opt;
                  const optDesc = opt.description || "";
                  const isSelected = formData[field.key] === optValue;
                  return (
                    <button
                      key={optValue}
                      onClick={() => handleChipSelect(field.key, optValue)}
                      title={optDesc}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all
                        ${isSelected
                          ? "text-white"
                          : "dark:text-dark-text/70 text-light-text/70 dark:bg-dark-primary bg-light-secondary hover:opacity-80"
                        }`}
                      style={{
                        backgroundColor: isSelected ? colors.fourth : undefined,
                        borderColor: isSelected ? colors.fourth : toRgba(colors.fourth, 0.3),
                      }}
                    >
                      {optValue}
                    </button>
                  );
                })}
              </div>
              {/* Show description of selected option */}
              {formData[field.key] && (() => {
                const selected = getOptionsForField(field.key).find(
                  (opt) => (opt.value || opt) === formData[field.key]
                );
                const desc = selected?.description;
                return desc ? (
                  <p className="mt-1.5 text-[10px] leading-snug dark:text-dark-text/50 text-light-text/50 italic">
                    {desc}
                  </p>
                ) : null;
              })()}
            </div>
          ))}
        </div>

        {/* Optional section toggle */}
        <button
          onClick={() => setShowOptional(!showOptional)}
          className="mt-6 text-sm font-medium transition-colors"
          style={{ color: colors.fourth }}
        >
          {showOptional ? "Hide" : "Show"} Advanced Options
        </button>

        {/* Optional fields */}
        {showOptional && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-4">
            {OPTIONAL_FIELDS.map((field) => (
              <div key={field.key}>
                <label className="block text-xs font-medium mb-2 dark:text-dark-text/60 text-light-text/60">
                  {field.label}
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {getOptionsForField(field.key).map((opt) => {
                    const optValue = opt.value || opt;
                    const optDesc = opt.description || "";
                    const isSelected = formData[field.key] === optValue;
                    return (
                      <button
                        key={optValue}
                        onClick={() => handleChipSelect(field.key, optValue)}
                        title={optDesc}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all
                          ${isSelected
                            ? "text-white"
                            : "dark:text-dark-text/70 text-light-text/70 dark:bg-dark-primary bg-light-secondary hover:opacity-80"
                          }`}
                        style={{
                          backgroundColor: isSelected ? colors.fourth : undefined,
                          borderColor: isSelected ? colors.fourth : toRgba(colors.fourth, 0.3),
                        }}
                      >
                        {optValue}
                      </button>
                    );
                  })}
                </div>
                {/* Show description of selected option */}
                {formData[field.key] && (() => {
                  const selected = getOptionsForField(field.key).find(
                    (opt) => (opt.value || opt) === formData[field.key]
                  );
                  const desc = selected?.description;
                  return desc ? (
                    <p className="mt-1.5 text-[10px] leading-snug dark:text-dark-text/50 text-light-text/50 italic">
                      {desc}
                    </p>
                  ) : null;
                })()}
              </div>
            ))}
          </div>
        )}

        {/* Save button */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={handleSave}
            disabled={!allRequiredFilled || saving}
            className="px-6 py-2 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
            style={{ backgroundColor: colors.fourth }}
          >
            {saving && <CircularProgress size={14} style={{ color: "white" }} />}
            {hasProfile ? "Update Profile" : "Save Profile"}
          </button>
        </div>
      </div>
      </div>
    </div>
  );
}

export default StyleProfile;
