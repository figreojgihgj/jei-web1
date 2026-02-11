#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const packsRoot = path.join(repoRoot, 'public', 'packs');
const packsIndexPath = path.join(packsRoot, 'index.json');

const args = new Set(process.argv.slice(2));
const onlyMissing = args.has('--only-missing');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  const out = JSON.stringify(value, null, 2) + '\n';
  fs.writeFileSync(filePath, out, 'utf8');
}

function toPosixPath(p) {
  return p.replaceAll('\\', '/');
}

function toLiteItem(itemDef, detailPath) {
  const lite = { ...itemDef, detailPath };
  delete lite.wiki;
  delete lite.recipes;
  return lite;
}

function assertArray(value, filePath) {
  if (!Array.isArray(value)) {
    throw new Error(`${filePath}: expected JSON array`);
  }
  return value;
}

function loadItemsFromDirectory(packDir, manifest, packId) {
  const indexRel = manifest.files?.itemsIndex;
  if (!indexRel || typeof indexRel !== 'string') {
    throw new Error(`[${packId}] items is directory but files.itemsIndex is missing`);
  }
  const indexPath = path.join(packDir, indexRel);
  const itemFiles = assertArray(readJson(indexPath), indexPath);
  return itemFiles.map((rel, i) => {
    if (typeof rel !== 'string') {
      throw new Error(`[${packId}] ${indexRel}[${i}]: expected string`);
    }
    const abs = path.join(packDir, rel);
    const item = readJson(abs);
    return toLiteItem(item, toPosixPath(rel));
  });
}

function loadItemsFromArray(packDir, manifest, packId) {
  const itemsRel = manifest.files?.items;
  if (!itemsRel || typeof itemsRel !== 'string') {
    throw new Error(`[${packId}] files.items is missing`);
  }
  const itemsPath = path.join(packDir, itemsRel);
  const items = assertArray(readJson(itemsPath), itemsPath);
  const normalizedItemsRel = toPosixPath(itemsRel);
  return items.map((item, i) => toLiteItem(item, `${normalizedItemsRel}#${i}`));
}

function processPack(packId) {
  const packDir = path.join(packsRoot, packId);
  const manifestPath = path.join(packDir, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    return { packId, status: 'skipped', reason: 'manifest.json missing' };
  }

  const manifest = readJson(manifestPath);
  const itemsFile = manifest?.files?.items;
  if (!itemsFile || typeof itemsFile !== 'string') {
    return { packId, status: 'skipped', reason: 'files.items missing' };
  }

  const itemsLiteRel =
    typeof manifest?.files?.itemsLite === 'string' && manifest.files.itemsLite.trim()
      ? manifest.files.itemsLite
      : 'itemsLite.json';
  const itemsLitePath = path.join(packDir, itemsLiteRel);
  if (onlyMissing && fs.existsSync(itemsLitePath) && manifest?.files?.itemsLite) {
    return { packId, status: 'skipped', reason: `${itemsLiteRel} already exists` };
  }

  const itemsLite = itemsFile.endsWith('/')
    ? loadItemsFromDirectory(packDir, manifest, packId)
    : loadItemsFromArray(packDir, manifest, packId);
  itemsLite.sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || '')));

  writeJson(itemsLitePath, itemsLite);
  if (!manifest.files || typeof manifest.files !== 'object') manifest.files = {};
  manifest.files.itemsLite = toPosixPath(itemsLiteRel);
  writeJson(manifestPath, manifest);

  return { packId, status: 'updated', items: itemsLite.length, itemsLiteRel };
}

function main() {
  if (!fs.existsSync(packsIndexPath)) {
    throw new Error(`packs index not found: ${packsIndexPath}`);
  }
  const index = readJson(packsIndexPath);
  const packs = assertArray(index?.packs, packsIndexPath);
  const packIds = packs
    .map((entry, i) => {
      const packId = entry?.packId;
      if (typeof packId !== 'string' || !packId.trim()) {
        throw new Error(`${packsIndexPath}: packs[${i}].packId must be non-empty string`);
      }
      return packId.trim();
    })
    .filter((v, i, arr) => arr.indexOf(v) === i);

  const results = packIds.map((packId) => processPack(packId));
  results.forEach((r) => {
    if (r.status === 'updated') {
      console.log(`[updated] ${r.packId} -> ${r.itemsLiteRel} (${r.items} items)`);
    } else {
      console.log(`[skipped] ${r.packId}: ${r.reason}`);
    }
  });

  const updated = results.filter((r) => r.status === 'updated').length;
  const skipped = results.length - updated;
  console.log(`done. total=${results.length}, updated=${updated}, skipped=${skipped}`);
}

main();
