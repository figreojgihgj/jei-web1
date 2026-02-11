import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

const DEFAULTS = {
  infoRoot: 'temp/info',
  methodsRoot: 'temp/skland-methods',
  outDir: 'public/packs/skland',
  packId: 'skland',
  gameId: 'skland',
  displayName: 'Skland Wiki Pack',
  version: '',
  downloadAssets: false,
  assetConcurrency: 8,
  assetTimeoutMs: 20000,
  registerPackIndex: false,
};

function parseArgs(argv) {
  const args = { ...DEFAULTS };
  for (let i = 2; i < argv.length; i += 1) {
    const key = argv[i];
    const next = argv[i + 1];
    if ((key === '--help' || key === '-h') && !next) {
      args.help = true;
      continue;
    }
    if (key === '--info-root' && next) {
      args.infoRoot = next;
      i += 1;
      continue;
    }
    if (key === '--methods-root' && next) {
      args.methodsRoot = next;
      i += 1;
      continue;
    }
    if (key === '--out-dir' && next) {
      args.outDir = next;
      i += 1;
      continue;
    }
    if (key === '--pack-id' && next) {
      args.packId = next;
      i += 1;
      continue;
    }
    if (key === '--game-id' && next) {
      args.gameId = next;
      i += 1;
      continue;
    }
    if (key === '--display-name' && next) {
      args.displayName = next;
      i += 1;
      continue;
    }
    if (key === '--version' && next) {
      args.version = next;
      i += 1;
      continue;
    }
    if (key === '--download-assets') {
      args.downloadAssets = true;
      continue;
    }
    if (key === '--asset-concurrency' && next) {
      args.assetConcurrency = Math.max(1, Number.parseInt(next, 10) || DEFAULTS.assetConcurrency);
      i += 1;
      continue;
    }
    if (key === '--asset-timeout-ms' && next) {
      args.assetTimeoutMs = Math.max(1000, Number.parseInt(next, 10) || DEFAULTS.assetTimeoutMs);
      i += 1;
      continue;
    }
    if (key === '--register-pack-index') {
      args.registerPackIndex = true;
      continue;
    }
  }
  return args;
}

function printHelp() {
  console.log(`Generate JEI-web pack from Skland wiki data

Usage:
  node scripts/generate-skland-pack.mjs [options]

Options:
  --info-root <path>          Skland info root (default: temp/info)
  --methods-root <path>       Extracted methods root (default: temp/skland-methods)
  --out-dir <path>            Output pack dir (default: public/packs/skland)
  --pack-id <id>              Pack id (default: skland)
  --game-id <id>              Game id (default: skland)
  --display-name <name>       Pack display name
  --version <text>            Pack version text
  --download-assets           Download wiki image assets to local pack assets/images
  --asset-concurrency <n>     Parallel image downloads (default: 8)
  --asset-timeout-ms <ms>     Single image timeout (default: 20000)
  --register-pack-index       Append/update public/packs/index.json entry

Examples:
  node scripts/generate-skland-pack.mjs --info-root D:\\data\\skland\\info --methods-root D:\\data\\skland\\converted-methods --out-dir D:\\data\\skland\\jei-pack --download-assets
  node scripts/generate-skland-pack.mjs --info-root temp/info --methods-root temp/skland-methods --out-dir public/packs/skland --register-pack-index
`);
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function resolvePathMaybeAbsolute(inputPath) {
  if (!inputPath) return '';
  return path.isAbsolute(inputPath) ? inputPath : path.resolve(repoRoot, inputPath);
}

function sanitizePathSegment(v, fallback = 'unknown') {
  const raw = String(v ?? '').trim() || fallback;
  let s = raw
    .replace(/[\\/:*?"<>|]/g, '_')
    .split('')
    .filter((ch) => {
      const code = ch.charCodeAt(0);
      return code < 0 || code > 31;
    })
    .join('')
    .replace(/[. ]+$/g, '')
    .trim();
  if (!s) s = fallback;
  return s;
}

function listInfoFiles(infoRoot) {
  const indexPath = path.join(infoRoot, 'index.json');
  if (fs.existsSync(indexPath)) {
    const indexJson = readJson(indexPath);
    const files = Array.isArray(indexJson?.files) ? indexJson.files : [];
    return files
      .map((f) => ({
        itemId: String(f?.itemId ?? ''),
        mainName: String(f?.mainName || ''),
        subName: String(f?.subName || ''),
        categoryPath: String(f?.categoryPath || ''),
        relPath: String(f?.path || ''),
      }))
      .filter((f) => f.itemId && f.relPath)
      .map((f) => ({
        ...f,
        absPath: path.join(infoRoot, f.relPath),
      }))
      .filter((f) => fs.existsSync(f.absPath));
  }

  const out = [];
  const stack = [infoRoot];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) continue;
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const absPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(absPath);
        continue;
      }
      if (!entry.isFile()) continue;
      if (!entry.name.toLowerCase().endsWith('.json')) continue;
      if (entry.name.toLowerCase() === 'index.json') continue;
      const relPath = path.relative(infoRoot, absPath);
      const itemId = entry.name.match(/^id(\d+)\.json$/i)?.[1] || '';
      out.push({
        itemId,
        mainName: '',
        subName: '',
        categoryPath: path.dirname(relPath),
        relPath,
        absPath,
      });
    }
  }
  out.sort((a, b) => a.relPath.localeCompare(b.relPath));
  return out;
}

