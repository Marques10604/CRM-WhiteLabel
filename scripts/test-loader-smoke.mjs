import("@/lib/validations")
  .then((m) => {
    console.log("leadSchema present:", typeof m.leadSchema);
  })
  .catch((e) => {
    console.error("ERR", e.message);
    process.exit(1);
  });
