import Link from 'next/link';
import {
  ArrowRight,
  BookOpen,
  Boxes,
  Cog,
  Compass,
  GitBranch,
  LayoutTemplate,
  Map as MapIcon,
  MessagesSquare,
  Server,
  Workflow,
  type LucideIcon,
} from 'lucide-react';
import { LogoMark } from '@/components/brand/logo';
import { appUrl } from '@/lib/shared';

// The six things that happen to every video, in order. Mirrors the
// "Life of a video" diagram in the Overview section.
const lifecycle = [
  { step: 'Upload', detail: 'Resumable, via tusd' },
  { step: 'Queue', detail: 'One pipeline at a time' },
  { step: 'Transcode', detail: '7 renditions, FFmpeg' },
  { step: 'Package', detail: 'HLS segments + playlists' },
  { step: 'Store', detail: 'MinIO object storage' },
  { step: 'Stream', detail: 'Adaptive bitrate player' },
];

type Section = { href: string; title: string; description: string; icon: LucideIcon };

const groups: { label: string; sections: Section[] }[] = [
  {
    label: 'Understand the system',
    sections: [
      { href: '/docs/overview', title: 'Overview', description: 'What VOD is, the stack, local setup and a glossary.', icon: BookOpen },
      { href: '/docs/architecture', title: 'Architecture', description: 'High-level design, routing and the upload-to-playback flow.', icon: Compass },
      { href: '/docs/decisions', title: 'Decisions & Incidents', description: 'Why things are the way they are, and what broke.', icon: GitBranch },
    ],
  },
  {
    label: 'Inside the code',
    sections: [
      { href: '/docs/backend', title: 'Backend', description: 'FastAPI: auth, data model, uploads and the API.', icon: Boxes },
      { href: '/docs/pipeline', title: 'Pipeline', description: 'Celery + FFmpeg: the queue, every stage, HLS output.', icon: Workflow },
      { href: '/docs/frontend', title: 'Frontend', description: 'Next.js: routing, auth, the player and the admin panel.', icon: LayoutTemplate },
    ],
  },
  {
    label: 'Run it',
    sections: [
      { href: '/docs/infrastructure', title: 'Infrastructure', description: 'Docker Compose, Caddy, local dev and production.', icon: Server },
      { href: '/docs/operations', title: 'Operations', description: 'Deploy, secrets, debugging and incident playbooks.', icon: Cog },
      { href: '/docs/roadmap', title: 'Roadmap', description: 'What is real today and what comes next.', icon: MapIcon },
      { href: '/docs/interview', title: 'Interview Guide', description: 'A system-design walkthrough and likely questions.', icon: MessagesSquare },
    ],
  },
];

export default function HomePage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 sm:px-6">
      <section className="pt-20 pb-16 sm:pt-28">
        <LogoMark className="size-10 text-fd-primary" />
        <p className="mt-8 text-xs font-medium uppercase tracking-[0.18em] text-fd-muted-foreground">
          Engineering documentation
        </p>
        <h1 className="mt-3 max-w-2xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
          How a self-hosted video platform is built, end to end.
        </h1>
        <p className="mt-5 max-w-xl text-lg leading-relaxed text-fd-muted-foreground">
          VOD turns an uploaded file into an adaptive HLS stream. These docs explain every
          part of it: the API, the processing pipeline, the player and the server it runs on.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link
            href="/docs"
            className="inline-flex items-center gap-2 rounded-lg bg-fd-primary px-4 py-2.5 text-sm font-medium text-fd-primary-foreground transition-opacity hover:opacity-90"
          >
            Start reading <ArrowRight className="size-4" />
          </Link>
          <a
            href={appUrl}
            className="inline-flex items-center rounded-lg border border-fd-border px-4 py-2.5 text-sm font-medium transition-colors hover:bg-fd-accent"
          >
            Open the app
          </a>
        </div>
      </section>

      <section className="border-t border-fd-border py-12">
        <h2 className="text-sm font-medium text-fd-muted-foreground">The life of a video</h2>
        <ol className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-fd-border bg-fd-border sm:grid-cols-3 lg:grid-cols-6">
          {lifecycle.map((item, i) => (
            <li key={item.step} className="bg-fd-background p-4">
              <span className="font-mono text-xs text-fd-muted-foreground">0{i + 1}</span>
              <p className="mt-2 font-medium">{item.step}</p>
              <p className="mt-1 text-sm text-fd-muted-foreground">{item.detail}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="space-y-12 border-t border-fd-border py-12 pb-24">
        {groups.map((group) => (
          <div key={group.label}>
            <h2 className="text-sm font-medium text-fd-muted-foreground">{group.label}</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {group.sections.map(({ href, title, description, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className="group rounded-xl border border-fd-border p-5 transition-colors hover:bg-fd-card"
                >
                  <Icon className="size-5 text-fd-muted-foreground transition-colors group-hover:text-fd-primary" />
                  <p className="mt-4 font-medium">{title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-fd-muted-foreground">{description}</p>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}
