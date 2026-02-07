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
  tipo: string; // os | reserva_local
  id: string;
  contrato?: string | null;
  status?: string | null;
  data?: string | null; // YYYY-MM-DD
  hora?: string | null; // HH:mm
  motivo?: string | null;
  responsavel?: string | null; // VT01...
  usuario?: string | null;
  cliente?: ClienteObj | null;
  _internal?: any;
};

type Dia = { data: string; porViatura: Record<string, Item[]> };
type AgendaResp = {
  viaturas: string[];
  dias: Dia[];
  totais?: { os?: number; reservas?: number };
  meta?: any;
};

type FlatItem = Item & { _dia: string; _viatura: string };

type TabKey = "agenda" | "reservar" | "instalacao";

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
function fmtHour(h?: string | null) {
  if (!h) return "--:--";
  return h.slice(0, 5);
}
function safeText(x: any) {
  const s = (x ?? "").toString().trim();
  return s.length ? s : "—";
}
function statusTone(status?: string | null, tipo?: string | null) {
  if (tipo === "reserva_local") return "gold";
  const s = (status || "").toLowerCase();
  if (s.includes("reserv")) return "gold";
  if (s.includes("abert")) return "green";
  if (s.includes("execu")) return "orange";
  if (s.includes("pend")) return "red";
  if (s.includes("encerr")) return "muted";
  return "muted";
}
function clienteEnderecoLinha(c?: ClienteObj | null) {
  const e = c?.endereco;
  const l1 = [e?.logradouro, e?.numero].filter(Boolean).join(", ");
  const cidadeUf = [e?.cidade, e?.uf].filter(Boolean).join("/");
  const l2 = [e?.bairro, cidadeUf].filter(Boolean).join(" — ");
  const compl = e?.complemento ? String(e.complemento) : "";
  return [l1, l2, compl].filter(Boolean).join(" • ");
}
function phonesLinha(c?: ClienteObj | null) {
  const t = (c?.telefones || []).filter(Boolean);
  return [t[0], t[1], t[2]].filter(Boolean).join(" / ");
}

function makeLocalId() {
  return "L" + Math.random().toString(36).slice(2, 9) + Date.now().toString(36);
}

