'use client';

// Renders a Mermaid diagram client-side, following the Fumadocs recipe:
// https://fumadocs.dev/docs/markdown/mermaid
import { use, useId, useSyncExternalStore } from 'react';

export function Mermaid({ chart }: { chart: string }) {
  // `false` on the server and during hydration
  const isClient = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  if (!isClient) return;
  return <MermaidContent chart={chart} />;
}

// Mermaid's theming only accepts literal colours, so these mirror the zinc +
// cyan tokens in app/global.css. Nodes are neutral; cyan is reserved for the
// `accent` class (classDef accent) and active edges.
const palettes = {
  light: {
    background: '#fafafa',
    primaryColor: '#ffffff',
    primaryTextColor: '#18181b',
    primaryBorderColor: '#a1a1aa',
    secondaryColor: '#f4f4f5',
    secondaryTextColor: '#18181b',
    secondaryBorderColor: '#d4d4d8',
    tertiaryColor: '#f4f4f5',
    tertiaryTextColor: '#18181b',
    tertiaryBorderColor: '#d4d4d8',
    lineColor: '#71717a',
    textColor: '#27272a',
    mainBkg: '#ffffff',
    nodeBorder: '#a1a1aa',
    clusterBkg: '#f4f4f5',
    clusterBorder: '#d4d4d8',
    titleColor: '#18181b',
    edgeLabelBackground: '#fafafa',
    noteBkgColor: '#ecfeff',
    noteTextColor: '#164e63',
    noteBorderColor: '#67e8f9',
    actorBkg: '#ffffff',
    actorBorder: '#a1a1aa',
    actorTextColor: '#18181b',
    actorLineColor: '#d4d4d8',
    signalColor: '#52525b',
    signalTextColor: '#18181b',
    labelBoxBkgColor: '#f4f4f5',
    labelBoxBorderColor: '#a1a1aa',
    labelTextColor: '#18181b',
    loopTextColor: '#52525b',
    activationBkgColor: '#ecfeff',
    activationBorderColor: '#0e7490',
    sequenceNumberColor: '#ffffff',
    accent: '#0e7490',
    accentText: '#ffffff',
    scale: ['#0e7490', '#0891b2', '#06b6d4', '#22d3ee', '#67e8f9', '#a5f3fc', '#cffafe'],
  },
  dark: {
    background: '#111113',
    primaryColor: '#18181b',
    primaryTextColor: '#fafafa',
    primaryBorderColor: '#52525b',
    secondaryColor: '#1c1c1f',
    secondaryTextColor: '#e4e4e7',
    secondaryBorderColor: '#3f3f46',
    tertiaryColor: '#141416',
    tertiaryTextColor: '#e4e4e7',
    tertiaryBorderColor: '#3f3f46',
    lineColor: '#71717a',
    textColor: '#e4e4e7',
    mainBkg: '#18181b',
    nodeBorder: '#52525b',
    clusterBkg: '#141416',
    clusterBorder: '#3f3f46',
    titleColor: '#fafafa',
    edgeLabelBackground: '#111113',
    noteBkgColor: '#083344',
    noteTextColor: '#cffafe',
    noteBorderColor: '#0e7490',
    actorBkg: '#18181b',
    actorBorder: '#52525b',
    actorTextColor: '#fafafa',
    actorLineColor: '#3f3f46',
    signalColor: '#a1a1aa',
    signalTextColor: '#e4e4e7',
    labelBoxBkgColor: '#1c1c1f',
    labelBoxBorderColor: '#52525b',
    labelTextColor: '#e4e4e7',
    loopTextColor: '#a1a1aa',
    activationBkgColor: '#083344',
    activationBorderColor: '#22d3ee',
    sequenceNumberColor: '#083344',
    accent: '#22d3ee',
    accentText: '#083344',
    scale: ['#22d3ee', '#06b6d4', '#0891b2', '#0e7490', '#155e75', '#164e63', '#67e8f9'],
  },
};

