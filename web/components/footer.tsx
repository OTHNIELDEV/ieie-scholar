export function Footer() {
  return (
    <footer className="border-t border-gray-200 dark:border-gray-800 mt-16 py-8 text-xs text-gray-500">
      <div className="mx-auto max-w-7xl px-4 flex flex-wrap gap-6 justify-between">
        <p>© {new Date().getFullYear()} 대한전자공학회 (The Institute of Electronics and Information Engineers)</p>
        <p>Open API · OAI-PMH · 이용약관 · 개인정보처리방침</p>
      </div>
    </footer>
  );
}
