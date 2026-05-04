// plugins/withFirebaseStaticFramework.js
// Фікс для Firebase Swift pods зі static linkage в Expo managed workflow.
//
// Проблема: "The Swift pod FirebaseCoreInternal depends upon GoogleUtilities,
// which does not define modules"
//
// Причина: Firebase Objective-C залежності (GoogleUtilities, GoogleDataTransport,
// nanopb, FirebaseABTesting) не мають module maps, необхідних для static linking.
//
// Рішення: $RNFirebaseAsStaticFramework = true + use_modular_headers!

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

      // 1. $RNFirebaseAsStaticFramework на самий початок файлу
      if (!content.includes("$RNFirebaseAsStaticFramework")) {
        content = "$RNFirebaseAsStaticFramework = true\n" + content;
      }

      // 2. use_modular_headers! одразу після рядка platform :ios
      // Генерує module maps для всіх Objective-C pods — потрібно для static linking
      if (!content.includes("use_modular_headers!")) {
        content = content.replace(
          /(platform :ios[^\n]*\n)/,
          "$1use_modular_headers!\n"
        );
      }

      fs.writeFileSync(podfilePath, content);
      return config;
    },
  ]);

module.exports = withFirebaseStaticFramework;
