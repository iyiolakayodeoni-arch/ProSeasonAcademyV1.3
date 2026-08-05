// Minimal helper to start RN Storybook: prints guidance and exits.
// Running full RN Storybook requires native setup; this script explains steps.
console.log('React Native Storybook helper');
console.log('1) Install devDependencies: npm install --save-dev @storybook/react-native @storybook/react @storybook/addon-essentials react-native-storybook-loader');
console.log('2) Follow https://storybook.js.org/docs/react-native/get-started/introduction to wire Storybook into your RN app (register the Storybook entry point, configure metro).');
console.log('3) For web preview, run: npm run storybook');
console.log('4) For native builds, follow the docs to add the Storybook entry file and run the app in the dev client.');
process.exit(0);
