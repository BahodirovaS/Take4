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
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { fetchAPI } from '@/lib/fetch';
import CustomButton from '@/components/CustomButton';
import { Ionicons } from '@expo/vector-icons';

interface RideData {
  id: string;
  driver_share?: number;
  fare_price?: number;
  tip_amount?: string;
  createdAt?: any;
  tipped_at?: any;
  rated_at?: any;
  user_name?: string;
  payment_status?: string;
  driver_id?: string;
  [key: string]: any;
}

interface Payment {
  id: string;
  amount: number;
  driverShare: number;
  createdAt: Date;
  rideId: string;
  passengerName: string;
  status: string;
  type: 'ride' | 'tip';
}

interface WalletData {
  totalEarnings: number;
  availableBalance: number;
  pendingBalance: number;
  recentPayments: Payment[];
}

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
  const [transferring, setTransferring] = useState(false);

  useEffect(() => {
    fetchWalletData();
  }, [userId]);

  const fetchWalletData = async () => {
    try {
      setLoading(true);
      
      // Simplest possible query - only filter by driver_id
      const ridesQuery = query(
        collection(db, 'rideRequests'),
        where('driver_id', '==', userId)
      );
      
      const ridesSnapshot = await getDocs(ridesQuery);
      const allRides: RideData[] = ridesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Filter and sort in JavaScript
      const rides = allRides
        .filter(ride => ride.payment_status === 'paid')
        .sort((a, b) => {
          const dateA = a.createdAt?.toDate() || new Date(a.createdAt);
          const dateB = b.createdAt?.toDate() || new Date(b.createdAt);
          return dateB.getTime() - dateA.getTime();
        });

      const totalEarnings = rides.reduce((sum, ride) => sum + (ride.driver_share || 0), 0);

      const recentPayments: Payment[] = [];

      rides.forEach(ride => {
        const baseFarePrice = ride.fare_price || 0;
        const tipAmountCents = ride.tip_amount ? parseFloat(ride.tip_amount) * 100 : 0;
        const baseDriverShare = (ride.driver_share || 0) - tipAmountCents;

        if (baseDriverShare > 0) {
          recentPayments.push({
            id: ride.id,
            amount: baseFarePrice / 100,
            driverShare: baseDriverShare / 100,
            createdAt: ride.createdAt?.toDate() || new Date(ride.createdAt),
            rideId: ride.id,
            passengerName: ride.user_name || 'Unknown',
            status: 'completed',
            type: 'ride' as const,
          });
        }

        if (ride.tip_amount && parseFloat(ride.tip_amount) > 0) {
          const tipAmount = parseFloat(ride.tip_amount);
          recentPayments.push({
            id: `${ride.id}_tip`,
            amount: tipAmount,
            driverShare: tipAmount,
            createdAt: ride.tipped_at?.toDate() || ride.rated_at?.toDate() || ride.createdAt?.toDate() || new Date(ride.createdAt),
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

  const handleInstantTransfer = async () => {
    if (walletData.availableBalance < 0.50) {
      Alert.alert('Insufficient Balance', 'You need at least $0.50 to make a transfer.');
      return;
    }

    Alert.alert(
      'Transfer Request',
      `Request a transfer of ${walletData.availableBalance.toFixed(2)} to your bank account? We'll process this within 24 hours.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Request Transfer',
          onPress: async () => {
            try {
              setTransferring(true);
              
              const transferData = {
                driver_id: userId,
                amount: walletData.availableBalance.toFixed(2),
                type: 'instant',
                requested_at: new Date(),
                status: 'requested'
              };

              await fetchAPI('/(api)/transfer-request', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(transferData),
              });

              Alert.alert('Success', 'Transfer request submitted! We\'ll process it within 24 hours.');
              
            } catch (error) {
              console.error('Transfer request error:', error);
              Alert.alert('Error', 'Failed to submit transfer request. Please try again.');
            } finally {
              setTransferring(false);
            }
          },
        },
      ]
    );
  };

  const handleStandardTransfer = async () => {
    if (walletData.availableBalance < 1.00) {
      Alert.alert('Insufficient Balance', 'You need at least $1.00 to make a transfer.');
      return;
    }

    Alert.alert(
      'Transfer Request',
      `Request a transfer of ${walletData.availableBalance.toFixed(2)} to your bank account? This will take 3-5 business days and is free.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Request Transfer',
          onPress: async () => {
            try {
              setTransferring(true);
              
              const transferData = {
                driver_id: userId,
                amount: walletData.availableBalance.toFixed(2),
                type: 'standard',
                requested_at: new Date(),
                status: 'requested'
              };

              await fetchAPI('/(api)/transfer-request', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(transferData),
              });

              Alert.alert('Success', 'Transfer request submitted! We\'ll process it within 3-5 business days.');
              
            } catch (error) {
              console.error('Transfer request error:', error);
              Alert.alert('Error', 'Failed to submit transfer request. Please try again.');
            } finally {
              setTransferring(false);
            }
          },
        },
      ]
    );
  };

  const openBankingInfo = () => {
    Alert.alert(
      'Bank Account Information',
      'To set up direct bank transfers, please contact support with your bank account details. We\'ll help you get set up for automatic transfers.',
      [
        { text: 'Contact Support', onPress: () => Linking.openURL('mailto:support@yourapp.com') },
        { text: 'Cancel', style: 'cancel' }
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
            disabled={transferring || walletData.availableBalance < 0.50}
          >
            <View style={styles.transferOptionContent}>
              <Ionicons name="flash" size={24} color="#3f7564" />
              <View style={styles.transferOptionText}>
                <Text style={styles.transferOptionTitle}>Instant Transfer</Text>
                <Text style={styles.transferOptionSubtitle}>
                  1.5% fee • Processed within 24 hours
                </Text>
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.transferOption}
            onPress={handleStandardTransfer}
            disabled={transferring || walletData.availableBalance < 1.00}
          >
            <View style={styles.transferOptionContent}>
              <Ionicons name="calendar" size={24} color="#2E7D32" />
              <View style={styles.transferOptionText}>
                <Text style={styles.transferOptionTitle}>Standard Transfer</Text>
                <Text style={styles.transferOptionSubtitle}>
                  Free • 3-5 business days
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
    marginBottom: 75,
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