import { Suspense } from "react";
import PatrullajeContent from "@/components/patrullaje/patrullaje-content";

export default function PatrullajePage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center bg-[#0f172a] text-[#94a3b8]">
          Cargando patrullaje...
        </div>
      }
    >
      <PatrullajeContent />
    </Suspense>
  );
}