export default function Page() {
  const [tab, setTab] = useState<TabKey>("agenda");

  // Agenda filtros
  const [inicio, setInicio] = useState(hojeISO());
  const [dias, setDias] = useState(14);
  const [viatura, setViatura] = useState("");
  const [q, setQ] = useState("");
  const [maxClientes, setMaxClientes] = useState("200");

  const fim = useMemo(() => addDays(inicio, Math.max(0, dias - 1)), [inicio, dias]);

  // Dados do Worker
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [data, setData] = useState<AgendaResp | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>("—");

  // Reservas locais (somente visual)
  const [localReserves, setLocalReserves] = useState<Item[]>([]);

  // Modal
  const [selected, setSelected] = useState<FlatItem | null>(null);

  // Form Reserva (aba)
  const [rData, setRData] = useState(hojeISO());
  const [rHora, setRHora] = useState("08:00");
  const [rViatura, setRViatura] = useState("VT01");
  const [rContrato, setRContrato] = useState("7333");
  const [rMotivo, setRMotivo] = useState("Mudança de endereço");
  const [rUsuario, setRUsuario] = useState("weslley");
  const [rResp, setRResp] = useState("vt01");
  const [rClienteNome, setRClienteNome] = useState("");
  const [rEndereco, setREndereco] = useState("");
  const [rContato, setRContato] = useState("");

  // Form Instalação (aba) — visual apenas
  const [iNome, setINome] = useState("");
  const [iCpf, setICpf] = useState("");
  const [iNasc, setINasc] = useState("");
  const [iContato1, setIContato1] = useState("");
  const [iContato2, setIContato2] = useState("");
  const [iEmail, setIEmail] = useState("");
  const [iEndereco, setIEndereco] = useState("");
  const [iRef, setIRef] = useState("");
  const [iVenc, setIVenc] = useState(10);
  const [iFatura, setIFatura] = useState<"WHATSAPP_EMAIL" | "APP">("WHATSAPP_EMAIL");
  const [iTaxa, setITaxa] = useState<"DINHEIRO" | "PIX" | "CARTAO">("PIX");
  const [iWifiNome, setIWifiNome] = useState("");
  const [iWifiSenha, setIWifiSenha] = useState("");
  const [iPlano, setIPlano] = useState("ESSENCIAL_100");
  const [iApps, setIApps] = useState("");

  async function loadAgenda() {
    setLoading(true);
    setErr(null);
    try {
      const qs = new URLSearchParams({
        inicio,
        fim,
        cliente: "1",
        max_clientes: maxClientes,
      });
      const resp = await fetch(`/api/agenda?${qs.toString()}`, { cache: "no-store" });
      const t = await resp.text();
      if (!resp.ok) throw new Error(t || `HTTP ${resp.status}`);
      setData(JSON.parse(t));
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

  useEffect(() => {
    function onKeyDown(ev: KeyboardEvent) {
      if (ev.key === "Escape") setSelected(null);
    }
    if (selected) {
      document.addEventListener("keydown", onKeyDown);
      document.body.style.overflow = "hidden";
      return () => {
        document.removeEventListener("keydown", onKeyDown);
        document.body.style.overflow = "";
      };
    }
  }, [selected]);

  // Achata itens do Worker
  const workerFlat: FlatItem[] = useMemo(() => {
    if (!data) return [];
    const out: FlatItem[] = [];
    for (const dia of data.dias || []) {
      for (const v of Object.keys(dia.porViatura || {})) {
        for (const it of dia.porViatura[v] || []) out.push({ ...it, _dia: dia.data, _viatura: v });
      }
    }
    return out;
  }, [data]);

  // Achata reservas locais (para aparecer na agenda)
  const localFlat: FlatItem[] = useMemo(() => {
    return localReserves.map((it) => ({
      ...it,
      _dia: it.data || "—",
      _viatura: it.responsavel || "—",
    }));
  }, [localReserves]);

  const flatItemsAll: FlatItem[] = useMemo(() => {
    return [...workerFlat, ...localFlat];
  }, [workerFlat, localFlat]);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return flatItemsAll
      .filter((it) => (viatura ? it._viatura === viatura : true))
      .filter((it) => {
        if (!qq) return true;
        const c = it.cliente;
        const blob = [
          it._dia,
          it._viatura,
          it.id,
          it.contrato,
          it.status,
          it.motivo,
          it.usuario,
          it.responsavel,
          c?.nome,
          (c?.telefones || []).join(" "),
          c?.email,
          c?.plano,
          c?.observacao,
          clienteEnderecoLinha(c),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return blob.includes(qq);
      })
      .sort((a, b) => `${a._dia} ${a.hora || ""}`.localeCompare(`${b._dia} ${b.hora || ""}`));
  }, [flatItemsAll, viatura, q]);

  const grouped = useMemo(() => {
    const map = new Map<string, FlatItem[]>();
    for (const it of filtered) {
      const key = it._dia || "Sem data";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(it);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered]);

  function addLocalReserve() {
    const id = makeLocalId();
    const item: Item = {
      tipo: "reserva_local",
      id: `RES-${id}`,
      status: "Reservado (local)",
      data: rData,
      hora: rHora,
      responsavel: rViatura,
      usuario: rUsuario,
      motivo: rMotivo,
      contrato: rContrato,
      cliente: {
        nome: rClienteNome || "—",
        telefones: rContato ? [rContato] : [],
        email: "",
        plano: "",
        observacao: "",
        contratoId: rContrato || "",
        endereco: { logradouro: rEndereco || "—" },
      },
      _internal: { local: true, resp: rResp },
    };

    setLocalReserves((prev) => [item, ...prev]);
    setTab("agenda");
  }

  function removeLocalReserve(id: string) {
    setLocalReserves((prev) => prev.filter((x) => x.id !== id));
  }

  return (
    <>
      <header className="topbar">
        <div className="container topbarInner">
          <div className="brand">
            <div className="brandLogo">e</div>
            <div>
              <div className="brandTitle">Agenda Operacional</div>
              <div className="brandSub">Etech • SGP</div>
            </div>
          </div>

          <nav className="navTabs">
            <button className={cx("tab", tab === "agenda" && "tabActive")} onClick={() => setTab("agenda")}>
              Agenda
            </button>
            <button className={cx("tab", tab === "reservar" && "tabActive")} onClick={() => setTab("reservar")}>
              Reservar serviço (visual)
            </button>
            <button className={cx("tab", tab === "instalacao" && "tabActive")} onClick={() => setTab("instalacao")}>
              Nova instalação (ficha)
            </button>
          </nav>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
            <span className="chip">Período</span>
            <span className="chip">{inicio} → {fim}</span>
            <button className="btn primary" onClick={loadAgenda} disabled={loading}>
              {loading ? "Carregando..." : "Atualizar"}
            </button>
          </div>
        </div>
      </header>

      <div className="container">
        {tab === "agenda" ? (
          <>
            <section className="panel filters">
              <div className="field">
                <label>Início</label>
                <input type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} />
              </div>

              <div className="field">
                <label>Dias</label>
                <select value={dias} onChange={(e) => setDias(Number(e.target.value))}>
                  {[1, 3, 5, 7, 10, 14].map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
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
                <label>Max clientes</label>
                <input value={maxClientes} onChange={(e) => setMaxClientes(e.target.value)} />
              </div>

              <div className="field grow">
                <label>Busca</label>
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="cliente, contrato, endereço, motivo..." />
              </div>

              <div className="field">
                <label>Atualização</label>
                <div className="chip">{lastUpdated}</div>
              </div>

              <div className="field">
                <label>Reservas locais</label>
                <div className="chip">{localReserves.length}</div>
              </div>
            </section>

            {err ? (
              <section
                className="panel"
                style={{
                  marginTop: 12,
                  padding: 12,
                  borderColor: "rgba(239,68,68,.35)",
                  background: "rgba(58,13,13,.40)",
                }}
              >
                <div style={{ fontWeight: 950 }}>Erro</div>
                <div style={{ marginTop: 6, color: "rgba(254,202,202,.95)" }}>{err}</div>
              </section>
            ) : null}

            <main className="content">
              <div className="grid">
                {grouped.map(([dia, itens]) => (
                  <section className="col" key={dia}>
                    <div className="colHead">
                      <div className="colTitle">{dia}</div>
                      <span className="chip small">{itens.length} itens</span>
                    </div>

                    <div className="cards">
                      {itens.map((it) => {
                        const c = it.cliente;
                        const endereco = clienteEnderecoLinha(c);

                        return (
                          <article
                            key={`${it.id}-${it._dia}-${it._viatura}`}
                            className={cx("cardCompact", `tone-${statusTone(it.status, it.tipo)}`)}
                            onClick={() => setSelected(it)}
                            role="button"
                            tabIndex={0}
                          >
                            <div className="cardCompactTop">
                              <div className="cardCompactTime">{fmtHour(it.hora)}</div>
                              <div className="cardCompactBadges">
                                <span className="pill">{it._viatura}</span>
                                <span className="pill ghost">
                                  {it.tipo === "reserva_local" ? "RESERVA (LOCAL)" : `OS ${it.id}`}
                                </span>
                                <span className="pill ghost">{safeText(it.status)}</span>
                              </div>
                            </div>

                            <div className="titleMainClamp">{safeText(c?.nome)}</div>
                            <div className="titleSub">{safeText(it.motivo)}</div>

                            <div className="cardCompactBody">
                              <div className="kvRow">
                                <span className="k">Contrato</span>
                                <span className="v">{safeText(it.contrato)}</span>
                              </div>
                              <div className="kvRow">
                                <span className="k">Endereço</span>
                                <span className="v vClamp2">{safeText(endereco)}</span>
                              </div>
                              <div className="kvRow">
                                <span className="k">Usuário</span>
                                <span className="v">{safeText(it.usuario)}</span>
                              </div>
                              <div className="kvRow">
                                <span className="k">Resp.</span>
                                <span className="v">{safeText(it.responsavel)}</span>
                              </div>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>
            </main>
          </>
        ) : null}

        {tab === "reservar" ? (
          <section className="panel" style={{ marginTop: 14, padding: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
              <div style={{ fontWeight: 950 }}>Reservar serviço (apenas visual na tela)</div>
              <div className="chip">Some ao atualizar a página</div>
            </div>

            <div className="filters">
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
                  {["VT01", "VT02", "VT03", "VT04", "VT05"].map((v) => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label>Contrato</label>
                <input value={rContrato} onChange={(e) => setRContrato(e.target.value)} />
              </div>

              <div className="field grow">
                <label>Motivo</label>
                <input value={rMotivo} onChange={(e) => setRMotivo(e.target.value)} />
              </div>

              <div className="field">
                <label>Usuário</label>
                <input value={rUsuario} onChange={(e) => setRUsuario(e.target.value)} />
              </div>

              <div className="field">
                <label>Resp.</label>
                <input value={rResp} onChange={(e) => setRResp(e.target.value)} />
              </div>

              <div className="field grow">
                <label>Nome do cliente</label>
                <input value={rClienteNome} onChange={(e) => setRClienteNome(e.target.value)} />
              </div>

              <div className="field grow">
                <label>Endereço (cliente)</label>
                <input value={rEndereco} onChange={(e) => setREndereco(e.target.value)} />
              </div>

              <div className="field">
                <label>Contato</label>
                <input value={rContato} onChange={(e) => setRContato(e.target.value)} />
              </div>

              <div className="field">
                <label>&nbsp;</label>
                <button className="btn primary" onClick={addLocalReserve}>
                  Reservar na tela
                </button>
              </div>
            </div>

            <div className="hr" />

            <div style={{ fontWeight: 950, marginBottom: 10 }}>Reservas locais (remover)</div>
            {localReserves.length === 0 ? (
              <div className="chip">Nenhuma reserva local criada.</div>
            ) : (
              <div className="grid">
                {localReserves.map((it) => (
                  <section key={it.id} className="panel" style={{ padding: 12 }}>
                    <div className="kvRow"><span className="k">Quando</span><span className="v">{it.data} {it.hora}</span></div>
                    <div className="kvRow"><span className="k">Viatura</span><span className="v">{it.responsavel}</span></div>
                    <div className="kvRow"><span className="k">Contrato</span><span className="v">{it.contrato}</span></div>
                    <div className="kvRow"><span className="k">Cliente</span><span className="v">{it.cliente?.nome}</span></div>
                    <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
                      <button className="btn" onClick={() => removeLocalReserve(it.id)}>Remover</button>
                    </div>
                  </section>
                ))}
              </div>
            )}
          </section>
        ) : null}

        {tab === "instalacao" ? (
          <section className="panel" style={{ marginTop: 14, padding: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
              <div style={{ fontWeight: 950 }}>Ficha de instalação (apenas visual)</div>
              <div className="chip">Não salva — só para preencher e revisar</div>
            </div>

            <div className="filters">
              <div className="field grow">
                <label>Nome Completo</label>
                <input value={iNome} onChange={(e) => setINome(e.target.value)} />
              </div>
              <div className="field">
                <label>CPF</label>
                <input value={iCpf} onChange={(e) => setICpf(e.target.value)} />
              </div>
              <div className="field">
                <label>Nascimento</label>
                <input type="date" value={iNasc} onChange={(e) => setINasc(e.target.value)} />
              </div>

              <div className="field grow">
                <label>Contato 1</label>
                <input value={iContato1} onChange={(e) => setIContato1(e.target.value)} />
              </div>
              <div className="field grow">
                <label>Contato 2</label>
                <input value={iContato2} onChange={(e) => setIContato2(e.target.value)} />
              </div>
              <div className="field grow">
                <label>E-mail</label>
                <input value={iEmail} onChange={(e) => setIEmail(e.target.value)} />
              </div>

              <div className="field grow">
                <label>Endereço completo</label>
                <input value={iEndereco} onChange={(e) => setIEndereco(e.target.value)} />
              </div>
              <div className="field grow">
                <label>Ponto de referência</label>
                <input value={iRef} onChange={(e) => setIRef(e.target.value)} />
              </div>

              <div className="field">
                <label>Vencimento</label>
                <select value={iVenc} onChange={(e) => setIVenc(Number(e.target.value))}>
                  <option value={10}>Dia 10</option>
                  <option value={20}>Dia 20</option>
                  <option value={30}>Dia 30</option>
                </select>
              </div>

              <div className="field">
                <label>Fatura</label>
                <select value={iFatura} onChange={(e) => setIFatura(e.target.value as any)}>
                  <option value="WHATSAPP_EMAIL">WhatsApp/E-mail</option>
                  <option value="APP">Central do Cliente (App)</option>
                </select>
              </div>

              <div className="field">
                <label>Taxa Instalação</label>
                <select value={iTaxa} onChange={(e) => setITaxa(e.target.value as any)}>
                  <option value="DINHEIRO">Dinheiro</option>
                  <option value="PIX">PIX</option>
                  <option value="CARTAO">Cartão</option>
                </select>
              </div>

              <div className="field grow">
                <label>Wi-Fi Nome</label>
                <input value={iWifiNome} onChange={(e) => setIWifiNome(e.target.value)} />
              </div>
              <div className="field grow">
                <label>Wi-Fi Senha (mín 8)</label>
                <input value={iWifiSenha} onChange={(e) => setIWifiSenha(e.target.value)} />
              </div>

              <div className="field grow">
                <label>Plano</label>
                <select value={iPlano} onChange={(e) => setIPlano(e.target.value)}>
                  <option value="ESSENCIAL_100">Essencial 100</option>
                  <option value="MINI_PLUS_300">Mini Plus 300</option>
                  <option value="PLUS_300">Plus 300</option>
                  <option value="ULTRA_500">Ultra 500</option>
                  <option value="PREMIUM_500">Premium 500</option>
                  <option value="MAX_700">Max 700</option>
                </select>
              </div>

              <div className="field grow">
                <label>Apps / Preferências</label>
                <textarea value={iApps} onChange={(e) => setIApps(e.target.value)} placeholder="Ex.: Advanced, Premium, Kaspersky..." />
              </div>
            </div>

            <div className="hr" />

            <div style={{ fontWeight: 950, marginBottom: 10 }}>Prévia da ficha</div>
            <section className="panel" style={{ padding: 12, background: "rgba(6,10,18,.35)" }}>
              <div className="kvRow"><span className="k">Cliente</span><span className="v">{safeText(iNome)}</span></div>
              <div className="kvRow"><span className="k">CPF</span><span className="v">{safeText(iCpf)}</span></div>
              <div className="kvRow"><span className="k">Contato</span><span className="v">{safeText(iContato1)} {iContato2 ? ` / ${iContato2}` : ""}</span></div>
              <div className="kvRow"><span className="k">E-mail</span><span className="v">{safeText(iEmail)}</span></div>
              <div className="kvRow"><span className="k">Endereço</span><span className="v vClamp2">{safeText(iEndereco)}</span></div>
              <div className="kvRow"><span className="k">Ref.</span><span className="v vClamp2">{safeText(iRef)}</span></div>
              <div className="kvRow"><span className="k">Venc.</span><span className="v">Dia {iVenc}</span></div>
              <div className="kvRow"><span className="k">Fatura</span><span className="v">{iFatura}</span></div>
              <div className="kvRow"><span className="k">Taxa</span><span className="v">{iTaxa}</span></div>
              <div className="kvRow"><span className="k">Wi-Fi</span><span className="v">{safeText(iWifiNome)}</span></div>
              <div className="kvRow"><span className="k">Plano</span><span className="v">{iPlano}</span></div>
              <div className="kvRow"><span className="k">Apps</span><span className="v vClamp2">{safeText(iApps)}</span></div>
            </section>
          </section>
        ) : null}

        <footer className="footer">
          <div className="muted small">Desenvolvido por Paulo Sales.</div>
        </footer>
      </div>

      {/* MODAL DETALHES */}
      {selected ? (
        <div className="overlay" onMouseDown={() => setSelected(null)}>
          <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modalHead">
              <div>
                <div className="modalTitleMain">
                  {selected.tipo === "reserva_local" ? "Reserva (local)" : "Ordem de Serviço"} •{" "}
                  {selected._viatura} • {selected._dia} {fmtHour(selected.hora)}
                </div>
                <div className="modalTitleSub">
                  {safeText(selected.motivo)} • {safeText(selected.status)}
                </div>
              </div>
              <button className="iconBtn" onClick={() => setSelected(null)}>
                X
              </button>
            </div>

            <div className="modalBody">
              <div className="modalGrid">
                <section className="modalBlock">
                  <div className="modalBlockTitle">Serviço</div>
                  <div className="kvRow"><span className="k">Tipo</span><span className="v">{safeText(selected.tipo)}</span></div>
                  <div className="kvRow"><span className="k">ID</span><span className="v">{safeText(selected.id)}</span></div>
                  <div className="kvRow"><span className="k">Contrato</span><span className="v">{safeText(selected.contrato)}</span></div>
                  <div className="kvRow"><span className="k">Motivo</span><span className="v vClamp2">{safeText(selected.motivo)}</span></div>
                  <div className="kvRow"><span className="k">Usuário</span><span className="v">{safeText(selected.usuario)}</span></div>
                  <div className="kvRow"><span className="k">Resp.</span><span className="v">{safeText(selected.responsavel)}</span></div>
                </section>

                <section className="modalBlock">
                  <div className="modalBlockTitle">Cliente</div>
                  <div className="kvRow"><span className="k">Nome</span><span className="v vClamp2">{safeText(selected.cliente?.nome)}</span></div>
                  <div className="kvRow"><span className="k">Contato</span><span className="v">{safeText(phonesLinha(selected.cliente))}</span></div>
                  <div className="kvRow"><span className="k">Email</span><span className="v">{safeText(selected.cliente?.email)}</span></div>
                  <div className="kvRow"><span className="k">Plano</span><span className="v vClamp2">{safeText(selected.cliente?.plano)}</span></div>
                  <div className="kvRow"><span className="k">Endereço</span><span className="v vClamp2">{safeText(clienteEnderecoLinha(selected.cliente))}</span></div>
                </section>
              </div>
            </div>

            <div className="modalFoot">
              <div className="chip small">ESC para fechar</div>
              <button className="btn" onClick={() => setSelected(null)}>
                Fechar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
