export const metadata = { title: 'Open API' };
export default function ApiDocs() {
  const eps = [
    ['GET', '/api/v1/search?q=&page=&per=&year_from=&year_to=&society=&venue=&type=&oa=1&sort=', '하이브리드 검색 (무료, 60 rpm)'],
    ['GET', '/api/v1/papers/{id|doi}', '서지·초록·저자·참고문헌·지표'],
    ['GET', '/api/v1/papers/{id}/pdf', '원문 (권한 필요)'],
    ['POST', '/api/ai/search', 'AI 근거 기반 답변 (스트리밍, 인증 필요)'],
  ];
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 prose dark:prose-invert">
      <h1>Open API v1</h1>
      <p>서지 메타데이터는 무료·무제한(공정이용)으로 제공됩니다. 원문·AI는 API 키가 필요합니다.</p>
      <table className="text-sm"><thead><tr><th>Method</th><th>Endpoint</th><th>설명</th></tr></thead>
        <tbody>{eps.map(([m, e, d]) => <tr key={e}><td><code>{m}</code></td><td><code>{e}</code></td><td>{d}</td></tr>)}</tbody></table>
      <p>OpenAPI 3.1 스펙: <code>/openapi.json</code> (예정) · OAI-PMH: <code>/oai</code> (예정)</p>
    </div>
  );
}
