import { View, TextInput, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../config/constants';

interface Props {
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
}

export const SearchBar = ({ value, onChangeText, placeholder = 'Tìm kiếm...' }: Props) => {
  return (
    <View
      className="bg-surface flex-row items-center px-4 h-11"
      style={{ borderRadius: 24 }}
    >
      <Ionicons name="search" size={18} color={COLORS.textSecondary} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textSecondary}
        style={{
          flex: 1,
          marginLeft: 10,
          fontSize: 15,
          color: COLORS.text,
        }}
        autoCorrect={false}
        autoComplete="off"
        spellCheck={false}
        returnKeyType="search"
      />
      {value.length > 0 && (
        <TouchableOpacity onPress={() => onChangeText('')} hitSlop={8}>
          <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
        </TouchableOpacity>
      )}
    </View>
  );
};
