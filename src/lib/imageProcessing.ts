const MAX_DIMENSION = 1200;
const WEBP_QUALITY = 0.8;

/**
 * Resize an image to fit within MAX_DIMENSION × MAX_DIMENSION and re-encode
 * it as WebP at WEBP_QUALITY. Rules:
 *  - Never upscales (images smaller than 1200px are only re-encoded, not stretched)
 *  - Preserves aspect ratio
 *  - Preserves alpha channel (WebP supports RGBA)
 *  - Works entirely in the browser — no server round-trip
 */
export async function processImageForUpload(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);

  let { width, height } = bitmap;

  if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
    const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
    width = Math.round(width * ratio);
    height = Math.round(height * ratio);
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    throw new Error("Canvas 2D context unavailable");
  }

  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => {
        if (b) resolve(b);
        else reject(new Error("canvas.toBlob returned null"));
      },
      "image/webp",
      WEBP_QUALITY
    );
  });

  const baseName = file.name.replace(/\.[^.]+$/, "");
  return new File([blob], `${baseName}.webp`, { type: "image/webp" });
}
