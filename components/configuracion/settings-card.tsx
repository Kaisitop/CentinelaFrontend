"use client";

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function SettingsCard({
  icon: Icon,
  title,
  description,
  accent = "#6366f1",
  children,
  danger = false,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  accent?: string;
  children: ReactNode;
  danger?: boolean;
}) {
  return (
    <div
      className={`overflow-hidden rounded-xl border bg-[#1e293b] ${
        danger ? "border-[#7f1d1d]/50" : "border-[#334155]"
      }`}
    >
      <div className="flex items-start gap-3 border-b border-[#334155] px-5 py-4">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1"
          style={{
            backgroundColor: `${accent}1a`,
            // @ts-expect-error CSS var for ring color
            "--tw-ring-color": `${accent}40`,
            color: accent,
          }}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-white">{title}</h2>
          {description && (
            <p className="mt-0.5 text-sm text-[#64748b]">{description}</p>
          )}
        </div>
      </div>
      <div className="space-y-5 p-5">{children}</div>
    </div>
  );
}

export function SettingsRow({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 space-y-0.5">
        <p className="text-sm font-medium text-white">{label}</p>
        {description && <p className="text-xs text-[#64748b]">{description}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}
