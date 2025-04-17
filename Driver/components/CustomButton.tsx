import React from "react";
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle, View } from "react-native";
import { ButtonProps } from "@/types/type";

const getBgVariantStyle = (variant: ButtonProps["bgVariant"]): ViewStyle => {
  switch (variant) {
    case "secondary":
      return styles.bgSecondary;
    case "danger":
      return styles.bgDanger;
    case "success":
      return styles.bgSuccess;
    case "outline":
      return styles.bgOutline;
    default:
      return styles.bgPrimary;
  }
};

const getTextVariantStyle = (variant: ButtonProps["textVariant"]): TextStyle => {
  switch (variant) {
    case "primary":
      return styles.textPrimary;
    case "secondary":
      return styles.textSecondary;
    case "danger":
      return styles.textDanger;
    case "success":
      return styles.textSuccess;
    default:
      return styles.textDefault;
  }
};

const getButtonSizeStyle = (size: ButtonProps["size"]): ViewStyle => {
  switch (size) {
    case "small":
      return styles.buttonSmall;
    case "large":
      return styles.buttonLarge;
    default:
      return {}; // Default size (medium)
  }
};

const getTextSizeStyle = (size: ButtonProps["size"]): TextStyle => {
  switch (size) {
    case "small":
      return styles.textSmall;
    case "large":
      return styles.textLarge;
    default:
      return {}; // Default size (medium)
  }
};

const CustomButton = ({
  onPress,
  title,
  bgVariant = "primary",
  textVariant = "default",
  size = "medium",
  IconLeft,
  IconRight,
  style, // Accept the external style
  ...props
}: ButtonProps) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.button, 
        getBgVariantStyle(bgVariant), 
        getButtonSizeStyle(size),
        style
      ]} // Merge styles
      {...props}
    >
      {IconLeft && <IconLeft />}
      <Text 
        style={[
          styles.text, 
          getTextVariantStyle(textVariant),
          getTextSizeStyle(size)
        ]}
      >
        {title}
      </Text>
      {IconRight && <IconRight />}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    width: "100%",
    borderRadius: 9999,
    padding: 12,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  buttonSmall: {
    padding: 8,
  },
  buttonLarge: {
    padding: 16,
  },
  bgPrimary: { backgroundColor: "#289dd2" },
  bgSecondary: { backgroundColor: "#6B7280" },
  bgDanger: { backgroundColor: "#E53935" },
  bgSuccess: { backgroundColor: "#2E7D32" },
  bgOutline: {
    backgroundColor: "transparent",
    borderColor: "#D1D5DB",
    borderWidth: 0.5,
  },
  text: { 
    fontSize: 17, 
    fontFamily: "DMSans-Bold",
  },
  textSmall: {
    fontSize: 14,
  },
  textLarge: {
    fontSize: 20,
  },
  textDefault: { color: "#FFFFFF" },
  textPrimary: { color: "#000000" },
  textSecondary: { color: "#F9FAFB" },
  textDanger: { color: "#FEE2E2" },
  textSuccess: { color: "#D1FAE5" },
});

export default CustomButton;