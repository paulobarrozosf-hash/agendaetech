"use client";

import { useEffect, useMemo, useState } from "react";

type Item = {
  tipo: string;
  id: string;
  contrato?: string | null;
  status?: string | null;
  data?: string | null;
  hora?: string | null;
  motivo?: string | null;
  responsavel?: string | null;
  usuario?: string | null;
  titulo?: string | null;
  cliente?: any; // no seu JSON atual está vindo null; deixei flexível
};

type Dia = {
  data: string;
  porViatura: Record<string, Item[]>;
};

type AgendaResp = {
  range: { inicio: string; fim: string };
  parametros: { cliente: number; max_clientes: number };
  meta: any;
  totais: { os: number; reservas: number };
  viaturas: string[];
  dias: Dia[];
};

function hojeISO() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(dateISO: string, days: number) {
  const d = new Date(dateISO + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function statusColor(status?: string | null) {
  const s = (status || "").toLowerCase();
  if (s.includes("reserv")) return "#F2C811";
  if (s.includes("abert")) return "#22C55E";
  if (s.includes("execu")) return "#FB923C";
  if (s.includes("pend")) return "#EF4444";
  if (s.includes("encerr")) return "#EF4444";
  return "#94A3B8";
}

export default function Page() {
  const [start, setStart] = useState(hojeISO());
  const [days, setDays] = useState(7);
  const [viatura, setViatura] = useState("");
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [cliente, setCliente] = useState("0");

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [data, setData] = useState<AgendaResp | null>(null);

  const fim = useMemo(() => addDays(start, Math.max(0, days - 1)), [start, days]);

  // “flatten” (transforma dias/viaturas em lista de cards)
  const items = useMemo(() => {
    if (!data) return [];
    const out: Array<Item & { _dia: string; _viatura: string }> = [];
    for (const dia of data.dias) {
      for (const v of Object.keys(dia.porViatura || {})) {
        for (const it of dia.porViatura[v] || []) {
          out.push({ ...it, _dia: dia.data, _viatura: v });
        }
      }
    }
    return out;
  }, [data]);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return items
      .filter((it) => (viatura ? it._viatura === viatura : true))
      .filter((it) => {
        if (!status) return true;
        return (it.status || "").toLowerCase().includes(status.toLowerCase());
      })
      .filter((it) => {
        if (!qq) return true;
        const blob = [
          it._dia,
          it._viatura,
          it.id,
          it.contrato,
          it.status,
          it.motivo,
          it.responsavel,
          it.usuario,
          it.titulo,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return blob.includes(qq);
      })
      .sort((a, b) => `${a._dia} ${a.hora || ""}`.localeCompare(`${b._dia} ${b.hora || ""}`));
  }, [items, viatura, status, q]);

  const grouped = useMemo(() => {
    const map = new Map<string, (Item & { _dia: string; _viatura: string })[]>();
    for (const it of filtered) {
      const k = it._dia || "Sem data";
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(it);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered]);

  async function loadAgenda() {
    setLoading(true);
    setErr(null);

    try {
      const qs = new URLSearchParams({
        inicio: start,
        fim,
        cliente: cliente || "0",
      });

      const resp = await fetch(`/api/agenda?${qs.toString()}`, { cache: "no-store" });
      const text = await resp.text();

      if (!resp.ok) throw new Error(text || `HTTP ${resp.status}`);
      setData(JSON.parse(text));
    } catch (e: any) {
      setData(null);
      setErr(e?.message ?? "Falha ao carregar agenda.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAgenda();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main>
      <header className="hdr">
        <div className="title">Agenda</div>

        <div className="controls">
          <input id="start" type="date" value={start} onChange={(e) => setStart(e.target.value)} />

          <select id="days" value={String(days)} onChange={(e) => setDays(Number(e.target.value))}>
            <option value="1">1 dia</option>
            <option value="3">3 dias</option>
            <option value="7">7 dias</option>
            <option value="14">14 dias</option>
          </select>

          <select id="viatura" value={viatura} onChange={(e) => setViatura(e.target.value)}>
            <option value="">Todas</option>
            {(data?.viaturas || ["VT01", "VT02", "VT03", "VT04", "VT05"]).map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>

          <select id="status" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Todos</option>
            <option value="aberta">Aberta</option>
            <option value="execu">Em execução</option>
            <option value="pendente">Pendente</option>
            <option value="encerr">Encerrado</option>
            <option value="reserv">Reservado</option>
          </select>

          <input
            id="q"
            placeholder="Buscar (cliente, contrato, OS...)"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />

          <input
            style={{ width: 90 }}
            title="cliente (0 = todos)"
            placeholder="cliente"
            value={cliente}
            onChange={(e) => setCliente(e.target.value)}
          />

          <button onClick={loadAgenda} disabled={loading}>
            {loading ? "Carregando..." : "Atualizar"}
          </button>
        </div>
      </header>

      <div className="wrap">
        {err && <div className="error">{err}</div>}

        {data && (
          <div className="metaLine">
            Período: <b>{data.range.inicio}</b> → <b>{data.range.fim}</b> • OS: <b>{data.totais.os}</b> •
            Reservas: <b>{data.totais.reservas}</b>
          </div>
        )}

        <div id="grid" className="grid">
          {!grouped.length && !err ? (
            <div className="meta">Sem registros para o filtro informado.</div>
          ) : (
            grouped.map(([day, list]) => (
              <section key={day} className="day">
                <h3>
                  {day} • {list.length} itens
                </h3>

                {list.map((it) => (
                  <div key={`${it.tipo}-${it.id}-${it._viatura}-${it._dia}`} className="card" style={{ borderLeftColor: statusColor(it.status) }}>
                    <div className="row">
                      <div className="strong">
                        ⏰ {it.hora || "--:--"} • {it._viatura} • OS {it.id}
                      </div>
                      <div className="meta">{it.responsavel || ""}</div>
                    </div>

                    <div className="meta">🚦 {it.status || ""} • 📜 {it.contrato || ""}</div>
                    <div style={{ marginTop: 6 }} className="meta">
                      📌 {it.motivo || ""} • 👤 {it.usuario || ""}
                    </div>
                  </div>
                ))}
              </section>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
