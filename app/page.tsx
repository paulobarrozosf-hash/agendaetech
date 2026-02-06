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
  cliente?: any;
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
};

type FlatItem = Item & { _dia: string; _viatura: string };

type Reserva = {
  id: string;
  data: string; // YYYY-MM-DD
  hora: string; // HH:mm
  viatura: string;
  cliente: string;
  servico: string;
  motivo: string;
  observacoes: string;
  criadoEm: string; // ISO
};

const RESERVAS_KEY = "etech_reservas_v1";

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
  const tab = (sp.get("tab") as "agenda" | "reservas") || "agenda";

  return { inicio, dias, viatura, status, q, cliente, group, tab };
}

function pushToURL(state: {
  inicio: string;
  dias: number;
  viatura: string;
  status: string;
  q: string;
  cliente: string;
  group: "dia" | "viatura";
  tab: "agenda" | "reservas";
}) {
  const sp = new URLSearchParams();
  sp.set("inicio", state.inicio);
  sp.set("dias", String(state.dias));
  if (state.viatura) sp.set("viatura", state.viatura);
  if (state.status) sp.set("status", state.status);
  if (state.q) sp.set("q", state.q);
  if (state.cliente) sp.set("cliente", state.cliente);
  sp.set("group", state.group);
  sp.set("tab", state.tab);

  const url = `${window.location.pathname}?${sp.toString()}`;
  window.history.replaceState(null, "", url);
}

function loadReservas(): Reserva[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RESERVAS_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr;
  } catch {
    return [];
  }
}

function saveReservas(reservas: Reserva[]) {
  localStorage.setItem(RESERVAS_KEY, JSON.stringify(reservas));
}

