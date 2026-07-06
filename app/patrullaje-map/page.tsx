import { redirect } from "next/navigation";

type PageProps = {
  searchParams: Promise<{ alerta?: string }>;
};

export default async function PatrullajeMapRedirectPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const q = params.alerta ? `?alerta=${encodeURIComponent(params.alerta)}` : "";
  redirect(`/patrullaje${q}`);
}
