// plugins/withFirebaseStaticFramework.js
//
// Фікс: Firebase Swift pods (FirebaseCoreInternal, FirebaseCrashlytics,
// FirebaseRemoteConfig, FirebaseSessions) не можуть бути інтегровані як
// static libraries бо їх Objective-C залежності (GoogleUtilities,
// GoogleDataTransport, nanopb, FirebaseABTesting) не мають module maps.
//
// Рішення:
//   1. $RNFirebaseAsStaticFramework = true  — конфігурує RN Firebase для static режиму
//   2. use_modular_headers!                 — генерує module maps для всіх ObjC pods
//      (CocoaPods сам рекомендує це в повідомленні про помилку)

const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

const withFirebaseStaticFramework = (config) =>
  withDangerousMod(config, [
    "ios",
    (config) => {
      const podfilePath = path.join(
        config.modRequest.platformProjectRoot,
        "Podfile"
      );
      let content = fs.readFileSync(podfilePath, "utf8");

      // Додаємо обидва рядки в самий початок Podfile (ідемпотентно)
      if (!content.includes("$RNFirebaseAsStaticFramework")) {
        const header =
          "$RNFirebaseAsStaticFramework = true\n" +
          "use_modular_headers!\n\n";
        content = header + content;
        fs.writeFileSync(podfilePath, content);
      }

      return config;
    },
  ]);

module.exports = withFirebaseStaticFramework;
