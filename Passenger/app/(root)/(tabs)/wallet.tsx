import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Text,
  View,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  SafeAreaView,
  ActivityIndicator,
  Image,
} from "react-native";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { useStripe } from "@stripe/stripe-react-native";

import CustomButton from "@/components/CustomButton";
import {
  fetchPassengerProfile,
  updatePassengerProfile,
  fetchPaymentMethods,
  createSetupIntent,
  setDefaultPaymentMethod,
  detachPaymentMethod,
} from "@/lib/fetch";
import { CardPM } from "@/types/type";
import { images } from "@/constants";

export default function PaymentMethodsScreen() {
  const { userId } = useAuth();
  const { user } = useUser();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  const [passengerDocId, setPassengerDocId] = useState<string | null>(null);
  const [stripeCustomerId, setStripeCustomerId] = useState<string>("");
  const [defaultPmId, setDefaultPmId] = useState<string>("");
  const [methodsRaw, setMethodsRaw] = useState<CardPM[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchComplete, setFetchComplete] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  const methods = useMemo(() => {
    const sig = (pm: CardPM) =>
      `${pm.brand ?? ""}_${pm.last4 ?? ""}_${pm.exp_month ?? ""}_${pm.exp_year ?? ""}`;

    const map = new Map<string, CardPM>();

    for (const pm of methodsRaw) {
      const key = sig(pm);
      const existing = map.get(key);

      if (!existing) {
        map.set(key, pm);
      } else {
        if (pm.id === defaultPmId) map.set(key, pm);
      }
    }

    return Array.from(map.values());
  }, [methodsRaw, defaultPmId]);

  const load = async () => {
    if (!userId) {
      setIsLoading(false);
      setFetchComplete(true);
      return;
    }

    setIsLoading(true);
    try {
      const { data, docId, error } = await fetchPassengerProfile(userId);
      if (error) throw error;

      setPassengerDocId(docId);

      const customerId = data?.stripeCustomerId || "";
      setStripeCustomerId(customerId);

      if (!customerId) {
        setMethodsRaw([]);
        setDefaultPmId("");
        setIsLoading(false);
        setFetchComplete(true);
        return;
      }

      const resp = await fetchPaymentMethods(customerId);

      setMethodsRaw(resp.paymentMethods || []);
      setDefaultPmId(resp.defaultPaymentMethodId || "");

      setIsLoading(false);
      setFetchComplete(true);
    } catch (e: any) {
      setIsLoading(false);
      setFetchComplete(true);
      Alert.alert("Error", e?.message || "Failed to load payment methods");
    }
  };

  useEffect(() => {
    load();
  }, [userId]);

  const addCard = async () => {
    if (!userId) return;
    if (isLoading || isAdding) return;

    setIsAdding(true);
    try {
      const resp = await createSetupIntent({
        customer_id: stripeCustomerId || undefined,
        name: user?.fullName || undefined,
        email: user?.primaryEmailAddress?.emailAddress || undefined,
      });

      if (!resp?.customerId || !resp?.ephemeralKeySecret || !resp?.setupIntentClientSecret) {
        Alert.alert("Error", "Missing Stripe setup fields from server.");
        return;
      }

      if (!stripeCustomerId && resp.customerId) {
        setStripeCustomerId(resp.customerId);
        await updatePassengerProfile(passengerDocId, userId, {
          stripeCustomerId: resp.customerId,
        } as any);
      }

      const { error: initError } = await initPaymentSheet({
        merchantDisplayName: "Cabbage Rides",
        customerId: resp.customerId,
        customerEphemeralKeySecret: resp.ephemeralKeySecret,
        setupIntentClientSecret: resp.setupIntentClientSecret,
        returnURL: "myapp://payment-methods",
      });

      if (initError) {
        Alert.alert("Payment setup failed", initError.message);
        return;
      }

      const { error: presentError } = await presentPaymentSheet();
      if (presentError) {
        if (presentError.code !== "Canceled") {
          Alert.alert("Couldn’t add card", `${presentError.code}: ${presentError.message}`);
        }
        return;
      }

      await load();
      Alert.alert("Success", "Card added.");
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to add card");
    } finally {
      setIsAdding(false);
    }
  };

  const setDefault = async (paymentMethodId: string) => {
    if (!stripeCustomerId) return;

    try {
      await setDefaultPaymentMethod({
        customerId: stripeCustomerId,
        paymentMethodId,
      });

      setDefaultPmId(paymentMethodId);

      await updatePassengerProfile(passengerDocId, userId || "", {
        defaultPaymentMethodId: paymentMethodId,
      } as any);
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to set default");
    }
  };

  const clearDefaultIfThisCard = async (paymentMethodId: string) => {
    if (!stripeCustomerId) return;
    if (defaultPmId !== paymentMethodId) return;

    const fallback = methodsRaw.find((m) => m.id !== paymentMethodId)?.id || null;

    try {
      await setDefaultPaymentMethod({
        customerId: stripeCustomerId,
        paymentMethodId: fallback,
      });

      setDefaultPmId(fallback || "");
      await updatePassengerProfile(passengerDocId, userId || "", {
        defaultPaymentMethodId: fallback || "",
      } as any);
    } catch (e: any) {
      console.warn("Failed to clear/set default before delete:", e?.message || e);
    }
  };

  const removeCard = async (paymentMethodId: string) => {
    try {
      await clearDefaultIfThisCard(paymentMethodId);

      await detachPaymentMethod({ paymentMethodId });

      if (defaultPmId === paymentMethodId) setDefaultPmId("");

      await load();
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to remove card");
    }
  };

  const confirmDelete = (paymentMethodId: string) => {
    Alert.alert("Delete Card", "Remove this card from your account?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => removeCard(paymentMethodId) },
    ]);
  };

  const renderHeader = () => (
    <View>
      <Text style={styles.headerText}>Payment Methods</Text>

      <View style={styles.buttonRow}>
        <CustomButton
          title={isAdding ? "Adding..." : "Add New Card"}
          onPress={addCard}
          style={[styles.addButton, (isLoading || isAdding) && styles.addButtonDisabled]}
          disabled={isLoading || isAdding}
        />
      </View>

      <Text style={styles.helperText}>Your default card is used automatically at checkout.</Text>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      {fetchComplete && methods.length === 0 ? (
        <>
          <Image source={images.credit} style={styles.image} resizeMode="contain" />
          <Text style={styles.emptyText}>No saved cards</Text>
          <Text style={styles.subText}>Add a card to pay faster on future rides.</Text>
        </>
      ) : isLoading ? (
        <ActivityIndicator size="small" color="#000" />
      ) : null}
    </View>
  );

  const renderItem = ({ item }: { item: CardPM }) => {
    const isDefault = item.id === defaultPmId;
    const brand = (item.brand || "Card").toUpperCase();
    const last4 = item.last4 || "----";
    const exp = item.exp_month && item.exp_year ? `${item.exp_month}/${item.exp_year}` : "—";

    return (
      <View style={styles.cardRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>
            {brand} •••• {last4}
          </Text>
          <Text style={styles.cardSub}>
            Expires {exp} {isDefault ? "• Default" : ""}
          </Text>
        </View>

        {!isDefault ? (
          <TouchableOpacity onPress={() => setDefault(item.id)}>
            <Text style={styles.action}>Set default</Text>
          </TouchableOpacity>
        ) : (
          <Text style={styles.defaultPill}>Default</Text>
        )}

        <TouchableOpacity onPress={() => confirmDelete(item.id)}>
          <Text style={[styles.action, { marginLeft: 14 }]}>Delete</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={methods}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmptyState}
        ListHeaderComponent={renderHeader}
        refreshing={isLoading}
        onRefresh={load}
        ListFooterComponent={
          <Text style={styles.footerText}>Securely stored and processed by Stripe.</Text>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "white" },
  listContent: { paddingBottom: 100 },

  headerText: {
    fontSize: 30,
    alignSelf: "center",
    fontFamily: "DMSans-Bold",
    marginTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 10,
  },

  buttonRow: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },

  addButton: {
    width: "70%",
    alignSelf: "center",
    marginTop: 30,
    backgroundColor: "#289dd2",
  },

  addButtonDisabled: {
    opacity: 0.7,
  },

  helperText: {
    fontSize: 13,
    color: "#888",
    fontFamily: "DMSans",
    textAlign: "center",
    paddingHorizontal: 20,
    marginBottom: 8,
  },

  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 0,
  },
  emptyText: {
    fontSize: 18,
    color: "#666",
    fontFamily: "DMSans",
    marginTop: 10,
  },
  subText: {
    fontSize: 14,
    color: "#888",
    fontFamily: "DMSans",
    marginTop: 6,
    textAlign: "center",
  },
  image: {
    marginTop: 150,
    width: 160,
    height: 160,
  },

  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginHorizontal: 20,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  cardTitle: {
    fontSize: 16,
    fontFamily: "DMSans-SemiBold",
    color: "#000",
  },
  cardSub: {
    fontSize: 13,
    fontFamily: "DMSans",
    color: "#666",
    marginTop: 3,
  },
  action: {
    fontSize: 15,
    fontFamily: "DMSans-SemiBold",
    color: "#289dd2",
  },
  defaultPill: {
    fontSize: 15,
    fontFamily: "DMSans-SemiBold",
    color: "#3f7564",
    marginLeft: 8,
  },

  footerText: {
    fontSize: 12,
    color: "#9CA3AF",
    fontFamily: "DMSans",
    textAlign: "center",
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 40,
  },
});
