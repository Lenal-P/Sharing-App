import { Pressable, PressableProps, ViewStyle, StyleProp, Animated } from 'react-native';
import { useRef } from 'react';
import * as Haptics from 'expo-haptics';

interface Props extends Omit<PressableProps, 'style'> {
  scaleTo?: number;
  haptic?: boolean;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

/**
 * Apple-style press scale dùng React Native Animated built-in (không cần
 * Reanimated). Tránh xung đột TurboModule trên New Architecture.
 */
export const PressableScale = ({
  scaleTo = 0.97,
  haptic = false,
  onPressIn,
  onPressOut,
  children,
  style,
  disabled,
  ...rest
}: Props) => {
  const scale = useRef(new Animated.Value(1)).current;

  return (
    <Pressable
      {...rest}
      disabled={disabled}
      onPressIn={(e) => {
        Animated.timing(scale, {
          toValue: scaleTo,
          duration: 80,
          useNativeDriver: true,
        }).start();
        if (haptic) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        }
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        Animated.spring(scale, {
          toValue: 1,
          damping: 18,
          stiffness: 240,
          mass: 1,
          useNativeDriver: true,
        }).start();
        onPressOut?.(e);
      }}
    >
      <Animated.View style={[{ transform: [{ scale }] }, style]}>
        {children}
      </Animated.View>
    </Pressable>
  );
};
