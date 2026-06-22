# Timeline Justified Markdown Paragraphs Design

## Goal

Present timeline entry body paragraphs from the markdown source files as justified text blocks instead of left-aligned text.

## Scope

This change applies only to the rendered paragraph text inside timeline entry descriptions.

In scope:
- Markdown paragraphs inside the shared `.description` container used by timeline entries
- Desktop and mobile timeline entry views, since both consume the same description styles

Out of scope:
- Headings
- Lists
- Code blocks and inline code
- Achievement callouts
- Markdown rendering pipeline changes

## Current State

Timeline entry descriptions are already rendered from markdown HTML and styled through `src/components/portfolio/TimelineExperience/styles.module.css`.

The relevant rule today is:
- `.description p { margin: 0; color: inherit; }`

This produces standard left-aligned paragraph text.

## Chosen Approach

Apply justification only to `.description p`.

This is the smallest correct change because it:
- Matches the requested behavior directly
- Avoids altering headings, lists, or non-paragraph markdown elements
- Reuses the existing shared typography path for both desktop and mobile timeline entries

## Implementation

Update `src/components/portfolio/TimelineExperience/styles.module.css`:

- Add `text-align: justify` to `.description p`
- Optionally add `hyphens: auto` if spacing looks uneven after justification

No component logic, data shape, or markdown serialization changes are needed.

## Risks

- Narrow mobile widths can produce visibly stretched word spacing in justified text
- Hyphenation behavior can vary slightly by browser and language content

## Mitigation

- Start with a paragraph-only rule so the blast radius stays small
- Verify visually on desktop and mobile widths after the CSS change
- If spacing looks poor on narrow screens, constrain justification to desktop in a follow-up adjustment

## Verification

- Open timeline entries that contain multi-line markdown paragraphs
- Confirm paragraphs are justified on both left and right edges
- Confirm headings, lists, code, and achievement blocks remain visually unchanged
