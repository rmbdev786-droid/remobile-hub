import { afterEach, describe, expect, it } from "vitest";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { packageStandalone } from "../scripts/package-standalone.mjs";

const temporaryDirectories = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      rm(directory, { recursive: true, force: true }),
    ),
  );
});

describe("standalone deployment packaging", () => {
  it("creates the managed runtime and non-empty public artifact layout", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "remobile-package-"));
    temporaryDirectories.push(root);

    await mkdir(path.join(root, ".next", "standalone"), { recursive: true });
    await mkdir(path.join(root, ".next", "static", "chunks"), { recursive: true });
    await mkdir(path.join(root, "public"), { recursive: true });

    const serverSource = "console.log('fixture server');\n";
    await writeFile(path.join(root, ".next", "standalone", "server.js"), serverSource);
    await writeFile(
      path.join(root, ".next", "standalone", "package.json"),
      JSON.stringify({ name: "fixture", private: true, type: "module" }),
    );
    await writeFile(path.join(root, ".next", "static", "chunks", "app.js"), "fixture");
    await writeFile(path.join(root, "public", "robots.txt"), "User-agent: *\nDisallow: /\n");

    await packageStandalone(root);

    await expect(readFile(path.join(root, "dist", "index.js"), "utf8")).resolves.toBe(
      serverSource,
    );
    await expect(
      readFile(path.join(root, "dist", ".next", "static", "chunks", "app.js"), "utf8"),
    ).resolves.toBe("fixture");
    await expect(readFile(path.join(root, "dist", "public", "robots.txt"), "utf8")).resolves.toContain(
      "Disallow: /",
    );

    const packageJson = JSON.parse(
      await readFile(path.join(root, "dist", "package.json"), "utf8"),
    );
    expect(packageJson.scripts.start).toBe("node index.js");
  });
});
