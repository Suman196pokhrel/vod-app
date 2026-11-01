import { createHash } from 'node:crypto';
import { docsLlms, source } from '@/lib/source';
import { siteUrl } from '@/lib/shared';

export const revalidate = false;

// Machine-readable page list for RAG indexers. `hash` is a SHA-256 of the
// page's markdown, so an indexer can re-embed only pages whose hash changed.
export async function GET() {
  const pages = await Promise.all(
    source.getPages().map(async (page) => {
      const markdown = await docsLlms.page(page);
      return {
        url: `${siteUrl}${page.url}`,
        markdownUrl: `${siteUrl}${page.url}.md`,
        title: page.data.title,
        description: page.data.description ?? null,
        section: page.slugs[0] ?? 'index',
        hash: createHash('sha256').update(markdown).digest('hex'),
        characters: markdown.length,
      };
    }),
  );

  return Response.json({
    site: siteUrl,
    generatedAt: new Date().toISOString(),
    fullText: `${siteUrl}/llms-full.txt`,
    index: `${siteUrl}/llms.txt`,
    pages,
  });
}
