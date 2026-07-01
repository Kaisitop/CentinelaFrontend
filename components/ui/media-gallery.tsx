"use client";

import { ImageIcon } from "lucide-react";

interface MediaGalleryProps {
  urls: string[];
  title?: string;
  emptyLabel?: string;
}

export function MediaGallery({
  urls,
  title = "Fotos adjuntas",
  emptyLabel,
}: MediaGalleryProps) {
  if (urls.length === 0) {
    if (!emptyLabel) return null;
    return (
      <p className="text-sm text-[#64748b]">{emptyLabel}</p>
    );
  }

  return (
    <div className="rounded-xl border border-[#334155]/80 bg-[#0f172a]/60 p-4">
      <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-[#64748b]">
        <ImageIcon className="h-3.5 w-3.5" />
        {title}
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {urls.map((url, index) => (
          <a
            key={`${url}-${index}`}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="group overflow-hidden rounded-lg border border-[#334155] bg-[#0f172a]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt={`${title} ${index + 1}`}
              className="aspect-square w-full object-cover transition-opacity group-hover:opacity-90"
            />
          </a>
        ))}
      </div>
    </div>
  );
}
