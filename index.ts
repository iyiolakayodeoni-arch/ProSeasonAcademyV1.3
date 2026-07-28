import { registerRootComponent } from 'expo';
import * as SplashScreen from 'expo-splash-screen';

// Keep the native (OS-level) splash visible until the JS splash's first
// frame is on screen — no white flash, no mismatched jump cut.
SplashScreen.preventAutoHideAsync().catch(() => {});

import App from './App';

registerRootComponent(App);
