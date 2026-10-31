import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="flex flex-col justify-center text-center flex-1 px-4">
      <h1 className="text-3xl font-bold mb-3">VOD Documentation</h1>
      <p className="text-fd-muted-foreground mb-6 max-w-xl mx-auto">
        How a self-hosted video-on-demand platform is designed and built: architecture,
        processing pipeline, frontend and infrastructure.
      </p>
      <p>
        <Link href="/docs" className="font-medium underline">
          Read the docs
        </Link>
      </p>
    </div>
  );
}
