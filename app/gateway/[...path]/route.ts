import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GATEWAY_ORIGIN = (
  process.env.GATEWAY_ORIGIN ||
  process.env.NEXT_PUBLIC_GATEWAY_ORIGIN ||
  ""
).replace(/\/$/, "");

const HOP_BY_HOP = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailers",
  "transfer-encoding",
  "upgrade",
  "host",
  "content-length",
]);

async function proxy(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  if (!GATEWAY_ORIGIN) {
    return NextResponse.json(
      { message: "GATEWAY_ORIGIN no configurado en el servidor" },
      { status: 500 },
    );
  }

  const { path } = await context.params;
  const targetPath = path?.length ? path.join("/") : "";
  const targetUrl = `${GATEWAY_ORIGIN}/api/${targetPath}${req.nextUrl.search}`;

  const headers = new Headers();
  req.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (HOP_BY_HOP.has(lower)) return;
    // Vercel a veces mueve/rompe Authorization; reinyectamos si existe.
    headers.set(key, value);
  });

  const authorization =
    req.headers.get("authorization") ||
    req.headers.get("Authorization") ||
    "";
  if (authorization) {
    headers.set("authorization", authorization);
  }

  const init: RequestInit = {
    method: req.method,
    headers,
    redirect: "manual",
    cache: "no-store",
  };

  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = await req.arrayBuffer();
  }

  let upstream: Response;
  try {
    upstream = await fetch(targetUrl, init);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error de red";
    return NextResponse.json(
      { message: `No se pudo contactar el gateway: ${message}` },
      { status: 502 },
    );
  }

  const responseHeaders = new Headers();
  const contentType = upstream.headers.get("content-type");
  if (contentType) responseHeaders.set("content-type", contentType);

  const body = await upstream.arrayBuffer();
  return new NextResponse(body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
export const OPTIONS = proxy;
