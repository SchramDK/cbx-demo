import { Card, CardFooter } from "@/components/ui/card";

type Props = {
  title: string;
  ratio: "1/1" | "3/4" | "4/3" | "16/9";
};

const ratioMap: Record<Props["ratio"], string> = {
  "1/1": "aspect-square",
  "3/4": "aspect-[3/4]",
  "4/3": "aspect-[4/3]",
  "16/9": "aspect-video",
};

export function ImageCard({ title, ratio }: Props) {
  return (
    <Card className="group relative overflow-hidden rounded-2xl">
      {/* Image placeholder */}
      <div
        className={`
          ${ratioMap[ratio]}
          bg-gradient-to-br from-muted to-muted/70
          transition-transform duration-300
          group-hover:scale-[1.03]
        `}
      />

      {/* Hover overlay (klar til actions) */}
      <div className="pointer-events-none absolute inset-0 bg-transparent transition group-hover:bg-foreground/10" />

      {/* Footer */}
      <CardFooter className="pointer-events-none absolute bottom-0 left-0 right-0 p-3">
        <div className="w-full rounded-xl bg-background/70 px-3 py-2 text-sm text-foreground backdrop-blur">
          {title}
        </div>
      </CardFooter>
    </Card>
  );
}