import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8080";

async function proxyRequest(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const token = request.cookies.get("procureflow_token")?.value;
  const subPath = params.path.join("/");
  const searchParams = request.nextUrl.search;
  const targetUrl = `${BACKEND_URL}/api/${subPath}${searchParams}`;

  const headers: Record<string, string> = {};

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const idempotencyKey = request.headers.get("idempotency-key");
  if (idempotencyKey) {
    headers["Idempotency-Key"] = idempotencyKey;
  }

  const contentType = request.headers.get("content-type");
  if (contentType) {
    headers["Content-Type"] = contentType;
  }

  let body: BodyInit | undefined = undefined;
  if (
    request.method !== "GET" &&
    request.method !== "HEAD" &&
    request.body !== null
  ) {
    body = await request.text();
  }

  try {
    const backendResponse = await fetch(targetUrl, {
      method: request.method,
      headers,
      body,
    });

    const responseContentType = backendResponse.headers.get("content-type") || "";

    if (backendResponse.status === 204) {
      return new NextResponse(null, { status: 204 });
    }

    if (responseContentType.includes("application/json")) {
      const data = await backendResponse.json();
      return NextResponse.json(data, {
        status: backendResponse.status,
      });
    }

    const blob = await backendResponse.blob();
    const resHeaders = new Headers();
    if (responseContentType) {
      resHeaders.set("Content-Type", responseContentType);
    }
    const contentDisposition = backendResponse.headers.get("content-disposition");
    if (contentDisposition) {
      resHeaders.set("Content-Disposition", contentDisposition);
    }

    return new NextResponse(blob, {
      status: backendResponse.status,
      headers: resHeaders,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to proxy request to backend service. Is the backend running?";
    return NextResponse.json(
      {
        timestamp: new Date().toISOString(),
        status: 502,
        error: "Bad Gateway",
        message,
        path: `/api/${subPath}`,
      },
      { status: 502 }
    );
  }
}

export const GET = proxyRequest;
export const POST = proxyRequest;
export const PUT = proxyRequest;
export const DELETE = proxyRequest;
export const PATCH = proxyRequest;
