import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const GATEWAY_ORIGIN = (
  process.env.GATEWAY_ORIGIN ||
  process.env.NEXT_PUBLIC_GATEWAY_ORIGIN ||
  ""
).replace(/\/$/, "");

/** Vercel a veces elimina Authorization; el cliente también manda este header. */
const AUTH_FALLBACK = "x-centinela-authorization";

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
  const contentType = req.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);
  headers.set("accept", req.headers.get("accept") || "application/json");

  const authorization =
    req.headers.get("authorization") ||
    req.headers.get(AUTH_FALLBACK) ||
    "";
  if (authorization) {
    headers.set("authorization", authorization);
  }

  const init: RequestInit & { duplex?: "half" } = {
    method: req.method,
    headers,
    redirect: "manual",
    cache: "no-store",
  };

  if (req.method !== "GET" && req.method !== "HEAD") {
    const body = await req.arrayBuffer();
    if (body.byteLength > 0) {
      init.body = body;
      // Node fetch exige duplex cuando hay body en algunos runtimes
      init.duplex = "half";
    }
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
  const upstreamType = upstream.headers.get("content-type");
  if (upstreamType) responseHeaders.set("content-type", upstreamType);

  // Ayuda a depurar en Network si llegó token al proxy
  responseHeaders.set(
    "x-centinela-proxy-auth",
    authorization ? "present" : "missing",
  );

  const outBody = await upstream.arrayBuffer();
  return new NextResponse(outBody, {
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
