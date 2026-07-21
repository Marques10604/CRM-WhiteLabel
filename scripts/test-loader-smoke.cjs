const { register } = require("node:module");
const { pathToFileURL } = require("node:url");

register("./ts-alias-loader.mjs", pathToFileURL(__dirname + "/"));

import("@/lib/validations")
  .then((m) => {
    console.log("leadSchema present (cjs):", typeof m.leadSchema);
  })
  .catch((e) => {
    console.error("ERR", e.message);
    process.exit(1);
  });
