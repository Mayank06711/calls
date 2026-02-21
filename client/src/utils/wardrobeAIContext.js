import { useEffect } from "react";
import { useSelector } from "react-redux";
import { useAIContext } from "../context/AIContext";

// ── Closet summary ──────────────────────────────────────────────
// "Closet: 23 items (8 tops, 6 bottoms…). Top colors: Navy, White. Fabrics: Cotton, Denim."

export function buildClosetSummary(items) {
  if (!items || items.length === 0) return "Closet is empty.";

  const typeCounts = {};
  const colorFreq = {};
  const fabricFreq = {};

  for (const item of items) {
    typeCounts[item.type] = (typeCounts[item.type] || 0) + 1;

    const colorName = item.dominantColors?.[0]?.name || item.color;
    if (colorName) colorFreq[colorName] = (colorFreq[colorName] || 0) + 1;

    if (item.fabric) fabricFreq[item.fabric] = (fabricFreq[item.fabric] || 0) + 1;
  }

  const typeStr = ["Top", "Bottom", "Full Body", "Outerwear", "Shoes", "Accessory"]
    .filter((t) => typeCounts[t])
    .map((t) => `${typeCounts[t]} ${t.toLowerCase()}${typeCounts[t] > 1 ? "s" : ""}`)
    .join(", ");

  let summary = `Closet: ${items.length} items (${typeStr}).`;

  const topColors = Object.entries(colorFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name]) => name);
  if (topColors.length > 0) summary += ` Top colors: ${topColors.join(", ")}.`;

  const topFabrics = Object.entries(fabricFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name]) => name);
  if (topFabrics.length > 0) summary += ` Common fabrics: ${topFabrics.join(", ")}.`;

  return summary;
}

// ── Style profile + DNA summary ─────────────────────────────────

export function buildStyleProfileSummary(profileData, styleDnaData) {
  if (!profileData) return "Style profile not set up yet.";

  const parts = [];
  if (profileData.bodyShape) parts.push(`${profileData.bodyShape} body`);
  if (profileData.height) parts.push(profileData.height);
  if (profileData.skinTone) {
    let skin = profileData.skinTone;
    if (profileData.undertone) skin += ` (${profileData.undertone} undertone)`;
    parts.push(skin + " skin");
  }
  if (profileData.ageGroup) parts.push(`${profileData.ageGroup} age group`);
  if (profileData.fitPreference) parts.push(`${profileData.fitPreference} fit preference`);
  if (profileData.styleVibe) parts.push(`${profileData.styleVibe} style vibe`);
  if (profileData.colorPaletteSeason) parts.push(`${profileData.colorPaletteSeason} color season`);

  let summary = `Style profile: ${parts.join(", ")}.`;

  const details = [];
  if (profileData.faceShape) details.push(`face: ${profileData.faceShape}`);
  if (profileData.hairType) details.push(`hair: ${profileData.hairType}`);
  if (profileData.hairColor) details.push(`hair color: ${profileData.hairColor}`);
  if (details.length > 0) summary += ` Details: ${details.join(", ")}.`;

  // AI analysis summary
  if (styleDnaData) {
    const dna = styleDnaData;
    const dnaParts = [];
    if (dna.colorSeason?.subSeason) dnaParts.push(`sub-season: ${dna.colorSeason.subSeason}`);
    if (dna.confidence) {
      const avgConf = Object.values(dna.confidence);
      if (avgConf.length > 0) {
        const avg = Math.round((avgConf.reduce((a, b) => a + b, 0) / avgConf.length) * 100);
        dnaParts.push(`avg confidence ${avg}%`);
      }
    }
    if (dnaParts.length > 0) summary += ` AI analysis: ${dnaParts.join(", ")}.`;
  }

  return summary;
}

// ── Base context (shared by all wardrobe pages) ─────────────────

export function buildWardrobeBaseContext(wardrobeState) {
  const { styleProfile, styleDna, closet } = wardrobeState;
  const parts = [];
  parts.push(buildStyleProfileSummary(styleProfile?.data, styleDna?.data));
  parts.push(buildClosetSummary(closet?.items));
  return parts.join(" ");
}

// ── Custom hook for simple wardrobe pages ───────────────────────

export function useWardrobeAIContext(page, buildDescription, deps = []) {
  const { setAIPageContext, clearAIPageContext } = useAIContext();
  const wardrobeState = useSelector((state) => state.wardrobe);

  useEffect(() => {
    const base = buildWardrobeBaseContext(wardrobeState);
    const pageSpecific = buildDescription(wardrobeState);
    const description = pageSpecific ? `${base} ${pageSpecific}` : base;

    setAIPageContext({ page, description });
    return () => clearAIPageContext();
  }, [
    page,
    wardrobeState.styleProfile?.data,
    wardrobeState.styleProfile?.hasProfile,
    wardrobeState.styleDna?.data,
    wardrobeState.closet?.items?.length,
    setAIPageContext,
    clearAIPageContext,
    ...deps, // eslint-disable-line react-hooks/exhaustive-deps
  ]);
}
