import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const applicationDir = path.resolve(__dirname, "..");
const publicImageDir = path.resolve(applicationDir, "public/images/profiles");
const reportsDir = path.resolve(applicationDir, "reports");
const apply = process.argv.includes("--apply");
const AVATAR_QUALITY = 72;
const AVATAR_WIDTH = 128;

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.resolve(dir, entry.name);
      if (entry.isDirectory()) {
        return walk(entryPath);
      }
      return [entryPath];
    }),
  );
  return nested.flat();
}

function isTargetImage(filePath) {
  return filePath.endsWith(".avatar.webp") === false && filePath.endsWith(".webp");
}

async function createAvatarVariant(filePath) {
  const sourceBuffer = await fs.readFile(filePath);
  const outputBuffer = await sharp(sourceBuffer, { limitInputPixels: false })
    .resize({
      fit: "cover",
      height: AVATAR_WIDTH,
      position: "centre",
      width: AVATAR_WIDTH,
      withoutEnlargement: true,
    })
    .webp({
      effort: 4,
      quality: AVATAR_QUALITY,
      smartSubsample: true,
    })
    .toBuffer();

  return {
    beforeBytes: sourceBuffer.byteLength,
    outputBuffer,
    outputPath: filePath.replace(/\.webp$/iu, ".avatar.webp"),
  };
}

async function main() {
  const files = (await walk(publicImageDir)).filter(isTargetImage);
  const results = [];

  for (const filePath of files) {
    const result = await createAvatarVariant(filePath);
    results.push({
      avatarBytes: result.outputBuffer.byteLength,
      beforeBytes: result.beforeBytes,
      outputPath: path.relative(applicationDir, result.outputPath),
      savedBytes: result.beforeBytes - result.outputBuffer.byteLength,
      sourcePath: path.relative(applicationDir, filePath),
    });

    if (apply) {
      await fs.writeFile(result.outputPath, result.outputBuffer);
    }
  }

  const summary = results.reduce(
    (accumulator, result) => {
      accumulator.avatarBytes += result.avatarBytes;
      accumulator.beforeBytes += result.beforeBytes;
      return accumulator;
    },
    { avatarBytes: 0, beforeBytes: 0 },
  );

  await fs.mkdir(reportsDir, { recursive: true });
  await fs.writeFile(
    path.resolve(reportsDir, "profile-image-variant-report.json"),
    JSON.stringify(
      {
        apply,
        generatedAt: new Date().toISOString(),
        summary: {
          avatarBytes: summary.avatarBytes,
          beforeBytes: summary.beforeBytes,
          generatedCount: results.length,
          savedBytes: summary.beforeBytes - summary.avatarBytes,
        },
        results,
      },
      null,
      2,
    ),
  );

  console.log(
    JSON.stringify(
      {
        avatarBytes: summary.avatarBytes,
        beforeBytes: summary.beforeBytes,
        generatedCount: results.length,
        savedBytes: summary.beforeBytes - summary.avatarBytes,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
