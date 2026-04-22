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
    title: 'Chào mừng đến Sharing',
    desc: 'Lưu trữ ảnh, video và chia sẻ khoảnh khắc một cách đơn giản.',
  },
  {
    icon: 'folder-open',
    title: 'Tạo thư mục',
    desc: 'Nhấn nút + trong tab “Thư mục” để tạo không gian riêng cho mỗi bộ sưu tập.',
  },
  {
    icon: 'cloud-upload',
    title: 'Tải lên',
    desc: 'Mở một thư mục rồi nhấn +, hoặc dùng tab “Tải lên” để upload nhanh.',
  },
  {
    icon: 'share-social',
    title: 'Chia sẻ bằng mã',
    desc: 'Mỗi thư mục công khai có mã 6 ký tự. Nhập mã ở tab “Chia sẻ” là xem được.',
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
        <View className="flex-row justify-end px-6 pt-14">
          <TouchableOpacity onPress={onDone} className="px-4 py-2" activeOpacity={0.6}>
            <Text className="text-primaryDark text-[15px] font-medium">Bỏ qua</Text>
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
            <View style={{ width }} className="items-center px-10 mt-6">
              <View
                style={{ backgroundColor: COLORS.primary + '14' }}
                className="w-44 h-44 rounded-xl items-center justify-center mb-12"
              >
                <Ionicons name={item.icon} size={88} color={COLORS.primary} />
              </View>
              <Text
                className="text-text font-semibold mb-4 text-center"
                style={{ fontSize: 34, lineHeight: 40, letterSpacing: -0.374 }}
              >
                {item.title}
              </Text>
              <Text
                className="text-textSecondary text-center"
                style={{ fontSize: 17, lineHeight: 25, letterSpacing: -0.374 }}
              >
                {item.desc}
              </Text>
            </View>
          )}
        />

        <View className="flex-row items-center justify-center mb-8">
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={{
                width: i === index ? 22 : 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: i === index ? COLORS.primary : 'rgba(0,0,0,0.15)',
                marginHorizontal: 3,
              }}
            />
          ))}
        </View>

        <View className="px-6 pb-10">
          <TouchableOpacity
            onPress={handleNext}
            className="bg-primary rounded-xs h-12 items-center justify-center flex-row"
            activeOpacity={0.85}
          >
            <Text className="text-white font-semibold text-[17px]">
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
