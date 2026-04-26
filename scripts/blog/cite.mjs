import { existsSync, renameSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const args = parseArgs(process.argv.slice(2));
const slug = args.slug;

if (!slug) {
  fail('Missing --slug. Example: npm run blog:cite -- --slug turning-ltsf-probabilistic-what-breaks');
}

const root = process.cwd();
const postPath = resolve(root, 'src/content/blog', `${slug}.md`);
const cslPath = resolve(root, args.csl || 'templates/blog-post/csl/chicago-author-date-17th-edition.csl');

if (!existsSync(postPath)) {
  fail(`Post file not found: ${postPath}`);
}

const bibliographyPath = resolveBibliographyPath({ root, args, slug });
const tempOutputPath = `${postPath}.cite-tmp`;
const tempBodyInputPath = `${postPath}.cite-body-input`;

const sourceRaw = readFileSync(postPath, 'utf8');
const { frontmatter, body } = splitFrontmatter(sourceRaw);
writeFileSync(tempBodyInputPath, body);

const pandocArgs = [
  tempBodyInputPath,
  '--from',
  'markdown+raw_html+tex_math_dollars+citations',
  '--to',
  'gfm+raw_html+tex_math_dollars',
  '--citeproc',
  '--metadata',
  'link-citations=true',
  '--bibliography',
  bibliographyPath,
  '--wrap',
  'none',
];

if (existsSync(cslPath)) {
  pandocArgs.push('--csl', cslPath);
}

pandocArgs.push('-o', tempOutputPath);

const result = spawnSync('pandoc', pandocArgs, {
  cwd: root,
  encoding: 'utf8',
});

if (result.error || result.status !== 0) {
  const details = result.error?.message || result.stderr || 'unknown error';
  fail(`Pandoc citation render failed: ${details.trim()}`);
}

const renderedBody = readFileSync(tempOutputPath, 'utf8').trimEnd();
const merged = frontmatter
  ? `${frontmatter}\n\n${renderedBody}\n`
  : `${renderedBody}\n`;

writeFileSync(postPath, merged);
safeUnlink(tempBodyInputPath);
safeUnlink(tempOutputPath);
process.stdout.write(`Citations rendered for: src/content/blog/${slug}.md\n`);

function resolveBibliographyPath({ root, args, slug }) {
  const explicit = args.bib ? resolve(root, args.bib) : undefined;
  const candidates = [
    explicit,
    resolve(root, 'posts/final_references.bib'),
    resolve(root, 'templates/blog-post/drafts', slug, 'references/references.bib'),
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  fail(
    'No bibliography file found. Pass --bib <path> or create posts/final_references.bib or templates/blog-post/drafts/<slug>/references/references.bib'
  );
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

function splitFrontmatter(raw) {
  if (!raw.startsWith('---\n')) {
    return { frontmatter: '', body: raw };
  }

  const end = raw.indexOf('\n---\n', 4);
  if (end === -1) {
    return { frontmatter: '', body: raw };
  }

  const frontmatter = raw.slice(0, end + 4);
  const body = raw.slice(end + 5);
  return { frontmatter, body };
}

function safeUnlink(path) {
  if (!existsSync(path)) {
    return;
  }
  unlinkSync(path);
}

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}
