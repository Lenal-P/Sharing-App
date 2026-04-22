import { View, Text, ScrollView } from 'react-native';
import { PressableScale } from './PressableScale';
import { COLORS } from '../config/constants';

export interface FilterOption<T extends string> {
  key: T;
  label: string;
  count?: number;
}

interface Props<T extends string> {
  options: FilterOption<T>[];
  value: T;
  onChange: (key: T) => void;
  /** Padding ngang bên ngoài (default 24 = 6 * 4) */
  paddingH?: number;
}

export const FilterChips = <T extends string>({
  options,
  value,
  onChange,
  paddingH = 24,
}: Props<T>) => {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: paddingH, gap: 8 }}
    >
      {options.map((opt) => {
        const active = opt.key === value;
        return (
          <PressableScale
            key={opt.key}
            onPress={() => onChange(opt.key)}
            scaleTo={0.95}
            style={{
              backgroundColor: active ? COLORS.primary : COLORS.surface,
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: 30,
              flexDirection: 'row',
              alignItems: 'center',
              borderWidth: active ? 0 : 1,
              borderColor: COLORS.border,
            }}
          >
            <Text
              style={{
                color: active ? '#fff' : COLORS.text,
                fontSize: 13,
                fontWeight: active ? '700' : '600',
                letterSpacing: 0.2,
              }}
            >
              {opt.label}
            </Text>
            {typeof opt.count === 'number' && (
              <View
                style={{
                  marginLeft: 6,
                  paddingHorizontal: 6,
                  paddingVertical: 1,
                  backgroundColor: active ? 'rgba(255,255,255,0.2)' : COLORS.cardHover,
                  borderRadius: 10,
                }}
              >
                <Text
                  style={{
                    color: active ? '#fff' : COLORS.textSecondary,
                    fontSize: 11,
                    fontWeight: '700',
                  }}
                >
                  {opt.count}
                </Text>
              </View>
            )}
          </PressableScale>
        );
      })}
    </ScrollView>
  );
};
