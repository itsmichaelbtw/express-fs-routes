import fs from "fs";
import path from "path";
import url from "url";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

const esm = path.join(__dirname, "..", "dist/module");
const cjs = path.join(__dirname, "..", "dist/common");

function stringify(obj: any) {
  return JSON.stringify(obj, null, 2);
}

function deleteSourceFiles(folder: string) {
  const files = fs.readdirSync(folder);

  for (const file of files) {
    const filePath = path.join(folder, file);
    const isMap = file.endsWith(".map");

    if (isMap) {
      fs.rmSync(filePath, { force: true });
    }
  }
}

fs.writeFileSync(
  path.join(esm, "package.json"),
  stringify({
    type: "module",
    types: "../types/index.d.ts"
  })
);

fs.writeFileSync(
  path.join(cjs, "package.json"),
  stringify({
    type: "commonjs",
    types: "../types/index.d.ts"
  })
);

deleteSourceFiles(esm);
deleteSourceFiles(cjs);
