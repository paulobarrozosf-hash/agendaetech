"use client";

import { useEffect, useMemo, useState } from "react";

// --- Tipos de dados (para o SGP e para o local) ---
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
  _internal?: any; // Para dados internos como reservationId
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

// --- Tipos para a Ficha de Instalação (localStorage) ---
type InstallStatus = "CRIADO" | "AGENDADO" | "CADASTRADO_SGP" | "FINALIZADO" | "CANCELADO";
type BillingDelivery = "WHATSAPP_EMAIL" | "APP";
type InstallFeePayment = "DINHEIRO" | "PIX" | "CARTAO";

type InstallationData = {
  id: string;
  createdAt: string;
  status: InstallStatus;
  nomeCompleto: string;
  cpf: string;
  nascimento?: string | null;
  contato1: string;
  contato2?: string | null;
  email?: string | null;
  enderecoFull: string;
  referencia?: string | null;
  vencimentoDia: 10 | 20 | 30;
  entregaFatura: BillingDelivery;
  taxaPagamento: InstallFeePayment;
  wifiNome: string;
  wifiSenha: string;
  planoCodigo: string;
  planoNome: string;
  planoMbps?: number | null;
  planoValor?: number | null;
  appsEscolhidos?: string[]; // Lista de apps
  criadoPor?: string | null;
  notasInternas?: string | null;
  reservaId?: string | null; // Link para a reserva local
};

// --- Dados dos Planos (para o formulário) ---
const PLANOS = [
  {
    codigo: "ESSENCIAL_100",
    nome: "Plano Essencial 100",
    mbps: 100,
    valor: 8499,
    apps: ["Leitura360", "Cindie"],
  },
  {
    codigo: "MINI_PLUS_300",
    nome: "Plano Mini Plus 300",
    mbps: 300,
    valor: 10999,
    apps: ["Leitura360", "Cindie", "Estádio TNT Sports"],
  },
  {
    codigo: "PLUS_300_OPCAO_A",
    nome: "Plano Plus 300 • Opção A",
    mbps: 300,
    valor: 11999,
    apps: ["Leitura360", "Cindie", "Estádio TNT Sports", "Deezer Premium"],
  },
  {
    codigo: "PLUS_300_OPCAO_B",
    nome: "Plano Plus 300 • Opção B",
    mbps: 300,
    valor: 11999,
    apps: ["Leitura360", "Cindie", "Estádio TNT Sports", "HBO Max (com anúncios)"],
  },
  {
    codigo: "ULTRA_500_A",
    nome: "Plano Ultra 500 • Opção A",
    mbps: 500,
    valor: 14999,
    apps: ["Leitura360", "Cindie", "Estádio TNT Sports", "Deezer Premium", "HBO Max (com anúncios)"],
  },
  {
    codigo: "ULTRA_500_B",
    nome: "Plano Ultra 500 • Opção B",
    mbps: 500,
    valor: 14999,
    apps: ["Leitura360", "Cindie", "Estádio TNT Sports", "HBO Max (com anúncios)", "Sky+ Light com Globo e Amazon SVA"],
  },
  {
    codigo: "ULTRA_500_C",
    nome: "Plano Ultra 500 • Opção C",
    mbps: 500,
    valor: 14999,
    apps: ["Leitura360", "Cindie", "Estádio TNT Sports", "HBO Max (com anúncios)", "Kaspersky Plus (1 licença)"],
  },
  {
    codigo: "PREMIUM_ULTRA_500",
    nome: "Plano Premium Ultra 500",
    mbps: 500,
    valor: 15999,
    apps: ["Leitura360", "Cindie", "Estádio TNT Sports", "HBO Max (sem anúncios)", "Kaspersky Plus (3 licenças)"],
  },
  {
    codigo: "MAX_700_A",
    nome: "Plano Max 700 • Opção A",
    mbps: 700,
    valor: 17999,
    apps: ["Leitura360", "Cindie", "Estádio TNT Sports", "HBO Max (sem anúncios)", "Kaspersky Plus (5 licenças)", "Sky+ Light com Globo e Amazon SVA"],
  },
  {
    codigo: "MAX_700_B",
    nome: "Plano Max 700 • Opção B",
    mbps: 700,
    valor: 17999,
    apps: ["Leitura360", "Cindie", "Estádio TNT Sports", "HBO Max (sem anúncios)", "Kaspersky Plus (5 licenças)", "Deezer Premium"],
  },
  {
    codigo: "PLUS_MAX_700_A",
    nome: "Plano Plus Max 700 • Opção A",
    mbps: 700,
    valor: 19999,
    apps: ["Leitura360", "Cindie", "Estádio TNT Sports", "HBO Max (sem anúncios)", "Kaspersky Plus (5 licenças)", "Sky+ Light com Globo e Amazon SVA", "Deezer Premium"],
  },
  {
    codigo: "PLUS_MAX_700_B",
    nome: "Plano Plus Max 700 • Opção B",
    mbps: 700,
    valor: 19999,
    apps: ["Leitura360", "Cindie", "Estádio TNT Sports", "HBO Max (sem anúncios)", "Kaspersky Plus (5 licenças)", "ZenWellness", "Queima Diária", "Smart Content"],
  },
];

