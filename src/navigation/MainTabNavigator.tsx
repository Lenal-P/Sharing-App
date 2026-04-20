import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MainTabParamList } from '../config/types';
import { HomeStackNavigator } from './HomeStackNavigator';
import { UploadScreen } from '../screens/Main/UploadScreen';
import { SharedScreen } from '../screens/Main/SharedScreen';
import { ProfileScreen } from '../screens/Main/ProfileScreen';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../config/constants';
import { View } from 'react-native';

const Tab = createBottomTabNavigator<MainTabParamList>();

export const MainTabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: COLORS.surfaceAlt,
          borderTopColor: COLORS.border,
          borderTopWidth: 0.5,
          height: 64,
          paddingBottom: 10,
          paddingTop: 8,
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'folder';

          if (route.name === 'Home') {
            iconName = focused ? 'folder' : 'folder-outline';
          } else if (route.name === 'Upload') {
            iconName = 'add';
          } else if (route.name === 'Shared') {
            iconName = focused ? 'share-social' : 'share-social-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          if (route.name === 'Upload') {
            return (
              <View
                style={{
                  backgroundColor: COLORS.primary,
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 12,
                  shadowColor: COLORS.primary,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.4,
                  shadowRadius: 8,
                  elevation: 8,
                }}
              >
                <Ionicons name="add" size={28} color="#fff" />
              </View>
            );
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeStackNavigator}
        options={{ tabBarLabel: 'Thư mục' }}
      />
      <Tab.Screen
        name="Shared"
        component={SharedScreen}
        options={{ tabBarLabel: 'Chia sẻ' }}
      />
      <Tab.Screen
        name="Upload"
        component={UploadScreen}
        options={{ tabBarLabel: '' }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarLabel: 'Cá nhân' }}
      />
    </Tab.Navigator>
  );
};
