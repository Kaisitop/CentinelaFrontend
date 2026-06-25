import { Suspense } from "react";
import PatrullajeMapContent from "./patrullaje-map-content";

export default function PatrullajeMapPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center bg-[#0f172a] text-[#94a3b8]">
          Cargando mapa...
        </div>
      }
    >
      <PatrullajeMapContent />
    </Suspense>
  );
}
