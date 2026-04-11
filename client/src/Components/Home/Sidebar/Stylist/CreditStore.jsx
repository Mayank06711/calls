import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button, CircularProgress } from '@mui/material';
import {
  ArrowBack,
  AccountBalanceWallet,
  Stars,
  Add,
  Remove,
} from '@mui/icons-material';
import { useSubscriptionColors, toRgba } from '../../../../utils/getSubscriptionColors';
import {
  fetchCreditBalance,
  fetchCreditPacks,
  fetchCreditTransactions,
  purchaseCreditPack,
  verifyCreditPurchase,
} from '../../../../redux/thunks/booking.thunks';
import { LOADER_TYPES } from '../../../../redux/action_creators';

const CreditStore = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const colors = useSubscriptionColors();

  const creditBalance = useSelector((state) => state.booking.creditBalance);
  const creditPacks = useSelector((state) => state.booking.creditPacks);
  const creditTransactions = useSelector((state) => state.booking.creditTransactions);
  const packsLoading = useSelector((state) => state.loaderState.loaders[LOADER_TYPES.CREDIT_PACKS]);
  const purchaseLoading = useSelector((state) => state.loaderState.loaders[LOADER_TYPES.CREDIT_PURCHASE]);

  const [processingPack, setProcessingPack] = useState(null);

  useEffect(() => {
    dispatch(fetchCreditBalance());
    dispatch(fetchCreditPacks());
    dispatch(fetchCreditTransactions());
  }, [dispatch]);

  const loadRazorpay = () => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePurchase = async (packId, packName) => {
    setProcessingPack(packId);

    const onOrderCreated = async (orderData) => {
      const razorpayLoaded = await loadRazorpay();
      if (!razorpayLoaded) {
        alert('Failed to load Razorpay SDK. Please try again.');
        setProcessingPack(null);
        return;
      }

      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'KYF Fashion AI',
        description: `Purchase ${orderData.packName || packName}`,
        order_id: orderData.providerOrderId,
        handler: async (response) => {
          await dispatch(
            verifyCreditPurchase({
              providerOrderId: response.razorpay_order_id,
              providerPaymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
            })
          );
          setProcessingPack(null);
          // Refresh balance and transactions
          dispatch(fetchCreditBalance());
          dispatch(fetchCreditTransactions());
        },
        modal: {
          ondismiss: () => {
            setProcessingPack(null);
          },
        },
        theme: {
          color: colors.fourth,
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    };

    dispatch(purchaseCreditPack(packId, onOrderCreated));
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.3 },
    },
  };

  return (
    <div className="min-h-screen bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text">
      {/* Header */}
      <div
        className="sticky top-0 z-10 bg-white dark:bg-dark-card border-b border-gray-200 dark:border-gray-700"
        style={{
          backgroundColor: toRgba(colors.fourth, 0.05),
          borderBottomColor: toRgba(colors.fourth, 0.2),
        }}
      >
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/stylist')}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <ArrowBack />
              </button>
              <h1 className="text-2xl font-bold">Credits</h1>
            </div>
            <div
              className="flex items-center gap-2 px-4 py-2 rounded-lg"
              style={{
                backgroundColor: toRgba(colors.fourth, 0.1),
                border: `1px solid ${toRgba(colors.fourth, 0.3)}`,
              }}
            >
              <AccountBalanceWallet style={{ color: colors.fourth }} />
              <span className="font-semibold text-lg">
                {creditBalance !== null ? creditBalance : '---'} Credits
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-8"
        >
          {/* Credit Packs Section */}
          <motion.section variants={itemVariants}>
            <h2 className="text-xl font-semibold mb-4">Purchase Credits</h2>
            {packsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="h-48 rounded-lg animate-pulse bg-gray-200 dark:bg-gray-700"
                  />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {creditPacks?.map((pack) => (
                  <motion.div
                    key={pack.id}
                    variants={itemVariants}
                    className="relative p-6 rounded-lg border-2 transition-all hover:shadow-lg"
                    style={{
                      backgroundColor: pack.popular
                        ? toRgba(colors.fourth, 0.05)
                        : 'transparent',
                      borderColor: pack.popular
                        ? colors.fourth
                        : toRgba(colors.fourth, 0.2),
                    }}
                  >
                    {pack.popular && (
                      <div
                        className="absolute -top-3 left-1/2 transform -translate-x-1/2 px-3 py-1 rounded-full text-xs font-semibold text-white flex items-center gap-1"
                        style={{ backgroundColor: colors.fourth }}
                      >
                        <Stars fontSize="small" />
                        Popular
                      </div>
                    )}
                    <div className="text-center space-y-4">
                      <h3 className="text-xl font-bold">{pack.name}</h3>
                      <div className="text-4xl font-bold" style={{ color: colors.fourth }}>
                        {pack.credits}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Credits</div>
                      <div className="text-2xl font-semibold">₹{pack.priceINR}</div>
                      {pack.credits >= 10 && (
                        <div className="text-sm text-gray-500">
                          ₹{(pack.priceINR / pack.credits).toFixed(2)} per credit
                        </div>
                      )}
                      <Button
                        variant="contained"
                        fullWidth
                        disabled={processingPack === pack.id || purchaseLoading}
                        onClick={() => handlePurchase(pack.id, pack.name)}
                        style={{
                          backgroundColor: colors.fourth,
                          color: 'white',
                        }}
                        sx={{
                          '&:hover': {
                            backgroundColor: colors.fourth,
                            opacity: 0.9,
                          },
                          '&:disabled': {
                            backgroundColor: toRgba(colors.fourth, 0.5),
                            color: 'white',
                          },
                        }}
                      >
                        {processingPack === pack._id ? (
                          <CircularProgress size={24} style={{ color: 'white' }} />
                        ) : (
                          'Buy Now'
                        )}
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.section>

          {/* Transaction History Section */}
          <motion.section variants={itemVariants}>
            <h2 className="text-xl font-semibold mb-4">Recent Transactions</h2>
            <div className="bg-white dark:bg-dark-card rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              {creditTransactions?.transactions?.length > 0 ? (
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {creditTransactions.transactions.slice(0, 10).map((transaction, index) => {
                    const isCredit = transaction.amount > 0;
                    return (
                      <motion.div
                        key={transaction._id || index}
                        variants={itemVariants}
                        className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div
                              className={`p-2 rounded-full ${
                                isCredit
                                  ? 'bg-green-100 dark:bg-green-900'
                                  : 'bg-red-100 dark:bg-red-900'
                              }`}
                            >
                              {isCredit ? (
                                <Add className="text-green-600 dark:text-green-400" />
                              ) : (
                                <Remove className="text-red-600 dark:text-red-400" />
                              )}
                            </div>
                            <div>
                              <div className="font-medium">
                                {transaction.description || 'Transaction'}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                {formatDate(transaction.createdAt || transaction.date)}
                              </div>
                            </div>
                          </div>
                          <div
                            className={`text-lg font-semibold ${
                              isCredit
                                ? 'text-green-600 dark:text-green-400'
                                : 'text-red-600 dark:text-red-400'
                            }`}
                          >
                            {isCredit ? '+' : ''}{transaction.amount}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                  <AccountBalanceWallet
                    style={{ fontSize: 48, marginBottom: 16, opacity: 0.5 }}
                  />
                  <p>No transactions yet</p>
                </div>
              )}
            </div>
          </motion.section>
        </motion.div>
      </div>
    </div>
  );
};

export default CreditStore;
