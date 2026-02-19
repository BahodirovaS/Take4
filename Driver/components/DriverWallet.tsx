import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl,
  Alert, Linking, ActivityIndicator, SafeAreaView
} from 'react-native';
import { useAuth } from '@clerk/clerk-expo';
import CustomButton from '@/components/CustomButton';
import { Ionicons } from '@expo/vector-icons';
import { WalletData } from '@/types/type';
import { router, useFocusEffect } from 'expo-router';
import {
  getDriverProfileExists,
  getDriverEmailFromProfile,
  getDriverOnboardingStatus,
  getWalletSummary,
  createStripeDashboardLink,
  createStripeOnboardingLink,
} from '@/lib/fetch';

const DriverWallet: React.FC = () => {
  const { userId } = useAuth();

  const [walletData, setWalletData] = useState<WalletData>({
    totalEarnings: 0,
    availableBalance: 0,
    pendingBalance: 0,
    recentPayments: [],
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [onboardingCompleted, setOnboardingCompleted] = useState(false);
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);

  const [driverEmail, setDriverEmail] = useState<string>('');
  const [accountExists, setAccountExists] = useState(false);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [openingDashboard, setOpeningDashboard] = useState(false);

  const [hasDriverProfile, setHasDriverProfile] = useState<boolean>(true);
  const [checkingProfile, setCheckingProfile] = useState<boolean>(true);

  const loadAll = useCallback(async () => {
    if (!userId) return;
    try {
      setLoading(true);
      setCheckingProfile(true);
      setCheckingOnboarding(true);

      const [exists, email, status, summary] = await Promise.all([
        getDriverProfileExists(userId),
        getDriverEmailFromProfile(userId),
        getDriverOnboardingStatus(userId),
        getWalletSummary(userId),
      ]);

      setHasDriverProfile(exists);
      setDriverEmail(email ?? '');
      setOnboardingCompleted(status.onboardingCompleted);
      setAccountExists(status.accountExists);
      setAccountId(status.accountId);
      setWalletData(summary);
    } catch (error) {
      console.error('Wallet load error:', error);
      Alert.alert('Error', 'Failed to load wallet data. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
      setCheckingProfile(false);
      setCheckingOnboarding(false);
    }
  }, [userId]);

  useEffect(() => { loadAll(); }, [loadAll]);
  useFocusEffect(useCallback(() => { loadAll(); }, [loadAll]));

  const handleRefresh = () => {
    setRefreshing(true);
    loadAll();
  };

  const openStripeDashboard = async () => {
    try {
      setOpeningDashboard(true);
      const resp = await createStripeDashboardLink(userId!, accountId);
          console.log("createStripeDashboardLink resp:", resp);

      if (resp.success && resp.url) {
        Linking.openURL(resp.url);
      } else {
        Alert.alert('Error', resp?.error || 'Unable to open Stripe dashboard. Please try again.');
      }
    } catch (error) {
      console.error('Error opening Stripe dashboard:', error);
      Alert.alert('Error', 'Failed to open dashboard. Please check your connection.');
    } finally {
      setOpeningDashboard(false);
    }
  };

  const openBankingInfo = async () => {
  try {
    // 1) Narrow userId first
    if (!userId) {
      Alert.alert('Not signed in', 'Please sign in again.');
      return;
    }

    // 2) Ensure a non-empty email string
    const emailToUse = (driverEmail && driverEmail.trim()) || 'driver@email.com';

    // 3) Now userId is a string, so this matches the helper signature
    const resp = await createStripeOnboardingLink(userId, emailToUse); // { success, url?, error? }

    if (resp.success && resp.url) {
      Alert.alert(
        'Bank Account Setup',
        "You'll be redirected to Stripe to set up your bank account. After completing the setup:\n\n1. Close the browser\n2. Return to this app\n3. Pull down to refresh",
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Continue to Stripe',
            onPress: async () => {
              // 4) Guard url before opening
              if (resp.url) await Linking.openURL(resp.url);
              setTimeout(() => {
                Alert.alert('📱 Return to App', 'After setup, pull to refresh to update your status.');
              }, 1200);
            },
          },
        ]
      );
    } else {
      Alert.alert('Error', resp?.error || 'Unable to start bank account setup. Please try again.');
    }
  } catch (error) {
    console.error('Error creating onboarding link:', error);
    Alert.alert('Error', 'Failed to start setup process. Please check your connection.');
  }
};
  const formatDate = (date: Date) =>
    date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  const renderRecentPayments = () => {
    if (walletData.recentPayments.length === 0) {
      return <Text style={styles.noPaymentsText}>No payments yet</Text>;
    }

    return (
      <View style={styles.paymentsContainer}>
        <ScrollView
          contentContainerStyle={styles.paymentsScrollContent}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled
        >
          {walletData.recentPayments.map((payment) => (
            <View key={payment.id} style={styles.paymentCardContainer}>
              <View style={styles.paymentItem}>
                <View style={styles.paymentIcon}>
                  <Ionicons
                    name={payment.type === 'tip' ? 'heart' : 'car'}
                    size={20}
                    color="#3f7564"
                  />
                </View>
                <View style={styles.paymentInfo}>
                  <Text style={styles.paymentTitle}>
                    {payment.type === 'tip' ? 'Tip' : 'Ride'} • {payment.passengerName}
                    {payment.status === 'pending' && <Text style={styles.pendingBadge}> • Pending</Text>}
                  </Text>
                  <Text style={styles.paymentDate}>{formatDate(payment.createdAt)}</Text>
                </View>
                <Text style={[
                  styles.paymentAmount,
                  payment.status === 'pending' && styles.pendingPaymentAmount
                ]}>
                  +${payment.driverShare.toFixed(2)}
                </Text>
              </View>
            </View>
          ))}
        </ScrollView>
      </View>
    );
  };

  if (loading || checkingOnboarding) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3f7564" />
          <Text style={styles.loadingText}>Loading wallet...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        <View style={styles.balanceCard}>
          <Text style={styles.balanceTitle}>Your Earnings</Text>
          <Text style={styles.totalEarnings}>${walletData.totalEarnings.toFixed(2)}</Text>

          <View style={styles.balanceRow}>
            <View style={styles.balanceItem}>
              <Text style={styles.balanceLabel}>Available</Text>
              <Text style={styles.availableAmount}>${walletData.availableBalance.toFixed(2)}</Text>
              <Text style={styles.balanceSubtext}>Ready to transfer</Text>
            </View>
            <View style={styles.balanceItem}>
              <Text style={styles.balanceLabel}>Pending</Text>
              <Text style={styles.pendingAmount}>${walletData.pendingBalance.toFixed(2)}</Text>
              <Text style={styles.balanceSubtext}>From active rides</Text>
            </View>
          </View>
        </View>

        {!checkingProfile && !hasDriverProfile && (
          <View style={styles.profilePromptCard}>
            <Ionicons name="person-circle" size={24} color="#B45309" />
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={styles.profilePromptTitle}>Complete Your Profile</Text>
              <Text style={styles.profilePromptDesc}>
                Please complete your profile information before setting up your bank.
              </Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/(root)/(tabs)/profile')}>
              <Text style={styles.profilePromptAction}>Complete</Text>
            </TouchableOpacity>
          </View>
        )}

        {!onboardingCompleted && (
          <View style={styles.warningCard}>
            <Ionicons name="warning" size={24} color="#FF9500" />
            <View style={styles.warningText}>
              <Text style={styles.warningTitle}>Setup Required</Text>
              <Text style={styles.warningDescription}>
                Complete your bank account setup to receive payments from completed rides.
              </Text>
            </View>
          </View>
        )}

        <View style={styles.transferSection}>
          <Text style={styles.sectionTitle}>Transfer to Bank</Text>

          <CustomButton
            title={accountExists ? (openingDashboard ? 'Opening...' : 'Open Stripe Dashboard') : 'Set Up Bank Account'}
            onPress={accountExists ? openStripeDashboard : openBankingInfo}
            disabled={openingDashboard || (!accountExists && !driverEmail)}
            style={accountExists ? styles.transferButton : styles.manageButton}
          />
        </View>

        <View style={styles.paymentsSection}>
          <Text style={styles.sectionTitle}>Recent Payments</Text>
          {renderRecentPayments()}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default DriverWallet;



const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F9FAFB' },
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, fontSize: 16, fontFamily: 'DMSans', color: '#6B7280' },

  balanceCard: {
    backgroundColor: 'white', margin: 16, padding: 20, borderRadius: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3,
  },
  balanceTitle: { fontSize: 16, fontFamily: 'DMSans', color: '#6B7280', marginBottom: 8 },
  totalEarnings: { fontSize: 36, fontFamily: 'DMSans-Bold', color: '#000000', marginBottom: 16 },
  balanceRow: { flexDirection: 'row', justifyContent: 'space-between' },
  balanceItem: { flex: 1 },
  balanceLabel: { fontSize: 14, fontFamily: 'DMSans', color: '#6B7280', marginBottom: 4 },
  balanceSubtext: { fontSize: 12, fontFamily: 'DMSans', color: '#9CA3AF', marginTop: 2 },

  profilePromptCard: {
    backgroundColor: '#FFF7ED', margin: 16, padding: 16, borderRadius: 12,
    borderLeftWidth: 4, borderLeftColor: '#F59E0B', flexDirection: 'row', alignItems: 'center',
  },
  profilePromptTitle: { fontSize: 16, fontFamily: 'DMSans-Bold', color: '#B45309', marginBottom: 4 },
  profilePromptDesc: { fontSize: 14, fontFamily: 'DMSans', color: '#92400E', lineHeight: 20 },
  profilePromptAction: { fontSize: 14, fontFamily: 'DMSans-Bold', color: '#B45309', paddingHorizontal: 8, paddingVertical: 4 },

  warningCard: {
    backgroundColor: '#FFF7ED', margin: 16, padding: 16, borderRadius: 12,
    borderLeftWidth: 4, borderLeftColor: '#FF9500', flexDirection: 'row', alignItems: 'center',
  },
  warningText: { marginLeft: 12, flex: 1 },
  warningTitle: { fontSize: 16, fontFamily: 'DMSans-Bold', color: '#FF9500', marginBottom: 4 },
  warningDescription: { fontSize: 14, fontFamily: 'DMSans', color: '#B45309', lineHeight: 20 },

  availableAmount: { fontSize: 18, fontFamily: 'DMSans-Bold', color: '#2E7D32' },
  pendingAmount: { fontSize: 18, fontFamily: 'DMSans-Bold', color: '#edc985' },

  transferSection: {
    backgroundColor: 'white', margin: 16, padding: 20, borderRadius: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3,
  },
  sectionTitle: { fontSize: 20, fontFamily: 'DMSans-Bold', color: '#000000', marginBottom: 16 },
  transferButton: { backgroundColor: '#3f7564', marginBottom: 12 },
  manageButton: { backgroundColor: '#6B7280' },
  disabledButton: { backgroundColor: '#E5E7EB', opacity: 0.6 },

  paymentsSection: {
    backgroundColor: 'white', margin: 16, marginBottom: 65, padding: 20, borderRadius: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3,
  },
  paymentsContainer: { maxHeight: 250, overflow: 'hidden' },
  paymentsScrollContent: { paddingVertical: 0 },
  paymentCardContainer: { marginVertical: 0, marginBottom: 0, marginTop: 0 },
  noPaymentsText: { textAlign: 'center', fontFamily: 'DMSans', color: '#6B7280', fontSize: 16, marginTop: 20 },
  paymentItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: '#D1D5DB' },
  paymentIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#edc985', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  paymentInfo: { flex: 1 },
  paymentTitle: { fontSize: 16, fontFamily: 'DMSans-Bold', color: '#000000', marginBottom: 4 },
  paymentDate: { fontSize: 14, fontFamily: 'DMSans', color: '#6B7280' },
  paymentAmount: { fontSize: 16, fontFamily: 'DMSans-Bold', color: '#2E7D32' },
  pendingBadge: { color: '#edc985', fontSize: 14 },
  pendingPaymentAmount: { color: '#edc985' },
});
