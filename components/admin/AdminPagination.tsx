import Link from "next/link";
export const ADMIN_PAGE_SIZE = 25;
export function adminPage(value?: string) {
  return Math.max(1, Math.min(100000, Number.parseInt(value || "1", 10) || 1));
}
export function filterSearch(value: string) {
  return value
    .replace(/[,()%\\"']/g, " ")
    .trim()
    .slice(0, 120);
}
export function AdminPagination({
  path,
  page,
  count,
  filters = {},
}: {
  path: string;
  page: number;
  count: number;
  filters?: Record<string, string>;
}) {
  const pages = Math.max(1, Math.ceil(count / ADMIN_PAGE_SIZE));
  function href(next: number) {
    const query = new URLSearchParams(filters);
    query.set("page", String(next));
    return `${path}?${query}`;
  }
  return (
    <nav
      aria-label="Pagination"
      className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm"
    >
      <span>
        {count} records · Page {page} of {pages}
      </span>
      <div className="flex gap-2">
        {page > 1 && (
          <Link className="admin-secondary" href={href(page - 1)}>
            Previous
          </Link>
        )}
        {page < pages && (
          <Link className="admin-secondary" href={href(page + 1)}>
            Next
          </Link>
        )}
      </div>
    </nav>
  );
}
