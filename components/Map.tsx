"use client";

import dynamic from "next/dynamic";
import { Zona, Nodo, Alerta } from "@/lib/core-service";

const MapClient = dynamic(() => import("./MapClient"), { 
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-[#0f172a] text-[#94a3b8]">
      Cargando mapa...
    </div>
  )
});

interface MapProps {
  zonas: Zona[];
  nodos: Nodo[];
  alertas: Alerta[];
}

export default function Map(props: MapProps) {
  return <MapClient {...props} />;
}
