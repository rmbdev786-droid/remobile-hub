import { copyFile, cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

export async function packageStandalone(root = process.cwd()) {
  const nextDirectory = path.join(root, ".next");
  const standaloneDirectory = path.join(nextDirectory, "standalone");
  const distDirectory = path.join(root, "dist");
  const publicDirectory = path.join(root, "public");

  await rm(distDirectory, { recursive: true, force: true });
  await cp(standaloneDirectory, distDirectory, { recursive: true });

  await mkdir(path.join(distDirectory, ".next"), { recursive: true });
  await cp(path.join(nextDirectory, "static"), path.join(distDirectory, ".next", "static"), {
    recursive: true,
  });

  await mkdir(path.join(distDirectory, "public"), { recursive: true });
  await cp(publicDirectory, path.join(distDirectory, "public"), { recursive: true });

  // The managed Node runtime starts dist/index.js. Next emits server.js, so keep
  // an identical entrypoint at the expected location instead of adding a wrapper.
  await copyFile(path.join(distDirectory, "server.js"), path.join(distDirectory, "index.js"));

  const packagePath = path.join(distDirectory, "package.json");
  const packageJson = JSON.parse(await readFile(packagePath, "utf8"));
  packageJson.scripts = { ...(packageJson.scripts ?? {}), start: "node index.js" };
  await writeFile(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`);

  console.log("Packaged Next.js standalone runtime in dist/");
}

const isMainModule =
  process.argv[1] !== undefined && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMainModule) {
  await packageStandalone();
}
