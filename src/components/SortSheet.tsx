import { Modal, View, Text, TouchableOpacity, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../config/constants';

export interface SortOption<T extends string> {
  key: T;
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
}

interface Props<T extends string> {
  visible: boolean;
  title?: string;
  options: SortOption<T>[];
  value: T;
  onSelect: (key: T) => void;
  onClose: () => void;
}

export const SortSheet = <T extends string>({
  visible,
  title = 'Sắp xếp theo',
  options,
  value,
  onSelect,
  onClose,
}: Props<T>) => {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}
        onPress={onClose}
      >
        <Pressable
          style={{
            backgroundColor: '#fff',
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            paddingBottom: 32,
            paddingTop: 8,
          }}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Drag handle */}
          <View
            style={{
              width: 36,
              height: 4,
              backgroundColor: COLORS.border,
              borderRadius: 2,
              alignSelf: 'center',
              marginBottom: 12,
            }}
          />
          <Text
            style={{
              fontSize: 13,
              fontWeight: '700',
              letterSpacing: 1,
              textTransform: 'uppercase',
              color: COLORS.textSecondary,
              paddingHorizontal: 24,
              marginBottom: 12,
            }}
          >
            {title}
          </Text>
          {options.map((opt) => {
            const active = opt.key === value;
            return (
              <TouchableOpacity
                key={opt.key}
                onPress={() => {
                  onSelect(opt.key);
                  onClose();
                }}
                activeOpacity={0.6}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 24,
                  paddingVertical: 14,
                }}
              >
                {opt.icon && (
                  <Ionicons
                    name={opt.icon}
                    size={20}
                    color={active ? COLORS.primary : COLORS.textSecondary}
                    style={{ marginRight: 12 }}
                  />
                )}
                <Text
                  style={{
                    flex: 1,
                    fontSize: 16,
                    fontWeight: active ? '700' : '500',
                    color: active ? COLORS.primary : COLORS.text,
                  }}
                >
                  {opt.label}
                </Text>
                {active && <Ionicons name="checkmark" size={20} color={COLORS.primary} />}
              </TouchableOpacity>
            );
          })}
        </Pressable>
      </Pressable>
    </Modal>
  );
};
