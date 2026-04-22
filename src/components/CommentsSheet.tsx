import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Pressable,
} from 'react-native';
import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../config/constants';
import { Comment, UserProfile } from '../config/types';
import { FirestoreService } from '../services/firestore.service';

interface Props {
  visible: boolean;
  folderId: string;
  itemId: string;
  currentUser: UserProfile | null;
  folderOwnerId: string;
  onClose: () => void;
}

export const CommentsSheet = ({
  visible,
  folderId,
  itemId,
  currentUser,
  folderOwnerId,
  onClose,
}: Props) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const list = await FirestoreService.getComments(folderId, itemId);
        if (!cancelled) setComments(list);
      } catch (e) {
        console.warn('Không tải được comment:', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [visible, folderId, itemId]);

  const handleSend = async () => {
    if (!currentUser || !text.trim() || sending) return;
    try {
      setSending(true);
      const newComment = await FirestoreService.addComment(
        folderId,
        itemId,
        {
          uid: currentUser.uid,
          displayName: currentUser.displayName,
          photoURL: currentUser.photoURL,
        },
        text.trim()
      );
      setComments((prev) => [...prev, newComment]);
      setText('');
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message || 'Không gửi được bình luận');
    } finally {
      setSending(false);
    }
  };

  const handleDelete = (c: Comment) => {
    Alert.alert('Xoá bình luận?', 'Hành động không thể hoàn tác.', [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Xoá',
        style: 'destructive',
        onPress: async () => {
          try {
            await FirestoreService.deleteComment(folderId, itemId, c.id);
            setComments((prev) => prev.filter((x) => x.id !== c.id));
          } catch (e: any) {
            Alert.alert('Lỗi', e?.message || 'Không xoá được');
          }
        },
      },
    ]);
  };

  const canDelete = (c: Comment) =>
    !!currentUser && (c.authorId === currentUser.uid || folderOwnerId === currentUser.uid);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}
        onPress={onClose}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1, justifyContent: 'flex-end' }}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#fff',
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              height: '75%',
            }}
          >
            <View
              style={{
                width: 36,
                height: 4,
                backgroundColor: COLORS.border,
                borderRadius: 2,
                alignSelf: 'center',
                marginTop: 10,
                marginBottom: 8,
              }}
            />
            <View className="flex-row items-center justify-between px-6 py-3 border-b border-border">
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: '900',
                  letterSpacing: -0.3,
                  textTransform: 'uppercase',
                  color: COLORS.text,
                }}
              >
                {comments.length} bình luận
              </Text>
              <TouchableOpacity onPress={onClose} hitSlop={8}>
                <Ionicons name="close" size={22} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            {loading ? (
              <View className="flex-1 items-center justify-center">
                <ActivityIndicator size="small" color={COLORS.primary} />
              </View>
            ) : comments.length === 0 ? (
              <View className="flex-1 items-center justify-center px-8">
                <Ionicons name="chatbubbles-outline" size={36} color={COLORS.textMuted} />
                <Text className="text-textSecondary text-[13px] mt-2 text-center">
                  Chưa có bình luận nào. Hãy là người đầu tiên!
                </Text>
              </View>
            ) : (
              <FlatList
                data={comments}
                keyExtractor={(c) => c.id}
                contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 12, paddingBottom: 12 }}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => (
                  <View className="flex-row mb-5">
                    <View
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 18,
                        backgroundColor: COLORS.primary,
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: 10,
                      }}
                    >
                      <Text style={{ color: '#fff', fontSize: 14, fontWeight: '800' }}>
                        {item.authorName.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <View className="flex-row items-center">
                        <Text
                          style={{
                            fontSize: 13,
                            fontWeight: '700',
                            color: COLORS.text,
                          }}
                          numberOfLines={1}
                        >
                          {item.authorName}
                        </Text>
                        <Text className="text-textMuted text-[11px] ml-2">
                          {timeAgo(item.createdAt)}
                        </Text>
                      </View>
                      <Text className="text-text text-[14px] mt-0.5" style={{ lineHeight: 20 }}>
                        {item.text}
                      </Text>
                    </View>
                    {canDelete(item) && (
                      <TouchableOpacity onPress={() => handleDelete(item)} hitSlop={8}>
                        <Ionicons name="trash-outline" size={16} color={COLORS.textMuted} />
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              />
            )}

            <View className="flex-row items-center px-6 py-3 border-t border-border">
              <View
                className="flex-1 bg-surface px-4 h-11 flex-row items-center mr-2"
                style={{ borderRadius: 24 }}
              >
                <TextInput
                  value={text}
                  onChangeText={setText}
                  placeholder="Viết bình luận..."
                  placeholderTextColor={COLORS.textMuted}
                  style={{ flex: 1, fontSize: 14, color: COLORS.text }}
                  multiline
                  maxLength={500}
                  autoCorrect={false}
                  autoComplete="off"
                  spellCheck={false}
                />
              </View>
              <TouchableOpacity
                onPress={handleSend}
                disabled={!text.trim() || sending}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: COLORS.primary,
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: !text.trim() || sending ? 0.4 : 1,
                }}
                activeOpacity={0.8}
              >
                {sending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="arrow-up" size={18} color="#fff" />
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
};

const timeAgo = (date: Date): string => {
  const sec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (sec < 60) return 'vừa xong';
  if (sec < 3600) return `${Math.floor(sec / 60)}p trước`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h trước`;
  if (sec < 2592000) return `${Math.floor(sec / 86400)} ngày trước`;
  return date.toLocaleDateString('vi-VN');
};
