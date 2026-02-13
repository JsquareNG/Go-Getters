// scripts/generate-ui-index.js
const fs = require("fs");
const path = require("path");

const componentsDir = path.join(__dirname, "../components/ui");
const indexPath = path.join(componentsDir, "index.js");

const files = fs.readdirSync(componentsDir)
  .filter(file => /\.(jsx|js)$/.test(file) && file !== "index.js");

let exportStatements = files.map(file => {
  const name = path.basename(file, path.extname(file));
  return `export { ${name} } from "./${name}";`;
});

fs.writeFileSync(indexPath, exportStatements.join("\n") + "\n");

console.log("index.js generated for UI components!");
