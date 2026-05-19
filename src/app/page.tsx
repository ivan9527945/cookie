import Link from 'next/link';
import { DynamicCookieShell } from '@/components/cookie-shell/dynamic';

export default function LandingPage() {
  return (
    <main className="relative h-screen w-screen overflow-hidden">
      <DynamicCookieShell variant="hero" className="absolute inset-0" />

      <div className="relative z-10 flex h-full w-full flex-col items-center justify-end p-12 text-center">
        <h1 className="font-display text-4xl tracking-tight md:text-5xl">
          Cookie
        </h1>
        <p className="mt-2 max-w-md text-sm text-neutral-600">
          這是一個用你的文字訓練出來的模仿物。
          <br />
          它知道你說過的話，但它不是你。
        </p>
        <Link
          href="/onboarding"
          className="mt-8 rounded-full border border-neutral-900 px-6 py-2 text-sm transition hover:bg-neutral-900 hover:text-white"
        >
          INITIALIZE
        </Link>
      </div>
    </main>
  );
}
