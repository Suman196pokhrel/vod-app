import { LandingNav } from "./_components/LandingNav";
import { LandingHero } from "./_components/LandingHero";
import { LandingFeatures } from "./_components/LandingFeatures";
import { LandingCTA } from "./_components/LandingCTA";

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <LandingNav />
      <LandingHero />
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <LandingFeatures />
        <LandingCTA />
      </div>
    </main>
  );
}
