import { registerRootComponent } from 'expo';
import App from './App';

// Web entry for ProSeason Academy.
// Fresh start: no splash, no pre-loaders — the app mounts straight to the
// landing page. Fonts load inside <App /> (see App.tsx).
registerRootComponent(App);
