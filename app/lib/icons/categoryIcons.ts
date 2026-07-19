import {
  LayoutGrid,
  Flame,
  Sparkles,
  Rocket,
  Swords,
  Drama,
  Laugh,
  Siren,
  Film,
  Wand2,
  Ghost,
  Heart,
  type LucideIcon,
} from "lucide-react"

/**
 * Genre/category icon registry — replaces free-form emoji across the app
 * (docs/DESIGN_SYSTEM.md rule 4: build from themed primitives, not
 * hand-rolled/arbitrary visuals). Shared by the home CategoryPills filter
 * and the admin category manager so both surfaces draw from the same set.
 */
export const CATEGORY_ICONS = {
  all: LayoutGrid,
  trending: Flame,
  "new-releases": Sparkles,
  "sci-fi": Rocket,
  action: Swords,
  drama: Drama,
  comedy: Laugh,
  thriller: Siren,
  documentary: Film,
  fantasy: Wand2,
  horror: Ghost,
  romance: Heart,
} as const satisfies Record<string, LucideIcon>

export type CategoryIconKey = keyof typeof CATEGORY_ICONS

export const CATEGORY_ICON_KEYS = Object.keys(CATEGORY_ICONS) as CategoryIconKey[]

/** Human-readable labels for accessibility (aria-label/title on icon pickers). */
export const CATEGORY_ICON_LABELS: Record<CategoryIconKey, string> = {
  all: "All",
  trending: "Trending",
  "new-releases": "New Releases",
  "sci-fi": "Sci-Fi",
  action: "Action",
  drama: "Drama",
  comedy: "Comedy",
  thriller: "Thriller",
  documentary: "Documentary",
  fantasy: "Fantasy",
  horror: "Horror",
  romance: "Romance",
}
