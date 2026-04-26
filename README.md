# Kai-Ref.github.io

## Blog workflow

Blog drafts are scaffolded in a hidden template workspace and compiled into canonical markdown content.

### Create a draft workspace

```bash
npm run blog:new -- --slug my-post --title "My Post" --format all
```

This creates `templates/blog-post/drafts/my-post/` from the skeleton template. `templates/` is not routed by Astro, so it never appears on the website.

### Build a draft into a website post

```bash
npm run blog:build -- --slug my-post
```

This command:

- picks source format with priority `qmd > tex > md` (or `--format` override)
- converts to canonical markdown via `pandoc` with `.bib` citation support
- writes `src/content/blog/my-post.md`
- copies `assets/images/` to `public/img/posts/my-post/`

### Existing live posts

Legacy posts were migrated to `src/content/blog/` and now render through dynamic route `src/pages/blog/[slug].astro`.

### Render citations into an existing post (one-liner)

```bash
npm run blog:cite -- --slug my-post
```

By default this uses Chicago author-date 17th edition style (`templates/blog-post/csl/chicago-author-date-17th-edition.csl`) and `posts/final_references.bib` if it exists. You can override with:

```bash
npm run blog:cite -- --slug my-post --bib posts/my_refs.bib
```
