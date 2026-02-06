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
  contratoId?: string | number | null;
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
  meta?: {
    contratos_unicos_total?: number;
    contratos_consultados?: number;
    aviso?: string | null;
  };
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

  const cliente = sp.get("cliente") || "1";
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

function enderecoFormatado(c?: ClienteObj | null) {
  const e = c?.endereco;
  const linha1 = [e?.logradouro, e?.numero].filter(Boolean).join(", ");
  const cidadeUf = [e?.cidade, e?.uf].filter(Boolean).join("/");
  const linha2 = [e?.bairro, cidadeUf].filter(Boolean).join(" — ");
  const compl = e?.complemento ? String(e.complemento) : "";
  return {
    linha1: linha1 || "",
    linha2: linha2 || "",
    complemento: compl || "",
    cep: e?.cep || "",
    ll: e?.ll || "",
  };
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
  const [lastUpdated, setLastUpdated] = useState<string>("—");

  const fim = useMemo(() => addDays(inicio, Math.max(0, dias - 1)), [inicio, dias]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    pushToURL({
      inicio,
      dias,
      viatura,
      status,
      q,
      cliente: clienteFlag,
      max_clientes: maxClientes,
      group,
    });
  }, [inicio, dias, viatura, status, q, clienteFlag, maxClientes, group]);

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

      const j = JSON.parse(text) as AgendaResp;
      setData(j);
      setLastUpdated(new Date().toLocaleString("pt-BR"));
    } catch (e: any) {
      setData(null);
      setErr(e?.message || "Erro ao carregar agenda.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAgenda();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        const e = enderecoFormatado(c);
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
          c?.email,
          c?.plano,
          e.linha1,
          e.linha2,
          e.complemento,
          e.cep,
          e.ll,
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

  return (
    <div className="app">
      <div className="bgGrid" />
      <div className="bgGlow" />

      <header className="topbar">
        <div className="container topbarInner">
          <div className="brand">
            <div className="brandLogo">E</div>
            <div>
              <div className="brandTitle">Agenda Etech</div>
              <div className="brandSub">SGP • Viaturas</div>
            </div>
          </div>

          <div className="periodCenter">
            <div className="periodLabel">Período</div>
            <div className="chip">
              {inicio} <span className="muted">→</span> {fim}
            </div>
            {data?.meta?.aviso ? <div className="warn">{data.meta.aviso}</div> : null}
          </div>

          <div className="actionsRight">
            <button className="btn primary" onClick={loadAgenda} disabled={loading}>
              {loading ? "Carregando..." : "Atualizar"}
            </button>
            <div className="chip small">Atualizado: {lastUpdated}</div>
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
            <label>Cliente</label>
            <select value={clienteFlag} onChange={(e) => setClienteFlag(e.target.value)}>
              <option value="1">Enriquecer (Sim)</option>
              <option value="0">Somente O.S (Não)</option>
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
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cliente, contrato, endereço, plano..."
            />
          </div>
        </section>

        {err ? (
          <section className="panel error">
            <div className="errorTitle">Erro</div>
            <div className="errorMsg">{err}</div>
          </section>
        ) : null}

        {data ? (
          <section className="stats">
            <div className="stat">
              <div className="statLabel">O.S</div>
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
              <div className="statLabel">Max clientes</div>
              <div className="statValue">{data.parametros?.max_clientes ?? 0}</div>
            </div>
          </section>
        ) : null}

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
                    const c = it.cliente;
                    const e = c?.endereco;
                    const end = enderecoFormatado(c);

                    const tel1 = (c?.telefones && c.telefones[0]) || "";
                    const tel2 = (c?.telefones && c.telefones[1]) || "";

                    return (
                      <article
                        key={`${it.tipo}-${it.id}-${it._viatura}-${it._dia}`}
                        className={cx("card", `tone-${statusTone(it.status)}`)}
                      >
                        <div className="cardHeader">
                          <div className="cardTime">{fmtHour(it.hora)}</div>
                          <div className="cardBadges">
                            <span className="badge">{it._viatura}</span>
                            <span className="badge ghost">{it.status || "—"}</span>
                            <span className="badge ghost">Contrato {it.contrato || "—"}</span>
                          </div>
                        </div>

                        <div className="cardMainTitle">
                          {it.motivo || "—"} <span className="muted">•</span> OS {it.id}
                        </div>

                        <div className="cardGrid2">
                          <div className="cardSection">
                            <div className="sectionTitle">Cliente</div>

                            <div className="row">
                              <span className="k">Nome</span>
                              <span className="vWrap">{c?.nome || "—"}</span>
                            </div>

                            <div className="row">
                              <span className="k">Contato</span>
                              <span className="vWrap">
                                {[tel1, tel2].filter(Boolean).join(" / ") || "—"}
                              </span>
                            </div>

                            <div className="row">
                              <span className="k">Email</span>
                              <span className="vWrap">{c?.email || "—"}</span>
                            </div>

                            <div className="row">
                              <span className="k">Plano</span>
                              <span className="vWrap">{c?.plano || "—"}</span>
                            </div>

                            <div className="row">
                              <span className="k">Endereço</span>
                              <span className="vWrap">
                                {([end.linha1, end.linha2, end.complemento].filter(Boolean).join("\n") || "—") as any}
                              </span>
                            </div>

                            <div className="row">
                              <span className="k">CEP</span>
                              <span className="v">{e?.cep || "—"}</span>
                            </div>

                            <div className="row">
                              <span className="k">LL</span>
                              <span className="vWrap">{e?.ll || "—"}</span>
                            </div>
                          </div>

                          <div className="cardSection">
                            <div className="sectionTitle">Serviço</div>

                            <div className="row">
                              <span className="k">Status</span>
                              <span className="v">{it.status || "—"}</span>
                            </div>

                            <div className="row">
                              <span className="k">Usuário</span>
                              <span className="v">{it.usuario || "—"}</span>
                            </div>

                            <div className="row">
                              <span className="k">Equipe</span>
                              <span className="v">{it.responsavel || "—"}</span>
                            </div>

                            <div className="row">
                              <span className="k">Contrato</span>
                              <span className="v">{it.contrato || "—"}</span>
                            </div>

                            <div className="row">
                              <span className="k">Contrato status</span>
                              <span className="vWrap">{it.contrato_status || "—"}</span>
                            </div>

                            <div className="row">
                              <span className="k">Obs. cliente</span>
                              <span className="vWrap">{c?.observacao || "—"}</span>
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

          {!loading && !err && grouped.length === 0 ? (
            <section className="panel empty">
              <div className="emptyTitle">Sem registros</div>
              <div className="muted small">Nenhum item para os filtros informados.</div>
            </section>
          ) : null}
        </main>

        <footer className="footer">
          <div className="muted small">Desenvolvido por Paulo Sales.</div>
        </footer>
      </div>
    </div>
  );
}
