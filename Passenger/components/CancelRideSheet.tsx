import React, { useMemo, useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import CustomButton from "@/components/CustomButton";
import type { CancelReason } from "@/types/type";

const REASONS: { key: CancelReason; label: string }[] = [
  { key: "wait_too_long", label: "Wait time is too long" },
  { key: "changed_mind", label: "Changed my mind" },
  { key: "wrong_pickup", label: "Pickup location is wrong" },
  { key: "found_other", label: "Found another ride" },
  { key: "other", label: "Other" },
];

export default function CancelRideSheet({
  visible,
  onClose,
  onConfirmCancel,
  rideStatus,
  onDone,
}: {
  visible: boolean;
  onClose: () => void;
  onConfirmCancel: (reason: CancelReason | null) => Promise<void> | void;
  rideStatus?: string;
  onDone: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<CancelReason | null>(null);
  const [didCancel, setDidCancel] = useState(false);

  // reset state when closed
  useEffect(() => {
    if (!visible) {
      setBusy(false);
      setSelected(null);
      setDidCancel(false);
    }
  }, [visible]);

  const subtitle = useMemo(() => {
    if (rideStatus === "requested") return "No driver yet — cancel anytime.";
    if (rideStatus === "accepted") return "A driver is on the way.";
    if (rideStatus === "arrived_at_pickup")
      return "Driver is at pickup. Cancelling now may affect your account.";
    if (rideStatus === "in_progress")
      return "Ride has started. You can’t cancel here.";
    return "Canceling may affect matching and reliability.";
  }, [rideStatus]);

  const allowCancel = rideStatus !== "in_progress";

  const confirm = async () => {
    if (!allowCancel || busy) return;

    try {
      setBusy(true);
      await onConfirmCancel(selected);
      setDidCancel(true); // ✅ show success UI instead of closing
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={busy ? undefined : onClose}>
      <TouchableOpacity
        activeOpacity={1}
        style={styles.backdrop}
        onPress={busy ? undefined : onClose}
      >
        <TouchableOpacity activeOpacity={1} style={styles.sheet} onPress={() => {}}>
          <View style={styles.handle} />

          {didCancel ? (
            <>
              <Text style={styles.title}>Ride canceled</Text>
              <CustomButton
                title="Done"
                bgVariant="primary"
                onPress={onDone}
                style={styles.doneBtn}
              />
            </>
          ) : (
            <>
              <Text style={styles.title}>Cancel ride?</Text>
              <Text style={styles.subtitle}>{subtitle}</Text>

              {!allowCancel ? (
                <View style={styles.blocked}>
                  <Text style={styles.blockedText}>
                    Your ride is already in progress. If you need help, message support.
                  </Text>
                </View>
              ) : (
                <>
                  <Text style={styles.sectionTitle}>Reason (optional)</Text>
                  <View style={styles.reasons}>
                    {REASONS.map((r) => {
                      const isSelected = selected === r.key;
                      return (
                        <TouchableOpacity
                          key={r.key}
                          onPress={() => setSelected(r.key)}
                          style={[styles.reasonRow, isSelected && styles.reasonRowSelected]}
                          disabled={busy}
                        >
                          <Text style={[styles.reasonText, isSelected && styles.reasonTextSelected]}>
                            {r.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <View style={styles.buttons}>
                    <CustomButton
                      title="Keep ride"
                      bgVariant="primary"
                      textVariant="primary"
                      onPress={onClose}
                      disabled={busy}
                      style={styles.keepBtn}
                    />
                    <CustomButton
                      title={busy ? "Canceling…" : "Cancel ride"}
                      bgVariant="danger"
                      onPress={confirm}
                      disabled={busy}
                      style={styles.cancelBtn}
                    />
                  </View>

                  {busy && (
                    <View style={styles.busyRow}>
                      <ActivityIndicator />
                      <Text style={styles.busyText}>Updating your ride…</Text>
                    </View>
                  )}
                </>
              )}
            </>
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "white",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: 16,
    paddingBottom: 24,
  },
  handle: {
    alignSelf: "center",
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#DDD",
    marginBottom: 10,
  },
  title: { fontSize: 20, fontFamily: "DMSans-Bold", textAlign: "center" },
  subtitle: {
    marginTop: 6,
    fontSize: 14,
    fontFamily: "DMSans",
    color: "#666",
    textAlign: "center",
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: "DMSans-SemiBold",
    color: "#333",
    marginBottom: 8,
  },
  reasons: { gap: 8 },
  reasonRow: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: "#F5F5F5",
  },
  reasonRowSelected: { backgroundColor: "#EAEAEA" },
  reasonText: { fontFamily: "DMSans", color: "#222" },
  reasonTextSelected: { fontFamily: "DMSans-SemiBold" },
  buttons: { flexDirection: "row", gap: 10, marginTop: 14 },
  keepBtn: { flex: 1 },
  cancelBtn: { flex: 1 },
  doneBtn: { marginTop: 10 },
  busyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
    justifyContent: "center",
  },
  busyText: { fontFamily: "DMSans", color: "#666" },
  blocked: { padding: 14, borderRadius: 12, backgroundColor: "#F5F5F5" },
  blockedText: { fontFamily: "DMSans", color: "#333" },
});