function loadMethodsByItemId(methodsRoot) {
  const out = new Map();
  const indexPath = path.join(methodsRoot, 'index.json');
  if (!fs.existsSync(indexPath)) return out;
  const index = readJson(indexPath);
  const files = Array.isArray(index?.files) ? index.files : [];
  for (const fileInfo of files) {
    const itemId = String(fileInfo?.itemId ?? '').trim();
    const rel = String(fileInfo?.path ?? '').trim();
    if (!itemId || !rel) continue;
    const abs = path.join(methodsRoot, rel);
    if (!fs.existsSync(abs)) continue;
    try {
      out.set(itemId, readJson(abs));
    } catch {
      // ignore bad json
    }
  }
  return out;
}

function loadMethodRecipes(methodsRoot) {
  const p = path.join(methodsRoot, 'recipes.json');
  if (!fs.existsSync(p)) return [];
  const json = readJson(p);
  return Array.isArray(json?.recipes) ? json.recipes : [];
}

function toPackItemId(gameId, numericId) {
  const core = String(numericId).trim();
  const suffix = /^\d+$/.test(core) ? `item_${core}` : `item_ref_${sanitizePathSegment(core, 'unknown')}`;
  return `${gameId}.wiki.${suffix}`;
}

function parseAmount(v) {
  const raw = String(v ?? '').trim();
  if (!raw) return 1;
  const n = Number.parseFloat(raw);
  if (!Number.isFinite(n) || n <= 0) return 1;
  return n;
}

function parseDurationSeconds(v) {
  const raw = String(v ?? '').trim().toLowerCase();
  if (!raw) return null;
  const m = raw.match(/^(\d+(?:\.\d+)?)(ms|s|sec|m|min|h|hr)?$/i);
  if (!m) return null;
  const n = Number.parseFloat(m[1]);
  if (!Number.isFinite(n)) return null;
  const unit = (m[2] || 's').toLowerCase();
  if (unit === 'ms') return n / 1000;
  if (unit === 'm' || unit === 'min') return n * 60;
  if (unit === 'h' || unit === 'hr') return n * 3600;
  return n;
}

function asStringArray(v) {
  if (!Array.isArray(v)) return [];
  return v.map((s) => String(s ?? '').trim()).filter(Boolean);
}

function buildItemDescription(methodPayload) {
  const acquisitionMethods = asStringArray(methodPayload?.acquisition?.methods);
  const usageMethods = asStringArray(methodPayload?.usage?.methods);
  const lines = [];
  if (acquisitionMethods.length) {
    lines.push('获取方式:');
    lines.push(...acquisitionMethods.slice(0, 6));
  }
  if (usageMethods.length) {
    if (lines.length) lines.push('');
    lines.push('用途:');
    lines.push(...usageMethods.slice(0, 6));
  }
  return lines.join('\n').trim();
}

