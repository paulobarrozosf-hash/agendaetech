export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const inicio = searchParams.get("inicio");
  const fim = searchParams.get("fim");
  const cliente = searchParams.get("cliente") ?? "0";
  const max_clientes = searchParams.get("max_clientes") ?? "20";

  if (!inicio || !fim) {
    return Response.json({ error: "inicio e fim são obrigatórios" }, { status: 400 });
  }

  const workerUrl = new URL("https://agenda.paulo-barrozosf.workers.dev/agenda");
  workerUrl.searchParams.set("inicio", inicio);
  workerUrl.searchParams.set("fim", fim);
  workerUrl.searchParams.set("cliente", cliente);
  workerUrl.searchParams.set("max_clientes", max_clientes);

  const resp = await fetch(workerUrl.toString(), { cache: "no-store" });
  const text = await resp.text();

  return new Response(text, {
    status: resp.status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}
