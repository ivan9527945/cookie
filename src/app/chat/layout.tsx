export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // ChatWindow 自己掌管整個全螢幕三層場景（視訊鏡頭 / 蛋形 AI / 對話覆蓋），
  // layout 只負責當一個全出血的容器。
  return (
    <main className="relative h-screen w-screen overflow-hidden bg-[#f4f4f0]">
      {children}
    </main>
  );
}
