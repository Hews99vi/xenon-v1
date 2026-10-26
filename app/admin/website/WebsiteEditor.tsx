"use client";
/* eslint-disable @next/next/no-img-element */
import { AdminField as Field } from "@/components/admin/AdminField";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowUp, ArrowDown, Trash2, Monitor, Smartphone } from "lucide-react";
import {
  contentPath,
  emptyImage,
  newSection,
  siteSchema,
  pageSchema,
  type ContentKind,
  type ContentSection,
  type ContentLink,
  type ContentImage,
  type SiteContent,
  type PageContent,
} from "@/lib/content/schema";
import type { ContentDocument } from "@/lib/content/server";
import {
  saveDraft,
  publishDraft,
  restoreDraft,
  uploadContentImage,
  listMedia,
  searchCatalog,
} from "./actions";
type Option = { id: string; name: string; slug: string };
type Props = {
  document: ContentDocument | null;
  kind: ContentKind;
  initial: SiteContent | PageContent;
  history: {
    id: string;
    created_at: string;
    published_at: string | null;
    authorName?: string;
  }[];
  historyPagination: { page: number; total: number };
  categories: Option[];
  products: Option[];
  pages: { kind: ContentKind; slug: string }[];
  initialPanel?: string;
};
export function WebsiteEditor({
  document: doc,
  kind,
  initial,
  history,
  historyPagination,
  categories,
  products,
  pages,
  initialPanel,
}: Props) {
  const router = useRouter();
  const [content, setContent] = useState(initial);
  const [slug, setSlug] = useState(
    doc?.slug || (kind === "site" ? "site" : ""),
  );
  const [revision, setRevision] = useState(doc?.draft_revision_id || null);
  const [documentId, setDocumentId] = useState(doc?.id || null);
  const [published, setPublished] = useState(
    doc?.published_revision_id || null,
  );
  const [dirty, setDirty] = useState(false);
  const [panel, setPanel] = useState(initialPanel || "sections");
  const [selected, setSelected] = useState(
    kind === "site" ? (initial as SiteContent).sections[0]?.id || "" : "",
  );
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();
  const [preview, setPreview] = useState("");
  const [previewed, setPreviewed] = useState<string | null>(null);
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: MouseEvent) => {
      const anchor = (event.target as HTMLElement).closest("a[href]");
      if (
        anchor &&
        !anchor.hasAttribute("target") &&
        !window.confirm("Leave without saving your changes?")
      )
        event.preventDefault();
    };
    document.addEventListener("click", warn, true);
    return () => document.removeEventListener("click", warn, true);
  }, [dirty]);
  function changeSite(edit: (draft: SiteContent) => void) {
    const next = structuredClone(content) as SiteContent;
    edit(next);
    setContent(next);
    setDirty(true);
    setPreviewed(null);
    setPreview("");
  }
  function changePage(patch: Partial<PageContent>) {
    setContent({ ...content, ...patch } as PageContent);
    setDirty(true);
    setPreviewed(null);
    setPreview("");
  }
  function patchSection(patch: Record<string, unknown>) {
    changeSite((s) => {
      const section = s.sections.find((s) => s.id === selected);
      if (section) Object.assign(section, patch);
    });
  }
  const site = content as SiteContent,
    page = content as PageContent;
  const section =
    kind === "site" ? site.sections.find((s) => s.id === selected) : undefined;
  const destinations = [
    { label: "All products", href: "/products" },
    { label: "Women", href: "/products?gender=women" },
    { label: "Men", href: "/products?gender=men" },
    { label: "New arrivals", href: "/products?tag=new" },
    ...categories.map((c) => ({
      label: c.name,
      href: `/categories/${c.slug}`,
    })),
    ...products.map((p) => ({ label: p.name, href: `/products/${p.slug}` })),
    ...pages.map((p) => ({ label: p.slug, href: contentPath(p.kind, p.slug) })),
  ];
  function fieldErrors(prefix: string) {
    return Object.fromEntries(
      Object.entries(errors)
        .filter(([key]) => key.startsWith(prefix + "."))
        .map(([key, error]) => [key.slice(prefix.length + 1), error]),
    );
  }
  const sectionPath = `sections.${site.sections?.findIndex((s) => s.id === selected)}`;
  async function save() {
    const parsed = (kind === "site" ? siteSchema : pageSchema).safeParse(
      content,
    );
    if (!parsed.success) {
      setErrors(
        Object.fromEntries(
          parsed.error.issues.map((i) => [i.path.join("."), i.message]),
        ),
      );
      setMessage("Correct the fields listed below.");
      const path = parsed.error.issues[0]?.path;
      if (
        kind === "site" &&
        path?.[0] === "sections" &&
        typeof path[1] === "number"
      ) {
        setPanel("sections");
        setSelected(site.sections[path[1]]?.id || "");
      } else if (kind === "site" && path?.[0])
        setPanel(path[0] === "newsletter" ? "footer" : String(path[0]));
      return;
    }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      setErrors({ slug: "Use lowercase words separated by hyphens." });
      return;
    }
    const result = await saveDraft({
      kind,
      slug,
      payload: parsed.data,
      expected: revision,
    });
    setMessage(result.message);
    if (result.ok) {
      setRevision(result.revision);
      setDocumentId(result.documentId);
      setDirty(false);
      setErrors({});
      if (!doc) {
        const savedKey = kind === "site" ? "site" : `${kind}:${slug}`;
        router.replace(`/admin/website?key=${encodeURIComponent(savedKey)}`);
      } else router.refresh();
    } else if ("errors" in result) setErrors(result.errors || {});
  }
  function launchPreview() {
    const key = kind === "site" ? "site" : `${kind}:${slug}`;
    setPreview(
      `/api/content-preview?key=${encodeURIComponent(key)}&revision=${revision}`,
    );
    setPreviewed(null);
  }
  return (
    <div
      className="website-editor space-y-6"
      data-draft-revision={revision || ""}
      aria-busy={pending}
    >
      <div className="editor-toolbar">
        <div>
          <strong>
            {dirty
              ? "Unsaved changes"
              : revision && revision === published
                ? "Published"
                : "Draft"}
          </strong>
          <p className="text-sm text-neutral-500">
            {kind === "site"
              ? "Website content"
              : kind === "journal"
                ? "Journal entry"
                : "Information page"}{" "}
            · Stock and prices stay live.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="admin-secondary"
            disabled={pending}
            onClick={() => startTransition(save)}
          >
            {pending ? "Working…" : "Save draft"}
          </button>
          <button
            type="button"
            className="admin-secondary"
            disabled={dirty || !revision || pending}
            onClick={launchPreview}
          >
            Preview
          </button>
          <button
            type="button"
            className="admin-button"
            disabled={dirty || !revision || pending || previewed !== revision}
            title="Save and preview this revision before publishing"
            onClick={() =>
              startTransition(async () => {
                if (!documentId || !revision) return;
                const result = await publishDraft(documentId, revision);
                setMessage(result.message);
                if (result.ok) {
                  setPublished(revision);
                  router.refresh();
                }
              })
            }
          >
            Publish
          </button>
        </div>
      </div>
      {message && (
        <p role="status" className="border bg-neutral-50 p-4">
          {message}
        </p>
      )}
      {Object.keys(errors).length > 0 && (
        <div role="alert" className="border border-red-300 bg-red-50 p-4">
          {Object.entries(errors).map(([path, error]) => (
            <p key={path}>
              <strong>{path}:</strong> {error}
            </p>
          ))}
        </div>
      )}
      {kind === "site" && (
        <div className="admin-section-tabs">
          {["sections", "navigation", "footer", "announcement", "media"].map(
            (p) => (
              <button
                type="button"
                key={p}
                aria-pressed={p === panel}
                className={p === panel ? "admin-button" : "admin-secondary"}
                onClick={() => setPanel(p)}
              >
                {p}
              </button>
            ),
          )}
        </div>
      )}
      {kind === "site" && panel === "sections" && (
        <div className="grid items-start gap-6 xl:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="admin-panel section-browser space-y-3">
            <h2>Homepage sections</h2>
            {site.sections.map((s, i) => (
              <div
                key={s.id}
                className={`border p-3 ${selected === s.id ? "border-black bg-neutral-50" : ""}`}
              >
                <button
                  type="button"
                  className="w-full text-left"
                  onClick={() => setSelected(s.id)}
                >
                  <strong>{s.title || s.type}</strong>
                  <span className="block text-xs text-neutral-500">
                    {s.type} · {s.enabled ? "Visible" : "Hidden"}
                  </span>
                </button>
                <div className="mt-2 flex gap-1">
                  <button
                    type="button"
                    className="icon-button"
                    aria-label={`Move ${s.title || s.type} up`}
                    disabled={i === 0}
                    onClick={() =>
                      changeSite((d) => {
                        [d.sections[i - 1], d.sections[i]] = [
                          d.sections[i],
                          d.sections[i - 1],
                        ];
                      })
                    }
                  >
                    <ArrowUp size={16} />
                  </button>
                  <button
                    type="button"
                    className="icon-button"
                    aria-label={`Move ${s.title || s.type} down`}
                    disabled={i === site.sections.length - 1}
                    onClick={() =>
                      changeSite((d) => {
                        [d.sections[i + 1], d.sections[i]] = [
                          d.sections[i],
                          d.sections[i + 1],
                        ];
                      })
                    }
                  >
                    <ArrowDown size={16} />
                  </button>
                  <button
                    type="button"
                    className="icon-button"
                    aria-label={`Remove ${s.title || s.type}`}
                    onClick={() => {
                      if (confirm("Remove this section from the draft?"))
                        changeSite((d) => {
                          d.sections = d.sections.filter((v) => v.id !== s.id);
                        });
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
            <Field label="Add a section">
              <select
                value=""
                onChange={(e) => {
                  if (!e.target.value) return;
                  const s = newSection(
                    e.target.value as ContentSection["type"],
                    crypto.randomUUID(),
                  );
                  changeSite((d) => {
                    d.sections.push(s);
                  });
                  setSelected(s.id);
                }}
              >
                <option value="">Choose a layout</option>
                {[
                  "hero",
                  "campaign",
                  "products",
                  "categories",
                  "occasions",
                  "story",
                ].map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </Field>
          </aside>
          <div className="admin-panel space-y-6">
            {section ? (
              <>
                <div className="flex items-center justify-between">
                  <h2>{section.type} section</h2>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={section.enabled}
                      onChange={(e) =>
                        patchSection({ enabled: e.target.checked })
                      }
                    />
                    Visible
                  </label>
                </div>
                <TextFields
                  value={section}
                  errors={fieldErrors(sectionPath)}
                  onChange={patchSection}
                />
                {(section.type === "hero" || section.type === "campaign") && (
                  <>
                    <ImageField
                      value={section.image}
                      errors={fieldErrors(`${sectionPath}.image`)}
                      onChange={(image) => patchSection({ image })}
                    />
                    <LinkField
                      label="Primary button"
                      value={section.primary}
                      errors={fieldErrors(`${sectionPath}.primary`)}
                      options={destinations}
                      onChange={(primary) => patchSection({ primary })}
                    />
                    <LinkField
                      label="Secondary button (optional)"
                      value={section.secondary}
                      errors={fieldErrors(`${sectionPath}.secondary`)}
                      options={destinations}
                      onChange={(secondary) => patchSection({ secondary })}
                    />
                  </>
                )}
                {section.type === "products" && (
                  <>
                    <Field label="Products to show">
                      <select
                        value={section.source}
                        onChange={(e) =>
                          patchSection({ source: e.target.value })
                        }
                      >
                        {["newest", "featured", "category", "manual"].map(
                          (s) => (
                            <option key={s}>{s}</option>
                          ),
                        )}
                      </select>
                    </Field>
                    {section.source === "category" && (
                      <Field label="Category">
                        <select
                          value={section.category}
                          onChange={(e) =>
                            patchSection({ category: e.target.value })
                          }
                        >
                          <option value="">Choose category</option>
                          {categories.map((c) => (
                            <option key={c.id} value={c.slug}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </Field>
                    )}
                    {section.source === "manual" && (
                      <Picker
                        catalog="products"
                        label="Selected products (selection order is display order)"
                        options={products}
                        value={section.productIds}
                        onChange={(productIds) => patchSection({ productIds })}
                      />
                    )}
                    <AudienceField
                      value={section.audience}
                      onChange={(audience) => patchSection({ audience })}
                    />
                    <LinkField
                      label="View all link"
                      value={section.link}
                      options={destinations}
                      onChange={(link) => patchSection({ link })}
                    />
                  </>
                )}
                {section.type === "categories" && (
                  <>
                    <Field label="Category selection">
                      <select
                        value={section.source}
                        onChange={(e) =>
                          patchSection({ source: e.target.value })
                        }
                      >
                        <option value="all">All matching categories</option>
                        <option value="manual">Selected categories</option>
                      </select>
                    </Field>
                    <AudienceField
                      value={section.audience}
                      onChange={(audience) => patchSection({ audience })}
                    />
                    {section.source === "manual" && (
                      <Picker
                        catalog="categories"
                        label="Selected categories (empty hides the row)"
                        value={section.categoryIds}
                        options={categories}
                        onChange={(categoryIds) =>
                          patchSection({ categoryIds })
                        }
                      />
                    )}
                    <LinkField
                      label="View all link"
                      value={section.link}
                      options={destinations}
                      onChange={(link) => patchSection({ link })}
                    />
                  </>
                )}
                {section.type === "occasions" && (
                  <>
                    <AudienceField
                      value={section.audience}
                      onChange={(audience) => patchSection({ audience })}
                    />
                    {section.items.map((item, i) => (
                      <div className="space-y-4 border p-4" key={item.id}>
                        <label className="flex min-h-11 items-center gap-2">
                          <input
                            type="checkbox"
                            checked={item.enabled}
                            onChange={(e) =>
                              patchSection({
                                items: section.items.map((v, n) =>
                                  n === i
                                    ? { ...v, enabled: e.target.checked }
                                    : v,
                                ),
                              })
                            }
                          />
                          Visible tile
                        </label>
                        <TextFields
                          value={item}
                          onChange={(patch) =>
                            patchSection({
                              items: section.items.map((v, n) =>
                                n === i ? { ...v, ...patch } : v,
                              ),
                            })
                          }
                        />
                        <AudienceField
                          allowUnisex
                          value={item.audience}
                          onChange={(audience) =>
                            patchSection({
                              items: section.items.map((v, n) =>
                                n === i ? { ...v, audience } : v,
                              ),
                            })
                          }
                        />
                        <ImageField
                          value={item.image}
                          onChange={(image) =>
                            patchSection({
                              items: section.items.map((v, n) =>
                                n === i ? { ...v, image } : v,
                              ),
                            })
                          }
                        />
                        <LinkField
                          label="Tile link"
                          value={item.link}
                          options={destinations}
                          onChange={(link) =>
                            patchSection({
                              items: section.items.map((v, n) =>
                                n === i ? { ...v, link } : v,
                              ),
                            })
                          }
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            className="admin-secondary"
                            disabled={i === 0}
                            onClick={() => {
                              const items = [...section.items];
                              [items[i - 1], items[i]] = [
                                items[i],
                                items[i - 1],
                              ];
                              patchSection({ items });
                            }}
                          >
                            Move up
                          </button>
                          <button
                            type="button"
                            className="admin-secondary"
                            onClick={() => {
                              if (confirm("Remove this tile?"))
                                patchSection({
                                  items: section.items.filter(
                                    (_, n) => n !== i,
                                  ),
                                });
                            }}
                          >
                            Remove tile
                          </button>
                        </div>
                      </div>
                    ))}
                    <button
                      type="button"
                      className="admin-secondary"
                      onClick={() =>
                        patchSection({
                          items: [
                            ...section.items,
                            {
                              id: crypto.randomUUID(),
                              enabled: true,
                              title: "",
                              body: "",
                              image: { ...emptyImage },
                              link: { label: "Shop now", href: "/products" },
                              audience: "all",
                            },
                          ],
                        })
                      }
                    >
                      Add occasion
                    </button>
                  </>
                )}
                {section.type === "story" && (
                  <>
                    <ImageField
                      value={section.image}
                      errors={fieldErrors(`${sectionPath}.image`)}
                      onChange={(image) => patchSection({ image })}
                    />
                    <Field label="Value points (one per line)">
                      <textarea
                        value={section.values.join("\n")}
                        onChange={(e) =>
                          patchSection({ values: e.target.value.split("\n") })
                        }
                      />
                    </Field>
                    <LinkField
                      label="Optional link"
                      value={section.link}
                      options={destinations}
                      onChange={(link) => patchSection({ link })}
                    />
                  </>
                )}
              </>
            ) : (
              <p>Select a section or add a layout to get started.</p>
            )}
          </div>
        </div>
      )}
      {kind === "site" && panel === "navigation" && (
        <div className="admin-panel space-y-6">
          <h2>Main navigation</h2>
          <p className="text-sm text-neutral-500">
            Audience links appear only when matching classified products are
            available.
          </p>
          {site.navigation.map((nav, i) => (
            <div key={i} className="space-y-3 border p-4">
              <LinkField
                label={`Menu ${i + 1}`}
                value={nav}
                options={destinations}
                onChange={(link) =>
                  changeSite((s) => {
                    Object.assign(s.navigation[i], link);
                  })
                }
              />
              <AudienceField
                value={nav.audience}
                onChange={(audience) =>
                  changeSite((s) => {
                    s.navigation[i].audience = audience as
                      "all" | "women" | "men";
                  })
                }
              />
              {nav.children.map((child, j) => (
                <div key={j} className="border-l-2 pl-4">
                  <LinkField
                    label="Submenu link"
                    value={child}
                    options={destinations}
                    onChange={(link) =>
                      changeSite((s) => {
                        s.navigation[i].children[j] = link;
                      })
                    }
                  />
                  <button
                    type="button"
                    className="admin-secondary"
                    onClick={() =>
                      changeSite((s) => {
                        s.navigation[i].children.splice(j, 1);
                      })
                    }
                  >
                    Remove link
                  </button>
                </div>
              ))}
              <div className="flex gap-2">
                <button
                  type="button"
                  className="admin-secondary"
                  onClick={() =>
                    changeSite((s) => {
                      s.navigation[i].children.push({ label: "", href: "" });
                    })
                  }
                >
                  Add submenu link
                </button>
                <button
                  type="button"
                  className="admin-secondary"
                  disabled={!i}
                  onClick={() =>
                    changeSite((s) => {
                      [s.navigation[i - 1], s.navigation[i]] = [
                        s.navigation[i],
                        s.navigation[i - 1],
                      ];
                    })
                  }
                >
                  Move up
                </button>
                <button
                  type="button"
                  className="admin-secondary"
                  onClick={() =>
                    changeSite((s) => {
                      s.navigation.splice(i, 1);
                    })
                  }
                >
                  Remove menu
                </button>
              </div>
            </div>
          ))}
          <button
            type="button"
            className="admin-secondary"
            onClick={() =>
              changeSite((s) => {
                s.navigation.push({
                  label: "",
                  href: "",
                  audience: "all",
                  children: [],
                });
              })
            }
          >
            Add menu
          </button>
        </div>
      )}
      {kind === "site" && panel === "announcement" && (
        <div className="admin-panel space-y-4">
          <h2>Announcement</h2>
          <label className="flex gap-2">
            <input
              type="checkbox"
              checked={site.announcement.enabled}
              onChange={(e) =>
                changeSite((s) => {
                  s.announcement.enabled = e.target.checked;
                })
              }
            />
            Show announcement
          </label>
          <Field label="Message">
            <input
              value={site.announcement.text}
              onChange={(e) =>
                changeSite((s) => {
                  s.announcement.text = e.target.value;
                })
              }
            />
          </Field>
          <LinkField
            label="Optional destination"
            value={{ label: "", href: site.announcement.href }}
            options={destinations}
            onChange={(link) =>
              changeSite((s) => {
                s.announcement.href = link.href;
              })
            }
            hideLabel
          />
        </div>
      )}
      {kind === "site" && panel === "footer" && (
        <div className="admin-panel space-y-6">
          <h2>Footer & newsletter</h2>
          {(
            [
              "tagline",
              "supportEmail",
              "supportPhone",
              "instagramUrl",
              "tiktokUrl",
              "whatsappNumber",
            ] as const
          ).map((key) => (
            <Field key={key} label={key.replace(/([A-Z])/g, " $1")}>
              <input
                value={site.footer[key]}
                onChange={(e) =>
                  changeSite((s) => {
                    s.footer[key] = e.target.value;
                  })
                }
              />
            </Field>
          ))}
          <label className="flex gap-2">
            <input
              type="checkbox"
              checked={site.newsletter.enabled}
              onChange={(e) =>
                changeSite((s) => {
                  s.newsletter.enabled = e.target.checked;
                })
              }
            />
            Show newsletter
          </label>
          <TextFields
            value={site.newsletter}
            onChange={(patch) =>
              changeSite((s) => {
                Object.assign(s.newsletter, patch);
              })
            }
          />
          {site.footer.columns.map((column, i) => (
            <div key={i} className="space-y-3 border p-4">
              <Field label="Column heading">
                <input
                  value={column.title}
                  onChange={(e) =>
                    changeSite((s) => {
                      s.footer.columns[i].title = e.target.value;
                    })
                  }
                />
              </Field>
              {column.links.map((link, j) => (
                <div key={j}>
                  <LinkField
                    label="Footer link"
                    value={link}
                    options={destinations}
                    onChange={(next) =>
                      changeSite((s) => {
                        s.footer.columns[i].links[j] = next;
                      })
                    }
                  />
                  <button
                    type="button"
                    className="admin-secondary"
                    onClick={() =>
                      changeSite((s) => {
                        s.footer.columns[i].links.splice(j, 1);
                      })
                    }
                  >
                    Remove link
                  </button>
                </div>
              ))}
              <div className="flex gap-2">
                <button
                  type="button"
                  className="admin-secondary"
                  onClick={() =>
                    changeSite((s) => {
                      s.footer.columns[i].links.push({ label: "", href: "" });
                    })
                  }
                >
                  Add link
                </button>
                <button
                  type="button"
                  className="admin-secondary"
                  onClick={() =>
                    changeSite((s) => {
                      s.footer.columns.splice(i, 1);
                    })
                  }
                >
                  Remove column
                </button>
              </div>
            </div>
          ))}
          {site.footer.columns.length < 4 && (
            <button
              type="button"
              className="admin-secondary"
              onClick={() =>
                changeSite((s) => {
                  s.footer.columns.push({ title: "", links: [] });
                })
              }
            >
              Add column
            </button>
          )}
        </div>
      )}
      {kind === "site" && panel === "media" && (
        <div className="admin-panel">
          <h2>Media library</h2>
          <p className="mb-4">
            Upload an image or browse reusable images. Images retained in
            revision history are not deleted.
          </p>
          <MediaLibrary
            onChoose={(url) => {
              navigator.clipboard
                .writeText(url)
                .then(() => setMessage("Image URL copied."));
            }}
          />
        </div>
      )}
      {kind !== "site" && (
        <div className="admin-panel space-y-5">
          <Field label="URL slug (fixed after first save)">
            <input
              value={slug}
              disabled={Boolean(documentId)}
              onChange={(e) => {
                setSlug(e.target.value);
                setDirty(true);
              }}
            />
          </Field>
          <TextFields
            value={page}
            errors={errors}
            showBody={false}
            onChange={changePage}
          />
          <Field label="Content (Markdown)">
            <textarea
              className="min-h-80 font-mono"
              value={page.body}
              onChange={(e) => changePage({ body: e.target.value })}
            />
          </Field>
          {kind === "journal" && (
            <>
              <Field label="Excerpt">
                <textarea
                  value={page.excerpt}
                  onChange={(e) => changePage({ excerpt: e.target.value })}
                />
              </Field>
              <ImageField
                value={page.image}
                errors={fieldErrors("image")}
                onChange={(image) => changePage({ image })}
              />
            </>
          )}
          <Field label="Search engine title">
            <input
              value={page.seoTitle}
              onChange={(e) => changePage({ seoTitle: e.target.value })}
            />
          </Field>
          <Field label="Search engine description">
            <textarea
              value={page.seoDescription}
              onChange={(e) => changePage({ seoDescription: e.target.value })}
            />
          </Field>
        </div>
      )}
      {preview && (
        <section className="admin-panel">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <h2 className="mr-auto">Saved draft preview</h2>
            <button
              type="button"
              aria-pressed={!mobile}
              className="admin-secondary"
              onClick={() => setMobile(false)}
            >
              <Monitor size={16} />
              Desktop
            </button>
            <button
              type="button"
              aria-pressed={mobile}
              className="admin-secondary"
              onClick={() => setMobile(true)}
            >
              <Smartphone size={16} />
              Mobile
            </button>
            <a className="admin-secondary" href={preview} target="_blank">
              Open preview ↗
            </a>
          </div>
          <div className="overflow-auto bg-neutral-100 p-2">
            <iframe
              key={preview}
              onLoad={(event) => {
                const actual = event.currentTarget.contentDocument
                  ?.querySelector("[data-content-preview]")
                  ?.getAttribute("data-content-preview");
                if (actual === revision) setPreviewed(actual);
                else
                  setMessage(
                    "Preview could not be loaded. Reload the editor and try again.",
                  );
              }}
              title="Website draft preview"
              src={preview}
              className="mx-auto h-[760px] border bg-white"
              style={{ width: mobile ? 390 : 1200, maxWidth: "none" }}
            />
          </div>
        </section>
      )}
      {history.length > 0 && (
        <details id="revision-history" className="admin-panel">
          <summary className="cursor-pointer font-semibold">
            Revision history
          </summary>
          <p className="my-3 text-sm">
            Restoring creates a new draft. It never changes catalog data.
          </p>
          <div className="space-y-2">
            {history.map((h) => (
              <div
                key={h.id}
                className="flex flex-wrap items-center justify-between gap-3 border-t py-3"
              >
                <span>
                  {new Date(h.created_at).toLocaleString("en-GB", {
                    timeZone: "Asia/Colombo",
                  })}{" "}
                  · {h.published_at ? "Published revision" : "Draft"} ·{" "}
                  {h.authorName || "Admin"}
                </span>
                <button
                  type="button"
                  className="admin-secondary"
                  disabled={pending || h.id === revision}
                  onClick={() => {
                    if (
                      !confirm(
                        "Restore this revision as a new draft? Unsaved edits will be discarded.",
                      )
                    )
                      return;
                    startTransition(async () => {
                      if (!documentId) return;
                      const result = await restoreDraft(
                        documentId,
                        h.id,
                        revision,
                      );
                      if (result.ok) {
                        setDirty(false);
                        window.location.href = `/admin/website?key=${encodeURIComponent(kind === "site" ? "site" : `${kind}:${slug}`)}`;
                      } else setMessage(result.message);
                    });
                  }}
                >
                  Restore draft
                </button>
              </div>
            ))}
          </div>
          <nav
            aria-label="Revision history pagination"
            className="mt-4 flex flex-wrap justify-between gap-3 text-sm"
          >
            <span>
              {historyPagination.total} revisions · Page{" "}
              {historyPagination.page}
            </span>
            <div className="flex gap-3">
              {historyPagination.page > 1 && (
                <a
                  className="admin-secondary"
                  href={`/admin/website?key=${encodeURIComponent(kind === "site" ? "site" : `${kind}:${slug}`)}&historyPage=${historyPagination.page - 1}#revision-history`}
                >
                  Previous
                </a>
              )}
              {historyPagination.page * 20 < historyPagination.total && (
                <a
                  className="admin-secondary"
                  href={`/admin/website?key=${encodeURIComponent(kind === "site" ? "site" : `${kind}:${slug}`)}&historyPage=${historyPagination.page + 1}#revision-history`}
                >
                  Next
                </a>
              )}
            </div>
          </nav>
        </details>
      )}
    </div>
  );
}
function TextFields({
  value,
  onChange,
  errors = {},
  showBody = true,
}: {
  value: { title: string; body: string; eyebrow?: string };
  showBody?: boolean;
  errors?: Record<string, string>;
  onChange: (patch: {
    title?: string;
    body?: string;
    eyebrow?: string;
  }) => void;
}) {
  return (
    <div className="space-y-4">
      {"eyebrow" in value && (
        <Field label="Small heading (optional)" error={errors.eyebrow}>
          <input
            value={value.eyebrow || ""}
            onChange={(e) => onChange({ eyebrow: e.target.value })}
          />
        </Field>
      )}
      <Field label="Heading" error={errors.title}>
        <input
          value={value.title}
          onChange={(e) => onChange({ title: e.target.value })}
        />
      </Field>
      {showBody && (
        <Field label="Supporting text (optional)" error={errors.body}>
          <textarea
            value={value.body}
            onChange={(e) => onChange({ body: e.target.value })}
          />
        </Field>
      )}
    </div>
  );
}
function AudienceField({
  value,
  onChange,
  allowUnisex = false,
}: {
  value: string;
  onChange: (value: string) => void;
  allowUnisex?: boolean;
}) {
  return (
    <Field label="Audience">
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="all">All audiences</option>
        <option value="women">Women</option>
        <option value="men">Men</option>
        {allowUnisex && <option value="unisex">Unisex</option>}
      </select>
    </Field>
  );
}
function LinkField({
  label,
  value,
  options,
  onChange,
  hideLabel = false,
  errors = {},
}: {
  label: string;
  value: ContentLink;
  options: ContentLink[];
  onChange: (value: ContentLink) => void;
  hideLabel?: boolean;
  errors?: Record<string, string>;
}) {
  const [custom, setCustom] = useState(false);
  const [search, setSearch] = useState(""),
    [matches, setMatches] = useState<ContentLink[]>([]);
  useEffect(() => {
    let cancelled = false;
    if (search.trim().length < 2) return;
    const timeout = setTimeout(() => {
      Promise.all([
        searchCatalog("products", search),
        searchCatalog("categories", search),
      ])
        .then(([products, categories]) => {
          if (!cancelled)
            setMatches([
              ...products.options.map((p) => ({
                label: p.name,
                href: `/products/${p.slug}`,
              })),
              ...categories.options.map((c) => ({
                label: c.name,
                href: `/categories/${c.slug}`,
              })),
            ]);
        })
        .catch(() => {});
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [search]);
  const destinations = [
    ...new Map([...options, ...matches].map((o) => [o.href, o])).values(),
  ];
  const known = !value.href || destinations.some((o) => o.href === value.href);
  return (
    <fieldset className="grid gap-3 sm:grid-cols-2">
      <legend className="mb-2 text-sm font-semibold">{label}</legend>
      {!hideLabel && (
        <Field label="Link text" error={errors.label}>
          <input
            value={value.label}
            onChange={(e) => onChange({ ...value, label: e.target.value })}
          />
        </Field>
      )}
      <Field label="Find a product or category">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Type at least 2 letters"
        />
      </Field>
      <Field label="Destination" error={errors.href}>
        <select
          value={custom || !known ? "custom" : value.href}
          onChange={(e) => {
            if (e.target.value === "custom") {
              setCustom(true);
              return;
            }
            setCustom(false);
            onChange({ ...value, href: e.target.value });
          }}
        >
          <option value="">No link</option>
          {destinations.map((o, i) => (
            <option key={`${o.href}-${i}`} value={o.href}>
              {o.label}
            </option>
          ))}
          <option value="custom">External or custom URL</option>
        </select>
      </Field>
      {(custom || !known) && (
        <Field label="URL" error={errors.href}>
          <input
            placeholder="https://…"
            value={value.href}
            onChange={(e) => onChange({ ...value, href: e.target.value })}
          />
        </Field>
      )}
    </fieldset>
  );
}
function Picker({
  label,
  options,
  value,
  onChange,
  catalog,
}: {
  label: string;
  options: Option[];
  value: string[];
  onChange: (value: string[]) => void;
  catalog: "products" | "categories";
}) {
  const [search, setSearch] = useState(""),
    [page, setPage] = useState(1),
    [matches, setMatches] = useState(options),
    [chosen, setChosen] = useState<Option[]>([]),
    [count, setCount] = useState(options.length),
    [message, setMessage] = useState("");
  const selection = value.join("|");
  useEffect(() => {
    let cancelled = false;
    const timeout = setTimeout(() => {
      searchCatalog(catalog, search, page, selection.split("|").filter(Boolean))
        .then((result) => {
          if (!cancelled) {
            setMatches(result.options);
            setChosen(result.selected);
            setCount(result.count);
            setMessage("");
          }
        })
        .catch(() => {
          if (!cancelled)
            setMessage("Could not load options. Try searching again.");
        });
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [catalog, search, page, selection]);
  const all = [
    ...new Map([...chosen, ...matches].map((o) => [o.id, o])).values(),
  ];
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-semibold">{label}</legend>
      <input
        className="admin-input"
        placeholder="Find by name"
        aria-label={label}
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setPage(1);
        }}
      />
      <div className="max-h-64 overflow-auto border p-3">
        {value
          .filter((id) => !all.some((o) => o.id === id))
          .map((id) => (
            <label key={id} className="flex min-h-11 items-center gap-3">
              <input
                type="checkbox"
                checked
                onChange={() => onChange(value.filter((v) => v !== id))}
              />
              Unavailable selection (remove or review)
            </label>
          ))}
        {all.map((o) => (
          <label key={o.id} className="flex min-h-11 items-center gap-3">
            <input
              type="checkbox"
              checked={value.includes(o.id)}
              onChange={(e) =>
                onChange(
                  e.target.checked
                    ? [...value, o.id]
                    : value.filter((id) => id !== o.id),
                )
              }
            />
            {o.name}
          </label>
        ))}
        {!all.length && (
          <p className="py-3 text-sm text-neutral-500">No matching items.</p>
        )}
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-sm">
        <span>
          {value.length} selected · {count} matches
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            className="admin-secondary"
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            Previous
          </button>
          <button
            type="button"
            className="admin-secondary"
            disabled={page * 25 >= count}
            onClick={() => setPage(page + 1)}
          >
            Next
          </button>
        </div>
      </div>
      {message && <p role="status">{message}</p>}
    </fieldset>
  );
}
function ImageField({
  value,
  onChange,
  errors = {},
}: {
  value: ContentImage;
  errors?: Record<string, string>;
  onChange: (image: ContentImage) => void;
}) {
  const [library, setLibrary] = useState<"src" | "mobileSrc" | null>(null);
  return (
    <fieldset className="space-y-4 border p-4">
      <legend className="px-2 text-sm font-semibold">Image & crop</legend>
      <div className="grid gap-4 sm:grid-cols-2">
        {(["src", "mobileSrc"] as const).map((key) => (
          <div key={key}>
            <Field
              error={errors[key]}
              label={
                key === "src"
                  ? "Desktop image URL"
                  : "Mobile image URL (optional)"
              }
            >
              <input
                value={value[key]}
                onChange={(e) => onChange({ ...value, [key]: e.target.value })}
              />
            </Field>
            <button
              type="button"
              className="admin-secondary mt-2"
              onClick={() => setLibrary(key)}
            >
              Choose or upload image
            </button>
          </div>
        ))}
      </div>
      {library && (
        <MediaLibrary
          onChoose={(url) => {
            onChange({ ...value, [library]: url });
            setLibrary(null);
          }}
        />
      )}
      {value.src && (
        <div className="relative aspect-video overflow-hidden bg-neutral-100">
          <img
            alt="Crop preview"
            src={value.src}
            className="h-full w-full object-cover"
            style={{ objectPosition: `${value.x}% ${value.y}%` }}
          />
          <span
            className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-black/70 p-2 text-white"
            style={{ left: `${value.x}%`, top: `${value.y}%` }}
          >
            +
          </span>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={`Horizontal focal point (${value.x}%)`}>
          <input
            type="range"
            min="0"
            max="100"
            value={value.x}
            onChange={(e) => onChange({ ...value, x: Number(e.target.value) })}
          />
        </Field>
        <Field label={`Vertical focal point (${value.y}%)`}>
          <input
            type="range"
            min="0"
            max="100"
            value={value.y}
            onChange={(e) => onChange({ ...value, y: Number(e.target.value) })}
          />
        </Field>
      </div>
      <Field label="Image description (alt text)" error={errors.alt}>
        <input
          value={value.alt}
          onChange={(e) => onChange({ ...value, alt: e.target.value })}
        />
      </Field>
      <p className="text-xs text-neutral-500">
        JPG, PNG or WebP, up to 5 MB. Use landscape images for desktop campaigns
        and portrait images for mobile.
      </p>
    </fieldset>
  );
}
function MediaLibrary({ onChoose }: { onChoose: (url: string) => void }) {
  const [media, setMedia] = useState<{ name: string; url: string }[]>([]),
    [message, setMessage] = useState(""),
    [source, setSource] = useState("website"),
    [search, setSearch] = useState(""),
    [page, setPage] = useState(1),
    [more, setMore] = useState(false);
  const [pending, start] = useTransition();
  useEffect(() => {
    let cancelled = false;
    const timeout = setTimeout(() => {
      listMedia({ source, page, search })
        .then((result) => {
          if (!cancelled) {
            setMedia(result.items);
            setMore(result.hasMore);
            setMessage("");
          }
        })
        .catch(() => {
          if (!cancelled) setMessage("Media could not be loaded.");
        });
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [source, page, search]);
  return (
    <div className="space-y-3 border bg-neutral-50 p-4">
      <Field label="Upload image">
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={pending}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const form = new FormData();
            form.set("image", file);
            start(async () => {
              const result = await uploadContentImage(form);
              setMessage(result.message);
              if (result.ok) onChoose(result.url);
            });
          }}
        />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Image collection">
          <select
            value={source}
            onChange={(e) => {
              setSource(e.target.value);
              setPage(1);
            }}
          >
            {["website", "banners", "homepage", "products", "categories"].map(
              (name) => (
                <option key={name}>{name}</option>
              ),
            )}
          </select>
        </Field>
        <Field label="Find image">
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search file names"
          />
        </Field>
      </div>
      {message && <p role="status">{message}</p>}
      <div className="grid max-h-80 grid-cols-2 gap-3 overflow-auto sm:grid-cols-3">
        {media.map((m) => (
          <button
            type="button"
            className="border bg-white p-2 text-left"
            key={m.url}
            onClick={() => onChoose(m.url)}
          >
            <img
              src={m.url}
              alt=""
              loading="lazy"
              className="aspect-square w-full object-cover"
            />
            <span className="mt-1 block truncate text-xs">{m.name}</span>
          </button>
        ))}
      </div>
      {!media.length && !message && (
        <p className="text-sm text-neutral-500">
          No images in this collection.
        </p>
      )}
      <div className="flex items-center justify-between">
        <span className="text-sm">Page {page}</span>
        <div className="flex gap-2">
          <button
            type="button"
            className="admin-secondary"
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            Previous
          </button>
          <button
            type="button"
            className="admin-secondary"
            disabled={!more}
            onClick={() => setPage(page + 1)}
          >
            Next
          </button>
        </div>
      </div>
      {pending && <p role="status">Uploading…</p>}
    </div>
  );
}
