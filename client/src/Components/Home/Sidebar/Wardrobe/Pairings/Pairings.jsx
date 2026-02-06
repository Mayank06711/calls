import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { ArrowBack } from "@mui/icons-material";
import { CircularProgress, IconButton } from "@mui/material";
import { useSubscriptionColors } from "../../../../../utils/getSubscriptionColors";
import { generatePairingsThunk, fetchClosetThunk } from "../../../../../redux/thunks/wardrobe.thunks";
import OccasionSeasonPicker from "../shared/OccasionSeasonPicker";
import PairingCard from "./PairingCard";
import PremiumGate from "../shared/PremiumGate";

function Pairings() {
  const colors = useSubscriptionColors();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { loading, data: pairings, unpaired, error } = useSelector(
    (state) => state.wardrobe.pairings
  );
  const { items: closetItems } = useSelector((state) => state.wardrobe.closet);

  const [occasion, setOccasion] = useState("");
  const [season, setSeason] = useState("");

  useEffect(() => {
    if (closetItems.length === 0) dispatch(fetchClosetThunk());
  }, [dispatch, closetItems.length]);

  // Auto-dismiss error after 5 seconds
  useEffect(() => {
    if (error) {
      const t = setTimeout(() => {
        // Clear the error by re-dispatching with empty
      }, 5000);
      return () => clearTimeout(t);
    }
  }, [error]);

  const handleGenerate = () => {
    if (!occasion || !season) return;
    dispatch(generatePairingsThunk({ occasion, season }));
  };

  return (
    <div className="p-2 sm:p-4 w-full h-full overflow-y-auto custom-scrollbar">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4 pr-12">
        <IconButton onClick={() => navigate("/wardrobe")} size="small">
          <ArrowBack style={{ color: colors.fourth }} />
        </IconButton>
        <h2 className="text-lg font-semibold dark:text-dark-text text-light-text">
          All Pairings
        </h2>
      </div>

      <PremiumGate requiredTier="Silver" message="Pairings require Silver or above">
        {/* Controls */}
        <div
          className="w-full rounded-xl backdrop-blur-md dark:bg-dark-primary bg-light-secondary border p-4 mb-4"
          style={{ borderColor: `${colors.fourth}30` }}
        >
          <OccasionSeasonPicker
            occasion={occasion}
            season={season}
            onOccasionChange={setOccasion}
            onSeasonChange={setSeason}
          />
          <div className="mt-3 flex justify-end">
            <button
              onClick={handleGenerate}
              disabled={!occasion || !season || loading}
              className="px-5 py-2 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
              style={{ backgroundColor: colors.fourth }}
            >
              {loading && <CircularProgress size={14} style={{ color: "white" }} />}
              Generate Pairings
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 mb-4">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Results count */}
        {pairings.length > 0 && (
          <p className="text-xs dark:text-dark-text/50 text-light-text/50 mb-3">
            {pairings.length} outfit combos
          </p>
        )}

        {/* Loading skeletons */}
        {loading && (
          <div className="space-y-3 mb-4">
            {Array.from({ length: 3 }).map((_, idx) => (
              <div
                key={idx}
                className="w-full rounded-xl border p-4 animate-pulse"
                style={{ borderColor: `${colors.fourth}20` }}
              >
                <div className="h-2 w-16 rounded dark:bg-dark-text/10 bg-light-text/10 mb-3" />
                <div className="flex items-stretch gap-3 mb-3">
                  <div className="flex-1 rounded-lg overflow-hidden" style={{ backgroundColor: `${colors.fourth}08` }}>
                    <div className="w-full h-24 dark:bg-dark-text/5 bg-light-text/5" />
                    <div className="p-2"><div className="h-3 rounded dark:bg-dark-text/10 bg-light-text/10 w-3/4 mx-auto" /></div>
                  </div>
                  <span className="text-lg dark:text-dark-text/10 text-light-text/10 self-center">+</span>
                  <div className="flex-1 rounded-lg overflow-hidden" style={{ backgroundColor: `${colors.fourth}08` }}>
                    <div className="w-full h-24 dark:bg-dark-text/5 bg-light-text/5" />
                    <div className="p-2"><div className="h-3 rounded dark:bg-dark-text/10 bg-light-text/10 w-3/4 mx-auto" /></div>
                  </div>
                </div>
                <div className="flex gap-6">
                  <div className="h-2 w-24 rounded dark:bg-dark-text/5 bg-light-text/5" />
                  <div className="h-2 w-20 rounded dark:bg-dark-text/5 bg-light-text/5" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pairing cards */}
        {!loading && (
          <div className="space-y-3">
            {pairings.map((pairing, idx) => (
              <PairingCard key={idx} pairing={pairing} index={idx} closetItems={closetItems} />
            ))}
          </div>
        )}

        {/* Empty state — only show if no pairings AND not loading */}
        {pairings.length === 0 && !loading && !error && (
          <div
            className="w-full rounded-xl backdrop-blur-md dark:bg-dark-primary bg-light-secondary border p-6 text-center"
            style={{ borderColor: `${colors.fourth}30` }}
          >
            <span className="text-3xl block mb-2 opacity-30">👔</span>
            <p className="text-sm dark:text-dark-text/50 text-light-text/50">
              Select an occasion and season, then generate pairings
            </p>
          </div>
        )}

        {/* Unpaired */}
        {unpaired && (Array.isArray(unpaired) ? unpaired.length > 0 : (unpaired.tops?.length > 0 || unpaired.bottoms?.length > 0)) && (
          <div
            className="w-full rounded-xl backdrop-blur-md dark:bg-dark-primary bg-light-secondary border p-4 mt-4"
            style={{ borderColor: `${colors.fourth}30` }}
          >
            <h4 className="text-sm font-semibold mb-2 dark:text-dark-text/70 text-light-text/70">
              Unpaired Items
            </h4>
            <div className="space-y-1">
              {Array.isArray(unpaired)
                ? unpaired.map((item, idx) => (
                    <p key={idx} className="text-xs dark:text-dark-text/50 text-light-text/50">
                      {item.subcategory || item.name} — {item.reason || "no match found"}
                    </p>
                  ))
                : [...(unpaired.tops || []), ...(unpaired.bottoms || [])].map((item, idx) => (
                    <p key={idx} className="text-xs dark:text-dark-text/50 text-light-text/50">
                      {item.subcategory || item.name} — {item.reason || "no match found"}
                    </p>
                  ))
              }
            </div>
          </div>
        )}
      </PremiumGate>
    </div>
  );
}

export default Pairings;
