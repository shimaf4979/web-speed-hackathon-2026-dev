import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const applicationDir = path.resolve(__dirname, "..");
const publicImageDir = path.resolve(applicationDir, "public/images");
const reportsDir = path.resolve(applicationDir, "reports");
const avifModulePath = path.resolve(applicationDir, "client/src/utils/avif_image_ids.ts");

const args = new Set(process.argv.slice(2));
const apply = args.has("--apply");

const MIN_SOURCE_BYTES = 4 * 1024 * 1024;
const MIN_SAVED_BYTES = 8 * 1024;

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
  const relativePath = path.relative(publicImageDir, filePath).replaceAll(path.sep, "/");
  return (
    relativePath.startsWith("profiles/") === false &&
    relativePath.endsWith(".thumb.webp") === false &&
    relativePath.endsWith(".webp")
  );
}

function getImageId(filePath) {
  return path.basename(filePath, ".webp");
}

async function convertToAvif(filePath) {
  const sourceBuffer = await fs.readFile(filePath);
  if (sourceBuffer.byteLength < MIN_SOURCE_BYTES) {
    return null;
  }

  const sourcePipeline = sharp(sourceBuffer, { animated: false, limitInputPixels: false }).rotate();
  const sourceMetadata = await sourcePipeline.metadata();
  const outputBuffer = await sourcePipeline
    .avif({
      chromaSubsampling: "4:2:0",
      effort: 4,
      quality: 50,
    })
    .toBuffer();
  const outputMetadata = await sharp(outputBuffer).metadata();

  if (
    sourceMetadata.width !== outputMetadata.width ||
    sourceMetadata.height !== outputMetadata.height
  ) {
    throw new Error(`Image dimensions changed unexpectedly: ${filePath}`);
  }

  const savedBytes = sourceBuffer.byteLength - outputBuffer.byteLength;
  if (savedBytes < MIN_SAVED_BYTES) {
    return null;
  }

  return {
    afterBytes: outputBuffer.byteLength,
    beforeBytes: sourceBuffer.byteLength,
    imageId: getImageId(filePath),
    outputBuffer,
    outputPath: filePath.replace(/\.webp$/iu, ".avif"),
    savedBytes,
    sourcePath: filePath,
  };
}

async function writeAvifModule(imageIds) {
  const sortedIds = [...imageIds].sort();
  const lines = [
    "export const avifImageIds = new Set<string>([",
    ...sortedIds.map((imageId) => `  ${JSON.stringify(imageId)},`),
    "]);",
    "",
  ];
  await fs.writeFile(avifModulePath, lines.join("\n"));
}

async function main() {
  await fs.mkdir(reportsDir, { recursive: true });

  const imageFiles = (await walk(publicImageDir)).filter(isTargetImage);
  const results = [];
  const generatedImageIds = [];

  for (const imageFile of imageFiles) {
    const result = await convertToAvif(imageFile);
    if (result == null) {
      continue;
    }

    generatedImageIds.push(result.imageId);
    results.push({
      sourcePath: path.relative(applicationDir, result.sourcePath),
      outputPath: path.relative(applicationDir, result.outputPath),
      imageId: result.imageId,
      beforeBytes: result.beforeBytes,
      afterBytes: result.afterBytes,
      savedBytes: result.savedBytes,
    });

    if (apply) {
      await fs.writeFile(result.outputPath, result.outputBuffer);
    }
  }

  if (apply) {
    await writeAvifModule(generatedImageIds);
  }

  const summary = results.reduce(
    (accumulator, result) => {
      accumulator.beforeBytes += result.beforeBytes;
      accumulator.afterBytes += result.afterBytes;
      accumulator.savedBytes += result.savedBytes;
      return accumulator;
    },
    { afterBytes: 0, beforeBytes: 0, savedBytes: 0 },
  );

  const report = {
    apply,
    generatedAt: new Date().toISOString(),
    summary: {
      ...summary,
      generatedCount: results.length,
    },
    thresholds: {
      minSavedBytes: MIN_SAVED_BYTES,
      minSourceBytes: MIN_SOURCE_BYTES,
    },
    results: results.sort((left, right) => right.savedBytes - left.savedBytes),
  };

  await fs.writeFile(
    path.resolve(reportsDir, "avif-variant-report.json"),
    JSON.stringify(report, null, 2),
  );

  console.log(JSON.stringify(report.summary, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
