export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 不約束容器寬度 — upload 頁自己包 max-w-2xl，process 頁要走 full-screen hero。
  return <main className="min-h-screen w-full">{children}</main>;
}
