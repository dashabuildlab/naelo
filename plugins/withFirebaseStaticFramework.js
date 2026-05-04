// plugins/withFirebaseStaticFramework.js
// Додає $RNFirebaseAsStaticFramework = true в Podfile перед підключенням Firebase pods
// Необхідно для роботи Firebase Swift pods зі static linkage

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
      if (!content.includes("$RNFirebaseAsStaticFramework")) {
        content = "$RNFirebaseAsStaticFramework = true\n" + content;
        fs.writeFileSync(podfilePath, content);
      }
      return config;
    },
  ]);

module.exports = withFirebaseStaticFramework;
