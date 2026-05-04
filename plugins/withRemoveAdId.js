// plugins/withRemoveAdId.js
// Firebase Crashlytics автоматично додає com.google.android.gms.permission.AD_ID
// в AndroidManifest.xml. Якщо застосунок не використовує рекламний ідентифікатор —
// цей дозвіл треба явно видалити, щоб відповідати декларації у Google Play Console.

const { withAndroidManifest } = require("@expo/config-plugins");

const withRemoveAdId = (config) =>
  withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;

    if (!manifest["uses-permission"]) {
      manifest["uses-permission"] = [];
    }

    // Перевіряємо чи вже є запис на видалення
    const alreadyRemoved = manifest["uses-permission"].some(
      (p) =>
        p.$?.["android:name"] ===
          "com.google.android.gms.permission.AD_ID" &&
        p.$?.["tools:node"] === "remove"
    );

    if (!alreadyRemoved) {
      manifest["uses-permission"].push({
        $: {
          "android:name": "com.google.android.gms.permission.AD_ID",
          "tools:node": "remove",
        },
      });
    }

    return config;
  });

module.exports = withRemoveAdId;
