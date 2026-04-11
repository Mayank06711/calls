import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { AccountBalanceWalletOutlined } from '@mui/icons-material';
import { useSubscriptionColors, toRgba } from '../../../../utils/getSubscriptionColors';
import { fetchCreditBalance } from '../../../../redux/thunks/booking.thunks';

/**
 * CreditBalance - Displays user's credit balance as a pill/badge
 * @param {Object} props
 * @param {boolean} props.showTopUp - Whether to show "Top Up" link (default: true)
 * @param {boolean} props.compact - Compact mode shows just the number (default: false)
 */
const CreditBalance = ({ showTopUp = true, compact = false }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const colors = useSubscriptionColors();

  const creditBalance = useSelector((state) => state.booking?.creditBalance || 0);

  useEffect(() => {
    // Fetch credit balance on mount if it's 0 (initial fetch)
    if (creditBalance === 0) {
      dispatch(fetchCreditBalance());
    }
  }, [dispatch, creditBalance]);

  const handleTopUpClick = () => {
    navigate('/stylist/credits');
  };

  if (compact) {
    return (
      <div
        className="inline-flex items-center justify-center px-3 py-1 rounded-full border"
        style={{
          borderColor: toRgba(colors.fourth, 0.3),
          backgroundColor: toRgba(colors.fourth, 0.1),
        }}
      >
        <span
          className="text-sm font-semibold"
          style={{ color: colors.fourth }}
        >
          {creditBalance}
        </span>
      </div>
    );
  }

  return (
    <div
      className="inline-flex items-center gap-2 px-4 py-2 rounded-full border"
      style={{
        borderColor: toRgba(colors.fourth, 0.3),
        backgroundColor: toRgba(colors.fourth, 0.05),
      }}
    >
      <AccountBalanceWalletOutlined
        sx={{
          fontSize: 18,
          color: colors.fourth,
        }}
      />
      <span
        className="text-sm font-semibold"
        style={{ color: colors.fourth }}
      >
        {creditBalance} {creditBalance === 1 ? 'Credit' : 'Credits'}
      </span>
      {showTopUp && (
        <>
          <span
            className="text-sm"
            style={{ color: toRgba(colors.fourth, 0.4) }}
          >
            |
          </span>
          <button
            onClick={handleTopUpClick}
            className="text-sm font-medium hover:underline transition-all"
            style={{ color: colors.fourth }}
          >
            Top Up
          </button>
        </>
      )}
    </div>
  );
};

export default CreditBalance;
