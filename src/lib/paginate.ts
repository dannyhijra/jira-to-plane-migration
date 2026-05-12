/**
 * Generic async generator for paginated APIs.
 * Pass a fetcher that takes a cursor (page token, startAt, etc.) and returns
 * { items, nextCursor }. The generator yields items until nextCursor is null.
 */
export async function* paginate<T, C>(
  fetcher: (cursor: C | null) => Promise<{ items: T[]; nextCursor: C | null }>,
): AsyncGenerator<T, void, unknown> {
  let cursor: C | null = null;
  do {
    const { items, nextCursor } = await fetcher(cursor);
    for (const item of items) yield item;
    cursor = nextCursor;
  } while (cursor !== null);
}
