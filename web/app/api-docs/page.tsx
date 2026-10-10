export const metadata = { title: 'Open API' };

const METHOD_TONE: Record<string, string> = {
  GET: 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-400/10 dark:text-emerald-300 dark:border-emerald-400/25',
  POST: 'bg-brand-50 text-brand-700 border-brand-200 dark:bg-brand-400/10 dark:text-brand-200 dark:border-brand-400/25',
};

export default function ApiDocs() {
  const eps = [
    ['GET', '/api/v1/search?q=&page=&per=&year_from=&year_to=&society=&venue=&type=&oa=1&sort=', '하이브리드 검색 (무료, 60 rpm)'],
    ['GET', '/api/v1/papers/{id|doi}', '서지·초록·저자·참고문헌·지표'],
    ['GET', '/api/v1/papers/{id}/pdf', '원문 (권한 필요)'],
    ['POST', '/api/ai/search', 'AI 근거 기반 답변 (스트리밍, 인증 필요)'],
  ];
  return (
    <div className="container-page max-w-4xl py-10 sm:py-14">
      <header className="border-b border-line pb-6">
        <h1 className="title-serif text-3xl sm:text-4xl">Open API v1</h1>
        <p className="mt-3 max-w-2xl leading-7 text-muted">서지 메타데이터는 공정이용 범위에서 무료로 제공합니다. 원문과 AI 답변은 API 키가 있어야 이용할 수 있습니다.</p>
      </header>

      <h2 className="mt-10 text-lg font-bold">엔드포인트</h2>
      <ul className="mt-4 divide-y divide-line rounded-lg border border-line bg-surface">
        {eps.map(([m, e, d]) => (
          <li key={e} className="grid gap-2 px-4 py-4 sm:grid-cols-[4rem_1fr] sm:gap-4">
            <span className={`inline-flex h-6 w-fit items-center rounded border px-2 font-mono text-xs font-semibold ${METHOD_TONE[m]}`}>{m}</span>
            <div className="min-w-0">
              <code className="block break-all font-mono text-[13px] leading-6 text-ink">{e}</code>
              <p className="mt-1 text-sm text-muted">{d}</p>
            </div>
          </li>
        ))}
      </ul>

      <h2 id="oai" className="mt-10 scroll-mt-24 text-lg font-bold">예정된 인터페이스</h2>
      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <div className="rounded-lg border border-dashed border-line-strong p-4">
          <dt className="font-medium">OpenAPI 3.1 스펙</dt>
          <dd className="mt-1 text-muted"><code className="font-mono text-ink">/openapi.json</code> 에서 제공할 예정입니다.</dd>
        </div>
        <div className="rounded-lg border border-dashed border-line-strong p-4">
          <dt className="font-medium">OAI-PMH</dt>
          <dd className="mt-1 text-muted"><code className="font-mono text-ink">/oai</code> 에서 메타데이터 수확을 지원할 예정입니다.</dd>
        </div>
      </dl>
    </div>
  );
}
