import Link from "next/link";
import { VibeLogo } from "@/components/logos/VibeLogo";

export function LandingNav() {
  return (
    <header className="border-b border-border">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="text-foreground">
          <VibeLogo size="md" animated mono />
        </Link>

        <div className="flex items-center gap-6 text-sm">
          <Link
            href="/auth/sign-in"
            className="text-muted-foreground transition-colors duration-(--duration-fast) hover:text-foreground"
          >
            Sign in
          </Link>
          <Link
            href="/auth/sign-up"
            className="rounded-md bg-primary px-4 py-2 font-semibold text-primary-foreground transition-opacity duration-(--duration-base) hover:opacity-90"
          >
            Sign up
          </Link>
        </div>
      </nav>
    </header>
  );
}
