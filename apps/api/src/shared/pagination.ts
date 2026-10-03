import { paginatedQuerySchema } from '@gestao-sst/shared'

export function parsePaginationQuery(query: unknown) {
  const parsed = paginatedQuerySchema.parse(query ?? {})
  const page = parsed.page
  const pageSize = Math.min(parsed.pageSize, 100)
  const skip = (page - 1) * pageSize
  const take = pageSize

  return {
    page,
    pageSize,
    search: parsed.search,
    skip,
    take,
  }
}

export function makePagination(page: number, pageSize: number, total: number) {
  return {
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  }
}
