import {
  TextInput,
  View,
  Text,
  Image,
  TouchableWithoutFeedback,
  Keyboard,
  StyleSheet,
} from "react-native";
import { InputFieldProps } from "@/types/type";

const InputField = ({
  label,
  icon,
  secureTextEntry = false,
  labelStyle,
  containerStyle,
  inputStyle,
  iconStyle,
  inputWrapperStyle,
  ...props
}: InputFieldProps) => {
  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={[styles.inputContainer, containerStyle]}>
        <Text style={[styles.label, labelStyle]}>{label}</Text>
        <View style={[styles.inputWrapper, containerStyle]}>
          {icon && <Image source={icon} style={[styles.icon, iconStyle]} />}
          <TextInput
            style={[styles.inputField, inputStyle]}
            secureTextEntry={secureTextEntry}
            {...props}
          />
        </View>
      </View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  inputContainer: {
    marginVertical: 8,
    width: '100%',
  },
  label: {
    fontSize: 18,
    fontFamily: "JakartaSemiBold",
    marginBottom: 12,
  },
  inputWrapper: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    backgroundColor: '#F3F4F6', // neutral-100 background color
    borderRadius: 9999, // full rounded corners
    borderWidth: 1,
    borderColor: '#F3F4F6', // neutral-100 border color
  },
  icon: {
    width: 24,
    height: 24,
    marginLeft: 16,
  },
  inputField: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontFamily: "JakartaSemiBold",
    fontSize: 15,
    textAlign: 'left',
    borderRadius: 9999, // full rounded corners
  },
});

export default InputField;