function themeVariables(mode: 'light' | 'dark') {
  const { accent, scale, ...base } = palettes[mode];
  const cScale = Object.fromEntries(
    scale.flatMap((c, i) => [
      [`cScale${i}`, c],
      [`cScaleLabel${i}`, mode === 'dark' && i < 3 ? '#083344' : '#ffffff'],
    ]),
  );
  return {
    ...base,
    ...cScale,
    fontSize: '14px',
    // Quadrant and xy charts
    quadrant1Fill: base.secondaryColor,
    quadrant2Fill: base.tertiaryColor,
    quadrant3Fill: base.tertiaryColor,
    quadrant4Fill: base.secondaryColor,
    quadrant1TextFill: base.textColor,
    quadrant2TextFill: base.textColor,
    quadrant3TextFill: base.textColor,
    quadrant4TextFill: base.textColor,
    quadrantPointFill: accent,
    quadrantPointTextFill: base.textColor,
    quadrantXAxisTextFill: base.textColor,
    quadrantYAxisTextFill: base.textColor,
    quadrantInternalBorderStrokeFill: base.secondaryBorderColor,
    quadrantExternalBorderStrokeFill: base.secondaryBorderColor,
    quadrantTitleFill: base.titleColor,
    xyChart: {
      backgroundColor: base.background,
      titleColor: base.titleColor,
      xAxisLabelColor: base.textColor,
      xAxisTitleColor: base.textColor,
      xAxisTickColor: base.lineColor,
      xAxisLineColor: base.lineColor,
      yAxisLabelColor: base.textColor,
      yAxisTitleColor: base.textColor,
      yAxisTickColor: base.lineColor,
      yAxisLineColor: base.lineColor,
      plotColorPalette: scale.slice(0, 4).join(','),
    },
  };
}

// The single emphasis style a diagram may use: `class X accent`.
function accentCSS(mode: 'light' | 'dark') {
  const { accent, accentText } = palettes[mode];
  return `
    .accent > rect, .accent > polygon, .accent > circle, .accent > path { fill: ${accent} !important; stroke: ${accent} !important; }
    .accent .nodeLabel, .accent span, .accent p { color: ${accentText} !important; fill: ${accentText} !important; }
    .node rect, .cluster rect { rx: 6px; ry: 6px; }
    .cluster-label .nodeLabel { font-weight: 600; }
    .edgeLabel, .edgeLabel p { font-size: 12px; }
  `;
}

const cache = new Map<string, Promise<unknown>>();

function cachePromise<T>(key: string, setPromise: () => Promise<T>): Promise<T> {
  const cached = cache.get(key);
  if (cached) return cached as Promise<T>;

  const promise = setPromise();
  cache.set(key, promise);
  return promise;
}

// Re-render when the site switches between light and dark mode
function subscribeTheme(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributeFilter: ['class'] });
  return () => observer.disconnect();
}

function MermaidContent({ chart }: { chart: string }) {
  const id = useId();
  const theme = useSyncExternalStore(subscribeTheme, () =>
    document.documentElement.classList.contains('dark') ? 'dark' : 'light',
  );
  const { default: mermaid } = use(cachePromise('mermaid', () => import('mermaid')));

  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'loose',
    fontFamily: 'inherit',
    theme: 'base',
    themeVariables: themeVariables(theme),
    themeCSS: accentCSS(theme),
    flowchart: { curve: 'basis', padding: 12, htmlLabels: true },
    sequence: { mirrorActors: false, messageAlign: 'center' },
  });

  const { svg, bindFunctions } = use(
    cachePromise(`${chart}-${theme}`, () => {
      return mermaid.render(id, chart.replaceAll('\\n', '\n'));
    }),
  );

  return (
    <div
      className="mermaid-figure not-prose"
      ref={(container) => {
        if (container) bindFunctions?.(container);
      }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
