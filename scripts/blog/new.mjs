import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { ensureProjectPath, slugify, writeMetaYaml } from './lib/workflow.mjs';

const args = parseArgs(process.argv.slice(2));
const rawTitle = args.title || 'Untitled Post';
const slug = args.slug || slugify(rawTitle);
const format = (args.format || 'all').toLowerCase();

const root = ensureProjectPath();
const skeletonDir = resolve(root, 'templates/blog-post/_skeleton');
const draftsDir = resolve(root, 'templates/blog-post/drafts');
const postDir = resolve(draftsDir, slug);

if (!existsSync(skeletonDir)) {
  fail(`Missing skeleton folder: ${skeletonDir}`);
}

if (existsSync(postDir)) {
  fail(`Draft already exists: ${postDir}`);
}

mkdirSync(draftsDir, { recursive: true });
cpSync(skeletonDir, postDir, { recursive: true });

const metaPath = join(postDir, 'meta/post.yaml');
writeMetaYaml(metaPath, {
  slug,
  title: rawTitle,
  pubDate: new Date().toISOString().slice(0, 10),
  sourceFormatHint: format === 'all' ? 'md' : format,
});

if (format !== 'all') {
  removeUnselectedFormats(postDir, format);
}

hydrateTitleTokens(postDir, rawTitle);

process.stdout.write(`Created draft workspace: templates/blog-post/drafts/${slug}\n`);

function removeUnselectedFormats(baseDir, selected) {
  const formatDirs = {
    tex: 'latex',
    latex: 'latex',
    md: 'markdown',
    markdown: 'markdown',
    qmd: 'quarto',
    quarto: 'quarto',
  };

  const keep = formatDirs[selected];
  if (!keep) {
    return;
  }

  for (const dirName of ['latex', 'markdown', 'quarto']) {
    if (dirName === keep) {
      continue;
    }
    rmSync(resolve(baseDir, dirName), { recursive: true, force: true });
  }
}

function hydrateTitleTokens(baseDir, title) {
  const files = [
    'latex/main.tex',
    'markdown/post.md',
    'quarto/post.qmd',
  ];

  for (const relativePath of files) {
    const absolutePath = resolve(baseDir, relativePath);
    if (!existsSync(absolutePath)) {
      continue;
    }
    const raw = readFileSync(absolutePath, 'utf8');
    const next = raw.replaceAll('{{TITLE}}', title).replaceAll('{{SLUG}}', slugify(title));
    writeFileSync(absolutePath, next);
  }
}

function parseArgs(input) {
  const parsed = {};
  for (let i = 0; i < input.length; i += 1) {
    const token = input[i];
    if (!token.startsWith('--')) {
      continue;
    }
    const key = token.slice(2);
    const maybeValue = input[i + 1];
    if (!maybeValue || maybeValue.startsWith('--')) {
      parsed[key] = true;
      continue;
    }
    parsed[key] = maybeValue;
    i += 1;
  }
  return parsed;
}

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}
