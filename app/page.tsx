"use client";

import { useEffect, useMemo, useState } from "react";

type ClienteEndereco = {
  logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  uf?: string | null;
  cep?: string | null;
  ll?: string | null;
};

type ClienteObj = {
  nome?: string | null;
  telefones?: string[] | null;
  email?: string | null;
  plano?: string | null;
  observacao?: string | null;
  contratoId?: string | null;
  endereco?: ClienteEndereco | null;
};

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

  // vem do Worker enriquecido:
  cliente?: ClienteObj | null;

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
  itens?: Item[];
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
  const cliente = sp.get("cliente") || "1"; // default enriquecido
  const max_clientes = sp.get("max_clientes") || "20";
  const group = (sp.get("group") as "dia" | "viatura") || "dia";
  return { inicio, dias, viatura, status, q, cliente, max_clientes, group };
}

function pushToURL(state: {
  inicio: string;
  dias: number;
  viatura: string;
  status: string;
  q: string;
  cliente: string;
  max_clientes: string;
  group: "dia" | "viatura";
}) {
  const sp = new URLSearchParams();
  sp.set("inicio", state.inicio);
  sp.set("dias", String(state.dias));
  if (state.viatura) sp.set("viatura", state.viatura);
  if (state.status) sp.set("status", state.status);
  if (state.q) sp.set("q", state.q);
  sp.set("cliente", state.cliente);
  sp.set("max_clientes", state.max_clientes);
  sp.set("group", state.group);
  window.history.replaceState(null, "", `${window.location.pathname}?${sp.toString()}`);
}

function fmtEndereco(c?: ClienteObj | null) {
  const e = c?.endereco;
  const linha1 = [e?.logradouro, e?.numero].filter(Boolean).join(", ");
  const linha2 = [e?.bairro, [e?.cidade, e?.uf].filter(Boolean).join("/")].filter(Boolean).join(" — ");
  return { linha1, linha2, cep: e?.cep || "", ll: e?.ll || "" };
}

