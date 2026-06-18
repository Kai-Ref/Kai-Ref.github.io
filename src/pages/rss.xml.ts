// src/pages/rss.xml.ts
import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';

export async function GET(context: APIContext) {
  const posts = await getCollection('blog', ({ data }) => !data.draft);
  return rss({
    title: 'Kai Reffert — Blog',
    description: 'Posts on data science, machine learning, and time series forecasting.',
    site: context.site!,
    items: posts
      .sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf())
      .map((p) => ({
        title: p.data.title,
        pubDate: p.data.pubDate,
        description: p.data.description,
        link: `/blog/${p.id}/`,
      })),
  });
}
