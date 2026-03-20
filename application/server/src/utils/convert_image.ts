import sharp from "sharp";

export async function convertImageToWebP(inputBuffer: Buffer): Promise<Buffer> {
  return sharp(inputBuffer).webp({ quality: 80 }).withMetadata().toBuffer();
}
