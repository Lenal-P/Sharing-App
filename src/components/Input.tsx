import { View, TextInput, Text, TextInputProps } from 'react-native';
import { COLORS } from '../config/constants';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';

interface InputProps extends TextInputProps {
  label: string;
  error?: string;
  isPassword?: boolean;
  /** search variant = pill rounded (24px), default = form (8px radius) */
  variant?: 'form' | 'search';
}

export const Input = ({
  label,
  error,
  isPassword,
  variant = 'form',
  className = '',
  ...props
}: InputProps) => {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const radius = variant === 'search' ? 'rounded-search' : 'rounded-xs';
  const borderColor = error
    ? 'border-error'
    : isFocused
    ? 'border-borderActive'
    : 'border-border';

  return (
    <View className={`mb-5 ${className}`}>
      {label ? (
        <Text
          className="text-text text-[14px] font-semibold mb-2"
          style={{ letterSpacing: 0.2 }}
        >
          {label}
        </Text>
      ) : null}
      <View
        className={`flex-row items-center h-12 bg-surface px-4 border ${borderColor} ${radius}`}
      >
        <TextInput
          className="flex-1 text-text text-[16px] h-full"
          placeholderTextColor={COLORS.textSecondary}
          secureTextEntry={isPassword && !showPassword}
          autoCorrect={false}
          autoComplete="off"
          spellCheck={false}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...props}
        />
        {isPassword && (
          <Ionicons
            name={showPassword ? 'eye-off-outline' : 'eye-outline'}
            size={20}
            color={COLORS.textSecondary}
            onPress={() => setShowPassword(!showPassword)}
            style={{ marginLeft: 8 }}
          />
        )}
      </View>
      {error && <Text className="text-error text-[12px] mt-1">{error}</Text>}
    </View>
  );
};
