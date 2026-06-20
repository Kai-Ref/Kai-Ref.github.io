import { AnimatePresence, motion } from 'framer-motion';
import type { ReactNode } from 'react';

import { TRACK_COLORS } from './constants';
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

export function CenterCard({
  entry,
  reducedMotion,
  fixedSize = false,
  sidebarSlot,
}: {
  entry: TimelineEntryView | null;
  reducedMotion: boolean;
  fixedSize?: boolean;
  sidebarSlot?: ReactNode;
}) {
  return (
    <div className="flex h-full min-h-0 w-full items-center justify-center px-2 sm:px-3">
      <AnimatePresence mode="wait">
        {entry && (
          <motion.article
            key={`${entry.title}-${entry.start}`}
            initial={reducedMotion ? false : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
            transition={{ duration: reducedMotion ? 0 : 0.35, ease: 'easeOut' }}
            className={`${styles.cardArticle} ${entry.type === 'education' ? styles.cardArticleEdu : styles.cardArticlePro} relative flex w-full min-h-0 flex-col overflow-hidden`}
            style={{
              width: fixedSize ? '100%' : undefined,
              maxWidth: fixedSize ? undefined : 980,
              height: fixedSize ? 'min(680px, calc(100% - 24px))' : undefined,
              maxHeight: fixedSize ? undefined : '100%',
              borderLeftColor: TRACK_COLORS[entry.type],
            }}
          >
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain p-5 sm:p-8">
              <header className={`${styles.cardHeader} flex items-start gap-4 pb-4 sm:gap-6 sm:pb-5`}>
                <div className="min-w-0 flex-1">
                  <h2 className={`${styles.cardTitle} text-[1.95rem] leading-tight sm:text-[2.3rem]`}>{entry.title}</h2>
                  <div className={`${styles.metaRow} mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-[0.95rem]`}>
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
                </div>
                <div className={styles.cardHeaderMedia}>
                  {entry.logo && (
                    <div className={styles.cardLogoWrap}>
                      <div className={styles.cardPortraitFrame}>
                        <img
                          src={resolvePortrait(entry.portrait)}
                          alt="Kai Reffert"
                          width="72"
                          height="72"
                          loading="lazy"
                          className={styles.cardPortraitImage}
                          style={{ objectPosition: resolvePortraitPosition(entry.portraitPosition) }}
                        />
                      </div>
                      <div className={`${styles.logoFrame} flex h-16 w-28 shrink-0 items-center justify-center px-3 py-2 sm:h-24 sm:w-44 sm:px-5 sm:py-3`}>
                        <img
                          src={resolveLogo(entry.logo)}
                          alt=""
                          width="144"
                          height="72"
                          loading="lazy"
                          className="max-h-[52px] max-w-[100px] object-contain sm:max-h-[72px] sm:max-w-[144px]"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </header>

              <div className="mt-5 flex flex-col gap-5 lg:flex-row lg:items-start lg:gap-6">
                <div className="min-w-0 flex-1">
                  <div
                    className={`${styles.description} max-w-[72ch] text-[0.92rem] leading-6 sm:leading-[1.7]`}
                    dangerouslySetInnerHTML={{ __html: entry.description }}
                  />
                </div>

                {(entry.skills?.length || sidebarSlot) ? (
                  <aside className={`${styles.asideWrap} flex shrink-0 flex-col border-t pt-4 lg:w-[280px] lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0`}>
                    {entry.skills && entry.skills.length > 0 && (
                      <section>
                        <p className={`${styles.skillsLabel} mb-3`}>Skills</p>
                        <div className="flex flex-wrap gap-2">
                          {entry.skills.map((skill) => (
                            <span
                              key={skill}
                              className={`${styles.skillChip} px-3 py-1`}
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      </section>
                    )}

                    {sidebarSlot && <div className="mt-5">{sidebarSlot}</div>}
                  </aside>
                ) : null}
              </div>
            </div>
          </motion.article>
        )}
      </AnimatePresence>
    </div>
  );
}
