import { spawn } from "node:child_process";

process.env.RUN_INTEGRATION_TESTS = "1";

const child = spawn("npm", ["test"], {
  stdio: "inherit",
  shell: true,
  env: process.env
});

child.on("exit", (code) => {
  process.exit(code ?? 1);
});

