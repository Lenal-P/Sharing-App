import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useEffect, useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../config/constants';
import { UserProfile } from '../config/types';
import { FirestoreService } from '../services/firestore.service';
import { SearchBar } from './SearchBar';
import { PressableScale } from './PressableScale';

interface Props {
  visible: boolean;
  /** uid những user đã là member/owner — hiện checked, không thêm lại */
  existingMemberIds: string[];
  ownerId: string;
  /** uid của current user (để loại khỏi list) */
  currentUid: string;
  onClose: () => void;
  onInvite: (selectedUids: string[]) => Promise<void>;
}

export const InviteMembersModal = ({
  visible,
  existingMemberIds,
  ownerId,
  currentUid,
  onClose,
  onInvite,
}: Props) => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    if (!visible) {
      setSelected(new Set());
      setSearch('');
      return;
    }
    (async () => {
      try {
        setLoading(true);
        const list = await FirestoreService.getAllUsers(currentUid);
        setUsers(list);
      } catch (e: any) {
        console.error('Lỗi tải user:', e);
        Alert.alert('Lỗi', e?.message || 'Không tải được danh sách user');
      } finally {
        setLoading(false);
      }
    })();
  }, [visible, currentUid]);

  const filteredUsers = useMemo(() => {
    if (!search.trim()) return users;
    const q = search.trim().toLowerCase();
    return users.filter(
      (u) =>
        u.displayName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q)
    );
  }, [users, search]);

  const toggleSelect = (uid: string) => {
    const next = new Set(selected);
    if (next.has(uid)) next.delete(uid);
    else next.add(uid);
    setSelected(next);
  };

  const handleInvite = async () => {
    if (selected.size === 0) {
      onClose();
      return;
    }
    try {
      setInviting(true);
      await onInvite(Array.from(selected));
      onClose();
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message || 'Không thể mời thành viên');
    } finally {
      setInviting(false);
    }
  };

  const isAlreadyMember = (uid: string) =>
    uid === ownerId || existingMemberIds.includes(uid);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-black/40 justify-end">
        <View
          style={{
            backgroundColor: '#fff',
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            maxHeight: '85%',
            paddingBottom: 32,
          }}
        >
          {/* Drag handle */}
          <View
            style={{
              width: 36,
              height: 4,
              backgroundColor: COLORS.border,
              borderRadius: 2,
              alignSelf: 'center',
              marginTop: 10,
              marginBottom: 12,
            }}
          />

          <View className="px-6 mb-4">
            <Text
              style={{
                fontSize: 24,
                lineHeight: 28,
                fontWeight: '900',
                letterSpacing: -0.4,
                textTransform: 'uppercase',
                color: COLORS.text,
                marginBottom: 4,
              }}
            >
              Mời thành viên
            </Text>
            <Text className="text-textSecondary text-[13px]" style={{ lineHeight: 18 }}>
              Chọn user để thêm vào folder — họ sẽ xem và upload chung được.
            </Text>
          </View>

          <View className="px-6 mb-3">
            <SearchBar
              value={search}
              onChangeText={setSearch}
              placeholder="Tìm theo tên hoặc email..."
            />
          </View>

          {loading ? (
            <View className="py-20 items-center">
              <ActivityIndicator size="small" color={COLORS.primary} />
            </View>
          ) : filteredUsers.length === 0 ? (
            <View className="py-10 items-center px-10">
              <Ionicons name="people-outline" size={32} color={COLORS.textMuted} />
              <Text className="text-textSecondary text-[13px] text-center mt-2">
                {search ? 'Không có user khớp.' : 'Chưa có user nào khác.'}
              </Text>
            </View>
          ) : (
            <FlatList
              data={filteredUsers}
              keyExtractor={(u) => u.uid}
              style={{ flexGrow: 0 }}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const already = isAlreadyMember(item.uid);
                const picked = selected.has(item.uid);
                return (
                  <TouchableOpacity
                    onPress={() => !already && toggleSelect(item.uid)}
                    disabled={already}
                    activeOpacity={0.7}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingHorizontal: 24,
                      paddingVertical: 10,
                      opacity: already ? 0.5 : 1,
                    }}
                  >
                    <View
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 20,
                        backgroundColor: COLORS.primary,
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: 12,
                      }}
                    >
                      <Text
                        style={{ color: '#fff', fontSize: 16, fontWeight: '800' }}
                      >
                        {item.displayName.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontSize: 15,
                          fontWeight: '700',
                          color: COLORS.text,
                        }}
                        numberOfLines={1}
                      >
                        {item.displayName}
                        {item.uid === ownerId && (
                          <Text style={{ color: COLORS.textSecondary, fontWeight: '500' }}>
                            {'  (owner)'}
                          </Text>
                        )}
                      </Text>
                      <Text
                        style={{ fontSize: 12, color: COLORS.textSecondary }}
                        numberOfLines={1}
                      >
                        {item.email}
                      </Text>
                    </View>
                    {already ? (
                      <View className="bg-success/10 px-2 py-1 rounded-pill">
                        <Text
                          className="text-success text-[10px] font-bold"
                          style={{ letterSpacing: 0.5, textTransform: 'uppercase' }}
                        >
                          Đã join
                        </Text>
                      </View>
                    ) : (
                      <View
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: 11,
                          borderWidth: 2,
                          borderColor: picked ? COLORS.primary : COLORS.border,
                          backgroundColor: picked ? COLORS.primary : 'transparent',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {picked && <Ionicons name="checkmark" size={14} color="#fff" />}
                      </View>
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          )}

          <View className="flex-row px-6 pt-3 gap-3">
            <PressableScale
              onPress={onClose}
              disabled={inviting}
              scaleTo={0.96}
              style={{
                flex: 1,
                height: 48,
                borderRadius: 30,
                backgroundColor: COLORS.surface,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text
                style={{
                  color: COLORS.text,
                  fontSize: 14,
                  fontWeight: '700',
                  letterSpacing: 0.3,
                  textTransform: 'uppercase',
                }}
              >
                Huỷ
              </Text>
            </PressableScale>
            <PressableScale
              onPress={handleInvite}
              disabled={inviting}
              haptic
              scaleTo={0.96}
              style={{
                flex: 1,
                height: 48,
                borderRadius: 30,
                backgroundColor: COLORS.primary,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: selected.size === 0 ? 0.5 : 1,
              }}
            >
              {inviting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text
                  style={{
                    color: '#fff',
                    fontSize: 14,
                    fontWeight: '700',
                    letterSpacing: 0.3,
                    textTransform: 'uppercase',
                  }}
                >
                  Mời {selected.size > 0 ? `(${selected.size})` : ''}
                </Text>
              )}
            </PressableScale>
          </View>
        </View>
      </View>
    </Modal>
  );
};
