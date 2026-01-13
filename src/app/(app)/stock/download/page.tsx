import Link from "next/link";

type SearchParams = Record<string, string | string[] | undefined>;

function pickParam(sp: SearchParams, key: string): string | undefined {
  const v = sp[key];
  if (typeof v === "string") return v.trim() || undefined;
  if (Array.isArray(v)) return (v[0] ?? "").trim() || undefined;
  return undefined;
}

function safeFilename(name: string) {
  const cleaned = name
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[^a-zA-Z0-9._\- ]/g, "")
    .slice(0, 80);
  return cleaned || "download";
}

export default function StockDownloadPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const orderId = pickParam(searchParams, "orderId");
  const assetId = pickParam(searchParams, "assetId") ?? pickParam(searchParams, "id");
  const title = pickParam(searchParams, "title") ?? pickParam(searchParams, "name");
  const format = (pickParam(searchParams, "format") ?? "JPG").toUpperCase();
  const size = (pickParam(searchParams, "size") ?? "XL").toUpperCase();
  const license = (pickParam(searchParams, "license") ?? "Standard").trim();
  const next = pickParam(searchParams, "next");

  // If we arrive from checkout, we might not have an assetId.
  // In that case, show an order-completed download page.
  if (!assetId) {
    const orderDownloadHref = orderId
      ? `/api/stock/download?orderId=${encodeURIComponent(orderId)}`
      : undefined;

    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-10">
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-medium text-neutral-500">Stock • Download</p>
          <h1 className="mt-1 text-xl font-semibold tracking-tight text-neutral-900">
            Your download is ready
          </h1>
          <p className="mt-2 text-sm text-neutral-600">
            Thanks — your order has been confirmed. You can download your files now, or continue browsing Stock.
          </p>

          <div className="mt-6 grid gap-3 rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
            <div className="rounded-xl bg-white p-4">
              <p className="text-xs font-medium text-neutral-500">Next</p>
              <p className="mt-1 text-sm font-semibold text-neutral-900">Download or add to Drive</p>
              <p className="mt-2 text-xs text-neutral-600">
                In the real product, downloads can also be delivered to Drive automatically.
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs text-neutral-600">
              <span className="font-medium text-neutral-800">Tip:</span> If download fails due to access, try logging in
              or upgrading.
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Link
                href="/stock/cart"
                className="inline-flex items-center justify-center rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-medium text-neutral-900 hover:bg-neutral-50"
              >
                Back to cart
              </Link>
              <Link
                href="/stock"
                className="inline-flex items-center justify-center rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-medium text-neutral-900 hover:bg-neutral-50"
              >
                Browse Stock
              </Link>
              <Link
                href="/drive/landing"
                className="inline-flex items-center justify-center rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-medium text-neutral-900 hover:bg-neutral-50"
              >
                Open Drive
              </Link>
              {orderDownloadHref ? (
                <a
                  href={orderDownloadHref}
                  download
                  className="inline-flex items-center justify-center rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-800"
                >
                  Download
                </a>
              ) : (
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-800"
                >
                  Log in to download
                </Link>
              )}
            </div>
          </div>
        </div>
      </main>
    );
  }

  const displayTitle = title ?? `Asset #${assetId}`;
  const filename = safeFilename(displayTitle);

  // NOTE:
  // This page intentionally does not call an API directly.
  // Hook this up later to your download endpoint (e.g. /api/stock/download?assetId=...).
  const downloadHref = `/api/stock/download?assetId=${encodeURIComponent(assetId)}&size=${encodeURIComponent(
    size
  )}&format=${encodeURIComponent(format)}`;

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-medium text-neutral-500">Stock • Download</p>
            <h1 className="mt-1 text-xl font-semibold tracking-tight text-neutral-900">
              {displayTitle}
            </h1>
            <p className="mt-2 text-sm text-neutral-600">
              Vælg størrelse og format, og hent filen. Hvis du ikke har adgang, kan du opgradere.
            </p>
          </div>

          <div className="flex gap-2">
            <Link
              href={next ?? "/stock"}
              className="inline-flex items-center justify-center rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-50"
            >
              Tilbage
            </Link>
            <Link
              href="/drive/landing"
              className="inline-flex items-center justify-center rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-50"
            >
              Drive
            </Link>
          </div>
        </div>

        <div className="mt-6 grid gap-4 rounded-2xl border border-neutral-200 bg-neutral-50 p-4 sm:grid-cols-2">
          <div className="rounded-xl bg-white p-4">
            <p className="text-xs font-medium text-neutral-500">Asset</p>
            <p className="mt-1 text-sm font-semibold text-neutral-900">#{assetId}</p>
            <p className="mt-2 text-xs text-neutral-600">Filnavn: {filename}.{format.toLowerCase()}</p>
          </div>

          <div className="rounded-xl bg-white p-4">
            <p className="text-xs font-medium text-neutral-500">Licens</p>
            <p className="mt-1 text-sm font-semibold text-neutral-900">{license}</p>
            <p className="mt-2 text-xs text-neutral-600">
              Husk at tjekke usage rights før publicering.
            </p>
          </div>

          <div className="rounded-xl bg-white p-4">
            <p className="text-xs font-medium text-neutral-500">Størrelse</p>
            <p className="mt-1 text-sm font-semibold text-neutral-900">{size}</p>
            <p className="mt-2 text-xs text-neutral-600">Brug fx M til web og XL til print.</p>
          </div>

          <div className="rounded-xl bg-white p-4">
            <p className="text-xs font-medium text-neutral-500">Format</p>
            <p className="mt-1 text-sm font-semibold text-neutral-900">{format}</p>
            <p className="mt-2 text-xs text-neutral-600">JPG er typisk bedst til foto.</p>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs text-neutral-600">
            <span className="font-medium text-neutral-800">Tip:</span> Hvis download fejler pga. adgang,
            så prøv at logge ind eller opgradere.
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-medium text-neutral-900 hover:bg-neutral-50"
            >
              Log ind
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center justify-center rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-medium text-neutral-900 hover:bg-neutral-50"
            >
              Opgrader
            </Link>
            <a
              href={downloadHref}
              download
              className="inline-flex items-center justify-center rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-800"
            >
              Download
            </a>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-neutral-200 bg-white p-4">
          <p className="text-sm font-semibold text-neutral-900">Del eller fortsæt</p>
          <p className="mt-1 text-xs text-neutral-600">
            Når du har hentet, kan du lægge filen i Drive eller finde flere lignende i Stock.
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Link
              href={"/stock"}
              className="inline-flex items-center justify-center rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-medium text-neutral-900 hover:bg-neutral-50"
            >
              Find flere billeder
            </Link>
            <Link
              href={"/drive/landing"}
              className="inline-flex items-center justify-center rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-medium text-neutral-900 hover:bg-neutral-50"
            >
              Tilføj til Drive
            </Link>
          </div>
        </div>
      </div>

      <p className="mx-auto mt-4 max-w-3xl text-center text-xs text-neutral-500">
        Hvis du forventer at lande her fra et asset view, kan du sende brugeren videre med
        <span className="font-mono"> ?assetId=…&title=…&size=…&format=…</span>.
      </p>
    </main>
  );
}
