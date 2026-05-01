// Custom Expo config plugin — removes RECORD_AUDIO from AndroidManifest
const { withAndroidManifest } = require("expo/config-plugins");

const removeAudioPermission = (config) => {
  return withAndroidManifest(config, (modConfig) => {
    const manifest = modConfig.modResults.manifest;
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
    return modConfig;
  });
};

module.exports = removeAudioPermission;
