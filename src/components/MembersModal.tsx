import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  Pressable,
} from 'react-native';
import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../config/constants';
import { UserProfile } from '../config/types';
import { FirestoreService } from '../services/firestore.service';
import { PressableScale } from './PressableScale';

interface Props {
  visible: boolean;
  folderId: string;
  folderName: string;
  ownerId: string;
  /** profile của owner để hiện trên đầu (fetch kèm memberIds) */
  memberIds: string[];
  currentUid: string;
  onClose: () => void;
  /** Sau khi kick/leave thành công, báo folder store cập nhật */
  onMembersChanged: (newMembers: string[]) => void;
}

export const MembersModal = ({
  visible,
  folderId,
  folderName,
  ownerId,
  memberIds,
  currentUid,
  onClose,
  onMembersChanged,
}: Props) => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const isOwner = currentUid === ownerId;

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const idsToFetch = Array.from(new Set([ownerId, ...memberIds]));
        const list = await FirestoreService.getUsersByIds(idsToFetch);
        if (!cancelled) setUsers(list);
      } catch (e) {
        console.warn('Không tải được members:', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [visible, folderId, memberIds, ownerId]);

  const handleKick = (u: UserProfile) => {
    Alert.alert(
      `Gỡ ${u.displayName}?`,
      'Họ sẽ không xem/upload được nữa. Có thể mời lại sau.',
      [
        { text: 'Huỷ', style: 'cancel' },
        {
          text: 'Gỡ',
          style: 'destructive',
          onPress: async () => {
            try {
              setActionLoading(u.uid);
              await FirestoreService.removeMember(folderId, u.uid);
              const next = memberIds.filter((id) => id !== u.uid);
              onMembersChanged(next);
              setUsers((prev) => prev.filter((x) => x.uid !== u.uid));
            } catch (e: any) {
              Alert.alert('Lỗi', e?.message || 'Không gỡ được');
            } finally {
              setActionLoading(null);
            }
          },
        },
      ]
    );
  };

  const handleLeave = () => {
    Alert.alert(
      'Rời khỏi thư mục?',
      `Bạn sẽ không còn xem/upload "${folderName}" nữa. Có thể join lại bằng mã nếu cần.`,
      [
        { text: 'Huỷ', style: 'cancel' },
        {
          text: 'Rời',
          style: 'destructive',
          onPress: async () => {
            try {
              setActionLoading(currentUid);
              await FirestoreService.removeMember(folderId, currentUid);
              const next = memberIds.filter((id) => id !== currentUid);
              onMembersChanged(next);
              onClose();
            } catch (e: any) {
              Alert.alert('Lỗi', e?.message || 'Không rời được');
            } finally {
              setActionLoading(null);
            }
          },
        },
      ]
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}
        onPress={onClose}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{
            backgroundColor: '#fff',
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            maxHeight: '80%',
            paddingBottom: 32,
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
              marginBottom: 10,
            }}
          />
          <View className="px-6 mb-3">
            <Text
              style={{
                fontSize: 22,
                fontWeight: '900',
                letterSpacing: -0.3,
                textTransform: 'uppercase',
                color: COLORS.text,
              }}
            >
              Thành viên ({users.length})
            </Text>
            <Text className="text-textSecondary text-[13px] mt-1">
              {isOwner ? 'Bạn là chủ thư mục.' : 'Bạn là thành viên.'}
            </Text>
          </View>

          {loading ? (
            <View className="py-16 items-center">
              <ActivityIndicator size="small" color={COLORS.primary} />
            </View>
          ) : (
            <FlatList
              data={users}
              keyExtractor={(u) => u.uid}
              style={{ flexGrow: 0 }}
              contentContainerStyle={{ paddingBottom: 16 }}
              renderItem={({ item }) => {
                const ownerRow = item.uid === ownerId;
                const me = item.uid === currentUid;
                return (
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingHorizontal: 24,
                      paddingVertical: 12,
                    }}
                  >
                    <View
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 22,
                        backgroundColor: COLORS.primary,
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: 12,
                      }}
                    >
                      <Text style={{ color: '#fff', fontSize: 17, fontWeight: '800' }}>
                        {item.displayName.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <View className="flex-row items-center">
                        <Text
                          style={{ fontSize: 15, fontWeight: '700', color: COLORS.text }}
                          numberOfLines={1}
                        >
                          {item.displayName}
                          {me && <Text style={{ color: COLORS.textSecondary }}> (bạn)</Text>}
                        </Text>
                        {ownerRow && (
                          <View
                            className="bg-primary ml-2 px-2 py-0.5 rounded-pill"
                            style={{ alignSelf: 'center' }}
                          >
                            <Text
                              className="text-white text-[9px] font-bold"
                              style={{ letterSpacing: 0.5, textTransform: 'uppercase' }}
                            >
                              Owner
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text
                        style={{ fontSize: 12, color: COLORS.textSecondary, marginTop: 1 }}
                        numberOfLines={1}
                      >
                        {item.email}
                      </Text>
                    </View>
                    {isOwner && !ownerRow && (
                      <TouchableOpacity
                        onPress={() => handleKick(item)}
                        disabled={actionLoading === item.uid}
                        hitSlop={8}
                        style={{
                          padding: 6,
                          borderRadius: 16,
                          backgroundColor: COLORS.surface,
                        }}
                      >
                        {actionLoading === item.uid ? (
                          <ActivityIndicator size="small" color={COLORS.error} />
                        ) : (
                          <Ionicons name="remove-circle-outline" size={20} color={COLORS.error} />
                        )}
                      </TouchableOpacity>
                    )}
                  </View>
                );
              }}
            />
          )}

          {!isOwner && memberIds.includes(currentUid) && (
            <View className="px-6 pt-3 border-t border-border">
              <PressableScale
                onPress={handleLeave}
                haptic
                scaleTo={0.96}
                disabled={actionLoading === currentUid}
                style={{
                  backgroundColor: COLORS.error + '15',
                  borderRadius: 30,
                  paddingVertical: 14,
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'row',
                }}
              >
                <Ionicons name="exit-outline" size={18} color={COLORS.error} />
                <Text
                  style={{
                    color: COLORS.error,
                    fontSize: 14,
                    fontWeight: '800',
                    marginLeft: 6,
                    letterSpacing: 0.3,
                    textTransform: 'uppercase',
                  }}
                >
                  Rời thư mục
                </Text>
              </PressableScale>
            </View>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
};
