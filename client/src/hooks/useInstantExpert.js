import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { createInstantBooking } from "../redux/thunks/booking.thunks";

export function useInstantExpert() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showDurationPicker, setShowDurationPicker] = useState(false);
  const [pendingCategory, setPendingCategory] = useState(null);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const findExpert = useCallback(
    (category) => {
      setError(null);
      setPendingCategory(category);
      setShowDurationPicker(true);
    },
    []
  );

  const confirmDuration = useCallback(
    async (duration) => {
      if (loading || !pendingCategory) return;

      setLoading(true);
      setError(null);

      try {
        const result = await dispatch(
          createInstantBooking(
            { category: pendingCategory, duration },
            (booking) => {
              navigate(`/session/${booking._id}`);
            }
          )
        );

        // Always clean up state after thunk completes
        setShowDurationPicker(false);
        setPendingCategory(null);
        setLoading(false);

        if (!result) {
          // No experts or error — thunk already showed notification
          setError("no_experts");
        }
      } catch (err) {
        setShowDurationPicker(false);
        setPendingCategory(null);
        setError(err.message || "Failed to create instant session");
        setLoading(false);
      }
    },
    [loading, pendingCategory, dispatch, navigate]
  );

  const cancelPicker = useCallback(() => {
    setShowDurationPicker(false);
    setPendingCategory(null);
    setError(null);
  }, []);

  return {
    findExpert,
    confirmDuration,
    cancelPicker,
    showDurationPicker,
    loading,
    error,
    pendingCategory,
  };
}
