# Habit Tracker Blog Post Design

**Date:** 2026-07-19

## Goal

Publish a first-person blog post about the local-first Habit Tracker Flutter application and add the project to the portfolio's Projects page.

## Audience and voice

The article is for developers and technically curious readers who enjoy practical build stories. It should sound personal and reflective, with enough implementation detail to make the engineering trade-offs concrete without reading like a reference manual.

## Article identity

- **Title:** I Accidentally Vibe-Coded the Perfect To-Do List App
- **Slug:** `i-accidentally-vibe-coded-the-perfect-to-do-list-app`
- **Publication date:** `2026-07-19`
- **Tags:** `Flutter`, `Habit Tracker`, `Local-First`, `Productivity`
- **GitHub project:** `https://github.com/Kai-Ref/Habit_tracker`
- **GIF asset path:** `/img/posts/i-accidentally-vibe-coded-the-perfect-to-do-list-app/habit-tracker-demo.gif`

## Article structure

1. Open with the unexpected scope of building a “simple” to-do list and the central promise of combining one-time tasks with recurring habits.
2. Explain the motivation: the gap between flexible Notion tables and conventional task apps.
3. Place an early GIF demo immediately after the motivation section, before deep product or technical details. The article should continue to make sense if the GIF is temporarily unavailable.
4. Describe the product workflow: shared task model, Today view, Habits view, Performance view, reminders, and local data.
5. Explain the technical structure: Flutter/Material 3, provider-based logic, domain recurrence evaluation, repository abstraction, SQLite, and platform notification services.
6. Focus on the hardest engineering problems: calendar recurrence, one-time completion semantics, defining “due” for statistics, and actionable notifications.
7. Summarize lessons learned about hidden domain complexity, local-first responsibility, and useful analytics.
8. Close with the concrete future-work areas from the supplied basis: data portability, richer recurrence, reminder controls, deeper reflection, and platform/product expansion.

## Repository integration

The canonical post will be a Markdown content entry at:

`src/content/blog/i-accidentally-vibe-coded-the-perfect-to-do-list-app.md`

Its frontmatter must satisfy `src/content/config.ts` and set `draft: false`. Astro's existing content collection will then include it in the dynamic blog route, blog index, RSS feed, sitemap, canonical metadata, related-post logic, and previous/next navigation without manual route registration.

The GIF reference belongs in the post body. The asset should be placed by the author at:

`public/img/posts/i-accidentally-vibe-coded-the-perfect-to-do-list-app/habit-tracker-demo.gif`

The Projects page entry belongs in `src/content/projects/projects.json`, using the existing object shape with a title, description, image, technologies, date, status, GitHub URL, and nullable demo URL. Because no project image was supplied, the entry will use an existing generic project asset rather than introducing a broken image path.

## Constraints

- Use only behavior documented in `src/content/blog/HABIT_TRACKER_BLOG_BASIS.md`; do not imply that future-work items are already implemented.
- Keep the GIF near the beginning of the article and include descriptive alternative text.
- Use the project's direct GitHub URL consistently in the post and project entry.
- Preserve existing files and formatting outside the new post, design/plan records, and the single project entry.

## Verification

- Run the repository test suite.
- Run `npm run build` to validate content-collection frontmatter, Markdown rendering, dynamic routing, RSS generation, sitemap generation, and project data parsing.
- Confirm the new slug, GitHub URL, GIF path, and project title appear in the expected files.
