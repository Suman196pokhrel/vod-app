import Link from "next/link";
import { VibeLogo } from "@/components/logos/VibeLogo";

export function LandingNav() {
  return (
    <header className="border-b border-landing-border">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="text-landing-fg">
          <VibeLogo size="md" animated mono />
        </Link>

        <div className="flex items-center gap-6 text-sm">
          <Link
            href="/auth/sign-in"
            className="text-landing-muted transition-colors hover:text-landing-fg"
          >
            Sign in
          </Link>
          <Link
            href="/auth/sign-up"
            className="rounded-md bg-landing-fg px-4 py-2 font-semibold text-landing-bg transition-opacity hover:opacity-80"
          >
            Sign up
          </Link>
        </div>
      </nav>
    </header>
  );
}
