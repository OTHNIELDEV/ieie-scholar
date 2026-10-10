import { streamText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';
import { retrieveChunks } from '@/lib/search/vector';
import { SYSTEM_AI_SEARCH, SYSTEM_PAPER_QA, buildContext } from '@/lib/ai/prompts';

export const runtime = 'nodejs';
export const maxDuration = 60;

const Body = z.object({
  messages: z.array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().max(1000) })),
  paperId: z.number().optional(),
});

/** AI 검색 / 논문 QA — 근거 청크를 검색해 Claude에 주입, 인용 메타를 헤더로 반환 */
export async function POST(req: Request) {
  const body = Body.parse(await req.json());
  const question = body.messages.at(-1)?.content ?? '';
  const chunks = await retrieveChunks(question, 12, body.paperId);
  const citations = chunks.map((c, i) => ({ n: i + 1, paper_id: c.paper_id, chunk_id: c.chunk_id, page: c.page, bbox: c.bbox, title: c.title_ko ?? c.title_en, year: c.year, venue: c.venue }));

  const result = streamText({
    model: anthropic('claude-sonnet-4-5'),
    system: body.paperId ? SYSTEM_PAPER_QA : SYSTEM_AI_SEARCH,
    messages: [
      ...body.messages.slice(0, -1),
      { role: 'user', content: `[근거]\n${buildContext(chunks)}\n\n[질문]\n${question}` },
    ],
    temperature: 0.2,
    maxTokens: 1500,
  });
  const res = result.toDataStreamResponse();
  res.headers.set('x-citations', encodeURIComponent(JSON.stringify(citations)));
  return res;
}
