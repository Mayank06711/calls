import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  Face,
  Palette,
  Style,
  AutoAwesome,
  Accessibility,
  ContentCut,
  WbSunny,
  Refresh,
  CheckCircle,
  Warning,
  CloudUpload,
  Person,
} from '@mui/icons-material';
import { LinearProgress } from '@mui/material';
import { useSubscriptionColors, toRgba } from '../../../../../../utils/getSubscriptionColors';
import { uploadFile } from '../../../../../../utils/cloudinaryUtils';
import {
  analyzeStyleDnaThunk,
  fetchStyleDnaThunk,
  markAutoFillAppliedThunk,
  generateUploadUrlThunk,
} from '../../../../../../redux/thunks/wardrobe.thunks';
import { fetchStyleProfileThunk, updateStyleProfileThunk } from '../../../../../../redux/thunks/wardrobe.thunks';
import { showNotification } from '../../../../../../redux/actions/notification.actions';

// ─── Auto-fill field categorization ──────────────────────────────────────────

function computeAutoFillCategories(styleDna, profileData) {
  const mapping = styleDna?.meta?.autoFillMapping;
  if (!mapping || Object.keys(mapping).length === 0) return { silent: [], conflicts: [] };

  const prevApplied = styleDna?.meta?.autoFilledValues || null;
  const silent = []; // fields to auto-fill without asking
  const conflicts = []; // fields where user edited → need review

  for (const [field, newValue] of Object.entries(mapping)) {
    const currentVal = profileData?.[field];

    // Current value is same as new → nothing to do
    if (currentVal === newValue) continue;

    // Field is empty → fill silently
    if (!currentVal) {
      silent.push({ field, value: newValue });
      continue;
    }

    // No previous auto-fill tracking → field was manually set, skip
    if (!prevApplied) continue;

    // Field was previously auto-filled and user didn't change it → update silently
    if (prevApplied[field] && currentVal === prevApplied[field]) {
      silent.push({ field, value: newValue });
      continue;
    }

    // Field was previously auto-filled but user changed it → conflict
    if (prevApplied[field] && currentVal !== prevApplied[field]) {
      conflicts.push({ field, currentValue: currentVal, detectedValue: newValue });
      continue;
    }
  }

  return { silent, conflicts };
}

const FIELD_LABELS = {
  bodyShape: 'Body Shape', skinTone: 'Skin Tone', undertone: 'Undertone',
  ageGroup: 'Age Group', faceShape: 'Face Shape', eyeShape: 'Eye Shape',
  lipShape: 'Lip Shape', hairType: 'Hair Type', hairColor: 'Hair Color',
  colorPaletteSeason: 'Color Season',
};

// ─── Category Card ───────────────────────────────────────────────────────────