export default function Page() {
  const initial = useMemo(() => parseFromURL(), []);

  const [inicio, setInicio] = useState(initial?.inicio ?? hojeISO());
  const [dias, setDias] = useState<number>(initial?.dias ?? 7);
  const [viatura, setViatura] = useState(initial?.viatura ?? "");
  const [status, setStatus] = useState(initial?.status ?? "");
  const [q, setQ] = useState(initial?.q ?? "");
  const [clienteFlag, setClienteFlag] = useState(initial?.cliente ?? "1");
  const [maxClientes, setMaxClientes] = useState(initial?.max_clientes ?? "20");
  const [group, setGroup] = useState<"dia" | "viatura">(initial?.group ?? "dia");

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [data, setData] = useState<AgendaResp | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const fim = useMemo(() => addDays(inicio, Math.max(0, dias - 1)), [inicio, dias]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    pushToURL({ inicio, dias, viatura, status, q, cliente: clienteFlag, max_clientes: maxClientes, group });
  }, [inicio, dias, viatura, status, q, clienteFlag, maxClientes, group]);

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
      .filter((it) => (status ? (it.status || "").toLowerCase().includes(status.toLowerCase()) : true))
      .filter((it) => {
        if (!qq) return true;
        const c = it.cliente;
        const e = fmtEndereco(c);
        const blob = [
          it._dia,
          it._viatura,
          it.id,
          it.contrato,
          it.status,
          it.motivo,
          it.usuario,
          c?.nome,
          (c?.telefones || []).join(" "),
          c?.plano,
          e.linha1,
          e.linha2,
          e.cep,
          c?.observacao,
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
        cliente: clienteFlag,
        max_clientes: maxClientes,
      });

      const resp = await fetch(`/api/agenda?${qs.toString()}`, { cache: "no-store" });
      const text = await resp.text();
      if (!resp.ok) throw new Error(text || `HTTP ${resp.status}`);
      setData(JSON.parse(text));
      setLastUpdated(new Date().toLocaleString("pt-BR"));
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
    <div className="app">
      <div className="bgGrid" />
      <div className="bgGlow" />

      <header className="topbar">
        <div className="container topbarInner">
          <div className="brand">
            <img src="/logo.png" alt="Etech" />
            <div>
              <div className="brandTitle">Agenda Operacional</div>
              <div className="brandSub">Etech • SGP</div>
            </div>
          </div>

          <div className="periodCenter">
            <div className="periodLabel">Período</div>
            <div className="chip">
              {inicio} <span className="muted">→</span> {fim}
            </div>
          </div>

          <div className="actionsRight">
            <button className="btn primary" onClick={loadAgenda} disabled={loading}>
              {loading ? "Carregando..." : "Atualizar"}
            </button>
          </div>
        </div>
      </header>

      <div className="container">
        <section className="panel filters">
          <div className="field">
            <label>Início</label>
            <input type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} />
          </div>

          <div className="field">
            <label>Dias</label>
            <select value={dias} onChange={(e) => setDias(Number(e.target.value))}>
              {[1, 3, 5, 7, 10, 14].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label>Viatura</label>
            <select value={viatura} onChange={(e) => setViatura(e.target.value)}>
              <option value="">Todas</option>
              {(data?.viaturas || ["VT01", "VT02", "VT03", "VT04", "VT05"]).map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
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

          <div className="field">
            <label>Cliente (enriquecer)</label>
            <select value={clienteFlag} onChange={(e) => setClienteFlag(e.target.value)}>
              <option value="1">Sim</option>
              <option value="0">Não</option>
            </select>
          </div>

          <div className="field">
            <label>Max clientes</label>
            <input value={maxClientes} onChange={(e) => setMaxClientes(e.target.value)} />
          </div>

          <div className="field">
            <label>Agrupar</label>
            <select value={group} onChange={(e) => setGroup(e.target.value as any)}>
              <option value="dia">Por dia</option>
              <option value="viatura">Por viatura</option>
            </select>
          </div>

          <div className="field grow">
            <label>Busca</label>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cliente, contrato, endereço, plano..." />
          </div>
        </section>

        {err && (
          <section className="panel error">
            <div className="errorTitle">Erro</div>
            <div className="errorMsg">{err}</div>
          </section>
        )}

        {data && (
          <section className="stats">
            <div className="stat">
              <div className="statLabel">OS</div>
              <div className="statValue">{data.totais?.os ?? 0}</div>
            </div>
            <div className="stat">
              <div className="statLabel">Contratos únicos</div>
              <div className="statValue">{data.meta?.contratos_unicos_total ?? 0}</div>
            </div>
            <div className="stat">
              <div className="statLabel">Consultados</div>
              <div className="statValue">{data.meta?.contratos_consultados ?? 0}</div>
            </div>
            <div className="stat">
              <div className="statLabel">Atualização</div>
              <div className="statValue" style={{ fontSize: 14, lineHeight: "20px" }}>
                {lastUpdated || "—"}
              </div>
            </div>
          </section>
        )}

        <main className="content">
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
                    const c = it.cliente;
                    const e = fmtEndereco(c);
                    const tel = c?.telefones?.[0] || "";
                    return (
                      <article key={`${it.tipo}-${it.id}-${it._viatura}-${it._dia}`} className={cx("card", `tone-${tone}`)}>
                        <div className="cardTop">
                          <div className="time">{fmtHour(it.hora)}</div>
                          <div className="badges">
                            <span className="badge">{it._viatura}</span>
                            <span className="badge ghost">{it.tipo?.toUpperCase?.() || "ITEM"}</span>
                          </div>
                        </div>

                        <div className="cardTitle">
                          OS {it.id} <span className="muted">•</span> <span className="muted">{it.status || "—"}</span>
                        </div>

                        <div className="cardGrid">
                          <div className="cardBlock">
                            <div className="blockTitle">Cliente</div>

                            <div className="metaRow">
                              <span className="k">Nome</span>
                              <span className="vWrap">{c?.nome || "—"}</span>
                            </div>

                            <div className="metaRow">
                              <span className="k">Contato</span>
                              <span className="v">{tel || "—"}</span>
                            </div>

                            <div className="metaRow">
                              <span className="k">Plano</span>
                              <span className="vWrap">{c?.plano || "—"}</span>
                            </div>

                            <div className="metaRow">
                              <span className="k">Obs.</span>
                              <span className="vWrap">{c?.observacao || "—"}</span>
                            </div>

                            <div className="metaRow">
                              <span className="k">Endereço</span>
                              <span className="vWrap">
                                {[e.linha1, e.linha2].filter(Boolean).join("\n") || "—"}
                              </span>
                            </div>

                            <div className="metaRow">
                              <span className="k">CEP</span>
                              <span className="v">{e.cep || "—"}</span>
                            </div>
                          </div>

                          <div className="cardBlock">
                            <div className="blockTitle">Serviço</div>

                            <div className="metaRow">
                              <span className="k">Contrato</span>
                              <span className="v">{it.contrato || "—"}</span>
                            </div>

                            <div className="metaRow">
                              <span className="k">Motivo</span>
                              <span className="vWrap">{it.motivo || "—"}</span>
                            </div>

                            <div className="metaRow">
                              <span className="k">Usuário</span>
                              <span className="v">{it.usuario || "—"}</span>
                            </div>

                            <div className="metaRow">
                              <span className="k">Resp.</span>
                              <span className="v">{it.responsavel || "—"}</span>
                            </div>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>

          {!loading && !err && grouped.length === 0 && (
            <section className="panel empty">
              <div className="emptyTitle">Sem registros</div>
              <div className="muted small">Nenhum item para os filtros informados.</div>
            </section>
          )}
        </main>

        <footer className="footer">Desenvolvido por Paulo Sales.</footer>
      </div>
    </div>
  );
}
