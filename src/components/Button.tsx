import { Text, ActivityIndicator, View, PressableProps } from 'react-native';
import { PressableScale } from './PressableScale';
import { COLORS } from '../config/constants';

interface ButtonProps extends Omit<PressableProps, 'style'> {
  title: string;
  /** primary=black pill CTA, inverse=white pill on dark, outlined=border pill, text=link */
  variant?: 'primary' | 'inverse' | 'outlined' | 'text';
  size?: 'lg' | 'md' | 'sm';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  className?: string;
  uppercase?: boolean;
}

export const Button = ({
  title,
  variant = 'primary',
  size = 'lg',
  isLoading = false,
  leftIcon,
  className = '',
  disabled,
  uppercase = false,
  ...props
}: ButtonProps) => {
  const sizing =
    size === 'lg' ? 'h-12 px-6' : size === 'md' ? 'h-10 px-5' : 'h-8 px-4';
  const textSize =
    size === 'lg' ? 'text-[16px]' : size === 'md' ? 'text-[14px]' : 'text-[12px]';

  const container = {
    primary: 'bg-primary',
    inverse: 'bg-white',
    outlined: 'bg-transparent border border-border',
    text: 'bg-transparent',
  }[variant];

  const txtColor = {
    primary: 'text-white',
    inverse: 'text-primary',
    outlined: 'text-primary',
    text: 'text-primary',
  }[variant];

  return (
    <PressableScale
      className={`${sizing} rounded-pill ${container} flex-row justify-center items-center ${
        disabled || isLoading ? 'opacity-40' : ''
      } ${className}`}
      disabled={disabled || isLoading}
      haptic={variant === 'primary'}
      {...props}
    >
      {isLoading ? (
        <ActivityIndicator
          color={variant === 'primary' ? '#FFFFFF' : COLORS.primary}
        />
      ) : (
        <View className="flex-row items-center">
          {leftIcon && <View className="mr-2">{leftIcon}</View>}
          <Text
            className={`font-semibold ${textSize} ${txtColor}`}
            style={uppercase ? { textTransform: 'uppercase', letterSpacing: 0.5 } : undefined}
          >
            {title}
          </Text>
        </View>
      )}
    </PressableScale>
  );
};
