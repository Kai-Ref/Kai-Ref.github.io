import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

import {
  copyDirectory,
  ensureProjectPath,
  formatDateString,
  pickSourceFormat,
  readMetaYaml,
  rewriteImagePaths,
  slugify,
  toBoolean,
} from './lib/workflow.mjs';

const args = parseArgs(process.argv.slice(2));
const requestedSlug = args.slug;

if (!requestedSlug) {
  fail('Missing --slug argument. Example: npm run blog:build -- --slug my-post');
}

const root = ensureProjectPath();
const draftDir = resolve(root, 'templates/blog-post/drafts', requestedSlug);
const metaPath = resolve(draftDir, 'meta/post.yaml');

if (!existsSync(draftDir)) {
  fail(`Draft does not exist: ${draftDir}`);
}
if (!existsSync(metaPath)) {
  fail(`Missing metadata file: ${metaPath}`);
}

const meta = readMetaYaml(metaPath);
const slug = meta.slug ? String(meta.slug) : requestedSlug;
const safeSlug = slugify(slug);
const title = String(meta.title || safeSlug);

const available = {
  qmd: existsSync(resolve(draftDir, 'quarto/post.qmd')),
  tex: existsSync(resolve(draftDir, 'latex/main.tex')),
  md: existsSync(resolve(draftDir, 'markdown/post.md')),
};

const sourceFormat = pickSourceFormat({
  explicit: args.format,
  available,
  hint: meta.sourceFormatHint,
});

if (!sourceFormat) {
  fail('No source format found. Provide one of: quarto/post.qmd, latex/main.tex, markdown/post.md');
}

const sourcePathMap = {
  qmd: resolve(draftDir, 'quarto/post.qmd'),
  tex: resolve(draftDir, 'latex/main.tex'),
  md: resolve(draftDir, 'markdown/post.md'),
};

const sourcePath = sourcePathMap[sourceFormat];
const bibliographyPath = resolve(draftDir, 'references/references.bib');
const cslPath = resolve(root, 'templates/blog-post/csl/apa.csl');

let markdownBody = convertToMarkdown({
  sourcePath,
  sourceFormat,
  bibliographyPath,
  cslPath,
  workdir: draftDir,
});

markdownBody = rewriteImagePaths(markdownBody, safeSlug);

const targetContentDir = resolve(root, 'src/content/blog');
const targetAssetDir = resolve(root, 'public/img/posts', safeSlug);
mkdirSync(targetContentDir, { recursive: true });
mkdirSync(targetAssetDir, { recursive: true });
copyDirectory(resolve(draftDir, 'assets/images'), targetAssetDir);

const heroImageName = String(meta.heroImage || 'hero.jpg');
const targetMarkdownPath = resolve(targetContentDir, `${safeSlug}.md`);

  const frontmatter = [
  '---',
  `title: "${escapeQuotes(title)}"`,
  `description: "${escapeQuotes(String(meta.description || ''))}"`,
  `pubDate: "${escapeQuotes(formatDateString(meta.pubDate))}"`,
  `readTime: "${escapeQuotes(String(meta.readTime || '10 min read'))}"`,
  `heroImage: "/img/posts/${safeSlug}/${escapeQuotes(heroImageName)}"`,
  `sourceFormat: "${sourceFormat}"`,
  `bibliography: "templates/blog-post/drafts/${escapeQuotes(requestedSlug)}/references/references.bib"`,
  `draft: ${toBoolean(meta.draft, false) ? 'true' : 'false'}`,
  'tags:',
  ...normalizeTags(meta.tags).map((tag) => `  - "${escapeQuotes(tag)}"`),
  '---',
  '',
].join('\n');

writeFileSync(targetMarkdownPath, `${frontmatter}${markdownBody.trim()}\n`);
process.stdout.write(`Generated canonical post: src/content/blog/${safeSlug}.md\n`);

function convertToMarkdown({ sourcePath, sourceFormat, bibliographyPath, cslPath, workdir }) {
  if (!existsSync(sourcePath)) {
    fail(`Missing source file: ${sourcePath}`);
  }

  if (!existsSync(bibliographyPath)) {
    fail(`Missing bibliography file: ${bibliographyPath}`);
  }

  const commonArgs = [
    sourcePath,
    '--to',
    'gfm',
    '--from',
    sourceFormat === 'tex' ? 'latex' : sourceFormat === 'qmd' ? 'markdown' : 'markdown',
    '--citeproc',
    '--bibliography',
    bibliographyPath,
  ];

  if (existsSync(cslPath)) {
    commonArgs.push('--csl', cslPath);
  }

  const converted = spawnSync('pandoc', commonArgs, {
    cwd: workdir,
    encoding: 'utf8',
  });

  if (converted.error || converted.status !== 0) {
    const stderr = converted.stderr ? converted.stderr.trim() : '';
    const reason = converted.error ? converted.error.message : stderr;
    fail(`Pandoc conversion failed. Install pandoc and retry. Details: ${reason}`);
  }

  return converted.stdout || '';
}

function normalizeTags(rawTags) {
  if (Array.isArray(rawTags) && rawTags.length > 0) {
    return rawTags.map((tag) => String(tag));
  }

  if (typeof rawTags === 'string' && rawTags.length > 0) {
    return rawTags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);
  }

  return ['Blog'];
}

function escapeQuotes(value) {
  return String(value).replace(/"/g, '\\"');
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
