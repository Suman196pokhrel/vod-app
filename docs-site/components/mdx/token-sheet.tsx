// The VOD app's design tokens rendered as swatches. The app is dark-only, so
// the sheet is always dark, whatever theme this docs site is in.
const surfaces = [
  { name: '--background', hex: '#0A0A0B', use: 'App background' },
  { name: '--card', hex: '#141416', use: 'Cards, rows' },
  { name: '--popover', hex: '#1C1C1F', use: 'Menus, dialogs' },
  { name: '--border', hex: '#27272A', use: 'Inputs, menus only' },
];

const text = [
  { name: '--foreground', hex: '#FAFAFA', use: 'Primary' },
  { name: '--muted-foreground', hex: '#A1A1AA', use: 'Secondary' },
  { name: '--text-subtle', hex: '#52525B', use: 'Tertiary' },
];

export function TokenSheet() {
  return (
    <div className="not-prose my-6 overflow-hidden rounded-xl border border-fd-border bg-[#0A0A0B] p-6 text-[#FAFAFA]">
      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#A1A1AA]">Surfaces</p>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {surfaces.map((s) => (
          <div key={s.name}>
            <div className="h-16 rounded-lg border border-[#27272A]" style={{ background: s.hex }} />
            <p className="mt-2 font-mono text-xs">{s.name}</p>
            <p className="text-xs text-[#A1A1AA]">{s.hex} · {s.use}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-8 sm:grid-cols-2">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#A1A1AA]">Text, three steps</p>
          <div className="mt-3 space-y-2">
            {text.map((t) => (
              <p key={t.name} className="flex items-baseline justify-between gap-4" style={{ color: t.hex }}>
                <span className="text-base">{t.use} text</span>
                <span className="font-mono text-xs">{t.hex}</span>
              </p>
            ))}
          </div>
        </div>
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#A1A1AA]">Accent, by contrast</p>
          <div className="mt-3 flex items-center gap-3">
            <span className="rounded-md bg-[#22D3EE] px-3 py-1.5 text-sm font-medium text-[#083344]">Primary CTA</span>
            <span className="font-mono text-xs text-[#A1A1AA]">#22D3EE on #083344</span>
          </div>
          <div className="mt-4 h-1 w-full rounded-full bg-[#27272A]">
            <div className="h-1 w-2/5 rounded-full bg-[#22D3EE]" />
          </div>
          <p className="mt-2 text-xs text-[#A1A1AA]">Seek bar: one of the few places cyan appears</p>
        </div>
      </div>

      <div className="mt-8 grid gap-8 sm:grid-cols-2">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#A1A1AA]">Radius</p>
          <div className="mt-3 flex items-end gap-4">
            <div className="size-14 rounded-lg bg-[#1C1C1F]" />
            <div className="size-10 rounded-md bg-[#1C1C1F]" />
            <div className="h-20 w-14 bg-[#1C1C1F]" />
          </div>
          <p className="mt-2 text-xs text-[#A1A1AA]">0.5rem cards · controls 2px less · poster tiles square</p>
        </div>
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#A1A1AA]">Type</p>
          <p className="mt-3 text-2xl font-semibold tracking-tight">Display, 600</p>
          <p className="mt-1 text-sm font-medium">UI emphasis, 500</p>
          <p className="mt-1 text-sm text-[#A1A1AA]">Body, 400. Nothing bolder than 600.</p>
          <p className="mt-2 text-[11px] uppercase tracking-[0.14em] text-[#A1A1AA]">Eyebrow · 11px · caps</p>
        </div>
      </div>
    </div>
  );
}
