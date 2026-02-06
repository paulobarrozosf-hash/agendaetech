import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { inicio, fim, cliente = "0", max_clientes = "20" } = req.query;

  if (!inicio || !fim || typeof inicio !== "string" || typeof fim !== "string") {
    return res.status(400).json({ error: "inicio e fim são obrigatórios" });
  }

  const workerUrl = new URL("https://agenda.paulo-barrozosf.workers.dev/agenda");
  workerUrl.searchParams.set("inicio", inicio);
  workerUrl.searchParams.set("fim", fim);
  workerUrl.searchParams.set("cliente", String(cliente));
  workerUrl.searchParams.set("max_clientes", String(max_clientes));

  const resp = await fetch(workerUrl.toString());
  const text = await resp.text();

  res.status(resp.status);
  res.setHeader("content-type", resp.headers.get("content-type") ?? "application/json; charset=utf-8");
  return res.send(text);
}
