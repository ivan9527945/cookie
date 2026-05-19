import { DynamicCookieShell } from '@/components/cookie-shell/dynamic';

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="relative min-h-screen w-full">
      <DynamicCookieShell
        variant="ambient"
        className="pointer-events-none fixed inset-0 -z-10 opacity-60"
      />
      <div className="mx-auto flex h-screen w-full max-w-2xl flex-col px-6 py-8">
        {children}
      </div>
    </main>
  );
}
