import { View, TextInput, Text, TextInputProps } from 'react-native';
import { COLORS } from '../config/constants';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';

interface InputProps extends TextInputProps {
  label: string;
  error?: string;
  isPassword?: boolean;
}

export const Input = ({
  label,
  error,
  isPassword,
  className = '',
  ...props
}: InputProps) => {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <View className={`mb-4 ${className}`}>
      <Text className="text-textSecondary text-sm font-medium mb-2">{label}</Text>
      <View
        className={`flex-row items-center h-14 bg-surface rounded-xl px-4 border ${
          error ? 'border-error' : isFocused ? 'border-primary' : 'border-border'
        }`}
      >
        <TextInput
          className="flex-1 text-white text-base h-full"
          placeholderTextColor={COLORS.textMuted}
          secureTextEntry={isPassword && !showPassword}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...props}
        />
        {isPassword && (
          <Ionicons
            name={showPassword ? 'eye-off-outline' : 'eye-outline'}
            size={22}
            color={COLORS.textSecondary}
            onPress={() => setShowPassword(!showPassword)}
            style={{ marginLeft: 8 }}
          />
        )}
      </View>
      {error && <Text className="text-error text-xs mt-1 ml-1">{error}</Text>}
    </View>
  );
};
