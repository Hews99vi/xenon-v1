import type { ContentLink, SiteContent } from "./schema";
export function siteLinks(site: SiteContent): ContentLink[] {
  return [
    ...site.navigation.flatMap((n) => [n, ...n.children]),
    ...site.footer.columns.flatMap((c) => c.links),
    ...site.sections
      .filter((s) => s.enabled)
      .flatMap((s) => {
        if (s.type === "hero" || s.type === "campaign")
          return [s.primary, s.secondary];
        if (s.type === "occasions")
          return s.items.filter((i) => i.enabled).map((i) => i.link);
        return [s.link];
      }),
    ...(site.announcement.enabled && site.announcement.href
      ? [{ label: site.announcement.text, href: site.announcement.href }]
      : []),
  ];
}
export function incompleteLinks(site: SiteContent) {
  return siteLinks(site).filter(
    (link) => Boolean(link.label.trim()) !== Boolean(link.href),
  );
}
