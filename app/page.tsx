"use client";

import { useEffect, useMemo, useState } from "react";

type Item = {
  tipo: string;
  id: string;
  contrato?: string | null;
  contrato_status?: string | null;
  status_id?: number | null;
  status?: string | null;
  data?: string | null;
  hora?: string | null;
  motivo?: string | null;
  responsavel?: string | null;
  usuario?: string | null;
  cliente?: any; // no seu JSON atual vem null; deixei flexível
  titulo?: string | null;
  inicioISO?: string | null;
  fimISO?: string | null;
};

type Dia = {
  data: string;
  porViatura: Record<string, Item[]>;
};

type AgendaResp = {
  range: { inicio: string; fim: string };
  parametros: { cliente: number; max_clientes: number };
  meta?: { contratos_unicos_total?: number; contratos_consultados?: number; aviso?: string | null };
  totais: { os: number; reservas: number };
  viaturas: string[];
  dias: Dia[];
};

type FlatItem = Item & { _dia: string; _viatura: string };

function hojeISO() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(dateISO: string, days: number) {
  const d = new Date(dateISO + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function statusTone(status?: string | null) {
  const s = (status || "").toLowerCase();
  if (s.includes("reserv")) return "gold";
  if (s.includes("abert")) return "green";
  if (s.includes("execu")) return "orange";
  if (s.includes("pend")) return "red";
  if (s.includes("encerr")) return "muted";
  return "muted";
}

function fmtHour(h?: string | null) {
  if (!h) return "--:--";
  return h.slice(0, 5);
}

function parseFromURL() {
  if (typeof window === "undefined") return null;
  const sp = new URLSearchParams(window.location.search);

  const inicio = sp.get("inicio") || hojeISO();
  const dias = Number(sp.get("dias") || "7") || 7;
  const viatura = sp.get("viatura") || "";
  const status = sp.get("status") || "";
  const q = sp.get("q") || "";
  const cliente = sp.get("cliente") || "0";
  const group = (sp.get("group") as "dia" | "viatura") || "dia";

  return { inicio, dias, viatura, status, q, cliente, group };
}

function pushToURL(state: {
  inicio: string;
  dias: number;
  viatura: string;
  status: string;
  q: string;
  cliente: string;
  group: "dia" | "viatura";
}) {
  const sp = new URLSearchParams();
  sp.set("inicio", state.inicio);
  sp.set("dias", String(state.dias));
  if (state.viatura) sp.set("viatura", state.viatura);
  if (state.status) sp.set("status", state.status);
  if (state.q) sp.set("q", state.q);
  if (state.cliente) sp.set("cliente", state.cliente);
  sp.set("group", state.group);

  const url = `${window.location.pathname}?${sp.toString()}`;
  window.history.replaceState(null, "", url);
}

export default function Page() {
  const initial = useMemo(() => parseFromURL(), []);
  const [inicio, setInicio] = useState(initial?.inicio ?? hojeISO());
  const [dias, setDias] = useState<number>(initial?.dias ?? 7);
  const [viatura, setViatura] = useState(initial?.viatura ?? "");
  const [status, setStatus] = useState(initial?.status ?? "");
  const [q, setQ] = useState(initial?.q ?? "");
  const [cliente, setCliente] = useState(initial?.cliente ?? "0");
  const [group, setGroup] = useState<"dia" | "viatura">(initial?.group ?? "dia");

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [data, setData] = useState<AgendaResp | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const fim = useMemo(() => addDays(inicio, Math.max(0, dias - 1)), [inicio, dias]);

  // Atualiza URL quando filtros mudarem (compartilhável)
  useEffect(() => {
    if (typeof window === "undefined") return;
    pushToURL({ inicio, dias, viatura, status, q, cliente, group });
  }, [inicio, dias, viatura, status, q, cliente, group]);

  const flatItems: FlatItem[] = useMemo(() => {
    if (!data) return [];
    const out: FlatItem[] = [];
    for (const dia of data.dias || []) {
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
    return flatItems
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
          it.contrato_status,
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
  }, [flatItems, viatura, status, q]);

  const grouped = useMemo(() => {
    const map = new Map<string, FlatItem[]>();
    for (const it of filtered) {
      const key = group === "dia" ? it._dia || "Sem data" : it._viatura || "Sem viatura";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(it);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered, group]);

  async function loadAgenda() {
    setLoading(true);
    setErr(null);

    try {
      const qs = new URLSearchParams({
        inicio,
        fim,
        cliente: cliente || "0",
      });

      const resp = await fetch(`/api/agenda?${qs.toString()}`, { cache: "no-store" });
      const text = await resp.text();

      if (!resp.ok) throw new Error(text || `HTTP ${resp.status}`);

      const parsed = JSON.parse(text);
      setData(parsed);
      setLastUpdated(new Date().toLocaleString("pt-BR"));
    } catch (e: any) {
      setData(null);
      setErr(e?.message ?? "Falha ao carregar agenda.");
    } finally {
      setLoading(false);
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setLastUpdated((prev) => prev ? `${prev} • link copiado` : "link copiado");
    } catch {
      setLastUpdated((prev) => prev ? `${prev} • não consegui copiar` : "não consegui copiar");
    }
  }

  useEffect(() => {
    loadAgenda();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resumo = useMemo(() => {
    if (!data) return null;
    return {
      os: data.totais?.os ?? 0,
      reservas: data.totais?.reservas ?? 0,
      viaturas: data.viaturas?.length ?? 0,
      itens: flatItems.length,
    };
  }, [data, flatItems.length]);

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <div className="logo" />
          <div>
            <div className="title">Agenda</div>
            <div className="subtitle">
              {data ? (
                <>
                  <span className="chip">Período: {data.range.inicio} → {data.range.fim}</span>
                  <span className="dot">•</span>
                  <span className="muted">Atualizado: {lastUpdated || "—"}</span>
                </>
              ) : (
                <span className="muted">Conectando…</span>
              )}
            </div>
          </div>
        </div>

        <div className="actions">
          <button className="btn ghost" onClick={copyLink} type="button">Copiar link</button>
          <button className="btn" onClick={loadAgenda} disabled={loading} type="button">
            {loading ? "Atualizando…" : "Atualizar"}
          </button>
        </div>
      </header>

      <section className="panel filters">
        <div className="field">
          <label>Início</label>
          <input type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} />
        </div>

        <div className="field">
          <label>Dias</label>
          <select value={String(dias)} onChange={(e) => setDias(Number(e.target.value))}>
            <option value="1">1</option>
            <option value="3">3</option>
            <option value="7">7</option>
            <option value="14">14</option>
          </select>
        </div>

        <div className="field">
          <label>Cliente</label>
          <input value={cliente} onChange={(e) => setCliente(e.target.value)} placeholder="0 = todos" />
        </div>

        <div className="field">
          <label>Viatura</label>
          <select value={viatura} onChange={(e) => setViatura(e.target.value)}>
            <option value="">Todas</option>
            {(data?.viaturas || ["VT01", "VT02", "VT03", "VT04", "VT05"]).map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </div>

        <div className="field">
          <label>Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Todos</option>
            <option value="abert">Aberta</option>
            <option value="execu">Em execução</option>
            <option value="pend">Pendente</option>
            <option value="encerr">Encerrada</option>
            <option value="reserv">Reservado</option>
          </select>
        </div>

        <div className="field grow">
          <label>Busca</label>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="OS, contrato, motivo, usuário…" />
        </div>

        <div className="field">
          <label>Agrupar</label>
          <select value={group} onChange={(e) => setGroup(e.target.value as any)}>
            <option value="dia">Por dia</option>
            <option value="viatura">Por viatura</option>
          </select>
        </div>
      </section>

      {err && (
        <section className="panel error">
          <div className="errorTitle">Erro ao carregar</div>
          <div className="errorMsg">{err}</div>
          <div className="muted small">
            Dica: teste direto a API em <code>/api/agenda?inicio=YYYY-MM-DD&fim=YYYY-MM-DD&cliente=0</code>
          </div>
        </section>
      )}

      {resumo && (
        <section className="stats">
          <div className="stat">
            <div className="statLabel">OS</div>
            <div className="statValue">{resumo.os}</div>
          </div>
          <div className="stat">
            <div className="statLabel">Reservas</div>
            <div className="statValue">{resumo.reservas}</div>
          </div>
          <div className="stat">
            <div className="statLabel">Viaturas</div>
            <div className="statValue">{resumo.viaturas}</div>
          </div>
          <div className="stat">
            <div className="statLabel">Itens</div>
            <div className="statValue">{resumo.itens}</div>
          </div>
        </section>
      )}

      <main className="content">
        {!loading && !err && grouped.length === 0 ? (
          <section className="panel empty">
            <div className="emptyTitle">Nada por aqui</div>
            <div className="muted">Sem registros para o filtro informado.</div>
          </section>
        ) : (
          <div className={cx("grid", group === "dia" && "gridDays")}>
            {grouped.map(([key, list]) => (
              <section key={key} className="col">
                <div className="colHead">
                  <div className="colTitle">{key}</div>
                  <div className="chip">{list.length} itens</div>
                </div>

                <div className="cards">
                  {list.map((it) => {
                    const tone = statusTone(it.status);
                    return (
                      <article
                        key={`${it.tipo}-${it.id}-${it._viatura}-${it._dia}`}
                        className={cx("card", `tone-${tone}`)}
                      >
                        <div className="cardTop">
                          <div className="time">{fmtHour(it.hora)}</div>
                          <div className="badges">
                            <span className="badge">{it._viatura}</span>
                            <span className="badge ghost">{it.tipo?.toUpperCase?.() || "ITEM"}</span>
                          </div>
                        </div>

                        <div className="cardTitle">
                          OS {it.id} <span className="muted">•</span>{" "}
                          <span className="muted">{it.status || "—"}</span>
                        </div>
                          <div className="metaRow">
                            <span className="k">Contrato</span>
                            <span className="v">{it.contrato || "—"}</span>
                          </div>
                        
                          <div className="metaRow">
                            <span className="k">Tipo</span>
                            <span className="v">{(it.tipo || "—").toString()}</span>
                          </div>
                        
                          <div className="metaRow">
                            <span className="k">Motivo</span>
                            <span className="v">{it.motivo || "—"}</span>
                          </div>
                        
                          <div className="metaRow">
                            <span className="k">Usuário</span>
                            <span className="v">{it.usuario || "—"}</span>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>

      <footer className="footer">
        <div className="muted small">
          Endpoint: <code>/api/agenda</code> • Vercel → Cloudflare Worker
        </div>
      </footer>
    </div>
  );
}
