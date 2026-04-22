import { execSync } from "child_process";
import { existsSync } from "fs";

if (!existsSync("dist/public")) {
  console.error("ERROR: dist/public not found. Run 'npm run build' first.");
  process.exit(1);
}

console.log("Building production server (CommonJS)...");
execSync(
  "npx esbuild server/prod.ts --platform=node --packages=external --bundle --format=cjs --outfile=dist/prod.cjs",
  { stdio: "inherit" }
);
console.log("Done. Startup file: dist/prod.cjs");
