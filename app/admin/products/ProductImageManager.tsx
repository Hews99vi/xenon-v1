"use client";

/* Dynamic legacy/external URLs are also editable; thumbnails need no optimizer. */
/* eslint-disable @next/next/no-img-element */
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUp, ArrowDown, ImageOff } from "lucide-react";
import { imageFileError, imageSnapshot, type SavedProductImage } from "@/lib/productImages";

type DraftImage = { key: string; id?: string; url: string; altText: string; file?: File; fileKey?: string };
function drafts(images: SavedProductImage[]): DraftImage[] {
  return images.map(image => ({ key: image.id, id: image.id, url: image.image_url, altText: image.alt_text || "" }));
}
function signature(images: DraftImage[]) {
  return JSON.stringify(images.map(image => ({ id: image.id, alt: image.altText, file: image.fileKey })));
}
function focusImage(key?: string) {
  requestAnimationFrame(() => document.getElementById(key ? `gallery-image-${key}` : "product-add-images")?.focus());
}

export function useProductGallery(initialImages: SavedProductImage[]) {
  const [baseline, setBaseline] = useState(initialImages);
  const [images, setImages] = useState(() => drafts(initialImages));
  const [removed, setRemoved] = useState<{ image: DraftImage; index: number }[]>([]);
  const [preparing, setPreparing] = useState(false);
  const preparingRef = useRef(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const blobs = useRef(new Set<string>());
  const dirty = signature(images) !== signature(drafts(baseline));
  useEffect(() => {
    const urls = blobs.current;
    return () => { urls.forEach(url => URL.revokeObjectURL(url)); urls.clear(); };
  }, []);
  useEffect(() => {
    let approvedExit = false;
    const unload = (event: BeforeUnloadEvent) => {
      if (approvedExit) return;
      event.preventDefault(); event.returnValue = "";
    };
    const resume = () => { approvedExit = false; };
    const navigate = (event: MouseEvent) => {
      const anchor = event.target instanceof Element ? event.target.closest("a") : null;
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download") || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const destination = new URL(anchor.href, location.href);
      if (destination.pathname === location.pathname && destination.search === location.search) return;
      event.preventDefault(); event.stopPropagation();
      if (dirty && !window.confirm("Leave without saving your image changes?")) return;
      // Full-document editor exits keep Back/Forward under native beforeunload
      // protection, without modifying Next's history state or adding fake entries.
      approvedExit = true;
      window.location.assign(anchor.href);
    };
    const submitOtherForm = (event: SubmitEvent) => {
      if (dirty && event.target instanceof HTMLFormElement && !event.target.classList.contains("catalog-form") && !window.confirm("Leave without saving your image changes?")) {
        event.preventDefault(); event.stopPropagation();
      }
    };
    if (dirty) window.addEventListener("beforeunload", unload);
    window.addEventListener("pageshow", resume);
    document.addEventListener("click", navigate, true);
    document.addEventListener("submit", submitOtherForm, true);
    return () => {
      window.removeEventListener("beforeunload", unload); window.removeEventListener("pageshow", resume);
      document.removeEventListener("click", navigate, true); document.removeEventListener("submit", submitOtherForm, true);
    };
  }, [dirty]);

  async function queue(files: File[], replaceKey?: string) {
    if (preparingRef.current) return;
    const remaining = images.filter(image => image.key !== replaceKey).flatMap(image => image.file ? [image.file] : []);
    const failure = imageFileError([...remaining, ...files]);
    if (failure) { setError(failure); return; }
    preparingRef.current = true; setPreparing(true);
    try {
      for (const file of files) { const bitmap = await createImageBitmap(file); bitmap.close(); }
    } catch { setError("An image could not be opened. Choose a valid JPG, PNG or WebP."); return; }
    finally { preparingRef.current = false; setPreparing(false); }
    const queued = files.map(file => {
      const url = URL.createObjectURL(file); blobs.current.add(url);
      return { key: crypto.randomUUID(), fileKey: crypto.randomUUID(), file, url, altText: "" };
    });
    setImages(current => replaceKey ? current.map(image => image.key === replaceKey ? { ...image, file: queued[0].file, fileKey: queued[0].fileKey, url: queued[0].url } : image) : [...current, ...queued]);
    setError(""); setNotice(replaceKey ? "Replacement ready. Update product to save." : `${files.length} image${files.length === 1 ? "" : "s"} added. Update product to save.`);
  }
  function acceptSaved(saved: SavedProductImage[]) {
    setBaseline(saved); setImages(drafts(saved)); setRemoved([]); setError(""); setNotice("Gallery is up to date.");
    blobs.current.forEach(url => URL.revokeObjectURL(url)); blobs.current.clear();
  }
  function move(key: string, destination: number) {
    const next = [...images]; const index = next.findIndex(image => image.key === key);
    const [image] = next.splice(index, 1); next.splice(destination, 0, image);
    setImages(next); setNotice(`Image moved to position ${destination + 1}${destination === 0 ? " and made main" : ""}. Update product to save.`); focusImage(key);
  }
  function remove(key: string) {
    const index = images.findIndex(image => image.key === key);
    setRemoved(current => [...current, { image: images[index], index }]);
    const next = images.filter(image => image.key !== key); setImages(next);
    setNotice("Image marked for removal. You can undo before saving."); focusImage(next[Math.min(index, next.length - 1)]?.key);
  }
  function undo(key: string) {
    const entry = removed.find(item => item.image.key === key); if (!entry) return;
    const next = [...images]; next.splice(Math.min(entry.index, next.length), 0, entry.image);
    const failure = imageFileError(next.flatMap(image => image.file ? [image.file] : []));
    if (failure) { setError(failure); return; }
    setImages(next); setRemoved(current => current.filter(item => item.image.key !== key));
    setNotice("Image restored to the gallery."); focusImage(key);
  }
  return {
    images, removed, notice, error, dirty, baseline, queue, acceptSaved, move, remove, undo, preparing, isPreparing: () => preparingRef.current,
    manifest: images.map(image => ({ key: image.key, id: image.id, fileKey: image.fileKey, altText: image.altText })),
    snapshot: imageSnapshot(baseline),
    files: images.flatMap(image => image.file && image.fileKey ? [{ key: image.fileKey, file: image.file }] : []),
    setAlt: (key: string, altText: string) => setImages(current => current.map(image => image.key === key ? { ...image, altText } : image)),
    cancelReplacement: (key: string) => {
      const original = baseline.find(image => image.id === key); if (!original) return;
      setImages(current => current.map(image => image.key === key ? { ...image, file: undefined, fileKey: undefined, url: original.image_url } : image));
      setNotice("Replacement cancelled. The original image is kept.");
    },
  };
}

export function ProductImageManager({ gallery }: { gallery: ReturnType<typeof useProductGallery> }) {
  return <div className="space-y-5" aria-label="Product image gallery">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h2 className="text-base font-medium">Product images <span className="font-normal text-neutral-600">({gallery.images.length})</span></h2>
        <p className="mt-1 max-w-2xl text-sm text-neutral-600">The first image is the main image shown in the store. Changes take effect when you save this product.</p></div>
      {gallery.dirty && <span className="text-sm font-medium">Unsaved image changes</span>}
    </div>
    {!gallery.images.length && <p className="border border-dashed border-neutral-300 p-5 text-sm text-neutral-600">No images in this gallery. Add photographs below, or save without images to use the store placeholder.</p>}
    <div className="grid gap-x-6 gap-y-5 xl:grid-cols-2">
      {gallery.images.map((image, index) => <ImageRow key={image.key} image={image} index={index} gallery={gallery}/>)}
    </div>
    {gallery.removed.length > 0 && <div className="border-t border-neutral-200 pt-4"><h3 className="text-sm font-medium">Pending removal</h3><ul className="mt-2 space-y-2">
      {gallery.removed.map(({ image }) => <li key={image.key} className="flex items-center justify-between gap-4 text-sm"><span className="min-w-0 break-words text-neutral-600">{image.altText || "Product image"}</span><button type="button" className="min-h-11 shrink-0 underline" onClick={() => gallery.undo(image.key)}>Undo removal</button></li>)}
    </ul><p className="mt-2 text-xs text-neutral-600">After saving, unused originals are deleted. Files used elsewhere or in website history are kept.</p></div>}
    <label className="editor-field"><span>Add photographs</span><input id="product-add-images" className="admin-file" type="file" multiple accept="image/jpeg,image/png,image/webp" aria-describedby="product-image-limits" onChange={event => { const files = Array.from(event.target.files || []); event.target.value = ""; if (files.length) void gallery.queue(files); }}/></label>
    <p id="product-image-limits" className="text-xs leading-5 text-neutral-600">JPG, PNG or WebP. Add or replace up to 5 files per save, up to 5 MiB each and 9 MiB combined. Existing images do not count toward this limit.</p>
    {gallery.error && <p role="alert" className="text-sm text-red-800">{gallery.error}</p>}
    <p role="status" className="text-sm text-neutral-600">{gallery.preparing ? "Preparing image previews…" : gallery.notice}</p>
  </div>;
}

function ImageRow({ image, index, gallery }: { image: DraftImage; index: number; gallery: ReturnType<typeof useProductGallery> }) {
  const replaceInput = useRef<HTMLInputElement>(null);
  const action = "min-h-11 text-left text-xs underline underline-offset-4 disabled:no-underline disabled:opacity-40";
  return <article id={`gallery-image-${image.key}`} tabIndex={-1} aria-label={`Image ${index + 1}`} className="flex min-w-0 gap-4 border-b border-neutral-200 pb-5">
    <Thumbnail key={image.url} image={image}/>
    <div className="min-w-0 flex-1">
      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs"><span>{index === 0 ? <span className="bg-black px-2 py-1 text-white">Main image</span> : `Image ${index + 1}`}</span><span className="text-neutral-600">{image.file ? image.id ? "Replacement ready" : "New image" : "Saved"}</span></div>
      <label className="editor-field"><span>Alternative text <span className="font-normal text-neutral-600">(optional)</span></span><input className="admin-input" aria-label={`Alternative text for image ${index + 1}`} value={image.altText} onChange={event => gallery.setAlt(image.key, event.target.value)}/></label>
      <div className="mt-2 flex flex-wrap items-center gap-x-4">
        {index > 0 && <button type="button" className={action} onClick={() => gallery.move(image.key, 0)}>Make main</button>}
        <button type="button" className={action} onClick={() => replaceInput.current?.click()}>Replace</button>
        <input ref={replaceInput} type="file" hidden accept="image/jpeg,image/png,image/webp" aria-label={`Replace image ${index + 1}`} onChange={event => { const file = event.target.files?.[0]; event.target.value = ""; if (file) void gallery.queue([file], image.key); }}/>
        <button type="button" className={`${action} text-red-800`} onClick={() => gallery.remove(image.key)}>Remove image</button>
        {image.id && image.file && <button type="button" className={action} onClick={() => gallery.cancelReplacement(image.key)}>Cancel replacement</button>}
      </div>
      <div className="flex gap-2"><button type="button" className="icon-button border border-neutral-300" aria-label={`Move image ${index + 1} earlier`} disabled={index === 0} onClick={() => gallery.move(image.key, index - 1)}><ArrowUp size={16}/></button>
        <button type="button" className="icon-button border border-neutral-300" aria-label={`Move image ${index + 1} later`} disabled={index === gallery.images.length - 1} onClick={() => gallery.move(image.key, index + 1)}><ArrowDown size={16}/></button></div>
    </div>
  </article>;
}

function Thumbnail({ image }: { image: DraftImage }) {
  const [failed, setFailed] = useState(false);
  const checkImage = useCallback((element: HTMLImageElement | null) => {
    // A failed server-rendered image can finish before hydration attaches onError.
    if (element?.complete && element.naturalWidth === 0) setFailed(true);
  }, []);
  return <div className="relative flex h-36 w-24 shrink-0 items-center justify-center bg-neutral-100 sm:h-44 sm:w-32">
    {failed ? <span className="px-2 text-center text-xs text-neutral-600"><ImageOff className="mx-auto mb-2" size={20}/>Image unavailable</span> : <img ref={checkImage} src={image.url} alt={image.altText || "Product photograph"} className="h-full w-full object-contain" onError={() => setFailed(true)}/>}
  </div>;
}
