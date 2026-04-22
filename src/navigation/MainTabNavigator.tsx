import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MainTabParamList } from '../config/types';
import { HomeStackNavigator } from './HomeStackNavigator';
import { UploadScreen } from '../screens/Main/UploadScreen';
import { SharedStackNavigator } from './SharedStackNavigator';
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
          backgroundColor: 'rgba(255,255,255,0.96)',
          borderTopColor: COLORS.border,
          borderTopWidth: 0.5,
          height: 68,
          paddingBottom: 12,
          paddingTop: 8,
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textMuted as string,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '500', letterSpacing: -0.08 },
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
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="add" size={26} color="#fff" />
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
        component={SharedStackNavigator}
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
