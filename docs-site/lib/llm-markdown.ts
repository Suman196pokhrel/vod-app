// Turns processed MDX into plain markdown for LLM and RAG consumers: JSX
// diagrams become ```mermaid fences, and visual-only components are dropped
// or replaced with a pointer to the equivalent text. Fenced code is left
// untouched, so MDX examples on the authoring page stay as written.
const FENCE = /(^```[\s\S]*?^```)/m;

export function toLlmMarkdown(mdx: string): string {
  return mdx
    .split(new RegExp(FENCE.source, 'gm'))
    .map((part) => (part.startsWith('```') ? part : convert(part)))
    .join('')
    .replace(/\n{3,}/g, '\n\n');
}

function convert(text: string): string {
  return text
    .replace(/<Mermaid\s+chart=\{`([\s\S]*?)`\}\s*\/>/g, (_, chart: string) => `\`\`\`mermaid\n${chart.trim()}\n\`\`\``)
    .replace(/<TokenSheet\s*\/>/g, '_The design tokens are listed in the tables below._');
}