export default function Page() {
  const initial = useMemo(() => parseFromURL(), []);

  const [tab, setTab] = useState<"agenda" | "reservas">(initial?.tab ?? "agenda");

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

  // Reservas (MVP local)
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [rData, setRData] = useState(hojeISO());
  const [rHora, setRHora] = useState("08:00");
  const [rViatura, setRViatura] = useState("");
  const [rCliente, setRCliente] = useState("");
  const [rServico, setRServico] = useState("");
  const [rMotivo, setRMotivo] = useState("");
  const [rObs, setRObs] = useState("");

  const fim = useMemo(() => addDays(inicio, Math.max(0, dias - 1)), [inicio, dias]);

  // Atualiza URL quando filtros mudarem (compartilhável)
  useEffect(() => {
    if (typeof window === "undefined") return;
    pushToURL({ inicio, dias, viatura, status, q, cliente, group, tab });
  }, [inicio, dias, viatura, status, q, cliente, group, tab]);

  // Carrega reservas do localStorage
  useEffect(() => {
    setReservas(loadReservas());
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
          it.tipo,
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
      setLastUpdated((prev) => (prev ? `${prev} • link copiado` : "link copiado"));
    } catch {
      setLastUpdated((prev) => (prev ? `${prev} • não consegui copiar` : "não consegui copiar"));
    }
  }

  function criarReserva() {
    // validações básicas
    if (!rData) return alert("Informe a data.");
    if (!rHora) return alert("Informe a hora.");
    if (!rViatura) return alert("Selecione a viatura.");
    if (!rCliente.trim()) return alert("Informe o cliente.");
    if (!rServico.trim()) return alert("Informe o tipo de serviço.");

    const nova: Reserva = {
      id: (typeof crypto !== "undefined" && "randomUUID" in crypto) ? crypto.randomUUID() : String(Date.now()),
      data: rData,
      hora: rHora,
      viatura: rViatura,
      cliente: rCliente.trim(),
      servico: rServico.trim(),
      motivo: rMotivo.trim(),
      observacoes: rObs.trim(),
      criadoEm: new Date().toISOString(),
    };

    const next = [nova, ...reservas].sort((a, b) =>
      `${a.data} ${a.hora}`.localeCompare(`${b.data} ${b.hora}`)
    );
    setReservas(next);
    saveReservas(next);

    // limpa alguns campos
    setRCliente("");
    setRServico("");
    setRMotivo("");
    setRObs("");
    alert("Reserva criada (salva localmente).");
  }

  function removerReserva(id: string) {
    const next = reservas.filter((r) => r.id !== id);
    setReservas(next);
    saveReservas(next);
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

  const periodoText = data ? `${data.range.inicio} → ${data.range.fim}` : "—";

  return (
    <div className="app">
      <div className="bgGrid" />
      <div className="bgGlow" />

      <header className="topbar">
        <div className="container topbarInner">
          {/* Left */}
          <div className="brand">
            <img src="/logo.png" alt="Etech" />
            <div>
              <div className="brandTitle">E-Tech Informática Telecom • Agenda</div>
              <div className="brandSub">
                <span className="muted">Atualizado: {lastUpdated || "—"}</span>
              </div>
            </div>
          </div>

          {/* Center */}
          <div className="periodCenter">
            <div className="periodLabel">Período</div>
            <div className="chip">{periodoText}</div>
          </div>

          {/* Right */}
          <div className="actionsRight">
            <button className="btn ghost" onClick={copyLink} type="button">
              Copiar link
            </button>
            <button className="btn primary" onClick={loadAgenda} disabled={loading} type="button">
              {loading ? "Atualizando…" : "Atualizar"}
            </button>
          </div>
        </div>
      </header>

      <div className="container">
        {/* Tabs */}
        <div className="tabs">
          <button
            className={cx("tab", tab === "agenda" && "tabActive")}
            onClick={() => setTab("agenda")}
            type="button"
          >
            Agenda
          </button>
          <button
            className={cx("tab", tab === "reservas" && "tabActive")}
            onClick={() => setTab("reservas")}
            type="button"
          >
            Reservas
          </button>
        </div>

        {tab === "agenda" && (
          <>
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

                              {/* METAS com espaçamento correto */}
                              <div className="cardMeta">
                                <div className="metaRow">
                                  <span className="k">Contrato</span>
                                  <span className="v">{it.contrato || "—"}</span>
                                </div>

                                <div className="metaRow">
                                  <span className="k">Tipo de serviço</span>
                                  <span className="vWrap">{(it.tipo || "—").toString()}</span>
                                </div>

                                <div className="metaRow">
                                  <span className="k">Motivo</span>
                                  <span className="vWrap">{it.motivo || "—"}</span>
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
          </>
        )}

        {tab === "reservas" && (
          <main className="content">
            <section className="panel reservaPanel">
              <div className="reservaHeader">
                <div>
                  <div className="reservaTitle">Criar reserva</div>
                  <div className="muted small">
                    Neste MVP, as reservas são salvas no navegador (localStorage).
                  </div>
                </div>
              </div>

              <div className="formGrid">
                <div className="field">
                  <label>Data</label>
                  <input type="date" value={rData} onChange={(e) => setRData(e.target.value)} />
                </div>

                <div className="field">
                  <label>Hora</label>
                  <input type="time" value={rHora} onChange={(e) => setRHora(e.target.value)} />
                </div>

                <div className="field">
                  <label>Viatura</label>
                  <select value={rViatura} onChange={(e) => setRViatura(e.target.value)}>
                    <option value="">Selecione</option>
                    {(data?.viaturas || ["VT01", "VT02", "VT03", "VT04", "VT05"]).map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="field grow" style={{ gridColumn: "1 / -1" }}>
                  <label>Cliente</label>
                  <input value={rCliente} onChange={(e) => setRCliente(e.target.value)} placeholder="Nome/ID do cliente" />
                </div>

                <div className="field grow" style={{ gridColumn: "1 / -1" }}>
                  <label>Tipo de serviço</label>
                  <input value={rServico} onChange={(e) => setRServico(e.target.value)} placeholder="Instalação, manutenção, visita técnica..." />
                </div>

                <div className="field grow" style={{ gridColumn: "1 / -1" }}>
                  <label>Motivo</label>
                  <input value={rMotivo} onChange={(e) => setRMotivo(e.target.value)} placeholder="Ex.: Instalação" />
                </div>

                <div className="field grow" style={{ gridColumn: "1 / -1" }}>
                  <label>Observações</label>
                  <textarea value={rObs} onChange={(e) => setRObs(e.target.value)} />
                </div>
              </div>

              <div className="reservaActions">
                <button className="btn primary" type="button" onClick={criarReserva}>
                  Salvar reserva
                </button>
                <button
                  className="btn ghost"
                  type="button"
                  onClick={() => {
                    setRCliente("");
                    setRServico("");
                    setRMotivo("");
                    setRObs("");
                  }}
                >
                  Limpar
                </button>
              </div>
            </section>

            <section className="panel reservaList">
              <div className="reservaTitle">Reservas criadas</div>

              {reservas.length === 0 ? (
                <div className="muted">Nenhuma reserva criada ainda.</div>
              ) : (
                <div className="reservaItems">
                  {reservas.map((r) => (
                    <div key={r.id} className="reservaItem">
                      <div className="reservaItemMain">
                        <div className="reservaLine1">
                          <span className="chip">{r.data}</span>
                          <span className="chip">{r.hora}</span>
                          <span className="chip">{r.viatura}</span>
                        </div>
                        <div className="reservaLine2">
                          <b>{r.cliente}</b> — <span className="muted">{r.servico}</span>
                        </div>
                        {(r.motivo || r.observacoes) && (
                          <div className="reservaLine3">
                            {r.motivo && (
                              <>
                                <span className="muted">Motivo:</span> <span>{r.motivo}</span>
                              </>
                            )}
                            {r.motivo && r.observacoes ? <span className="sep" /> : null}
                            {r.observacoes && (
                              <>
                                <span className="muted">Obs:</span> <span>{r.observacoes}</span>
                              </>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="reservaItemActions">
                        <button className="btn danger" type="button" onClick={() => removerReserva(r.id)}>
                          Excluir
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </main>
        )}

        <footer className="footer">
          <div className="muted small">
            Endpoint: <code>/api/agenda</code> • Vercel → Cloudflare Worker
          </div>
        </footer>
      </div>
    </div>
  );
}
