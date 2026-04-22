import { useEffect, useRef, useState } from 'react';
import { Animated, Easing } from 'react-native';

/**
 * Hook đếm lên từ 0 tới `target` khi mount hoặc khi target đổi.
 * Trả về số nguyên hiện tại (để render).
 */
export const useCountUp = (target: number, duration = 800): number => {
  const anim = useRef(new Animated.Value(0)).current;
  const [value, setValue] = useState(0);

  useEffect(() => {
    anim.setValue(0);
    const id = anim.addListener(({ value: v }) => {
      setValue(Math.round(v * target));
    });
    Animated.timing(anim, {
      toValue: 1,
      duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
    return () => anim.removeListener(id);
  }, [target]);

  return value;
};
