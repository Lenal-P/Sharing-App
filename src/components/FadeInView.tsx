import { useEffect, useRef } from 'react';
import { Animated, ViewProps, StyleProp, ViewStyle, Easing } from 'react-native';

interface Props extends ViewProps {
  delay?: number;
  fromY?: number;
  duration?: number;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

/**
 * Fade-in + slide-up subtle dùng React Native Animated built-in.
 * Tránh dùng Reanimated để bớt chance TurboModule xung đột.
 */
export const FadeInView = ({
  delay = 0,
  fromY = 8,
  duration = 320,
  style,
  children,
  ...rest
}: Props) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const ty = useRef(new Animated.Value(fromY)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(ty, {
        toValue: 0,
        duration,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      {...rest}
      style={[{ opacity, transform: [{ translateY: ty }] }, style]}
    >
      {children}
    </Animated.View>
  );
};
