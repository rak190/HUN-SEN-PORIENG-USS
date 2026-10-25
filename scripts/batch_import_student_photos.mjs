import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { createClient } from '@supabase/supabase-js';

// Read .env.local
const envContent = fs.readFileSync('.env.local', 'utf-8');
const env = {};
for (const line of envContent.split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const idx = trimmed.indexOf('=');
  if (idx !== -1) {
    const key = trimmed.slice(0, idx).trim();
    let val = trimmed.slice(idx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    env[key] = val;
  }
}

const supabaseAdmin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

function normalizeText(text) {
  return (text || '')
    .toLowerCase()
    .replace(/\.[^/.]+$/, '')
    .replace(/\(\d+\)/g, '')
    .replace(/^[0-9០-៩\s._-]+/, '')
    .replace(/[._-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Parses a ZIP file buffer and extracts all JPEG/PNG/WEBP files without external dependencies.
 */
function extractZipFiles(zipPath) {
  const buf = fs.readFileSync(zipPath);
  let eocdOffset = -1;
  for (let i = buf.length - 22; i >= 0; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      eocdOffset = i;
      break;
    }
  }
  if (eocdOffset === -1) throw new Error('EOCD signature not found in ZIP');

  const cdSize = buf.readUInt32LE(eocdOffset + 12);
  const cdOffset = buf.readUInt32LE(eocdOffset + 16);

  let ptr = cdOffset;
  const extracted = [];

  while (ptr < cdOffset + cdSize) {
    const sig = buf.readUInt32LE(ptr);
    if (sig !== 0x02014b50) break;

    const compressionMethod = buf.readUInt16LE(ptr + 10);
    const compressedSize = buf.readUInt32LE(ptr + 20);
    const uncompressedSize = buf.readUInt32LE(ptr + 24);
    const nameLen = buf.readUInt16LE(ptr + 28);
    const extraLen = buf.readUInt16LE(ptr + 30);
    const commentLen = buf.readUInt16LE(ptr + 32);
    const localHeaderOffset = buf.readUInt32LE(ptr + 42);

    const name = buf.toString('utf8', ptr + 46, ptr + 46 + nameLen);
    ptr += 46 + nameLen + extraLen + commentLen;

    if (name.includes('__MACOSX') || name.endsWith('/')) continue;
    const lower = name.toLowerCase();
    if (!lower.endsWith('.jpg') && !lower.endsWith('.jpeg') && !lower.endsWith('.png') && !lower.endsWith('.webp')) {
      continue;
    }

    // Local file header to read data
    const localSig = buf.readUInt32LE(localHeaderOffset);
    if (localSig !== 0x04034b50) continue;

    const localNameLen = buf.readUInt16LE(localHeaderOffset + 26);
    const localExtraLen = buf.readUInt16LE(localHeaderOffset + 28);
    const dataOffset = localHeaderOffset + 30 + localNameLen + localExtraLen;

    let fileData;
    if (compressionMethod === 0) {
      // Stored (no compression)
      fileData = buf.subarray(dataOffset, dataOffset + uncompressedSize);
    } else if (compressionMethod === 8) {
      // Deflate
      try {
        fileData = zlib.inflateRawSync(buf.subarray(dataOffset, dataOffset + compressedSize));
      } catch (zErr) {
        console.warn(`Deflate decomp error for ${name}:`, zErr.message);
        continue;
      }
    } else {
      console.warn(`Unsupported compression method ${compressionMethod} for ${name}`);
      continue;
    }

    extracted.push({ name, data: fileData });
  }

  return extracted;
}

async function runBatchImport() {
  console.log('--- Starting Student Photo Batch Import ---');

  // 1. Fetch all students from DB
  const { data: students, error: sErr } = await supabaseAdmin
    .from('students')
    .select('id, full_name, english_name, student_id_number, photo_url');

  if (sErr || !students) {
    console.error('Failed to fetch students from DB:', sErr);
    return;
  }
  console.log(`Fetched ${students.length} students from database.`);

  // 2. Locate zip files in Downloads and Telegram Desktop
  const potentialDirs = [
    'C:\\Users\\Admin\\Downloads\\Telegram Desktop',
    'C:\\Users\\Admin\\Downloads',
  ];

  let allFiles = [];
  for (const dir of potentialDirs) {
    if (!fs.existsSync(dir)) continue;
    const list = fs.readdirSync(dir);
    for (const f of list) {
      if (f.endsWith('.zip')) {
        const fullZipPath = path.join(dir, f);
        console.log(`Scanning zip: ${fullZipPath}`);
        try {
          const filesInZip = await extractZipFiles(fullZipPath);
          console.log(`Extracted ${filesInZip.length} image files from ${f}`);
          allFiles.push(...filesInZip);
        } catch (err) {
          console.warn(`Could not extract from ${f}:`, err.message);
        }
      }
    }
  }

  console.log(`Total extracted candidate images across archives: ${allFiles.length}`);
  if (allFiles.length === 0) {
    console.log('No candidate images found in archives.');
    return;
  }

  console.log('All 51 DB Students:');
  students.forEach((s, idx) => console.log(` ${idx + 1}. [${s.id}] "${s.full_name}"`));

  console.log('\nSample 20 filenames from archives:');
  allFiles.slice(0, 20).forEach((f, idx) => console.log(` ${idx + 1}. "${f.name}"`));

  for (const fileItem of allFiles) {
    const rawClean = path.basename(fileItem.name).replace(/\.[^/.]+$/, '').trim().toLowerCase();
    const normalized = normalizeText(path.basename(fileItem.name));

    const matchedStudent = students.find((s) => {
      const sFullName = (s.full_name || '').toLowerCase().trim();
      const sEngName = (s.english_name || '').toLowerCase().trim();
      const sNorm = normalizeText(s.full_name || '');
      const sId = (s.student_id_number || '').toLowerCase().trim();

      if (sFullName === rawClean || (sEngName && sEngName === rawClean) || (sId && sId === rawClean)) {
        return true;
      }
      if (normalized && (sNorm === normalized || sFullName === normalized)) {
        return true;
      }
      if (sFullName && sFullName.length >= 3 && rawClean.includes(sFullName)) {
        return true;
      }
      return false;
    });

    if (matchedStudent) {
      matchedCount++;
      const ext = path.extname(fileItem.name).toLowerCase().replace('.', '') || 'jpg';
      const contentType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
      const uniqueFileName = `${matchedStudent.id}-${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;

      console.log(`[MATCH] "${fileItem.name}" -> Student: "${matchedStudent.full_name}" (ID: ${matchedStudent.id})`);

      // Upload to Supabase Storage
      const { error: upErr } = await supabaseAdmin.storage
        .from('student-profiles')
        .upload(uniqueFileName, fileItem.data, { contentType, upsert: true });

      if (upErr) {
        console.error(`Upload error for ${matchedStudent.full_name}:`, upErr.message);
        continue;
      }

      const { data: pubData } = supabaseAdmin.storage
        .from('student-profiles')
        .getPublicUrl(uniqueFileName);

      const publicUrl = pubData.publicUrl;

      // Update student record
      const { error: dbErr } = await supabaseAdmin
        .from('students')
        .update({ photo_url: publicUrl, updated_at: new Date().toISOString() })
        .eq('id', matchedStudent.id);

      if (dbErr) {
        console.error(`DB update error for ${matchedStudent.full_name}:`, dbErr.message);
      } else {
        updatedCount++;
        matchedStudent.photo_url = publicUrl;
      }
    }
  }

  console.log(`\n=== Batch Import Summary ===`);
  console.log(`Total candidate files: ${allFiles.length}`);
  console.log(`Matched students: ${matchedCount}`);
  console.log(`Successfully updated in DB & Storage: ${updatedCount}`);
}

runBatchImport().catch(console.error);
