// 패턴 §5.4 — zod로 한 번 정의하는 계약으로서의 응답 스키마.
// `z.infer`가 같은 소스에서 TypeScript 타입을 도출하므로,
// 런타임 검증과 컴파일 타임 타입이 어긋날 수 없습니다.
import { z } from 'zod';

export const ItemSchema = z.object({
  id: z.uuid(),
  name: z.string().min(1),
  created_at: z.iso.datetime(),
});

export const ListItemsResponseSchema = z.object({
  data: z.array(ItemSchema),
});

export type Item = z.infer<typeof ItemSchema>;
export type ListItemsResponse = z.infer<typeof ListItemsResponseSchema>;
