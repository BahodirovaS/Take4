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
  editable = true,
  ...props
}: InputFieldProps) => {
  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={[styles.inputContainer, containerStyle]}>
        <Text style={[styles.label, labelStyle]}>{label}</Text>
        <View style={[
          styles.inputWrapper, 
          containerStyle,
          !editable && styles.nonEditableWrapper
        ]}>
          {icon && <Image source={icon} style={[styles.icon, iconStyle]} />}
          <TextInput
            placeholderTextColor="#000000"
            style={[
              styles.inputField, 
              inputStyle,
              !editable && styles.nonEditableInput
            ]}
            secureTextEntry={secureTextEntry}
            editable={editable}
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
    backgroundColor: '#F3F4F6', 
    borderRadius: 9999, 
    borderWidth: 1,
    borderColor: '#F3F4F6', 
  },
  nonEditableWrapper: {
    backgroundColor: '#F3F4F6', 
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
    borderRadius: 9999, 
    color: '#000000', 
  },
  nonEditableInput: {
    color: '#000000', 
    backgroundColor: 'transparent',
  }
});

export default InputField;