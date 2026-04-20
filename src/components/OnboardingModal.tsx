import { useState, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../config/constants';

const { width } = Dimensions.get('window');

type Slide = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  desc: string;
};

const SLIDES: Slide[] = [
  {
    icon: 'sparkles',
    title: 'Chào mừng đến Sharing!',
    desc: 'Lưu trữ ảnh, video và chia sẻ khoảnh khắc với người thân một cách đơn giản.',
  },
  {
    icon: 'folder-open',
    title: 'Tạo thư mục',
    desc: 'Nhấn nút + ở tab "Thư mục" để tạo không gian riêng cho từng bộ sưu tập ảnh.',
  },
  {
    icon: 'cloud-upload',
    title: 'Tải ảnh/video lên',
    desc: 'Mở một thư mục rồi nhấn + ở góc phải, hoặc dùng tab "Tải lên" để upload nhanh.',
  },
  {
    icon: 'share-social',
    title: 'Chia sẻ bằng mã',
    desc: 'Mỗi thư mục công khai có mã 6 ký tự. Bạn bè chỉ cần nhập mã ở tab "Chia sẻ" là xem được.',
  },
];

interface Props {
  visible: boolean;
  onDone: () => void;
}

export const OnboardingModal = ({ visible, onDone }: Props) => {
  const [index, setIndex] = useState(0);
  const listRef = useRef<FlatList<Slide>>(null);

  const isLast = index === SLIDES.length - 1;

  const goToSlide = (i: number) => {
    listRef.current?.scrollToIndex({ index: i, animated: true });
    setIndex(i);
  };

  const handleNext = () => {
    if (isLast) onDone();
    else goToSlide(index + 1);
  };

  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / width);
    setIndex(i);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDone}>
      <View className="flex-1 bg-background">
        <View className="flex-row justify-end px-5 pt-14">
          <TouchableOpacity onPress={onDone} className="px-4 py-2">
            <Text className="text-textMuted text-sm font-medium">Bỏ qua</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          ref={listRef}
          data={SLIDES}
          keyExtractor={(_, i) => String(i)}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onScrollEnd}
          renderItem={({ item }) => (
            <View style={{ width }} className="items-center px-8 mt-4">
              <View
                style={{ backgroundColor: COLORS.primary + '26' }}
                className="w-48 h-48 rounded-full items-center justify-center mb-10"
              >
                <Ionicons name={item.icon} size={96} color={COLORS.primary} />
              </View>
              <Text className="text-white text-2xl font-bold mb-4 text-center">
                {item.title}
              </Text>
              <Text className="text-textSecondary text-base text-center leading-6">
                {item.desc}
              </Text>
            </View>
          )}
        />

        {/* Dots */}
        <View className="flex-row items-center justify-center mb-8">
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={{
                width: i === index ? 24 : 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: i === index ? COLORS.primary : COLORS.border,
                marginHorizontal: 4,
              }}
            />
          ))}
        </View>

        <View className="px-6 pb-10">
          <TouchableOpacity
            onPress={handleNext}
            className="bg-primary rounded-2xl h-14 items-center justify-center flex-row"
            activeOpacity={0.85}
          >
            <Text className="text-white font-bold text-base">
              {isLast ? 'Bắt đầu' : 'Tiếp theo'}
            </Text>
            {!isLast && (
              <Ionicons name="arrow-forward" size={18} color="#fff" style={{ marginLeft: 6 }} />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};