// --- Funções utilitárias ---
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
  const l2 = [e?.bairro, [e?.cidade, e?.uf].filter(Boolean).join("/")].filter(Boolean).join(" — "); // <-- AQUI FOI ADICIONADO 'const'
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
function moneyBRLFromCents(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// --- Componente principal da página ---
export default function Page() {
  const [tab, setTab] = useState<TabKey>("agenda");

  // --- Agenda: filtros e dados do Worker ---
  const [inicio, setInicio] = useState(hojeISO());
  const [dias, setDias] = useState(14);
  const [viatura, setViatura] = useState("");
  const [q, setQ] = useState("");
  const [maxClientes, setMaxClientes] = useState("200");

  const fim = useMemo(() => addDays(inicio, Math.max(0, dias - 1)), [inicio, dias]);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [data, setData] = useState<AgendaResp | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>("—");

  // --- LocalStorage: Reservas e Instalações ---
  const [localReserves, setLocalReserves] = useState<Item[]>([]);
  const [localInstallations, setLocalInstallations] = useState<InstallationData[]>([]);

  // Carrega dados do localStorage ao iniciar
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedReserves = localStorage.getItem("localReserves");
      if (storedReserves) setLocalReserves(JSON.parse(storedReserves));

      const storedInstalls = localStorage.getItem("localInstallations");
      if (storedInstalls) setLocalInstallations(JSON.parse(storedInstalls));
    }
  }, []);

  // Salva reservas no localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("localReserves", JSON.stringify(localReserves));
    }
  }, [localReserves]);

  // Salva instalações no localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("localInstallations", JSON.stringify(localInstallations));
    }
  }, [localInstallations]);

  // --- Modal de detalhes ---
  const [selected, setSelected] = useState<FlatItem | null>(null);

  // --- Form Reserva (aba "Reservar serviço") ---
  const [rData, setRData] = useState(hojeISO());
  const [rHora, setRHora] = useState("08:00");
  const [rViatura, setRViatura] = useState("VT01");
  const [rContrato, setRContrato] = useState("7333");
  const [rMotivo, setRMotivo] = useState("Instalação"); // Default para o novo select
  const [rUsuario, setRUsuario] = useState("weslley");
  const [rResp, setRResp] = useState("vt01");
  const [rClienteNome, setRClienteNome] = useState("");
  const [rEndereco, setREndereco] = useState("");
  const [rContato, setRContato] = useState("");

  const RESERVA_MOTIVOS = [
    "Instalação",
    "Mudança de Endereço",
    "Reativação",
    "Suporte",
    "Recolhimento",
  ];

  function addLocalReserve() {
    if (!rData || !rHora || !rViatura || !rMotivo || !rClienteNome || !rEndereco || !rContato) {
      alert("Preencha todos os campos obrigatórios da reserva!");
      return;
    }

    const newReserve: Item = {
      tipo: "reserva_local",
      id: makeLocalId(),
      contrato: rContrato,
      status: "Reservado",
      data: rData,
      hora: rHora,
      motivo: rMotivo,
      responsavel: rViatura,
      usuario: rUsuario,
      cliente: {
        nome: rClienteNome,
        telefones: [rContato],
        endereco: { logradouro: rEndereco },
      },
      _internal: {
        // Podemos adicionar mais dados aqui se precisar
      },
    };
    setLocalReserves((prev) => [...prev, newReserve]);
    alert("Reserva adicionada à agenda (localmente)!");
    // Limpar formulário após salvar
    setRClienteNome("");
    setREndereco("");
    setRContato("");
    setRContrato("7333");
    setRMotivo("Instalação");
  }

  function removeLocalReserve(id: string) {
    if (confirm("Tem certeza que deseja remover esta reserva local?")) {
      setLocalReserves((prev) => prev.filter((r) => r.id !== id));
    }
  }

  // --- Form Instalação (aba "Nova instalação") ---
  const [iNome, setINome] = useState("");
  const [iCpf, setICpf] = useState("");
  const [iNasc, setINasc] = useState("");
  const [iContato1, setIContato1] = useState("");
  const [iContato2, setIContato2] = useState("");
  const [iEmail, setIEmail] = useState("");
  const [iEndereco, setIEndereco] = useState("");
  const [iRef, setIRef] = useState("");
  const [iVenc, setIVenc] = useState<10 | 20 | 30>(10);
  const [iFatura, setIFatura] = useState<BillingDelivery>("WHATSAPP_EMAIL");
  const [iTaxa, setITaxa] = useState<InstallFeePayment>("PIX");
  const [iWifiNome, setIWifiNome] = useState("");
  const [iWifiSenha, setIWifiSenha] = useState("");
  const [iPlanoCodigo, setIPlanoCodigo] = useState(PLANOS[0].codigo);
  const [iAppsSelecionados, setIAppsSelecionados] = useState<string[]>([]);

  const selectedPlan = useMemo(() => PLANOS.find((p) => p.codigo === iPlanoCodigo) || PLANOS[0], [iPlanoCodigo]);

  function handleAppToggle(app: string) {
    setIAppsSelecionados((prev) =>
      prev.includes(app) ? prev.filter((a) => a !== app) : [...prev, app]
    );
  }

  function addLocalInstallation() {
    if (!iNome || !iCpf || !iContato1 || !iEndereco || !iWifiNome || !iWifiSenha || iWifiSenha.length < 8) {
      alert("Preencha todos os campos obrigatórios da ficha e verifique a senha do Wi-Fi (mín. 8 caracteres)!");
      return;
    }

    const newInstallation: InstallationData = {
      id: makeLocalId(),
      createdAt: new Date().toISOString(),
      status: "CRIADO",
      nomeCompleto: iNome,
      cpf: iCpf,
      nascimento: iNasc || null,
      contato1: iContato1,
      contato2: iContato2 || null,
      email: iEmail || null,
      enderecoFull: iEndereco,
      referencia: iRef || null,
      vencimentoDia: iVenc,
      entregaFatura: iFatura,
      taxaPagamento: iTaxa,
      wifiNome: iWifiNome,
      wifiSenha: iWifiSenha,
      planoCodigo: selectedPlan.codigo,
      planoNome: selectedPlan.nome,
      planoMbps: selectedPlan.mbps,
      planoValor: selectedPlan.valor,
      appsEscolhidos: iAppsSelecionados,
      criadoPor: "usuário_local", // Pode ser dinâmico se tiver login
      notasInternas: "",
    };
    setLocalInstallations((prev) => [...prev, newInstallation]);
    alert("Ficha de instalação salva (localmente)!");
    // Limpar formulário
    setINome(""); setICpf(""); setINasc("");
    setIContato1(""); setIContato2(""); setIEmail("");
    setIEndereco(""); setIRef("");
    setIVenc(10); setIFatura("WHATSAPP_EMAIL"); setITaxa("PIX");
    setIWifiNome(""); setIWifiSenha("");
    setIPlanoCodigo(PLANOS[0].codigo);
    setIAppsSelecionados([]);
  }

  function removeLocalInstallation(id: string) {
    if (confirm("Tem certeza que deseja remover esta ficha de instalação local?")) {
      setLocalInstallations((prev) => prev.filter((inst) => inst.id !== id));
    }
  }

  // --- Lógica de carregamento da Agenda (SGP + Local) ---
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
  }, [inicio, fim, maxClientes]); // Recarrega agenda se filtros mudarem

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

  // Achata itens do Worker (SGP)
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
    // Filtra reservas locais para o período da agenda
    const inicioTs = new Date(inicio + "T00:00:00").getTime();
    const fimTs = new Date(fim + "T23:59:59").getTime();

    return localReserves
      .filter(res => {
        const resDateTs = new Date(res.data + "T" + res.hora + ":00").getTime();
        return resDateTs >= inicioTs && resDateTs <= fimTs;
      })
      .map((it) => ({
        ...it,
        _dia: it.data || "—",
        _viatura: it.responsavel || "—",
      }));
  }, [localReserves, inicio, fim]);

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

  return (
    <>
      <header className="topbar">
        <div className="container topbarInner">
          <div className="brand">
            <div className="brandLogo">E</div>
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
              Reservar serviço
            </button>
            <button className={cx("tab", tab === "instalacao" && "tabActive")} onClick={() => setTab("instalacao")}>
              Nova instalação
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
        {/* --- ABA AGENDA --- */}
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

        {/* --- ABA RESERVAR SERVIÇO --- */}
        {tab === "reservar" ? (
          <section className="panel" style={{ marginTop: 14, padding: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
              <div style={{ fontWeight: 950 }}>Reservar serviço (salvo no navegador)</div>
              <div className="chip">Os dados ficam salvos neste navegador</div>
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
                <select value={rMotivo} onChange={(e) => setRMotivo(e.target.value)}>
                  {RESERVA_MOTIVOS.map((motivo) => (
                    <option key={motivo} value={motivo}>{motivo}</option>
                  ))}
                </select>
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
                  Salvar Reserva
                </button>
              </div>
            </div>

            <div className="hr" />

            <div style={{ fontWeight: 950, marginBottom: 10 }}>Reservas salvas (neste navegador)</div>
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

        {/* --- ABA NOVA INSTALAÇÃO --- */}
        {tab === "instalacao" ? (
          <section className="panel" style={{ marginTop: 14, padding: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
              <div style={{ fontWeight: 950 }}>Ficha de instalação (salva no navegador)</div>
              <div className="chip">Os dados ficam salvos neste navegador</div>
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
                <label>Data de Nascimento</label>
                <input type="date" value={iNasc} onChange={(e) => setINasc(e.target.value)} />
              </div>

              <div className="field grow">
                <label>Contato 1 (WhatsApp)</label>
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
                <label>Dia de vencimento</label>
                <select value={iVenc} onChange={(e) => setIVenc(Number(e.target.value) as 10 | 20 | 30)}>
                  <option value={10}>Dia 10</option>
                  <option value={20}>Dia 20</option>
                  <option value={30}>Dia 30</option>
                </select>
              </div>

              <div className="field">
                <label>Receber fatura</label>
                <select value={iFatura} onChange={(e) => setIFatura(e.target.value as BillingDelivery)}>
                  <option value="WHATSAPP_EMAIL">WhatsApp/E-mail</option>
                  <option value="APP">Central do Cliente (Aplicativo)</option>
                </select>
              </div>

              <div className="field">
                <label>Pagamento da taxa (R$50,00)</label>
                <select value={iTaxa} onChange={(e) => setITaxa(e.target.value as InstallFeePayment)}>
                  <option value="DINHEIRO">Dinheiro</option>
                  <option value="PIX">PIX</option>
                  <option value="CARTAO">Cartão</option>
                </select>
              </div>

              <div className="field grow">
                <label>Nome do Wi-Fi</label>
                <input value={iWifiNome} onChange={(e) => setIWifiNome(e.target.value)} />
              </div>
              <div className="field grow">
                <label>Senha do Wi-Fi (mínimo 8 dígitos)</label>
                <input value={iWifiSenha} onChange={(e) => setIWifiSenha(e.target.value)} />
              </div>

              <div className="field grow">
                <label>Plano E-TECH</label>
                <select value={iPlanoCodigo} onChange={(e) => {
                  setIPlanoCodigo(e.target.value);
                  setIAppsSelecionados([]); // Limpa apps ao mudar de plano
                }}>
                  {PLANOS.map((p) => (
                    <option key={p.codigo} value={p.codigo}>
                      {p.nome} ({p.mbps}MB) - {moneyBRLFromCents(p.valor)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field grow" style={{ gridColumn: "span 2" }}>
                <label>Aplicativos do Plano ({selectedPlan.nome})</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  {selectedPlan.apps.map((app) => (
                    <label key={app} className="chip" style={{ cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={iAppsSelecionados.includes(app)}
                        onChange={() => handleAppToggle(app)}
                        style={{ marginRight: "6px" }}
                      />
                      {app}
                    </label>
                  ))}
                </div>
              </div>

              <div className="field" style={{ gridColumn: "span 3", display: "flex", justifyContent: "flex-end" }}>
                <button className="btn primary" onClick={addLocalInstallation}>
                  Salvar Ficha
                </button>
              </div>
            </div>

            <div className="hr" />

            <div style={{ fontWeight: 950, marginBottom: 10 }}>Fichas de Instalação salvas (neste navegador)</div>
            {localInstallations.length === 0 ? (
              <div className="chip">Nenhuma ficha de instalação salva.</div>
            ) : (
              <div className="installationsList">
                {localInstallations.map((inst) => (
                  <div key={inst.id} className="installationItem">
                    <div className="name">{inst.nomeCompleto}</div>
                    <div className="contact">{inst.contato1} {inst.email ? `• ${inst.email}` : ''}</div>
                    <div className="plan">{inst.planoNome} • {inst.status}</div>
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", gridColumn: "span 3" }}>
                      <button className="btn" onClick={() => alert(`Detalhes de ${inst.nomeCompleto}:\n${JSON.stringify(inst, null, 2)}`)}>Ver Detalhes</button>
                      <button className="btn" onClick={() => removeLocalInstallation(inst.id)}>Remover</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        ) : null}

        <footer className="footer">
          <div className="muted small">Desenvolvido por Paulo Sales.</div>
        </footer>
      </div>

      {/* --- MODAL DETALHES (para itens da agenda) --- */}
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
