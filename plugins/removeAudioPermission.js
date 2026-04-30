// Custom Expo config plugin — removes RECORD_AUDIO from AndroidManifest
const { withAndroidManifest } = require("expo/config-plugins");

module.exports = withAndroidManifest(config => {
  const manifest = config.modResults.manifest;
  const remove = [
    "android.permission.RECORD_AUDIO",
    "android.permission.MODIFY_AUDIO_SETTINGS",
  ];
  if (manifest["uses-permission"]) {
    manifest["uses-permission"] = manifest["uses-permission"].filter(p => {
      const name = p.$?.["android:name"];
      return !remove.includes(name);
    });
  }
  return config;
});