function normalizeMachineName(v) {
  let s = String(v ?? '').trim();
  if (!s) return '未知来源';
  s = s.replace(/^\[+/, '').replace(/\]+$/, '').trim();
  return s || '未知来源';
}

function hashShort(v) {
  return createHash('sha1').update(String(v)).digest('hex').slice(0, 12);
}

function buildSlots(maxIn, maxOut) {
  const slots = [];
  const inCols = Math.max(1, Math.min(4, maxIn || 1));
  for (let i = 0; i < maxIn; i += 1) {
    slots.push({
      slotId: `in${i + 1}`,
      io: 'input',
      accept: ['item', 'tag'],
      x: i % inCols,
      y: Math.floor(i / inCols),
      label: 'In',
    });
  }
  const outCols = Math.max(1, Math.min(4, maxOut || 1));
  const outX0 = inCols + 1;
  for (let i = 0; i < maxOut; i += 1) {
    slots.push({
      slotId: `out${i + 1}`,
      io: 'output',
      accept: ['item'],
      x: outX0 + (i % outCols),
      y: Math.floor(i / outCols),
      label: 'Out',
    });
  }
  return slots;
}

function likelyImageUrl(key, value) {
  if (typeof value !== 'string') return false;
  if (!/^https?:\/\//i.test(value)) return false;
  const keyLower = String(key || '').toLowerCase();
  const vLower = value.toLowerCase();
  if (/\.(png|jpg|jpeg|webp|gif|bmp|svg)(\?|$)/i.test(vLower)) return true;
  if (/bbs\.hycdn\.cn\/image\//i.test(vLower)) return true;
  if (/(cover|icon|img|illustration|avatar|thumb|poster|banner|url)$/.test(keyLower)) return true;
  return false;
}

function collectImageUrls(value, out, keyName = '') {
  if (!value) return;
  if (Array.isArray(value)) {
    for (const v of value) collectImageUrls(v, out, keyName);
    return;
  }
  if (typeof value !== 'object') return;
  for (const [k, v] of Object.entries(value)) {
    if (typeof v === 'string') {
      if (likelyImageUrl(k || keyName, v)) out.add(v);
      continue;
    }
    collectImageUrls(v, out, k);
  }
}

function rewriteUrlsDeep(value, urlMap) {
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i += 1) {
      value[i] = rewriteUrlsDeep(value[i], urlMap);
    }
    return value;
  }
  if (!value || typeof value !== 'object') {
    if (typeof value === 'string') return urlMap.get(value) || value;
    return value;
  }
  for (const [k, v] of Object.entries(value)) {
    value[k] = rewriteUrlsDeep(v, urlMap);
  }
  return value;
}

async function mapLimit(items, limit, worker) {
  const out = new Array(items.length);
  let next = 0;
  const workers = new Array(Math.min(limit, items.length)).fill(null).map(async () => {
    while (true) {
      const idx = next;
      next += 1;
      if (idx >= items.length) return;
      out[idx] = await worker(items[idx], idx);
    }
  });
  await Promise.all(workers);
  return out;
}

function extFromContentType(ct) {
  const s = String(ct || '').toLowerCase();
  if (s.includes('image/png')) return '.png';
  if (s.includes('image/jpeg')) return '.jpg';
  if (s.includes('image/webp')) return '.webp';
  if (s.includes('image/gif')) return '.gif';
  if (s.includes('image/svg+xml')) return '.svg';
  if (s.includes('image/bmp')) return '.bmp';
  return '';
}

function extFromUrl(url) {
  try {
    const u = new URL(url);
    const ext = path.extname(u.pathname || '').toLowerCase();
    if (/^\.(png|jpg|jpeg|webp|gif|svg|bmp)$/.test(ext)) return ext === '.jpeg' ? '.jpg' : ext;
  } catch {
    // ignore
  }
  return '';
}

async function fetchArrayBufferWithTimeout(url, timeoutMs) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'image/*,*/*',
        'User-Agent': 'jei-web-skland-pack-builder/1.0',
      },
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const ct = res.headers.get('content-type') || '';
    const body = await res.arrayBuffer();
    return { body, contentType: ct };
  } finally {
    clearTimeout(t);
  }
}

