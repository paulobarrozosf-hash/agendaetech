import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const WORKER_BASE = "https://agenda.paulo-barrozosf.workers.dev";

export async function GET(req: Request) {
  const url = new URL(req.url);

  const inicio = url.searchParams.get("inicio") || "";
  const fim = url.searchParams.get("fim") || "";
  const cliente = url.searchParams.get("cliente") ?? "1";

  // ✅ REMOVIDO: max_clientes não é mais necessário
  // O worker agora busca TODOS os clientes quando cliente=1

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

  // ✅ REMOVIDO: max_clientes não precisa mais ser enviado
  // workerUrl.searchParams.set("max_clientes", max_clientes);

  try {
    const resp = await fetch(workerUrl.toString(), { 
      cache: "no-store",
      // ✅ OPCIONAL: Adicionar timeout para evitar que o Next.js fique esperando indefinidamente
      signal: AbortSignal.timeout(50000) // 50 segundos (ajuste conforme necessário)
    });

    if (!resp.ok) {
      // ✅ Melhor tratamento de erros
      const errorText = await resp.text();
      console.error(`[WORKER ERROR] Status ${resp.status}: ${errorText}`);
      return NextResponse.json(
        { error: `Worker retornou erro: ${resp.status}`, details: errorText },
        { status: resp.status }
      );
    }

    const text = await resp.text();

    return new NextResponse(text, {
      status: resp.status,
      headers: {
        "content-type":
          resp.headers.get("content-type") || "application/json; charset=utf-8",
        "x-proxy-by": "next-route",
      },
    });
  } catch (error) {
    // ✅ Tratamento de erros de rede ou timeout
    console.error(`[ROUTE ERROR] Falha ao chamar worker:`, error);
    return NextResponse.json(
      { 
        error: "Falha ao comunicar com o worker", 
        details: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
}
