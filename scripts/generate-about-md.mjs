import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const outAboutFile = path.resolve(repoRoot, 'src', 'assets', 'about.generated.md');
const outReadmeFile = path.resolve(repoRoot, 'src', 'assets', 'readme.generated.md');
const outLicenseFile = path.resolve(repoRoot, 'src', 'assets', 'license.generated.md');
const outThirdPartyFile = path.resolve(repoRoot, 'src', 'assets', 'third-party-licenses.generated.md');

function run(cmd) {
  return execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
}

function safeRun(cmd, fallback = 'unknown') {
  try {
    const v = run(cmd);
    return v || fallback;
  } catch {
    return fallback;
  }
}

function writeFile(filePath, text) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, text.endsWith('\n') ? text : `${text}\n`, 'utf8');
}

function readText(filePath, fallback = '') {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return fallback;
  }
}

function splitLines(text) {
  return (text || '')
    .split(/\r?\n/g)
    .map((s) => s.trim())
    .filter(Boolean);
}

function splitRecords(text) {
  return (text || '').split('\x1e').map((s) => s.trim()).filter(Boolean);
}

function normalizeMessageLines(message) {
  const raw = (message || '').replace(/\r/g, '').split('\n').map((l) => l.replace(/\s+$/g, ''));
  while (raw.length && !raw[0].trim()) raw.shift();
  while (raw.length && !raw[raw.length - 1].trim()) raw.pop();
  const out = [];
  for (const line of raw) {
    const isEmpty = !line.trim();
    const prevEmpty = out.length ? !out[out.length - 1].trim() : false;
    if (isEmpty && prevEmpty) continue;
    out.push(line);
  }
  return out;
}

function formatHistoryByTags() {
  const tags = splitLines(safeRun('git tag --sort=creatordate', ''));
  if (!tags.length) return null;

  const sep = '\x1f';
  const latest = tags[tags.length - 1];
  const headDate = safeRun('git log -1 --date=iso-strict --pretty=%ad');
  const unreleasedCommitsRaw = safeRun(
    `git log "${latest}"..HEAD --date=iso-strict --pretty=format:%h%x1f%ad%x1f%B%x1e`,
    '',
  );
  const unreleasedCommits = splitRecords(unreleasedCommitsRaw).map((rec) => {
    const [hash, date, message] = rec.split(sep);
    return { hash, date, message };
  });

  const sections = [];

  if (unreleasedCommits.length) {
    sections.push(`### Unreleased (${headDate})`);
    for (const c of unreleasedCommits) {
      sections.push(`- ${c.hash} ${c.date}`);
      for (const line of normalizeMessageLines(c.message)) sections.push(`  ${line}`);
    }
    sections.push('');
  }

  for (let i = tags.length - 1; i >= 0; i -= 1) {
    const tag = tags[i];
    const prev = i > 0 ? tags[i - 1] : null;
    const tagDate = safeRun(`git log -1 "${tag}" --date=iso-strict --pretty=%ad`);
    const range = prev ? `"${prev}".."${tag}"` : `"${tag}"`;
    const commitsRaw = safeRun(
      `git log ${range} --date=iso-strict --pretty=format:%h%x1f%ad%x1f%B%x1e`,
      '',
    );
    const commits = splitRecords(commitsRaw).map((rec) => {
      const [hash, date, message] = rec.split(sep);
      return { hash, date, message };
    });

    sections.push(`### ${tag} (${tagDate})`);
    if (commits.length) {
      for (const c of commits) {
        sections.push(`- ${c.hash} ${c.date}`);
        for (const line of normalizeMessageLines(c.message)) sections.push(`  ${line}`);
      }
    } else {
      sections.push('- (no commits)');
    }
    sections.push('');
  }

  return sections;
}

function formatHistoryByCommits() {
  const sep = '\x1f';
  const commitsRaw = safeRun('git log --date=iso-strict --pretty=format:%h%x1f%ad%x1f%B%x1e', '');
  const commits = splitRecords(commitsRaw).map((rec) => {
    const [hash, date, message] = rec.split(sep);
    return { hash, date, message };
  });
  if (!commits.length) return [];

  const sections = [];
  for (let i = 0; i < commits.length; i += 1) {
    const c = commits[i];
    const version = `r${commits.length - i}`;
    sections.push(`### ${version} (${c.date})`);
    sections.push(`- ${c.hash}`);
    for (const line of normalizeMessageLines(c.message)) sections.push(`  ${line}`);
    sections.push('');
  }
  return sections;
}

function main() {
  const now = new Date().toISOString();
  const version = safeRun('git describe --tags --always --dirty');
  const commit = safeRun('git rev-parse HEAD');
  const commitShort = safeRun('git rev-parse --short HEAD');
  const commitCount = safeRun('git rev-list --count HEAD');
  const subject = safeRun('git log -1 --pretty=%s');
  const author = safeRun('git log -1 --pretty=%an');
  const date = safeRun('git log -1 --date=iso-strict --pretty=%ad');
  const remote = safeRun('git remote get-url origin', '');

  const lines = [
    '# About',
    '',
    '## Build',
    `- Version: ${version}`,
    `- Commit: ${commitShort} (${commit})`,
    `- Commit count: ${commitCount}`,
    `- Subject: ${subject}`,
    `- Author: ${author}`,
    `- Date: ${date}`,
    `- Generated at: ${now}`,
    ...(remote ? [`- Remote: ${remote}`] : []),
    '',
    '## Version History',
    '',
  ];

  const history = formatHistoryByTags() ?? formatHistoryByCommits();
  lines.push(...history);

  writeFile(outAboutFile, lines.join('\n'));

  const readme = readText(path.resolve(repoRoot, 'README.md'), '# README\n\nMissing.\n');
  writeFile(outReadmeFile, readme);

  const license = readText(path.resolve(repoRoot, 'LICENSE'), 'Missing.\n');
  const licenseMd = ['# License', '', '```text', license.replace(/\n$/, ''), '```', ''].join('\n');
  writeFile(outLicenseFile, licenseMd);

  const thirdParty = readText(
    path.resolve(repoRoot, 'THIRD-PARTY_LICENSES.md'),
    '# Third-Party Licenses\n\nMissing.\n',
  );
  writeFile(outThirdPartyFile, thirdParty);
}

main();
