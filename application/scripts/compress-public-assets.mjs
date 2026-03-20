import { promises as fs } from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

import ffmpegPath from "ffmpeg-static";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const applicationDir = path.resolve(__dirname, "..");
const publicDir = path.resolve(applicationDir, "public");
const reportsDir = path.resolve(applicationDir, "reports");
const manifestPath = path.resolve(applicationDir, "client/src/utils/compressed_public_assets.ts");

const apply = process.argv.includes("--apply");
const imageExtensions = new Set([".jpg", ".jpeg", ".png"]);
const imagesDir = path.resolve(publicDir, "images");
const profileImagesDir = path.resolve(imagesDir, "profiles");
const moviesDir = path.resolve(publicDir, "movies");

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

function getId(filePath) {
  return path.basename(filePath, path.extname(filePath));
}

function runFfmpeg(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(ffmpegPath, args, { stdio: "ignore" });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`ffmpeg exited with code ${code ?? -1}`));
    });
  });
}

async function convertImage(filePath) {
  const sourceBuffer = await fs.readFile(filePath);
  const sourceSize = sourceBuffer.byteLength;
  const pipeline = sharp(sourceBuffer, { animated: false, limitInputPixels: false }).rotate();
  const sourceMetadata = await pipeline.metadata();
  const outputBuffer = await pipeline
    .webp({
      quality: 86,
      effort: 4,
      smartSubsample: true,
    })
    .toBuffer();
  const outputMetadata = await sharp(outputBuffer).metadata();

  if (
    sourceMetadata.width !== outputMetadata.width ||
    sourceMetadata.height !== outputMetadata.height ||
    outputBuffer.byteLength >= sourceSize
  ) {
    return null;
  }

  return {
    afterBytes: outputBuffer.byteLength,
    beforeBytes: sourceSize,
    outputBuffer,
    outputPath: filePath.replace(/\.(?:jpe?g|png)$/iu, ".webp"),
  };
}

async function convertMovie(filePath) {
  const sourceStats = await fs.stat(filePath);
  const outputPath = filePath.replace(/\.gif$/iu, ".webm");
  const tempPath = `${outputPath}.tmp`;
  await fs.rm(tempPath, { force: true });
  await runFfmpeg([
    "-y",
    "-i",
    filePath,
    "-an",
    "-c:v",
    "libvpx-vp9",
    "-b:v",
    "0",
    "-crf",
    "35",
    "-deadline",
    "good",
    "-row-mt",
    "1",
    tempPath,
  ]);
  const outputStats = await fs.stat(tempPath);
  if (outputStats.size >= sourceStats.size) {
    await fs.rm(tempPath, { force: true });
    return null;
  }

  return {
    afterBytes: outputStats.size,
    beforeBytes: sourceStats.size,
    outputPath,
    tempPath,
  };
}

function formatSet(name, values) {
  return `export const ${name} = new Set<string>(${JSON.stringify([...values].sort(), null, 2)});\n`;
}

async function writeManifest({ imageIds, movieIds, profileImageIds }) {
  const content = [
    formatSet("compressedImageIds", imageIds),
    formatSet("compressedMovieIds", movieIds),
    formatSet("compressedProfileImageIds", profileImageIds),
  ].join("\n");
  await fs.writeFile(manifestPath, content);
}

async function main() {
  await fs.mkdir(reportsDir, { recursive: true });

  const imageFiles = (await walk(imagesDir)).filter((filePath) =>
    imageExtensions.has(path.extname(filePath).toLowerCase()),
  );
  const movieFiles = (await walk(moviesDir)).filter(
    (filePath) => path.extname(filePath).toLowerCase() === ".gif",
  );

  const imageIds = new Set();
  const movieIds = new Set();
  const profileImageIds = new Set();
  const results = [];

  for (const imageFile of imageFiles) {
    const result = await convertImage(imageFile);
    if (result == null) {
      continue;
    }

    const isProfileImage = imageFile.startsWith(`${profileImagesDir}${path.sep}`);
    const id = getId(imageFile);
    if (isProfileImage) {
      profileImageIds.add(id);
    } else {
      imageIds.add(id);
    }

    results.push({
      afterBytes: result.afterBytes,
      beforeBytes: result.beforeBytes,
      id,
      kind: isProfileImage ? "profile-image" : "image",
      outputPath: path.relative(applicationDir, result.outputPath),
      sourcePath: path.relative(applicationDir, imageFile),
    });

    if (apply) {
      await fs.writeFile(result.outputPath, result.outputBuffer);
      await fs.rm(imageFile);
    }
  }

  for (const movieFile of movieFiles) {
    const result = await convertMovie(movieFile);
    if (result == null) {
      continue;
    }

    const id = getId(movieFile);
    movieIds.add(id);
    results.push({
      afterBytes: result.afterBytes,
      beforeBytes: result.beforeBytes,
      id,
      kind: "movie",
      outputPath: path.relative(applicationDir, result.outputPath),
      sourcePath: path.relative(applicationDir, movieFile),
    });

    if (apply) {
      await fs.rename(result.tempPath, result.outputPath);
      await fs.rm(movieFile);
    } else {
      await fs.rm(result.tempPath, { force: true });
    }
  }

  await writeManifest({ imageIds, movieIds, profileImageIds });

  const summary = results.reduce(
    (acc, result) => {
      acc.beforeBytes += result.beforeBytes;
      acc.afterBytes += result.afterBytes;
      return acc;
    },
    { afterBytes: 0, beforeBytes: 0 },
  );

  const report = {
    apply,
    generatedAt: new Date().toISOString(),
    summary: {
      afterBytes: summary.afterBytes,
      beforeBytes: summary.beforeBytes,
      convertedCount: results.length,
      savedBytes: summary.beforeBytes - summary.afterBytes,
    },
    results: results.sort((left, right) => right.beforeBytes - left.beforeBytes),
  };

  await fs.writeFile(
    path.resolve(reportsDir, "public-asset-compression-report.json"),
    JSON.stringify(report, null, 2),
  );

  console.log(JSON.stringify(report.summary, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
