export function serializeTimelineEntry(entry, descriptionHtml) {
  return Object.fromEntries(Object.entries({
    type: entry.data.type,
    start: entry.data.start,
    end: entry.data.end,
    title: entry.data.title,
    institution: entry.data.institution,
    company: entry.data.company,
    location: entry.data.location,
    lat: entry.data.lat,
    lng: entry.data.lng,
    description: descriptionHtml,
    skills: entry.data.skills,
    logo: entry.data.logo,
    portrait: entry.data.portrait,
    portraitPosition: entry.data.portraitPosition,
    website: entry.data.website,
  }).filter(([, value]) => value !== undefined));
}
