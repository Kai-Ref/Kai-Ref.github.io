import type { ReactNode } from 'react';

import styles from './styles.module.css';
import type { TimelineEntryView } from './types';

const PROFILE_IMAGE = '/img/profile_pics/1.jpg';

function formatDate(dateStr?: string) {
  if (!dateStr) return 'Present';
  const [year, month] = dateStr.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[Number(month) - 1]} ${year}`;
}

function resolveLogo(logo?: string) {
  if (!logo) return undefined;
  if (/^(https?:)?\/\//.test(logo) || logo.startsWith('/')) return logo;
  return `/${logo}`;
}

function resolvePortrait(portrait?: string) {
  if (!portrait) return PROFILE_IMAGE;
  if (/^(https?:)?\/\//.test(portrait) || portrait.startsWith('/')) return portrait;
  return `/${portrait}`;
}

function resolvePortraitPosition(position?: string) {
  return position ?? 'center 28%';
}

export function InlineEntry({
  entry,
  isActive,
  sidebarSlot,
  compactMobile = false,
}: {
  entry: TimelineEntryView;
  isActive: boolean;
  sidebarSlot?: ReactNode;
  compactMobile?: boolean;
}) {
  if (compactMobile) {
    return (
      <article className={`${styles.inlineEntry} ${styles.mobileInlineEntry} ${styles.cardArticle} ${entry.type === 'education' ? styles.cardArticleEdu : styles.cardArticlePro}`} data-active={isActive ? 'true' : 'false'} data-track={entry.type} style={{ borderLeftColor: `var(${entry.type === 'education' ? '--edu-color' : '--pro-color'})` }}>
        <div className={`${styles.inlineEntryMain} px-5 py-5 sm:px-6 sm:py-6`}>
          <header className={styles.inlineHeader} data-inline-entry-anchor="true">
            <p className={styles.inlineKicker}>{entry.type === 'education' ? 'Education' : 'Professional'}</p>
            <div className={styles.mobileHeaderRow}>
              <div className="min-w-0 flex-1">
                <h2 className={`${styles.cardTitle} text-[1.95rem] leading-tight`}>{entry.title}</h2>
                <div className={`${styles.metaRow} mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-[0.95rem]`}>
                  <span className="font-semibold">{entry.company ?? entry.institution}</span>
                  {entry.website && (
                    <a
                      href={entry.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-0 min-w-0 items-center gap-1 text-[0.9rem]"
                    >
                      Visit
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                      </svg>
                    </a>
                  )}
                </div>
                <p className={`${styles.dateLine} mt-3`}>
                  {formatDate(entry.start)} - {formatDate(entry.end)}
                  {entry.location ? ` · ${entry.location}` : ''}
                </p>
              </div>

              {entry.logo && (
                <div className={styles.mobileLogoStack}>
                  <div className={`${styles.logoFrame} flex h-20 w-32 shrink-0 items-center justify-center px-4 py-3 sm:h-24 sm:w-40`}>
                    <img
                      src={resolveLogo(entry.logo)}
                      alt=""
                      width="128"
                      height="72"
                      loading="lazy"
                      className="max-h-[64px] max-w-[120px] object-contain sm:max-h-[72px] sm:max-w-[132px]"
                    />
                  </div>
                </div>
              )}
            </div>
          </header>

          <div
            className={`${styles.description} max-w-none text-[0.98rem] leading-7`}
            dangerouslySetInnerHTML={{ __html: entry.description }}
          />

          {entry.skills && entry.skills.length > 0 && (
            <section className="mt-6">
              <p className={`${styles.skillsLabel} mb-3`}>Skills</p>
              <div className={styles.inlineSkillList}>
                {entry.skills.map((skill) => (
                  <span key={skill} className={`${styles.skillChip} px-3 py-1`}>
                    {skill}
                  </span>
                ))}
              </div>
            </section>
          )}

          <div className={styles.mobilePortraitFrame}>
            <img
              src={resolvePortrait(entry.portrait)}
              alt="Kai Reffert"
              width="160"
              height="160"
              loading="lazy"
              className={styles.inlineSidebarPortraitImage}
              style={{ objectPosition: resolvePortraitPosition(entry.portraitPosition) }}
            />
          </div>

          {sidebarSlot ? <div className={styles.mobileCityBlock}>{sidebarSlot}</div> : null}
        </div>
      </article>
    );
  }

  return (
    <article className={styles.inlineEntry} data-active={isActive ? 'true' : 'false'} data-track={entry.type}>
      <div className={styles.inlineEntryMain}>
        <header className={styles.inlineHeader} data-inline-entry-anchor="true">
          <p className={styles.inlineKicker}>{entry.type === 'education' ? 'Education' : 'Professional'}</p>
          <h2 className={`${styles.cardTitle} text-[2.15rem] leading-tight sm:text-[2.6rem]`}>{entry.title}</h2>
          <div className={`${styles.metaRow} mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-[0.98rem]`}>
            <span className="font-semibold">{entry.company ?? entry.institution}</span>
            {entry.website && (
              <a
                href={entry.website}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-0 min-w-0 items-center gap-1 text-[0.92rem]"
              >
                Visit
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                </svg>
              </a>
            )}
          </div>
          <p className={`${styles.dateLine} mt-3`}>
            {formatDate(entry.start)} - {formatDate(entry.end)}
            {entry.location ? ` · ${entry.location}` : ''}
          </p>
        </header>

        <div
          className={`${styles.description} text-[0.98rem] leading-7 sm:text-[1.02rem] sm:leading-[1.82]`}
          dangerouslySetInnerHTML={{ __html: entry.description }}
        />
      </div>

      {(entry.logo || entry.skills?.length || sidebarSlot) ? (
        <aside className={styles.inlineEntryAside}>
          {entry.logo && (
            <div className={styles.inlineLogoFrame}>
              <img
                src={resolveLogo(entry.logo)}
                alt=""
                width="144"
                height="72"
                loading="lazy"
                className={styles.inlineLogoImage}
              />
            </div>
          )}

          {entry.skills && entry.skills.length > 0 && (
            <section>
              <p className={`${styles.skillsLabel} mb-3`}>Skills</p>
              <div className={styles.inlineSkillList}>
                {entry.skills.map((skill) => (
                  <span key={skill} className={`${styles.skillChip} px-3 py-1`}>
                    {skill}
                  </span>
                ))}
              </div>
            </section>
          )}

          <div className={styles.inlineSidebarPortrait}>
            <img
              src={resolvePortrait(entry.portrait)}
              alt="Kai Reffert"
              width="84"
              height="84"
              loading="lazy"
              className={styles.inlineSidebarPortraitImage}
              style={{ objectPosition: resolvePortraitPosition(entry.portraitPosition) }}
            />
          </div>

          {sidebarSlot ? <div className={styles.inlineMapSlot}>{sidebarSlot}</div> : null}
        </aside>
      ) : null}
    </article>
  );
}
