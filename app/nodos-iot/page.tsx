"use client";

import { Sidebar } from "@/components/sidebar";
import { ProtectedRoute } from "@/components/protected-route";
import NodosIotContent from "@/components/nodos-iot/nodos-iot-content";

export default function NodosIotPage() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[#0f172a]">
        <Sidebar />
        <main className="ml-64 p-8">
          <NodosIotContent />
        </main>
      </div>
    </ProtectedRoute>
  );
}