function CategoryCard({ icon: Icon, title, description, chips, swatches, colors }) {
  return (
    <div
      className="p-4 rounded-xl border"
      style={{ borderColor: toRgba(colors.fourth, 0.25), backgroundColor: toRgba(colors.fourth, 0.04) }}
    >
      <div className="flex items-center gap-3 mb-3">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
          style={{ backgroundColor: toRgba(colors.fourth, 0.15) }}
        >
          <Icon style={{ color: colors.fourth, fontSize: 20 }} />
        </div>
        <h3 className="font-semibold dark:text-dark-text text-light-text">{title}</h3>
      </div>

      {description && (
        <p className="text-sm dark:text-gray-400 text-gray-600 mb-3 leading-relaxed">{description}</p>
      )}

      {chips && chips.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {chips.map((chip, i) => (
            <span
              key={i}
              className="text-xs px-2.5 py-1 rounded-full font-medium"
              style={{
                backgroundColor: toRgba(colors.fourth, 0.12),
                color: colors.fourth,
                border: `1px solid ${toRgba(colors.fourth, 0.25)}`,
              }}
            >
              {chip}
            </span>
          ))}
        </div>
      )}

      {swatches && swatches.length > 0 && (
        <div className="flex gap-2 mt-2">
          {swatches.map((hex, i) => (
            <div
              key={i}
              className="w-7 h-7 rounded-full border-2"
              style={{ backgroundColor: hex, borderColor: toRgba(colors.fourth, 0.3) }}
              title={hex}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

function MyStyle() {
  const dispatch = useDispatch();
  const colors = useSubscriptionColors();
  const { styleDna, styleProfile } = useSelector((s) => s.wardrobe);
  const userInfo = useSelector((s) => s.userInfo);
  const userData = userInfo?.data || {};
  const hasPhoto = !!(userData?.photo?.url || userData?.photo?.thumbnailUrl);

  const [conflicts, setConflicts] = useState([]);
  const [selectedConflicts, setSelectedConflicts] = useState({});
  const [uploading, setUploading] = useState(false);
  const autoFillAppliedRef = useRef(false);
  const fileInputRef = useRef(null);

  // ── Fetch on mount ───────────────────────────────────────────────
  useEffect(() => {
    dispatch(fetchStyleDnaThunk());
    dispatch(fetchStyleProfileThunk());
  }, [dispatch]);

  // ── Auto-fill logic when analysis data arrives ───────────────────
  useEffect(() => {
    if (!styleDna.data || !styleDna.hasAnalysis || autoFillAppliedRef.current) return;
    if (styleProfile.loading) return;

    const { silent, conflicts: detectedConflicts } = computeAutoFillCategories(
      styleDna.data,
      styleProfile.data
    );

    if (silent.length > 0 && detectedConflicts.length === 0 && styleProfile.data) {
      const updates = {};
      const appliedValues = {};
      silent.forEach(({ field, value }) => {
        updates[field] = value;
        appliedValues[field] = value;
      });
      dispatch(updateStyleProfileThunk({ ...styleProfile.data, ...updates }));
      dispatch(markAutoFillAppliedThunk(appliedValues));
      autoFillAppliedRef.current = true;
    }

    if (!styleProfile.data) {
      autoFillAppliedRef.current = true;
    }

    if (detectedConflicts.length > 0) {
      setConflicts(detectedConflicts);
      autoFillAppliedRef.current = true;
    }
  }, [styleDna.data, styleDna.hasAnalysis, styleProfile.data, styleProfile.loading, dispatch]);

  // ── Shared result handler ────────────────────────────────────────

  const handleAnalyzeResult = useCallback((result) => {
    if (result?.success && !result.skipped) {
      dispatch(showNotification('Style DNA analysis complete!', 200));
    } else if (result?.skipped) {
      const msg = result.reason === 'multiple_people'
        ? 'Multiple people detected. Please upload a solo photo of yourself.'
        : 'No face detected in photo. Try a clear portrait.';
      dispatch(showNotification(msg, 400));
    }
  }, [dispatch]);

  // ── Option 1: Analyze using profile photo ────────────────────────

  const handleAnalyzeProfile = useCallback(async () => {
    if (!hasPhoto) {
      dispatch(showNotification('No profile photo found. Upload one or use "Upload Photo" option.', 400));
      return;
    }
    const result = await dispatch(analyzeStyleDnaThunk());
    handleAnalyzeResult(result);
  }, [dispatch, hasPhoto, handleAnalyzeResult]);

  // ── Option 2: Upload a separate photo and analyze ────────────────

  const handleUploadAndAnalyze = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      dispatch(showNotification('Please upload a JPEG, PNG, or WebP image.', 400));
      return;
    }
    if (file.size > MAX_SIZE) {
      dispatch(showNotification('Image must be under 5MB.', 400));
      return;
    }

    try {
      setUploading(true);
      // Get presigned upload URL from server, then upload via shared util
      const urlResult = await dispatch(generateUploadUrlThunk({ fileName: file.name, contentType: file.type }));
      if (!urlResult?.success) throw new Error('Failed to get upload URL');
      const imageUrl = await uploadFile(file, urlResult.data);
      setUploading(false);
      const result = await dispatch(analyzeStyleDnaThunk(imageUrl));
      handleAnalyzeResult(result);
    } catch (err) {
      setUploading(false);
      dispatch(showNotification(err.message || 'Upload failed. Try again.', 400));
    }
  }, [dispatch, handleAnalyzeResult]);

  const handleConflictToggle = useCallback((field) => {
    setSelectedConflicts((prev) => ({ ...prev, [field]: !prev[field] }));
  }, []);

  const handleApplyConflicts = useCallback(async () => {
    const updates = {};
    const appliedValues = { ...(styleDna.data?.meta?.autoFilledValues || {}) };
    conflicts.forEach(({ field, detectedValue }) => {
      if (selectedConflicts[field]) {
        updates[field] = detectedValue;
        appliedValues[field] = detectedValue;
      }
    });
    if (Object.keys(updates).length > 0 && styleProfile.data) {
      await dispatch(updateStyleProfileThunk({ ...styleProfile.data, ...updates }));
    }
    dispatch(markAutoFillAppliedThunk(appliedValues));
    setConflicts([]);
    setSelectedConflicts({});
  }, [conflicts, selectedConflicts, styleDna.data, styleProfile.data, dispatch]);

  const handleKeepMyValues = useCallback(() => {
    const appliedValues = { ...(styleDna.data?.meta?.autoFilledValues || {}) };
    dispatch(markAutoFillAppliedThunk(appliedValues));
    setConflicts([]);
    setSelectedConflicts({});
  }, [styleDna.data, dispatch]);

  // ── Build card data from analysis ────────────────────────────────

  const dna = styleDna.data;
  const desc = dna?.descriptions || {};

  const bodyChips = [
    dna?.body?.shape && `Shape: ${dna.body.shape}`,
    dna?.body?.heightCategory && `Height: ${dna.body.heightCategory}`,
  ].filter(Boolean);

  const faceChips = [
    dna?.face?.faceShape && `Face: ${dna.face.faceShape}`,
    dna?.face?.estimatedAge && `Age: ~${dna.face.estimatedAge}`,
    dna?.face?.eyeShape && `Eyes: ${dna.face.eyeShape}`,
    dna?.face?.lipFullness && `Lips: ${dna.face.lipFullness}`,
  ].filter(Boolean);

  const skinChips = [
    dna?.skin?.monkTone && `Monk Tone: ${dna.skin.monkTone}`,
    dna?.skin?.undertone && `Undertone: ${dna.skin.undertone}`,
  ].filter(Boolean);
  const skinSwatches = [dna?.skin?.hex, dna?.skin?.referenceHex].filter(Boolean);

  const hairChips = [
    dna?.hair?.type && `Type: ${dna.hair.type}`,
    dna?.hair?.color?.name && `Color: ${dna.hair.color.name}`,
  ].filter(Boolean);

  const seasonChips = [
    dna?.colorSeason?.season && `Season: ${dna.colorSeason.season}`,
    dna?.colorSeason?.subSeason && `Sub: ${dna.colorSeason.subSeason}`,
  ].filter(Boolean);
  const seasonSwatches = dna?.colorSeason?.palette || [];

  // ── Render ───────────────────────────────────────────────────────

  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="text-center mb-6">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3"
          style={{
            background: `linear-gradient(135deg, ${toRgba(colors.fourth, 0.3)}, ${toRgba(colors.fourth, 0.1)})`,
            border: `2px solid ${toRgba(colors.fourth, 0.5)}`,
          }}
        >
          <Style className="text-3xl" style={{ color: colors.fourth }} />
        </div>

        <h1
          className="text-2xl md:text-3xl font-bold mb-1"
          style={{
            background: `linear-gradient(90deg, ${colors.fourth}, ${colors.first || colors.fourth})`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          My Style DNA
        </h1>

        {dna?.analyzedAt && (
          <p className="text-xs dark:text-gray-500 text-gray-400 mt-1">
            Analyzed {new Date(dna.analyzedAt).toLocaleDateString()}
          </p>
        )}

        {/* Re-analyze controls (shown after initial analysis) */}
        {styleDna.hasAnalysis && (
          <div className="flex items-center justify-center gap-3 mt-3">
            {hasPhoto && (
              <button
                onClick={handleAnalyzeProfile}
                disabled={styleDna.analyzing || uploading}
                className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full transition-opacity hover:opacity-80 disabled:opacity-50"
                style={{
                  backgroundColor: toRgba(colors.fourth, 0.12),
                  color: colors.fourth,
                  border: `1px solid ${toRgba(colors.fourth, 0.3)}`,
                }}
              >
                <Refresh style={{ fontSize: 16 }} />
                Re-analyze Profile Photo
              </button>
            )}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={styleDna.analyzing || uploading}
              className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full transition-opacity hover:opacity-80 disabled:opacity-50"
              style={{
                backgroundColor: toRgba(colors.fourth, 0.12),
                color: colors.fourth,
                border: `1px solid ${toRgba(colors.fourth, 0.3)}`,
              }}
            >
              <CloudUpload style={{ fontSize: 16 }} />
              Upload New Photo
            </button>
          </div>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleUploadAndAnalyze}
      />

      {/* Uploading progress */}
      {uploading && (
        <div
          className="p-4 rounded-xl mb-6"
          style={{ backgroundColor: toRgba(colors.fourth, 0.08), border: `1px solid ${toRgba(colors.fourth, 0.2)}` }}
        >
          <div className="flex items-center gap-2 mb-2">
            <CloudUpload style={{ color: colors.fourth, fontSize: 18 }} />
            <span className="text-sm font-medium dark:text-dark-text text-light-text">Uploading photo...</span>
          </div>
          <LinearProgress
            sx={{
              borderRadius: 4, height: 6,
              backgroundColor: toRgba(colors.fourth, 0.15),
              '& .MuiLinearProgress-bar': { backgroundColor: colors.fourth },
            }}
          />
        </div>
      )}

      {/* Analyzing progress */}
      {styleDna.analyzing && (
        <div
          className="p-4 rounded-xl mb-6"
          style={{ backgroundColor: toRgba(colors.fourth, 0.08), border: `1px solid ${toRgba(colors.fourth, 0.2)}` }}
        >
          <div className="flex items-center gap-2 mb-2">
            <AutoAwesome className="animate-spin" style={{ color: colors.fourth, fontSize: 18 }} />
            <span className="text-sm font-medium dark:text-dark-text text-light-text">Analyzing your photo...</span>
          </div>
          <LinearProgress
            sx={{
              borderRadius: 4,
              height: 6,
              backgroundColor: toRgba(colors.fourth, 0.15),
              '& .MuiLinearProgress-bar': { backgroundColor: colors.fourth },
            }}
          />
          <p className="text-xs dark:text-gray-500 text-gray-400 mt-2">
            Running 6-stage AI pipeline: body, face, skin, hair, color season...
          </p>
        </div>
      )}

      {/* Error state */}
      {styleDna.error && !styleDna.analyzing && (
        <div
          className="p-4 rounded-xl mb-6 text-center"
          style={{ backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}
        >
          <Warning style={{ color: '#ef4444', fontSize: 32 }} className="mb-2" />
          <p className="text-sm text-red-500 mb-3">{styleDna.error}</p>
          <div className="flex gap-2 justify-center">
            {hasPhoto && (
              <button
                onClick={handleAnalyzeProfile}
                className="text-sm px-4 py-1.5 rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors"
              >
                Try Profile Photo
              </button>
            )}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="text-sm px-4 py-1.5 rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors"
            >
              Upload Photo
            </button>
          </div>
        </div>
      )}

      {/* Conflict review banner (re-analysis with user-edited conflicts) */}
      {conflicts.length > 0 && (
        <div
          className="p-4 rounded-xl mb-6"
          style={{ backgroundColor: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)' }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Warning style={{ color: '#f59e0b', fontSize: 18 }} />
            <span className="text-sm font-medium dark:text-dark-text text-light-text">
              {conflicts.length} field{conflicts.length > 1 ? 's' : ''} you edited {conflicts.length > 1 ? 'have' : 'has'} new detected values:
            </span>
          </div>
          <div className="space-y-2 mb-3">
            {conflicts.map(({ field, currentValue, detectedValue }) => (
              <label
                key={field}
                className="flex items-center gap-2 text-sm cursor-pointer dark:text-gray-300 text-gray-700"
              >
                <input
                  type="checkbox"
                  checked={!!selectedConflicts[field]}
                  onChange={() => handleConflictToggle(field)}
                  className="rounded"
                  style={{ accentColor: colors.fourth }}
                />
                <span className="font-medium">{FIELD_LABELS[field] || field}:</span>
                <span className="line-through opacity-60">{currentValue}</span>
                <span>→</span>
                <span style={{ color: colors.fourth }}>{detectedValue}</span>
              </label>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleApplyConflicts}
              disabled={!Object.values(selectedConflicts).some(Boolean)}
              className="text-xs px-3 py-1.5 rounded-full text-white transition-opacity hover:opacity-90 disabled:opacity-40"
              style={{ backgroundColor: colors.fourth }}
            >
              Update Selected
            </button>
            <button
              onClick={handleKeepMyValues}
              className="text-xs px-3 py-1.5 rounded-full transition-opacity hover:opacity-80"
              style={{
                backgroundColor: toRgba(colors.fourth, 0.1),
                color: colors.fourth,
                border: `1px solid ${toRgba(colors.fourth, 0.3)}`,
              }}
            >
              Keep My Values
            </button>
          </div>
        </div>
      )}

      {/* ─── Has analysis → 6 category cards ──────────────────────── */}
      {styleDna.hasAnalysis && !styleDna.analyzing && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
            <CategoryCard
              icon={Accessibility}
              title="Body Profile"
              description={desc.body}
              chips={bodyChips}
              colors={colors}
            />
            <CategoryCard
              icon={Face}
              title="Face"
              description={desc.face}
              chips={faceChips}
              colors={colors}
            />
            <CategoryCard
              icon={Palette}
              title="Skin"
              description={desc.skin}
              chips={skinChips}
              swatches={skinSwatches}
              colors={colors}
            />
            <CategoryCard
              icon={ContentCut}
              title="Hair"
              description={desc.hair}
              chips={hairChips}
              colors={colors}
            />
            <CategoryCard
              icon={WbSunny}
              title="Color Season"
              description={desc.colorSeason}
              chips={seasonChips}
              swatches={seasonSwatches}
              colors={colors}
            />
            <CategoryCard
              icon={AutoAwesome}
              title="Summary"
              description={desc.summary}
              colors={colors}
            />
          </div>

          {/* Auto-filled indicator */}
          {dna?.meta?.autoFilledValues && Object.keys(dna.meta.autoFilledValues).length > 0 && (
            <div className="flex items-center justify-center gap-1.5 mt-4">
              <CheckCircle style={{ color: toRgba(colors.fourth, 0.5), fontSize: 14 }} />
              <span className="text-xs dark:text-gray-500 text-gray-400">
                {Object.keys(dna.meta.autoFilledValues).length} style profile fields auto-filled from analysis
              </span>
            </div>
          )}
        </>
      )}

      {/* ─── No analysis yet → Two options: profile photo or upload ── */}
      {!styleDna.hasAnalysis && !styleDna.analyzing && !styleDna.error && (
        <div className="max-w-lg mx-auto">
          <div
            className="p-6 rounded-2xl"
            style={{ backgroundColor: toRgba(colors.fourth, 0.06), border: `1px dashed ${toRgba(colors.fourth, 0.3)}` }}
          >
            <AutoAwesome style={{ color: colors.fourth, fontSize: 40 }} className="mx-auto mb-3 block" />
            <h3 className="font-semibold dark:text-dark-text text-light-text mb-2 text-center">
              Discover Your Style DNA
            </h3>
            <p className="text-sm dark:text-gray-400 text-gray-500 mb-5 text-center">
              Analyze a photo to discover your body shape, skin tone, ideal color palette, and more.
              Use a clear solo portrait for best results.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              {/* Option 1: Use profile photo */}
              {hasPhoto && (
                <button
                  onClick={handleAnalyzeProfile}
                  disabled={styleDna.analyzing || uploading}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                  style={{ backgroundColor: colors.fourth }}
                >
                  <Person style={{ fontSize: 18 }} />
                  Use Profile Photo
                </button>
              )}

              {/* Option 2: Upload a different photo */}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={styleDna.analyzing || uploading}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{
                  backgroundColor: toRgba(colors.fourth, 0.12),
                  color: colors.fourth,
                  border: `1px solid ${toRgba(colors.fourth, 0.3)}`,
                }}
              >
                <CloudUpload style={{ fontSize: 18 }} />
                Upload a Photo
              </button>
            </div>

            <p className="text-xs dark:text-gray-500 text-gray-400 mt-3 text-center">
              Uploading a photo here won't change your profile picture.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default MyStyle;