async function downloadAssets(urls, args, outDirAbs) {
  const urlMap = new Map();
  if (!args.downloadAssets || urls.length === 0) return urlMap;
  const assetsDirAbs = path.join(outDirAbs, 'assets', 'images');
  ensureDir(assetsDirAbs);

  let ok = 0;
  let fail = 0;
  await mapLimit(urls, args.assetConcurrency, async (url, idx) => {
    try {
      const { body, contentType } = await fetchArrayBufferWithTimeout(url, args.assetTimeoutMs);
      const ext = extFromContentType(contentType) || extFromUrl(url) || '.bin';
      if (ext === '.bin' && !/^image\//i.test(contentType)) {
        fail += 1;
        return;
      }
      const name = `${hashShort(url)}${ext}`;
      const rel = path.join('assets', 'images', name).replaceAll('\\', '/');
      const abs = path.join(outDirAbs, rel);
      if (!fs.existsSync(abs)) {
        ensureDir(path.dirname(abs));
        fs.writeFileSync(abs, Buffer.from(body));
      }
      const localUrl = `/packs/${encodeURIComponent(args.packId)}/${rel}`;
      urlMap.set(url, localUrl);
      ok += 1;
      if ((idx + 1) % 50 === 0 || idx + 1 === urls.length) {
        console.log(`[assets] progress ${idx + 1}/${urls.length} (ok=${ok}, fail=${fail})`);
      }
    } catch {
      fail += 1;
    }
  });
  console.log(`[assets] done: ${ok} downloaded, ${fail} failed`);
  return urlMap;
}

