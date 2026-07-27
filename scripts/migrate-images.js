/**
 * Image migration script — converts existing listing and avatar images to
 * resized WebP. Safe to run multiple times (idempotent).
 *
 * PREREQUISITES
 *   npm install --save-dev sharp dotenv
 *
 * USAGE
 *   SUPABASE_URL=https://xxx.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=eyJh... \
 *   node scripts/migrate-images.js
 *
 *   Or put the vars in a .env file (never commit it) and run:
 *   node -r dotenv/config scripts/migrate-images.js
 *
 * WHAT IT DOES
 *   1. Reads every row in listing_images and profiles (avatar_url).
 *   2. Skips rows whose storage_path already ends in ".webp"
 *      (idempotency marker — first run converts, subsequent runs skip).
 *   3. For each non-webp image: download → resize to max 1200 px → encode
 *      as WebP at 80 % quality → upload to the same folder with .webp ext →
 *      update the DB row → delete the old file.
 *   4. Writes a JSON log of every action to migrate-images-log.json so you
 *      can inspect or roll back manually if needed.
 */

"use strict";

const { createClient } = require("@supabase/supabase-js");
const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error(
    "Missing env vars. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
  );
  process.exit(1);
}

const MAX_DIMENSION = 1200;
const WEBP_QUALITY = 80;
const LOG_FILE = path.join(__dirname, "migrate-images-log.json");

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const log = [];

function record(action, details) {
  const entry = { action, ...details, at: new Date().toISOString() };
  log.push(entry);
  console.log(`[${entry.at}] ${action}`, details);
}

async function downloadFile(bucket, storagePath) {
  const { data, error } = await supabase.storage
    .from(bucket)
    .download(storagePath);
  if (error) throw new Error(`Download failed: ${error.message}`);
  const arrayBuffer = await data.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function processBuffer(inputBuffer) {
  return sharp(inputBuffer)
    .resize(MAX_DIMENSION, MAX_DIMENSION, {
      fit: "inside",
      withoutEnlargement: true, // never upscale
    })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer();
}

async function uploadFile(bucket, storagePath, buffer) {
  const { error } = await supabase.storage.from(bucket).upload(storagePath, buffer, {
    contentType: "image/webp",
    cacheControl: "3600",
    upsert: true,
  });
  if (error) throw new Error(`Upload failed: ${error.message}`);
}

async function deleteFile(bucket, storagePath) {
  const { error } = await supabase.storage.from(bucket).remove([storagePath]);
  if (error) throw new Error(`Delete failed: ${error.message}`);
}

function webpPath(oldPath) {
  return oldPath.replace(/\.[^/.]+$/, "") + ".webp";
}

// ---------------------------------------------------------------------------
// Migrate listing images
// ---------------------------------------------------------------------------

async function migrateListingImages() {
  console.log("\n=== Migrating listing_images ===");

  const { data: rows, error } = await supabase
    .from("listing_images")
    .select("id, storage_path, listing_id");

  if (error) throw new Error(`DB select failed: ${error.message}`);
  console.log(`Found ${rows.length} listing image records.`);

  for (const row of rows) {
    const oldPath = row.storage_path;

    // Idempotency: already .webp means we already processed it.
    if (oldPath.endsWith(".webp")) {
      record("skip", { id: row.id, reason: "already .webp", path: oldPath });
      continue;
    }

    const newPath = webpPath(oldPath);

    try {
      const inputBuffer = await downloadFile("listing-images", oldPath);
      const outputBuffer = await processBuffer(inputBuffer);

      await uploadFile("listing-images", newPath, outputBuffer);

      const { error: updateErr } = await supabase
        .from("listing_images")
        .update({ storage_path: newPath })
        .eq("id", row.id);

      if (updateErr) throw new Error(`DB update failed: ${updateErr.message}`);

      await deleteFile("listing-images", oldPath);

      record("converted", {
        id: row.id,
        from: oldPath,
        to: newPath,
        oldBytes: inputBuffer.length,
        newBytes: outputBuffer.length,
        saved: `${Math.round((1 - outputBuffer.length / inputBuffer.length) * 100)}%`,
      });
    } catch (err) {
      record("error", { id: row.id, path: oldPath, error: err.message });
    }
  }
}

// ---------------------------------------------------------------------------
// Migrate avatars
// ---------------------------------------------------------------------------

async function migrateAvatars() {
  console.log("\n=== Migrating avatars ===");

  const { data: rows, error } = await supabase
    .from("profiles")
    .select("id, avatar_url")
    .not("avatar_url", "is", null);

  if (error) throw new Error(`DB select failed: ${error.message}`);
  console.log(`Found ${rows.length} profiles with avatars.`);

  for (const row of rows) {
    const oldPath = row.avatar_url;
    if (!oldPath) continue;

    if (oldPath.endsWith(".webp")) {
      record("skip", { id: row.id, reason: "already .webp", path: oldPath });
      continue;
    }

    const newPath = webpPath(oldPath);

    try {
      const inputBuffer = await downloadFile("avatars", oldPath);
      const outputBuffer = await processBuffer(inputBuffer);

      await uploadFile("avatars", newPath, outputBuffer);

      const { error: updateErr } = await supabase
        .from("profiles")
        .update({ avatar_url: newPath })
        .eq("id", row.id);

      if (updateErr) throw new Error(`DB update failed: ${updateErr.message}`);

      await deleteFile("avatars", oldPath);

      record("converted", {
        id: row.id,
        from: oldPath,
        to: newPath,
        oldBytes: inputBuffer.length,
        newBytes: outputBuffer.length,
        saved: `${Math.round((1 - outputBuffer.length / inputBuffer.length) * 100)}%`,
      });
    } catch (err) {
      record("error", { id: row.id, path: oldPath, error: err.message });
    }
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("Starting image migration…");
  console.log(`  Max dimension : ${MAX_DIMENSION} px`);
  console.log(`  WebP quality  : ${WEBP_QUALITY} %`);
  console.log(`  Log file      : ${LOG_FILE}\n`);

  await migrateListingImages();
  await migrateAvatars();

  fs.writeFileSync(LOG_FILE, JSON.stringify(log, null, 2));

  const errors = log.filter((e) => e.action === "error");
  const converted = log.filter((e) => e.action === "converted");
  const skipped = log.filter((e) => e.action === "skip");

  console.log("\n=== Summary ===");
  console.log(`  Converted : ${converted.length}`);
  console.log(`  Skipped   : ${skipped.length} (already WebP)`);
  console.log(`  Errors    : ${errors.length}`);
  if (errors.length > 0) {
    console.log("\nErrors:");
    errors.forEach((e) => console.log(`  ${e.path} → ${e.error}`));
  }
  console.log(`\nFull log written to ${LOG_FILE}`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  fs.writeFileSync(LOG_FILE, JSON.stringify(log, null, 2));
  process.exit(1);
});
