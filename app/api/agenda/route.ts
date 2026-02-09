import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const WORKER_BASE = "https://agenda.paulo-barrozosf.workers.dev";

export async function GET(req: Request) {
  const url = new URL(req.url);

  const inicio = url.searchParams.get("inicio") || "";
  const fim = url.searchParams.get("fim") || "";
  const cliente = url.searchParams.get("cliente") ?? "1";
  const max_clientes = url.searchParams.get("max_clientes") ?? "400";

  if (!inicio || !fim) {
    return NextResponse.json(
      { error: "Parâmetros obrigatórios: inicio e fim (YYYY-MM-DD)" },
      { status: 400 }
    );
  }

  const workerUrl = new URL("/agenda", WORKER_BASE);
  workerUrl.searchParams.set("inicio", inicio);
  workerUrl.searchParams.set("fim", fim);
  workerUrl.searchParams.set("cliente", cliente);
  workerUrl.searchParams.set("max_clientes", max_clientes);

  const resp = await fetch(workerUrl.toString(), { cache: "no-store" });
  const text = await resp.text();

  return new NextResponse(text, {
    status: resp.status,
    headers: {
      "content-type":
        resp.headers.get("content-type") || "application/json; charset=utf-8",
      "x-proxy-by": "next-route",
    },
  });
}