function updatePackIndex(packId, displayName) {
  const p = path.join(repoRoot, 'public', 'packs', 'index.json');
  if (!fs.existsSync(p)) return;
  const json = readJson(p);
  const packs = Array.isArray(json?.packs) ? json.packs : [];
  const idx = packs.findIndex((it) => it?.packId === packId);
  const entry = { packId, label: displayName };
  if (idx >= 0) packs[idx] = entry;
  else packs.push(entry);
  writeJson(p, { packs });
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    printHelp();
    return;
  }

  const infoRootAbs = resolvePathMaybeAbsolute(args.infoRoot);
  const methodsRootAbs = resolvePathMaybeAbsolute(args.methodsRoot);
  const outDirAbs = resolvePathMaybeAbsolute(args.outDir);

  if (!infoRootAbs || !fs.existsSync(infoRootAbs)) {
    throw new Error(`info root not found: ${infoRootAbs || args.infoRoot}`);
  }
  ensureDir(outDirAbs);

  const version = args.version || new Date().toISOString().slice(0, 10);

  console.log('== Skland Pack Builder ==');
  console.log(`info root: ${infoRootAbs}`);
  console.log(`methods root: ${methodsRootAbs}`);
  console.log(`output: ${outDirAbs}`);
  console.log(`packId/gameId: ${args.packId}/${args.gameId}`);

  const infoFiles = listInfoFiles(infoRootAbs);
  const methodsByItemId = loadMethodsByItemId(methodsRootAbs);
  const methodRecipes = loadMethodRecipes(methodsRootAbs);
  const DOC_ACQUIRE_TYPE_KEY = `${args.gameId}:wiki_doc/acquisition`;
  const DOC_USAGE_TYPE_KEY = `${args.gameId}:wiki_doc/usage`;

  const itemRecords = [];
  for (const f of infoFiles) {
    let payload = null;
    try {
      payload = readJson(f.absPath);
    } catch {
      continue;
    }
    const item = payload?.data?.item;
    if (!item) continue;
    const itemId = String(item?.itemId || f.itemId || '').trim();
    if (!itemId) continue;
    const mainName = String(item?.mainType?.name || f.mainName || '').trim();
    const subName = String(item?.subType?.name || f.subName || '').trim();
    const categoryPath =
      f.categoryPath ||
      path.join(
        sanitizePathSegment(mainName || 'unknown-main'),
        sanitizePathSegment(subName || 'unknown-sub'),
      );
    itemRecords.push({
      itemId,
      mainName,
      subName,
      categoryPath,
      relPath: f.relPath.replaceAll('\\', '/'),
      absPath: f.absPath,
      payload,
    });
  }
  itemRecords.sort((a, b) => Number(a.itemId) - Number(b.itemId));
  console.log(`items loaded: ${itemRecords.length}`);

  const itemIdToPackId = new Map();
  const itemNameToPackIds = new Map();
  for (const rec of itemRecords) {
    const packItemId = toPackItemId(args.gameId, rec.itemId);
    itemIdToPackId.set(rec.itemId, packItemId);
    const name = String(rec.payload?.data?.item?.name || '').trim();
    if (name) {
      const list = itemNameToPackIds.get(name) || [];
      list.push(packItemId);
      itemNameToPackIds.set(name, list);
    }
  }

  const imageUrlSet = new Set();
  if (args.downloadAssets) {
    for (const rec of itemRecords) {
      collectImageUrls(rec.payload, imageUrlSet);
    }
  }
  console.log(`image urls found: ${imageUrlSet.size}`);
  const imageUrlMap = await downloadAssets(Array.from(imageUrlSet), args, outDirAbs);

  const items = [];
  const itemsLite = [];
  const itemFiles = [];
  for (const rec of itemRecords) {
    const payload = JSON.parse(JSON.stringify(rec.payload));
    rewriteUrlsDeep(payload, imageUrlMap);

    const wikiItem = payload?.data?.item || {};
    const itemId = rec.itemId;
    const keyId = itemIdToPackId.get(itemId);
    if (!keyId) continue;

    const cover = String(wikiItem?.brief?.cover || '');
    const methodPayload = methodsByItemId.get(itemId);
    const description = buildItemDescription(methodPayload);
    const tags = [];
    if (rec.mainName) tags.push(`main:${rec.mainName}`);
    if (rec.subName) tags.push(`sub:${rec.subName}`);

    const itemDef = {
      key: { id: keyId },
      name: String(wikiItem?.name || wikiItem?.brief?.name || `Item ${itemId}`),
      ...(cover ? { icon: cover } : {}),
      ...(description ? { description } : {}),
      ...(tags.length ? { tags } : {}),
      source: rec.relPath,
      wiki: payload,
    };

    const rel = path.join('items', rec.categoryPath, `id${itemId}.json`).replaceAll('\\', '/');
    writeJson(path.join(outDirAbs, rel), itemDef);
    itemFiles.push(rel);
    items.push(itemDef);
    const liteItemDef = { ...itemDef };
    delete liteItemDef.wiki;
    delete liteItemDef.recipes;
    itemsLite.push({
      ...liteItemDef,
      detailPath: rel,
    });
  }

  const extraItemsById = new Map();
  const machineGroups = new Map();
  const recipes = [];
  let docAcquireMaxIn = 1;
  let docUsageMaxOut = 1;
  let docRecipes = 0;
  let recipeSeq = 0;

  function ensureItemForEntry(entry) {
    const rawId = String(entry?.id ?? '').trim();
    if (!rawId) return null;
    let packItemId = itemIdToPackId.get(rawId);
    if (!packItemId) {
      packItemId = toPackItemId(args.gameId, rawId);
      itemIdToPackId.set(rawId, packItemId);
      if (!extraItemsById.has(rawId)) {
        extraItemsById.set(rawId, {
          key: { id: packItemId },
          name: String(entry?.name || `条目${rawId}`),
          source: 'methods/entry',
        });
      }
    }
    return {
      kind: 'item',
      id: packItemId,
      amount: parseAmount(entry?.count),
    };
  }

  function sectionTitle(sectionType, context) {
    const prefix = sectionType === 'acquisition' ? '获取' : '用途';
    const parts = [
      String(context?.groupTitle || '').trim(),
      String(context?.widgetTitle || '').trim(),
      String(context?.panelTitle || '').trim(),
    ].filter(Boolean);
    if (!parts.length) return prefix;
    return `${prefix}: ${parts.join(' / ')}`;
  }

  function buildDocRecipesForItem(itemId, methodPayload) {
    const targetPackItemId = itemIdToPackId.get(itemId);
    if (!targetPackItemId) return;

    const sectionGroups = [
      {
        sectionType: 'acquisition',
        typeKey: DOC_ACQUIRE_TYPE_KEY,
        sections: Array.isArray(methodPayload?.acquisition?.sections)
          ? methodPayload.acquisition.sections
          : [],
      },
      {
        sectionType: 'usage',
        typeKey: DOC_USAGE_TYPE_KEY,
        sections: Array.isArray(methodPayload?.usage?.sections) ? methodPayload.usage.sections : [],
      },
    ];

    for (const group of sectionGroups) {
      group.sections.forEach((section) => {
        const sectionEntries = Array.isArray(section?.entries) ? section.entries : [];
        const relatedStacks = sectionEntries
          .map((entry) => ensureItemForEntry(entry))
          .filter(Boolean)
          .filter((stack) => stack.id !== targetPackItemId);

        const slotContents = {};
        if (group.sectionType === 'acquisition') {
          slotContents.out1 = { kind: 'item', id: targetPackItemId, amount: 1 };
          relatedStacks.slice(0, 8).forEach((stack, i) => {
            slotContents[`in${i + 1}`] = stack;
          });
          docAcquireMaxIn = Math.max(docAcquireMaxIn, Math.max(1, relatedStacks.length));
        } else {
          slotContents.in1 = { kind: 'item', id: targetPackItemId, amount: 1 };
          relatedStacks.slice(0, 8).forEach((stack, i) => {
            slotContents[`out${i + 1}`] = stack;
          });
          docUsageMaxOut = Math.max(docUsageMaxOut, Math.max(1, relatedStacks.length));
        }

        const markdown = String(section?.markdown || '').trim();
        const html = String(section?.html || '').trim();
        const methods = asStringArray(section?.methods);
        const wikiDoc =
          section?.wikiDoc && typeof section.wikiDoc === 'object' ? section.wikiDoc : undefined;
        const context = section?.context && typeof section.context === 'object' ? section.context : {};

        recipeSeq += 1;
        recipes.push({
          id: `${args.gameId}:doc/${itemId}/${group.sectionType}/${recipeSeq}`,
          type: group.typeKey,
          slotContents,
          params: {
            sectionType: group.sectionType,
            title: sectionTitle(group.sectionType, context),
            context,
            methods,
            ...(markdown ? { markdown } : {}),
            ...(html ? { html } : {}),
            ...(wikiDoc ? { wikiDoc } : {}),
          },
        });
        docRecipes += 1;
      });
    }
  }

  for (const rec of methodRecipes) {
    const ingredients = Array.isArray(rec?.ingredients) ? rec.ingredients : [];
    const outputs = Array.isArray(rec?.outputs) ? rec.outputs : [];
    if (!ingredients.length || !outputs.length) continue;

    const machineName = normalizeMachineName(rec?.machine);
    const typeSlug = `m_${hashShort(machineName)}`;
    const typeKey = `${args.gameId}:machine/${typeSlug}`;

    const machineItemId = (itemNameToPackIds.get(machineName) || [])[0] || '';
    const group = machineGroups.get(typeKey) || {
      key: typeKey,
      displayName: machineName,
      machineItemId,
      maxIn: 0,
      maxOut: 0,
    };
    group.maxIn = Math.max(group.maxIn, ingredients.length);
    group.maxOut = Math.max(group.maxOut, outputs.length);
    machineGroups.set(typeKey, group);

    const slotContents = {};
    const inStacks = ingredients.map(ensureItemForEntry).filter(Boolean);
    const outStacks = outputs.map(ensureItemForEntry).filter(Boolean);
    if (!inStacks.length || !outStacks.length) continue;

    inStacks.forEach((st, idx) => {
      slotContents[`in${idx + 1}`] = st;
    });
    outStacks.forEach((st, idx) => {
      slotContents[`out${idx + 1}`] = st;
    });

    const durationText = String(rec?.duration || '').trim();
    const durationSec = parseDurationSeconds(durationText);
    const params = {};
    if (durationSec != null) params.time = durationSec;
    else if (durationText) params.timeText = durationText;
    if (rec?.context && typeof rec.context === 'object') {
      params.context = rec.context;
    }

    recipeSeq += 1;
    const recId = `${args.gameId}:r/${String(rec?.itemId || 'x')}/${recipeSeq}`;
    recipes.push({
      id: recId,
      type: typeKey,
      slotContents,
      ...(Object.keys(params).length ? { params } : {}),
    });
  }

  for (const rec of itemRecords) {
    const methodPayload = methodsByItemId.get(rec.itemId);
    if (!methodPayload) continue;
    buildDocRecipesForItem(rec.itemId, methodPayload);
  }

  for (const [rawId, itemDef] of extraItemsById.entries()) {
    const rel = path.join('items', '_extra', `id${rawId}.json`).replaceAll('\\', '/');
    writeJson(path.join(outDirAbs, rel), itemDef);
    itemFiles.push(rel);
    items.push(itemDef);
    itemsLite.push({
      ...itemDef,
      detailPath: rel,
    });
  }

  const recipeTypes = Array.from(machineGroups.values())
    .map((g) => {
      const machine = g.machineItemId
        ? {
            id: g.machineItemId,
            name: g.displayName,
          }
        : undefined;
      return {
        key: g.key,
        displayName: g.displayName,
        renderer: 'slot_layout',
        ...(machine ? { machine } : {}),
        slots: buildSlots(g.maxIn || 1, g.maxOut || 1),
        paramSchema: {
          time: { displayName: 'Time', unit: 's', format: 'duration' },
        },
      };
    });

  recipeTypes.push({
    key: DOC_ACQUIRE_TYPE_KEY,
    displayName: '获取方式',
    renderer: 'wiki_doc_panel',
    slots: buildSlots(Math.max(1, docAcquireMaxIn), 1),
  });

  recipeTypes.push({
    key: DOC_USAGE_TYPE_KEY,
    displayName: '用途说明',
    renderer: 'wiki_doc_panel',
    slots: buildSlots(1, Math.max(1, docUsageMaxOut)),
  });

  recipeTypes.sort((a, b) => a.displayName.localeCompare(b.displayName));

  itemFiles.sort((a, b) => a.localeCompare(b));
  itemsLite.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
  writeJson(path.join(outDirAbs, 'itemsIndex.json'), itemFiles);
  writeJson(path.join(outDirAbs, 'itemsLite.json'), itemsLite);
  writeJson(path.join(outDirAbs, 'recipeTypes.json'), recipeTypes);
  writeJson(path.join(outDirAbs, 'recipes.json'), recipes);
  writeJson(path.join(outDirAbs, 'manifest.json'), {
    packId: args.packId,
    gameId: args.gameId,
    displayName: args.displayName,
    version,
    files: {
      items: 'items/',
      itemsIndex: 'itemsIndex.json',
      itemsLite: 'itemsLite.json',
      recipeTypes: 'recipeTypes.json',
      recipes: 'recipes.json',
    },
  });

  const summary = {
    generatedAt: new Date().toISOString(),
    input: {
      infoRoot: infoRootAbs,
      methodsRoot: methodsRootAbs,
    },
    output: outDirAbs,
    pack: {
      packId: args.packId,
      gameId: args.gameId,
      displayName: args.displayName,
      version,
    },
    stats: {
      items: items.length,
      baseItems: itemRecords.length,
      extraItems: extraItemsById.size,
      recipeTypes: recipeTypes.length,
      recipes: recipes.length,
      docRecipes,
      downloadedImages: imageUrlMap.size,
    },
  };
  writeJson(path.join(outDirAbs, 'build-summary.json'), summary);

  if (args.registerPackIndex) {
    updatePackIndex(args.packId, args.displayName);
  }

  console.log('Done.');
  console.log(`items: ${items.length} (base=${itemRecords.length}, extra=${extraItemsById.size})`);
  console.log(`recipeTypes: ${recipeTypes.length}, recipes: ${recipes.length} (doc=${docRecipes})`);
  console.log(`downloaded images: ${imageUrlMap.size}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
