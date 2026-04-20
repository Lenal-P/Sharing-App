import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useRoute, RouteProp } from '@react-navigation/native';
import { SharedStackParamList } from '../config/types';
import { SharedScreen } from '../screens/Main/SharedScreen';
import { SharedFolderViewerScreen } from '../screens/Main/SharedFolderViewerScreen';
import { MediaViewerScreen } from '../screens/Main/MediaViewerScreen';

const Stack = createNativeStackNavigator<SharedStackParamList>();

// Wrapper: ép readOnly=true khi xem qua stack Shared để tránh lộ nút Xoá.
const SharedMediaViewer = () => {
  const route = useRoute<RouteProp<SharedStackParamList, 'SharedMediaViewer'>>();
  (route.params as any).readOnly = true;
  return <MediaViewerScreen />;
};

export const SharedStackNavigator = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="SharedHome" component={SharedScreen} />
    <Stack.Screen name="SharedFolder" component={SharedFolderViewerScreen} />
    <Stack.Screen
      name="SharedMediaViewer"
      component={SharedMediaViewer}
      options={{ animation: 'fade' }}
    />
  </Stack.Navigator>
);
