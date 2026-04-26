import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, posix, relative, resolve } from 'node:path';

export function slugify(input) {
  return String(input)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function parseSimpleYaml(raw) {
  const out = {};
  let currentListKey;

  const lines = raw.split(/\r?\n/);
  for (const line of lines) {
    if (!line.trim() || line.trim().startsWith('#')) {
      continue;
    }

    const listMatch = line.match(/^\s*-\s*(.+)$/);
    if (listMatch && currentListKey) {
      if (!Array.isArray(out[currentListKey])) {
        out[currentListKey] = [];
      }
      out[currentListKey].push(stripQuotes(listMatch[1].trim()));
      continue;
    }

    const keyValueMatch = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!keyValueMatch) {
      continue;
    }

    const key = keyValueMatch[1];
    const value = keyValueMatch[2];

    if (!value) {
      out[key] = [];
      currentListKey = key;
      continue;
    }

    out[key] = stripQuotes(value.trim());
    currentListKey = undefined;
  }

  return out;
}

export function toBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  const normalized = String(value).trim().toLowerCase();
  if (['true', '1', 'yes', 'y', 'on'].includes(normalized)) {
    return true;
  }
  if (['false', '0', 'no', 'n', 'off'].includes(normalized)) {
    return false;
  }
  return fallback;
}

export function pickSourceFormat({ explicit, available, hint }) {
  const normalizedExplicit = explicit ? String(explicit).toLowerCase() : undefined;
  const normalizedHint = hint ? String(hint).toLowerCase() : undefined;

  if (normalizedExplicit && available[normalizedExplicit]) {
    return normalizedExplicit;
  }

  if (normalizedHint && available[normalizedHint]) {
    return normalizedHint;
  }

  if (available.qmd) {
    return 'qmd';
  }
  if (available.tex) {
    return 'tex';
  }
  if (available.md) {
    return 'md';
  }

  return undefined;
}

export function rewriteImagePaths(markdown, slug) {
  const targetRoot = `/img/posts/${slug}`;
  return markdown
    .replace(/\]\((\.\/)?assets\/images\//g, `](${targetRoot}/`)
    .replace(/src="(\.\/)?assets\/images\//g, `src="${targetRoot}/`)
    .replace(/src='(\.\/)?assets\/images\//g, `src='${targetRoot}/`);
}

export function copyDirectory(sourceDir, targetDir) {
  if (!existsSync(sourceDir)) {
    return;
  }

  mkdirSync(targetDir, { recursive: true });
  for (const entry of readdirSync(sourceDir)) {
    const sourcePath = join(sourceDir, entry);
    const targetPath = join(targetDir, entry);
    const entryStat = statSync(sourcePath);

    if (entryStat.isDirectory()) {
      copyDirectory(sourcePath, targetPath);
      continue;
    }

    writeFileSync(targetPath, readFileSync(sourcePath));
  }
}

export function readMetaYaml(pathToMetaFile) {
  const raw = readFileSync(pathToMetaFile, 'utf8');
  return parseSimpleYaml(raw);
}

export function writeMetaYaml(pathToMetaFile, updates) {
  const existing = readMetaYaml(pathToMetaFile);
  const merged = { ...existing, ...updates };
  const lines = [];

  for (const [key, value] of Object.entries(merged)) {
    if (Array.isArray(value)) {
      lines.push(`${key}:`);
      for (const item of value) {
        lines.push(`  - ${item}`);
      }
      continue;
    }

    lines.push(`${key}: ${value ?? ''}`);
  }

  mkdirSync(dirname(pathToMetaFile), { recursive: true });
  writeFileSync(pathToMetaFile, `${lines.join('\n')}\n`);
}

export function ensureProjectPath(...segments) {
  return resolve(process.cwd(), ...segments);
}

export function formatDateString(value) {
  if (!value) {
    return new Date().toISOString().slice(0, 10);
  }
  return String(value);
}

export function relativePosix(from, to) {
  return posix.join(...relative(from, to).split(/\\/g));
}

function stripQuotes(value) {
  return value.replace(/^['"]|['"]$/g, '');
}
