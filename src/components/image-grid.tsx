"use client";
import { useState } from "react";
import { ViewerModal, ViewerItem } from "@/components/viewer-modal";
import { Card, CardFooter } from "@/components/ui/card";

// Using remote placeholder images (no local files needed)

const images = [
  { id: 1, title: "Portrait", ratio: "3/4", src: "https://picsum.photos/seed/portrait/900/1200" },
  { id: 2, title: "Lifestyle", ratio: "4/3", src: "https://picsum.photos/seed/lifestyle/1200/900" },
  { id: 3, title: "Landscape", ratio: "16/9", src: "https://picsum.photos/seed/landscape/1600/900" },
  { id: 4, title: "Office", ratio: "1/1", src: "https://picsum.photos/seed/office/1200/1200" },
  { id: 5, title: "City", ratio: "16/9", src: "https://picsum.photos/seed/city/1600/900" },
  { id: 6, title: "People", ratio: "3/4", src: "https://picsum.photos/seed/people/900/1200" },
  { id: 7, title: "Product", ratio: "1/1", src: "https://picsum.photos/seed/product/1200/1200" },
  { id: 8, title: "Detail", ratio: "4/3", src: "https://picsum.photos/seed/detail/1200/900" },
  { id: 9,  title: "Nature",      ratio: "16/9", src: "https://picsum.photos/seed/nature/1600/900" },
  { id: 10, title: "Fashion",     ratio: "3/4",  src: "https://picsum.photos/seed/fashion/900/1200" },
  { id: 11, title: "Architecture",ratio: "4/3",  src: "https://picsum.photos/seed/architecture/1200/900" },
  { id: 12, title: "Food",        ratio: "1/1",  src: "https://picsum.photos/seed/food/1200/1200" },
  { id: 13, title: "Travel",      ratio: "16/9", src: "https://picsum.photos/seed/travel/1600/900" },
  { id: 14, title: "Studio",      ratio: "1/1",  src: "https://picsum.photos/seed/studio/1200/1200" },
  { id: 15, title: "Outdoor",     ratio: "4/3",  src: "https://picsum.photos/seed/outdoor/1200/900" },
  { id: 16, title: "Business",    ratio: "3/4",  src: "https://picsum.photos/seed/business/900/1200" },
  { id: 17, title: "Abstract",    ratio: "1/1",  src: "https://picsum.photos/seed/abstract/1200/1200" },
  { id: 18, title: "Technology",  ratio: "16/9", src: "https://picsum.photos/seed/technology/1600/900" },
  { id: 19, title: "Details",     ratio: "4/3",  src: "https://picsum.photos/seed/details/1200/900" },
  { id: 20, title: "Creative",    ratio: "3/4",  src: "https://picsum.photos/seed/creative/900/1200" },
] as const;

export function ImageGrid({ query = "" }: { query?: string }) {
  const [active, setActive] = useState<typeof images[number] | null>(null);

  type AssetMeta = {
    tags: string[];
    comments: { id: string; text: string; createdAt: string }[];
    updatedAt: string;
  };

  const getFilename = (src: string) => {
    try {
      return decodeURIComponent(src.split("/").filter(Boolean).pop() ?? "");
    } catch {
      return src.split("/").filter(Boolean).pop() ?? "";
    }
  };

  const readMeta = (id: string | number): AssetMeta | null => {
    try {
      const raw = localStorage.getItem(`CBX_META_V1:${String(id)}`);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as any;
      return {
        tags: Array.isArray(parsed.tags) ? parsed.tags.filter((t: any) => typeof t === "string") : [],
        comments: Array.isArray(parsed.comments)
          ? parsed.comments
              .filter((c: any) => c && typeof c.text === "string")
              .map((c: any) => ({
                id: typeof c.id === "string" ? c.id : "",
                text: String(c.text),
                createdAt: typeof c.createdAt === "string" ? c.createdAt : "",
              }))
          : [],
        updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : "",
      };
    } catch {
      return null;
    }
  };

  const q = query.trim().toLowerCase();

  const filteredImages = !q
    ? images
    : images.filter((img) => {
        const title = String(img.title ?? "").toLowerCase();
        const filename = getFilename(String(img.src ?? "")).toLowerCase();

        if (title.includes(q) || filename.includes(q)) return true;

        const meta = readMeta(img.id);
        if (!meta) return false;

        if (meta.tags.join(" ").toLowerCase().includes(q)) return true;
        if (meta.comments.map((c) => c.text).join(" ").toLowerCase().includes(q)) return true;

        return false;
      });

  return (
    <>
      <section className="mx-auto grid items-start gap-3 [grid-template-columns:repeat(auto-fill,minmax(160px,1fr))] sm:gap-4 sm:[grid-template-columns:repeat(auto-fill,minmax(190px,1fr))] lg:gap-5 lg:[grid-template-columns:repeat(auto-fill,minmax(220px,1fr))]">
        {filteredImages.length === 0 && (
          <div className="col-span-full rounded-2xl border border-border bg-muted/20 p-6 text-sm text-muted-foreground">
            No results for <span className="font-semibold text-foreground">{query}</span>
          </div>
        )}
        {filteredImages.map((img) => (
          <Card
            key={img.id}
            className="group relative self-start overflow-hidden rounded-xl sm:rounded-2xl"
          >
            <img
              src={img.src}
              alt={img.title}
              onClick={() => setActive(img)}
              tabIndex={0}
              className="block w-full h-auto cursor-zoom-in object-cover transition-transform duration-300 will-change-transform group-hover:scale-[1.03]"
              loading="lazy"
              decoding="async"
              draggable={false}
            />

            <div className="pointer-events-none absolute inset-0 bg-transparent transition group-hover:bg-foreground/10" />

            <CardFooter className="pointer-events-none absolute bottom-0 left-0 right-0 p-3">
              <div className="w-full rounded-xl bg-background/70 px-3 py-2 text-sm text-foreground backdrop-blur">
                {img.title}
              </div>
            </CardFooter>
          </Card>
        ))}
      </section>

      <ViewerModal
        open={!!active}
        item={active as ViewerItem | null}
        items={images as unknown as ViewerItem[]}
        onClose={() => setActive(null)}
      />
    </>
  );
}