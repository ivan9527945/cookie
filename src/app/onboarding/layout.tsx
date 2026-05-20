export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // upload 頁自帶 3D 病房場景；preview/submitting 階段走樸素白底。
  // process 頁是 full-screen split + cookie shell。
  return (
    <main className="relative min-h-screen w-full overflow-hidden bg-[#f4f5f3] text-neutral-800">
      {children}
    </main>
  );
}
