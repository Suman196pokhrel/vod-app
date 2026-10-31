import { createGetUrl } from 'fumadocs-core/source';

export const appName = 'VOD Docs';
export const siteUrl = 'https://docs.vod.spokhrel.dev';
export const docsRoute = '/docs';
export const docsImageRoute = '/og/docs';
export const docsContentRoute = '/llms.mdx/docs';

// Used for the GitHub link and each page's "Edit on GitHub" link.
// contentDir is relative to the repo root: this app lives in docs-site/.
export const gitConfig = {
  user: 'Suman196pokhrel',
  repo: 'vod-app',
  branch: 'main',
  contentDir: 'docs-site/content/docs',
};

const getContentUrl = createGetUrl(docsContentRoute);

export function getPageMarkdownUrl(page: { slugs: string[]; locale?: string }) {
  const segments = [...page.slugs, 'content.md'];

  return { segments, url: getContentUrl(segments, page.locale) };
}

const getImageUrl = createGetUrl(docsImageRoute);

export function getPageImageUrl(page: { slugs: string[]; locale?: string }) {
  const segments = [...page.slugs, 'image.png'];

  return { segments, url: getImageUrl(segments, page.locale) };
}
