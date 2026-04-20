import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeStackParamList } from '../config/types';
import { HomeScreen } from '../screens/Main/HomeScreen';
import { FolderDetailScreen } from '../screens/Main/FolderDetailScreen';
import { MediaViewerScreen } from '../screens/Main/MediaViewerScreen';
import { CreateFolderScreen } from '../screens/Main/CreateFolderScreen';

const Stack = createNativeStackNavigator<HomeStackParamList>();

export const HomeStackNavigator = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="FolderList" component={HomeScreen} />
      <Stack.Screen name="FolderDetail" component={FolderDetailScreen} />
      <Stack.Screen
        name="MediaViewer"
        component={MediaViewerScreen}
        options={{ animation: 'fade' }}
      />
      <Stack.Screen
        name="CreateFolder"
        component={CreateFolderScreen}
        options={{ animation: 'slide_from_bottom' }}
      />
    </Stack.Navigator>
  );
};
