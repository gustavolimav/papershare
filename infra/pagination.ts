import type { NextApiRequest } from "next";
import { validate, paginationSchema } from "./schemas";
import type { PaginationParams, PaginationMeta } from "../types/index";

// Every paginated list endpoint (documents, activity, workspace links,
// workspace contacts) repeated this exact validate-then-derive-offset
// pair — centralized here so a new list endpoint gets it for free.
export function parsePagination(
  query: NextApiRequest["query"],
): PaginationParams {
  const { page, per_page } = validate(paginationSchema, query);

  return {
    page,
    perPage: per_page,
    offset: (page - 1) * per_page,
  };
}

export function buildPaginationMeta(
  total: number,
  page: number,
  perPage: number,
): PaginationMeta {
  return {
    total,
    page,
    per_page: perPage,
    total_pages: Math.ceil(total / perPage),
  };
}
