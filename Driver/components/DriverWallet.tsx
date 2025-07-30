import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Linking,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { useAuth } from '@clerk/clerk-expo';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import CustomButton from '@/components/CustomButton';
import { Ionicons } from '@expo/vector-icons';
import { Ride, WalletData, Payment } from '@/types/type';
import { fetchAPI, fetchDriverInfo } from '@/lib/fetch';
import { API_ENDPOINTS } from '@/lib/config';

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

  useEffect(() => {
    if (userId) {
      fetchDriverEmail();
      checkOnboardingStatus();
      fetchWalletData();
    }
  }, [userId]);

  const fetchDriverEmail = async () => {
    if (!userId) return;
    
    try {
      const { driverData, error } = await fetchDriverInfo(userId);
      if (driverData && driverData.email) {
        setDriverEmail(driverData.email);
      } else {
        console.log('No email found for driver');
      }
    } catch (error) {
      console.error('Error fetching driver email:', error);
    }
  };

  const checkOnboardingStatus = async () => {
  try {
    setCheckingOnboarding(true);
    console.log('Checking onboarding status for driver:', userId);
    
const response = await fetchAPI(API_ENDPOINTS.CHECK_DRIVER_STATUS, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        driver_id: userId,
      }),
    });

    console.log('Onboarding status response:', response);
    setOnboardingCompleted(response.onboarding_completed || false);
  } catch (error) {
    console.error('Error checking onboarding status:', error);
    
    if (error instanceof SyntaxError && error.message.includes('JSON Parse error')) {
      console.error('API endpoint returned HTML instead of JSON - check if the endpoint exists');
    }
    
    setOnboardingCompleted(false);
  } finally {
    setCheckingOnboarding(false);
  }
};

  const fetchWalletData = async () => {
    if (!userId) {
      console.log('No userId available for fetching wallet data');
      return;
    }

    try {
      setLoading(true);
      
      const ridesQuery = query(
        collection(db, 'rideRequests'),
        where('driver_id', '==', userId),
        where('payment_status', '==', 'paid')
      );
      
      const ridesSnapshot = await getDocs(ridesQuery);
      const allRides: Ride[] = ridesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as Ride));

      const pendingRides = allRides.filter(ride => 
        ride.status === 'accepted' || 
        ride.status === 'arrived_at_pickup' || 
        ride.status === 'in_progress'
      );
      
      const completedRides = allRides.filter(ride => 
        ride.status === 'completed' || 
        ride.status === 'rated'
      );

      const pendingEarnings = pendingRides.reduce((sum, ride) => sum + (ride.driver_share || 0), 0);
      const availableEarnings = completedRides.reduce((sum, ride) => sum + (ride.driver_share || 0), 0);
      const totalEarnings = pendingEarnings + availableEarnings;

      const recentPayments: Payment[] = [];

      allRides.forEach(ride => {
        const baseFarePrice = ride.fare_price || 0;
        const tipAmountCents = ride.tip_amount ? parseFloat(ride.tip_amount.toString()) * 100 : 0;
        const baseDriverShare = (ride.driver_share || 0) - tipAmountCents;

        if (baseDriverShare > 0) {
          let rideDate;
          const createdAt = (ride as any).createdAt;
          
          if (createdAt?.toDate) {
            rideDate = createdAt.toDate();
          } else if (createdAt?.seconds) {
            rideDate = new Date(createdAt.seconds * 1000);
          } else if (createdAt?._seconds) {
            rideDate = new Date(createdAt._seconds * 1000);
          } else {
            rideDate = new Date();
          }

          let paymentStatus = 'pending';
          if (ride.status === 'completed' || ride.status === 'rated') {
            paymentStatus = 'completed';
          }
          
          recentPayments.push({
            id: ride.id,
            amount: baseFarePrice / 100,
            driverShare: baseDriverShare / 100,
            createdAt: rideDate,
            rideId: ride.id,
            passengerName: ride.user_name || 'Unknown',
            status: paymentStatus,
            type: 'ride' as const,
          });
        }

        if (ride.tip_amount && parseFloat(ride.tip_amount.toString()) > 0 && 
           (ride.status === 'completed' || ride.status === 'rated')) {
          const tipAmount = parseFloat(ride.tip_amount.toString());
          const createdAt = (ride as any).createdAt;
          
          recentPayments.push({
            id: `${ride.id}_tip`,
            amount: tipAmount,
            driverShare: tipAmount,
            createdAt: ride.tipped_at?.toDate ? ride.tipped_at.toDate() : 
                      ride.rated_at?.toDate ? ride.rated_at.toDate() :
                      createdAt?.toDate ? createdAt.toDate() : 
                      createdAt?.seconds ? new Date(createdAt.seconds * 1000) :
                      new Date(),
            rideId: ride.id,
            passengerName: ride.user_name || 'Unknown',
            status: 'completed',
            type: 'tip' as const,
          });
        }
      });

      recentPayments.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      const limitedPayments = recentPayments.slice(0, 10);

      setWalletData({
        totalEarnings: totalEarnings / 100,
        availableBalance: availableEarnings / 100,
        pendingBalance: pendingEarnings / 100,
        recentPayments: limitedPayments,
      });
    } catch (error) {
      console.error('Error fetching wallet data:', error);
      Alert.alert('Error', 'Failed to load wallet data. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDriverEmail();
    checkOnboardingStatus();
    fetchWalletData();
  };

  const openStripeDashboard = async () => {
    try {
    const response = await fetchAPI(API_ENDPOINTS.EXPRESS_DASHBOARD, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          driver_id: userId,
        }),
      });

      if (response.success && response.url) {
        Linking.openURL(response.url);
      } else {
        Alert.alert('Error', 'Unable to open Stripe dashboard. Please try again.');
      }
    } catch (error) {
      console.error('Error opening Stripe dashboard:', error);
      Alert.alert('Error', 'Failed to open dashboard. Please check your connection.');
    }
  };

  const openBankingInfo = async () => {
    try {
      const emailToUse = driverEmail || 'driver@email.com';
      
      const response = await fetchAPI(API_ENDPOINTS.ONBOARD_DRIVER, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          driver_id: userId,
          email: emailToUse,
        }),
      });

      if (response.success && response.url) {
        Alert.alert(
          'Bank Account Setup',
          'You\'ll be redirected to Stripe to set up your bank account. After completing the setup:\n\n1. Close the browser\n2. Return to this app\n3. Pull down to refresh\n\nThis ensures your payments are processed securely.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Continue to Stripe',
              onPress: async () => {
                await Linking.openURL(response.url);
                setTimeout(() => {
                  Alert.alert(
                    '📱 Return to App',
                    'After completing setup in your browser, return here and pull down to refresh to see your updated status.',
                    [{ text: 'OK' }]
                  );
                }, 2000);
              },
            },
          ]
        );
      } else {
        Alert.alert('Error', 'Unable to start bank account setup. Please try again.');
      }
    } catch (error) {
      console.error('Error creating onboarding link:', error);
      Alert.alert('Error', 'Failed to start setup process. Please check your connection.');
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderRecentPayments = () => {
    if (walletData.recentPayments.length === 0) {
      return <Text style={styles.noPaymentsText}>No payments yet</Text>;
    }

    return (
      <View style={styles.paymentsContainer}>
        <ScrollView
          contentContainerStyle={styles.paymentsScrollContent}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled={true}
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
                    {payment.status === 'pending' && (
                      <Text style={styles.pendingBadge}> • Pending</Text>
                    )}
                  </Text>
                  <Text style={styles.paymentDate}>
                    {formatDate(payment.createdAt)}
                  </Text>
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
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <View style={styles.balanceCard}>
          <Text style={styles.balanceTitle}>Your Earnings</Text>
          <Text style={styles.totalEarnings}>
            ${walletData.totalEarnings.toFixed(2)}
          </Text>
          
          <View style={styles.balanceRow}>
            <View style={styles.balanceItem}>
              <Text style={styles.balanceLabel}>Available</Text>
              <Text style={styles.availableAmount}>
                ${walletData.availableBalance.toFixed(2)}
              </Text>
              <Text style={styles.balanceSubtext}>Ready to transfer</Text>
            </View>
            <View style={styles.balanceItem}>
              <Text style={styles.balanceLabel}>Pending</Text>
              <Text style={styles.pendingAmount}>
                ${walletData.pendingBalance.toFixed(2)}
              </Text>
              <Text style={styles.balanceSubtext}>From active rides</Text>
            </View>
          </View>
        </View>

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
            title={onboardingCompleted ? "Open Stripe Dashboard" : "Set Up Bank Account"}
            onPress={onboardingCompleted ? openStripeDashboard : openBankingInfo}
            style={onboardingCompleted ? styles.transferButton : styles.manageButton}
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

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    fontFamily: 'DMSans',
    color: '#6B7280',
  },
  balanceCard: {
    backgroundColor: 'white',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  balanceTitle: {
    fontSize: 16,
    fontFamily: 'DMSans',
    color: '#6B7280',
    marginBottom: 8,
  },
  totalEarnings: {
    fontSize: 36,
    fontFamily: 'DMSans-Bold',
    color: '#000000',
    marginBottom: 16,
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  balanceItem: {
    flex: 1,
  },
  balanceLabel: {
    fontSize: 14,
    fontFamily: 'DMSans',
    color: '#6B7280',
    marginBottom: 4,
  },
  balanceSubtext: {
    fontSize: 12,
    fontFamily: 'DMSans',
    color: '#9CA3AF',
    marginTop: 2,
  },
  warningCard: {
    backgroundColor: '#FFF7ED',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9500',
    flexDirection: 'row',
    alignItems: 'center',
  },
  warningText: {
    marginLeft: 12,
    flex: 1,
  },
  warningTitle: {
    fontSize: 16,
    fontFamily: 'DMSans-Bold',
    color: '#FF9500',
    marginBottom: 4,
  },
  warningDescription: {
    fontSize: 14,
    fontFamily: 'DMSans',
    color: '#B45309',
    lineHeight: 20,
  },
  availableAmount: {
    fontSize: 18,
    fontFamily: 'DMSans-Bold',
    color: '#2E7D32',
  },
  pendingAmount: {
    fontSize: 18,
    fontFamily: 'DMSans-Bold',
    color: '#edc985',
  },
  transferSection: {
    backgroundColor: 'white',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'DMSans-Bold',
    color: '#000000',
    marginBottom: 16,
  },
  transferButton: {
    backgroundColor: '#3f7564',
    marginBottom: 12,
  },
  manageButton: {
    backgroundColor: '#6B7280',
  },
  paymentsSection: {
    backgroundColor: 'white',
    margin: 16,
    marginBottom: 65,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  paymentsContainer: {
    maxHeight: 250,
    overflow: "hidden",
  },
  paymentsScrollContent: {
    paddingVertical: 0,
  },
  paymentCardContainer: {
    marginVertical: 0,
    marginBottom: 0,
    marginTop: 0,
  },
  noPaymentsText: {
    textAlign: 'center',
    fontFamily: 'DMSans',
    color: '#6B7280',
    fontSize: 16,
    marginTop: 20,
  },
  paymentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#D1D5DB',
  },
  paymentIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#edc985',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  paymentInfo: {
    flex: 1,
  },
  paymentTitle: {
    fontSize: 16,
    fontFamily: 'DMSans-Bold',
    color: '#000000',
    marginBottom: 4,
  },
  paymentDate: {
    fontSize: 14,
    fontFamily: 'DMSans',
    color: '#6B7280',
  },
  paymentAmount: {
    fontSize: 16,
    fontFamily: 'DMSans-Bold',
    color: '#2E7D32',
  },
  pendingBadge: {
    color: '#edc985',
    fontSize: 14,
  },
  pendingPaymentAmount: {
    color: '#edc985',
  },
});

export default DriverWallet;