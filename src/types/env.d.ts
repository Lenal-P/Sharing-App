declare global {
  namespace NodeJS {
    interface ProcessEnv {
      EXPO_PUBLIC_API_KEY?: string;
      EXPO_PUBLIC_AUTH_DOMAIN?: string;
      EXPO_PUBLIC_PROJECT_ID?: string;
      EXPO_PUBLIC_STORAGE_BUCKET?: string;
      EXPO_PUBLIC_MESSAGING_SENDER_ID?: string;
      EXPO_PUBLIC_APP_ID?: string;
      EXPO_PUBLIC_MEASUREMENT_ID?: string;
    }
  }
  
  var process: {
    env: NodeJS.ProcessEnv;
  };
}

export {};
