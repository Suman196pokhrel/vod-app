import {
  Activity,
  BarChart3,
  Clapperboard,
  GitBranch,
  Image as ImageIcon,
  Network,
  Sparkles,
  Workflow,
  type LucideIcon,
} from 'lucide-react';

// Marks where a diagram, video or other visual will go. Every placeholder
// says what it should show, so it can be replaced later without re-reading
// the page around it.
const kinds = {
  architecture: { icon: Network, label: 'Architecture diagram' },
  flow: { icon: Workflow, label: 'Flow diagram' },
  sequence: { icon: GitBranch, label: 'Sequence diagram' },
  state: { icon: Activity, label: 'State diagram' },
  chart: { icon: BarChart3, label: 'Chart' },
  screenshot: { icon: ImageIcon, label: 'Screenshot' },
  video: { icon: Clapperboard, label: 'Video' },
  animation: { icon: Sparkles, label: 'Animation' },
} satisfies Record<string, { icon: LucideIcon; label: string }>;

export type PlaceholderKind = keyof typeof kinds;

export function Placeholder({
  kind = 'flow',
  title,
  children,
}: {
  kind?: PlaceholderKind;
  title: string;
  children?: React.ReactNode;
}) {
  const { icon: Icon, label } = kinds[kind];

  return (
    <figure className="not-prose my-6 rounded-xl border border-dashed border-fd-border bg-fd-muted/40 px-5 py-6">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-fd-muted-foreground">
        <Icon className="size-4" aria-hidden />
        <span>{label} · placeholder</span>
      </div>
      <figcaption className="mt-2 text-sm font-semibold text-fd-foreground">{title}</figcaption>
      {children ? (
        <div className="mt-2 text-sm leading-relaxed text-fd-muted-foreground">{children}</div>
      ) : null}
    </figure>
  );
}
