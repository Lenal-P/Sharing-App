import { TouchableOpacity, Text, ActivityIndicator, TouchableOpacityProps, View } from 'react-native';
import { COLORS } from '../config/constants';

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
}

export const Button = ({
  title,
  variant = 'primary',
  isLoading = false,
  leftIcon,
  className = '',
  disabled,
  ...props
}: ButtonProps) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return 'bg-primary border-primary';
      case 'secondary':
        return 'bg-surfaceAlt border-surfaceAlt';
      case 'outline':
        return 'bg-transparent border-primary border-2';
      case 'ghost':
        return 'bg-transparent border-transparent';
      default:
        return 'bg-primary border-primary';
    }
  };

  const getTextColor = () => {
    switch (variant) {
      case 'primary':
        return 'text-white';
      case 'secondary':
        return 'text-white';
      case 'outline':
        return 'text-primary';
      case 'ghost':
        return 'text-textSecondary';
      default:
        return 'text-white';
    }
  };

  return (
    <TouchableOpacity
      className={`h-14 flex-row justify-center items-center rounded-xl px-4 ${getVariantStyles()} ${
        disabled || isLoading ? 'opacity-50' : 'opacity-100'
      } ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <ActivityIndicator color={variant === 'outline' ? COLORS.primary : '#FFFFFF'} />
      ) : (
        <View className="flex-row items-center">
          {leftIcon && <View className="mr-2">{leftIcon}</View>}
          <Text className={`font-semibold text-lg ${getTextColor()}`}>
            {title}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};
