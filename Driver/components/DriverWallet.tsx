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

  useEffect(() => {
    fetchWalletData();
  }, [userId]);

  const fetchWalletData = async () => {
    try {
      setLoading(true);
      
      const ridesQuery = query(
        collection(db, 'rideRequests'),
        where('driver_id', '==', userId)
      );
      
      const ridesSnapshot = await getDocs(ridesQuery);
      const allRides: Ride[] = ridesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as Ride));

      const rides = allRides.filter(ride => ride.payment_status === 'paid');

      const totalEarnings = rides.reduce((sum, ride) => sum + (ride.driver_share || 0), 0);

      const recentPayments: Payment[] = [];

      rides.forEach(ride => {
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
          
          recentPayments.push({
            id: ride.id,
            amount: baseFarePrice / 100,
            driverShare: baseDriverShare / 100,
            createdAt: rideDate,
            rideId: ride.id,
            passengerName: ride.user_name || 'Unknown',
            status: 'completed',
            type: 'ride' as const,
          });
        }

        if (ride.tip_amount && parseFloat(ride.tip_amount.toString()) > 0) {
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
        availableBalance: totalEarnings / 100,
        pendingBalance: 0,
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
    fetchWalletData();
  };

  const handleInstantTransfer = () => {
    Alert.alert(
      'Transfer Money',
      'To transfer your earnings to your bank account, you\'ll be redirected to your Stripe dashboard where you can manage transfers securely.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Open Stripe Dashboard',
          onPress: () => openStripeDashboard(),
        },
      ]
    );
  };

  const handleStandardTransfer = () => {
    Alert.alert(
      'Transfer Money',
      'To transfer your earnings to your bank account, you\'ll be redirected to your Stripe dashboard where you can manage transfers securely.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Open Stripe Dashboard',
          onPress: () => openStripeDashboard(),
        },
      ]
    );
  };

  const openStripeDashboard = () => {
    Alert.alert(
      'Stripe Dashboard',
      'This will open your personal Stripe Express dashboard where you can:\n\n• View your balance\n• Transfer money to your bank\n• Update bank account details\n• View transaction history',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Open Dashboard',
          onPress: () => {
            Linking.openURL('https://dashboard.stripe.com/express');
          },
        },
      ]
    );
  };

  const openBankingInfo = () => {
    Alert.alert(
      'Bank Account Setup',
      'Set up your bank account through Stripe Express to receive payments securely.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Set Up with Stripe',
          onPress: () => {
            Linking.openURL('https://dashboard.stripe.com/express');
          },
        },
      ]
    );
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
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
            </View>
            <View style={styles.balanceItem}>
              <Text style={styles.balanceLabel}>Pending</Text>
              <Text style={styles.pendingAmount}>
                ${walletData.pendingBalance.toFixed(2)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.transferSection}>
          <Text style={styles.sectionTitle}>Transfer to Bank</Text>
          
          <View style={styles.transferOptions}>
            <TouchableOpacity
              style={styles.transferOption}
              onPress={handleInstantTransfer}
            >
              <View style={styles.transferOptionContent}>
                <Ionicons name="flash" size={24} color="#3f7564" />
                <View style={styles.transferOptionText}>
                  <Text style={styles.transferOptionTitle}>Instant Transfer</Text>
                  <Text style={styles.transferOptionSubtitle}>
                    Available immediately via Stripe
                  </Text>
                </View>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.transferOption}
              onPress={handleStandardTransfer}
            >
              <View style={styles.transferOptionContent}>
                <Ionicons name="calendar" size={24} color="#2E7D32" />
                <View style={styles.transferOptionText}>
                  <Text style={styles.transferOptionTitle}>Standard Transfer</Text>
                  <Text style={styles.transferOptionSubtitle}>
                    1-2 business days via Stripe
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>

          <CustomButton
            title="Set Up Bank Account"
            onPress={openBankingInfo}
            style={styles.manageButton}
          />
        </View>

        <View style={styles.paymentsSection}>
          <Text style={styles.sectionTitle}>Recent Payments</Text>
          
          {walletData.recentPayments.length === 0 ? (
            <Text style={styles.noPaymentsText}>No payments yet</Text>
          ) : (
            walletData.recentPayments.map((payment) => (
              <View key={payment.id} style={styles.paymentItem}>
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
                  </Text>
                  <Text style={styles.paymentDate}>
                    {formatDate(payment.createdAt)}
                  </Text>
                </View>
                <Text style={styles.paymentAmount}>
                  +${payment.driverShare.toFixed(2)}
                </Text>
              </View>
            ))
          )}
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
  transferOptions: {
    marginBottom: 16,
  },
  transferOption: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: '#D1D5DB',
    marginBottom: 12,
    backgroundColor: '#F9FAFB',
  },
  transferOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  transferOptionText: {
    marginLeft: 12,
    flex: 1,
  },
  transferOptionTitle: {
    fontSize: 16,
    fontFamily: 'DMSans-Bold',
    color: '#000000',
    marginBottom: 4,
  },
  transferOptionSubtitle: {
    fontSize: 14,
    fontFamily: 'DMSans',
    color: '#6B7280',
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
});

export default DriverWallet;