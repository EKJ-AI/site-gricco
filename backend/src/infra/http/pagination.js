// src/infra/http/pagination.js
export function parsePagination(req) {
  const page = Math.max(1, parseInt(req.query.page ?? '1', 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize ?? '10', 10)));
  return { skip: (page - 1) * pageSize, take: pageSize, page, pageSize };
}
