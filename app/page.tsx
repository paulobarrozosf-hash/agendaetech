"use client";

import Image from "next/image";
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
  tipo: string;
  id: string;
  contrato?: string | null;
  status?: string | null;
  data?: string | null;
  hora?: string | null;
  motivo?: string | null;
  responsavel?: string | null;
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
  appsEscolhidos: { category: string; apps: string[] }[];
  criadoPor?: string | null;
  notasInternas?: string | null;
  reservaId?: string | null;
};

type AppCategory = "STANDARD" | "ADVANCED" | "TOP" | "PREMIUM";

type PlanAppChoice = {
  category: AppCategory;
  count: number;
  options: string[];
};

type PlanOption = {
  id: string;
  name: string;
  choices: PlanAppChoice[];
};

type Plan = {
  codigo: string;
  nome: string;
  mbps: number;
  valor: number;
  options: PlanOption[];
};

const PLANOS: Plan[] = [
  {
    codigo: "ESSENCIAL_100",
    nome: "Plano Essencial 100",
    mbps: 100,
    valor: 8499,
    options: [{
      id: "UNICA",
      name: "Combo Standard (1 App)",
      choices: [{
        category: "STANDARD",
        count: 1,
        options: [
          "Ubook+", "Estuda+", "Pequenos Leitores", "Looke", "Sky+ Light SVA",
          "PlayKids+", "Kaspersky Standard (1 licença)", "Hub Vantagens",
          "Revistaria", "Fluid", "Social Comics", "QNutri", "Playlist", "Kiddle Pass"
        ]
      }]
    }]
  },
  {
    codigo: "MINI_PLUS_300",
    nome: "Plano Mini Plus 300",
    mbps: 300,
    valor: 10999,
    options: [{
      id: "UNICA",
      name: "Advanced (1 App)",
      choices: [{
        category: "ADVANCED",
        count: 1,
        options: [
          "Deezer", "DocWay", "Sky+ Light com Globo SVA",
          "Kaspersky Standard (3 licenças)", "O Jornalista", "CurtaOn",
          "HotGo", "Kiddle Pass"
        ]
      }]
    }]
  },
  {
    codigo: "PLUS_300",
    nome: "Plano Plus 300",
    mbps: 300,
    valor: 11999,
    options: [
      {
        id: "A",
        name: "Opção A: Top (1 App)",
        choices: [{
          category: "TOP",
          count: 1,
          options: [
            "HBO Max (com anúncios)", "Sky+ Light com Globo e Amazon SVA",
            "Leitura360", "Cindie"
          ]
        }]
      },
      {
        id: "B",
        name: "Opção B: Standard (1 App) + Advanced (1 App)",
        choices: [
          {
            category: "STANDARD",
            count: 1,
            options: [
              "Ubook+", "Estuda+", "Pequenos Leitores", "Looke", "Sky+ Light SVA",
              "PlayKids+", "Kaspersky Standard (1 licença)", "Hub Vantagens",
              "Revistaria", "Fluid", "Social Comics", "QNutri", "Playlist", "Kiddle Pass"
            ]
          },
          {
            category: "ADVANCED",
            count: 1,
            options: [
              "Deezer", "DocWay", "Sky+ Light com Globo SVA",
              "Kaspersky Standard (3 licenças)", "O Jornalista", "CurtaOn",
              "HotGo", "Kiddle Pass"
            ]
          }
        ]
      }
    ]
  },
  {
    codigo: "ULTRA_500",
    nome: "Plano Ultra 500",
    mbps: 500,
    valor: 14999,
    options: [
      {
        id: "A",
        name: "Opção A: Top (1 App) + Standard (1 App)",
        choices: [
          {
            category: "TOP",
            count: 1,
            options: [
              "HBO Max (com anúncios)", "Sky+ Light com Globo e Amazon SVA",
              "Leitura360", "Cindie"
            ]
          },
          {
            category: "STANDARD",
            count: 1,
            options: [
              "Ubook+", "Estuda+", "Pequenos Leitores", "Looke", "Sky+ Light SVA",
              "PlayKids+", "Kaspersky Standard (1 licença)", "Hub Vantagens",
              "Revistaria", "Fluid", "Social Comics", "QNutri", "Playlist", "Kiddle Pass"
            ]
          }
        ]
      },
      {
        id: "B",
        name: "Opção B: Advanced (1 App) + Standard (2 Apps)",
        choices: [
          {
            category: "ADVANCED",
            count: 1,
            options: [
              "Deezer", "DocWay", "Sky+ Light com Globo SVA",
              "Kaspersky Standard (3 licenças)", "O Jornalista", "CurtaOn",
              "HotGo", "Kiddle Pass"
            ]
          },
          {
            category: "STANDARD",
            count: 2,
            options: [
              "Ubook+", "Estuda+", "Pequenos Leitores", "Looke", "Sky+ Light SVA",
              "PlayKids+", "Kaspersky Standard (1 licença)", "Hub Vantagens",
              "Revistaria", "Fluid", "Social Comics", "QNutri", "Playlist", "Kiddle Pass"
            ]
          }
        ]
      },
      {
        id: "C",
        name: "Opção C: Advanced (2 Apps)",
        choices: [{
          category: "ADVANCED",
          count: 2,
          options: [
            "Deezer", "DocWay", "Sky+ Light com Globo SVA",
            "Kaspersky Standard (3 licenças)", "O Jornalista", "CurtaOn",
            "HotGo", "Kiddle Pass"
          ]
        }]
      }
    ]
  },
  {
    codigo: "PREMIUM_ULTRA_500",
    nome: "Plano Premium Ultra 500",
    mbps: 500,
    valor: 15999,
    options: [{
      id: "UNICA",
      name: "Premium (1 App)",
      choices: [{
        category: "PREMIUM",
        count: 1,
        options: [
          "HBO Max (sem anúncios)", "Kaspersky Plus (5 licenças)",
          "ZenWellness", "Queima Diária", "Smart Content"
        ]
      }]
    }]
  },
  {
    codigo: "MAX_700",
    nome: "Plano Max 700",
    mbps: 700,
    valor: 17999,
    options: [
      {
        id: "A",
        name: "Opção A: Premium (1 App)",
        choices: [{
          category: "PREMIUM",
          count: 1,
          options: [
            "HBO Max (sem anúncios)", "Kaspersky Plus (5 licenças)",
            "ZenWellness", "Queima Diária", "Smart Content"
          ]
        }]
      },
      {
        id: "B",
        name: "Opção B: Top (1 App) + Advanced (1 App)",
        choices: [
          {
            category: "TOP",
            count: 1,
            options: [
              "HBO Max (com anúncios)", "Sky+ Light com Globo e Amazon SVA",
              "Leitura360", "Cindie"
            ]
          },
          {
            category: "ADVANCED",
            count: 1,
            options: [
              "Deezer", "DocWay", "Sky+ Light com Globo SVA",
              "Kaspersky Standard (3 licenças)", "O Jornalista", "CurtaOn",
              "HotGo", "Kiddle Pass"
            ]
          }
        ]
      }
    ]
  },
  {
    codigo: "PLUS_MAX_700",
    nome: "Plano Plus Max 700",
    mbps: 700,
    valor: 19999,
    options: [
      {
        id: "A",
        name: "Opção A: Premium (2 Apps)",
        choices: [{
          category: "PREMIUM",
          count: 2,
          options: [
            "HBO Max (sem anúncios)", "Kaspersky Plus (5 licenças)",
            "ZenWellness", "Queima Diária", "Smart Content"
          ]
        }]
      },
      {
        id: "B",
        name: "Opção B: Top (2 Apps) + Advanced (1 App)",
        choices: [
          {
            category: "TOP",
            count: 2,
            options: [
              "HBO Max (com anúncios)", "Sky+ Light com Globo e Amazon SVA",
              "Leitura360", "Cindie"
            ]
          },
          {
            category: "ADVANCED",
            count: 1,
            options: [
              "Deezer", "DocWay", "Sky+ Light com Globo SVA",
              "Kaspersky Standard (3 licenças)", "O Jornalista", "CurtaOn",
              "HotGo", "Kiddle Pass"
            ]
          }
        ]
      }
    ]
  }
];

const RESERVA_MOTIVOS = [
  "Instalação",
  "Mudança de Endereço",
  "Reativação",
  "Suporte",
  "Recolhimento",
];

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
function statusTone(status?: string | null, tipo?: string) {
  if (tipo === "reserva_local") return "gold";
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
function safeText(x: any) {
  const s = (x ?? "").toString().trim();
  return s.length ? s : "—";
}
function moneyBRLFromCents(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function clienteEnderecoLinha(c?: ClienteObj | null) {
  const e = c?.endereco;
  const l1 = [e?.logradouro, e?.numero].filter(Boolean).join(", ");
  const l2 = [e?.bairro, [e?.cidade, e?.uf].filter(Boolean).join("/")].filter(Boolean).join(" — ");
  return [l1, l2].filter(Boolean).join(" • ");
}

function phonesLinha(c?: ClienteObj | null) {
  const t = (c?.telefones || []).filter(Boolean);
  return t.length ? t.join(" / ") : null;
}

export default function HomePage() {
  const [tab, setTab] = useState<TabKey>("agenda");
  const [data, setData] = useState<AgendaResp | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const [inicio, setInicio] = useState(hojeISO());
  const [dias, setDias] = useState(7);
  const fim = useMemo(() => addDays(inicio, dias - 1), [inicio, dias]);

  const [viatura, setViatura] = useState("");
  const [qAgenda, setQAgenda] = useState("");

  const [selectedAgendaItem, setSelectedAgendaItem] = useState<FlatItem | null>(null);
  const [selectedInstallation, setSelectedInstallation] = useState<InstallationData | null>(null);

  const [rData, setRData] = useState(hojeISO());
  const [rHora, setRHora] = useState("08:00");
  const [rViatura, setRViatura] = useState("VT01");
  const [rContrato, setRContrato] = useState("");
  const [rMotivo, setRMotivo] = useState(RESERVA_MOTIVOS[0]);
  const [rUsuario, setRUsuario] = useState("");
  const [rClienteNome, setRClienteNome] = useState("");
  const [rEndereco, setREndereco] = useState("");
  const [rContato, setRContato] = useState("");

  const [localReserves, setLocalReserves] = useState<Item[]>([]);

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
  const [iTaxa, setITaxa] = useState<InstallFeePayment>("DINHEIRO");
  const [iWifiNome, setIWifiNome] = useState("");
  const [iWifiSenha, setIWifiSenha] = useState("");
  const [iPlano, setIPlano] = useState(PLANOS[0].codigo);
  const [iOpcao, setIOpcao] = useState("");
  const [iAppsSelecionados, setIAppsSelecionados] = useState<string[]>([]);
  const [iCriadoPor, setICriadoPor] = useState("");
  const [iNotas, setINotas] = useState("");

  const [localInstallations, setLocalInstallations] = useState<InstallationData[]>([]);
  const [qInstallations, setQInstallations] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem("localReserves");
    if (stored) {
      try {
        setLocalReserves(JSON.parse(stored));
      } catch {}
    }
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem("localInstallations");
    if (stored) {
      try {
        setLocalInstallations(JSON.parse(stored));
      } catch {}
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [inicio, dias]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedAgendaItem(null);
        setSelectedInstallation(null);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  async function loadData() {
    setLoading(true);
    setErr(null);
    try {
      const qs = new URLSearchParams();
      qs.append("inicio", inicio);
      qs.append("fim", fim);
      qs.append("cliente", "1");

      const resp = await fetch(`/api/agenda?${qs.toString()}`);
      if (!resp.ok) {
        let errorMsg = `HTTP ${resp.status}`;
        try {
          const errJson = await resp.json();
          if (errJson.error) {
            errorMsg = errJson.error;
            if (errJson.details) errorMsg += ` (${errJson.details})`;
          }
        } catch {}
        throw new Error(errorMsg);
      }

      const json: AgendaResp = await resp.json();
      setData(json);
      setLastUpdated(new Date().toLocaleTimeString("pt-BR"));
    } catch (e: any) {
      setErr(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  function addLocalReserve() {
    const newReserve: Item = {
      tipo: "reserva_local",
      id: `local-${Date.now()}`,
      contrato: rContrato || null,
      status: "Reservado",
      data: rData,
      hora: rHora,
      motivo: rMotivo,
      responsavel: rViatura,
      usuario: rUsuario || null,
      cliente: {
        nome: rClienteNome || null,
        telefones: rContato ? [rContato] : null,
        email: null,
        plano: null,
        observacao: null,
        contratoId: null,
        endereco: {
          logradouro: rEndereco || null,
          numero: null,
          complemento: null,
          bairro: null,
          cidade: null,
          uf: null,
          cep: null,
          ll: null,
        },
      },
      _internal: { reservationId: `local-${Date.now()}` },
    };

    const updated = [...localReserves, newReserve];
    setLocalReserves(updated);
    localStorage.setItem("localReserves", JSON.stringify(updated));

    setRContrato("");
    setRUsuario("");
    setRClienteNome("");
    setREndereco("");
    setRContato("");
  }

  function removeLocalReserve(id: string) {
    const updated = localReserves.filter((r) => r.id !== id);
    setLocalReserves(updated);
    localStorage.setItem("localReserves", JSON.stringify(updated));
  }

  function addLocalInstallation() {
    const plano = PLANOS.find((p) => p.codigo === iPlano);
    if (!plano) return;

    const newInstall: InstallationData = {
      id: `install-${Date.now()}`,
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
      planoCodigo: plano.codigo,
      planoNome: plano.nome,
      planoMbps: plano.mbps,
      planoValor: plano.valor,
      appsEscolhidos: buildAppsEscolhidos(),
      criadoPor: iCriadoPor || null,
      notasInternas: iNotas || null,
      reservaId: null,
    };

    const updated = [...localInstallations, newInstall];
    setLocalInstallations(updated);
    localStorage.setItem("localInstallations", JSON.stringify(updated));

    setINome("");
    setICpf("");
    setINasc("");
    setIContato1("");
    setIContato2("");
    setIEmail("");
    setIEndereco("");
    setIRef("");
    setIVenc(10);
    setIFatura("WHATSAPP_EMAIL");
    setITaxa("DINHEIRO");
    setIWifiNome("");
    setIWifiSenha("");
    setIPlano(PLANOS[0].codigo);
    setIOpcao("");
    setIAppsSelecionados([]);
    setICriadoPor("");
    setINotas("");
  }

  function buildAppsEscolhidos() {
    const plano = PLANOS.find((p) => p.codigo === iPlano);
    if (!plano) return [];

    const opcao = plano.options.find((o) => o.id === iOpcao);
    if (!opcao) return [];

    return opcao.choices.map((choice) => ({
      category: choice.category,
      apps: iAppsSelecionados.filter((app) => choice.options.includes(app)),
    }));
  }

  function removeLocalInstallation(id: string) {
    const updated = localInstallations.filter((inst) => inst.id !== id);
    setLocalInstallations(updated);
    localStorage.setItem("localInstallations", JSON.stringify(updated));
  }

  function handleAppToggle(app: string, category: AppCategory, maxCount: number) {
    const plano = PLANOS.find((p) => p.codigo === iPlano);
    if (!plano) return;

    const opcao = plano.options.find((o) => o.id === iOpcao);
    if (!opcao) return;

    const choice = opcao.choices.find((c) => c.category === category);
    if (!choice) return;

    const currentCategoryApps = iAppsSelecionados.filter((a) => choice.options.includes(a));

    if (iAppsSelecionados.includes(app)) {
      setIAppsSelecionados(iAppsSelecionados.filter((a) => a !== app));
    } else {
      if (currentCategoryApps.length < maxCount) {
        setIAppsSelecionados([...iAppsSelecionados, app]);
      }
    }
  }

  const viaturas = useMemo(() => data?.viaturas || [], [data]);

  const flatItems = useMemo(() => {
    if (!data) return [];
    const arr: FlatItem[] = [];
    for (const dia of data.dias) {
      for (const vt of viaturas) {
        const items = dia.porViatura[vt] || [];
        for (const it of items) {
          arr.push({ ...it, _dia: dia.data, _viatura: vt });
        }
      }
    }

    for (const r of localReserves) {
      if (r.data && r.data >= inicio && r.data <= fim) {
        arr.push({ ...r, _dia: r.data, _viatura: r.responsavel || "VT01" });
      }
    }

    arr.sort((a, b) => {
      const cmpData = (a._dia || "").localeCompare(b._dia || "");
      if (cmpData !== 0) return cmpData;
      const cmpHora = (a.hora || "").localeCompare(b.hora || "");
      if (cmpHora !== 0) return cmpHora;
      if (a.tipo === "reserva_local" && b.tipo !== "reserva_local") return -1;
      if (a.tipo !== "reserva_local" && b.tipo === "reserva_local") return 1;
      return 0;
    });

    return arr;
  }, [data, viaturas, localReserves, inicio, fim]);

  const filteredItems = useMemo(() => {
    let arr = flatItems;
    if (viatura) {
      arr = arr.filter((it) => it._viatura === viatura);
    }
    if (qAgenda) {
      const q = qAgenda.toLowerCase();
      arr = arr.filter((it) => {
        const nome = (it.cliente?.nome || "").toLowerCase();
        const motivo = (it.motivo || "").toLowerCase();
        const status = (it.status || "").toLowerCase();
        const contrato = (it.contrato || "").toLowerCase();
        return nome.includes(q) || motivo.includes(q) || status.includes(q) || contrato.includes(q);
      });
    }
    return arr;
  }, [flatItems, viatura, qAgenda]);

  const groupedByDay = useMemo(() => {
    const map: Record<string, Record<string, FlatItem[]>> = {};
    for (const it of filteredItems) {
      const d = it._dia;
      const v = it._viatura;
      if (!map[d]) map[d] = {};
      if (!map[d][v]) map[d][v] = [];
      map[d][v].push(it);
    }
    return map;
  }, [filteredItems]);

  const filteredInstallations = useMemo(() => {
    if (!qInstallations) return localInstallations;
    const q = qInstallations.toLowerCase();
    return localInstallations.filter((inst) => {
      const nome = inst.nomeCompleto.toLowerCase();
      const cpf = inst.cpf.toLowerCase();
      const plano = inst.planoNome.toLowerCase();
      return nome.includes(q) || cpf.includes(q) || plano.includes(q);
    });
  }, [localInstallations, qInstallations]);

  const planoSelecionado = useMemo(() => PLANOS.find((p) => p.codigo === iPlano), [iPlano]);

  useEffect(() => {
    if (planoSelecionado && planoSelecionado.options.length > 0) {
      setIOpcao(planoSelecionado.options[0].id);
      setIAppsSelecionados([]);
    }
  }, [planoSelecionado]);

  return (
    <>
      <div className="container">
        <header className="header">
          <div className="headerLeft">
            <Image src="/logo.png" alt="Logo" width={40} height={40} />
            <h1 className="title">Agenda de Viaturas</h1>
          </div>
          <div className="headerRight">
            {lastUpdated && <div className="chip small">Atualizado: {lastUpdated}</div>}
            <button className="btn" onClick={loadData} disabled={loading}>
              {loading ? "Carregando..." : "Atualizar"}
            </button>
          </div>
        </header>

        <nav className="tabs">
          <button className={cx("tab", tab === "agenda" && "active")} onClick={() => setTab("agenda")}>
            Agenda
          </button>
          <button className={cx("tab", tab === "reservar" && "active")} onClick={() => setTab("reservar")}>
            Reservar
          </button>
          <button className={cx("tab", tab === "instalacao" && "active")} onClick={() => setTab("instalacao")}>
            Instalação
          </button>
        </nav>

        {err && <div className="error">{err}</div>}

        {tab === "agenda" ? (
          <section className="section">
            <div className="filters">
              <div className="field">
                <label>Início</label>
                <input type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} />
              </div>
              <div className="field">
                <label>Dias</label>
                <input type="number" min="1" max="30" value={dias} onChange={(e) => setDias(Number(e.target.value))} />
              </div>
              <div className="field">
                <label>Viatura</label>
                <select value={viatura} onChange={(e) => setViatura(e.target.value)}>
                  <option value="">Todas</option>
                  {viaturas.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field grow search-field">
                <input type="text" value={qAgenda} onChange={(e) => setQAgenda(e.target.value)} placeholder="Buscar..." />
              </div>
            </div>

            {Object.keys(groupedByDay).length === 0 ? (
              <div className="chip">Nenhum item encontrado.</div>
            ) : (
              Object.keys(groupedByDay).map((dia) => {
                const diaFormatado = new Date(dia + "T00:00:00").toLocaleDateString("pt-BR", {
                  weekday: "long",
                  day: "2-digit",
                  month: "short",
                });
                return (
                  <div key={dia} className="dayBlock">
                    <div className="dayHeader">{diaFormatado}</div>
                    <div className="viaturaGrid">
                      {viaturas.map((vt) => {
                        const items = groupedByDay[dia][vt] || [];
                        return (
                          <div key={vt} className="viaturaCol">
                            <div className="viaturaTitle">{vt}</div>
                            {items.length === 0 ? (
                              <div className="chip tiny">Vazio</div>
                            ) : (
                              items.map((it) => (
                                <div
                                  key={it.id}
                                  className={cx("osCard", statusTone(it.status, it.tipo))}
                                  onClick={() => setSelectedAgendaItem(it)}
                                >
                                  <div className="osCardTop">
                                    <span className="osCardHour">{fmtHour(it.hora)}</span>
                                    <span className="chip tiny">{it.tipo === "reserva_local" ? "Local" : "SGP"}</span>
                                  </div>
                                  <div className="osCardMid">{safeText(it.cliente?.nome)}</div>
                                  <div className="osCardBot">
                                    <span className="chip tiny">{safeText(it.motivo)}</span>
                                    <span className="chip tiny">{safeText(it.status)}</span>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </section>
        ) : null}

        {tab === "reservar" ? (
          <section className="section">
            <div className="sectionTitle">Criar Reserva Local</div>
            <div className="form">
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
                  {viaturas.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Contrato (opcional)</label>
                <input value={rContrato} onChange={(e) => setRContrato(e.target.value)} />
              </div>
              <div className="field">
                <label>Motivo</label>
                <select value={rMotivo} onChange={(e) => setRMotivo(e.target.value)}>
                  {RESERVA_MOTIVOS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Usuário (opcional)</label>
                <input value={rUsuario} onChange={(e) => setRUsuario(e.target.value)} />
              </div>
              <div className="field grow">
                <label>Nome do Cliente</label>
                <input value={rClienteNome} onChange={(e) => setRClienteNome(e.target.value)} />
              </div>
              <div className="field grow">
                <label>Endereço</label>
                <input value={rEndereco} onChange={(e) => setREndereco(e.target.value)} />
              </div>
              <div className="field grow">
                <label>Contato</label>
                <input value={rContato} onChange={(e) => setRContato(e.target.value)} />
              </div>
              <div className="field" style={{ gridColumn: "span 3" }}>
                <button className="btn primary" onClick={addLocalReserve}>
                  Salvar Reserva
                </button>
              </div>
            </div>

            <div className="hr" />

            <div style={{ fontWeight: 950, marginBottom: "10px" }}>Reservas salvas (neste navegador)</div>
            {localReserves.length === 0 ? (
              <div className="chip">Nenhuma reserva local salva.</div>
            ) : (
              <div className="reservesList">
                {localReserves.map((r) => (
                  <div key={r.id} className="reserveItem">
                    <div className="name">{r.cliente?.nome || "—"}</div>
                    <div className="datetime">
                      {r.data} • {fmtHour(r.hora)} • {r.responsavel}
                    </div>
                    <div className="motivo">{r.motivo}</div>
                    <button className="btn" onClick={() => removeLocalReserve(r.id)}>
                      Remover
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        ) : null}

        {tab === "instalacao" ? (
          <section className="section">
            <div className="sectionTitle">Nova Ficha de Instalação</div>
            <div className="form">
              <div className="field grow">
                <label>Nome completo</label>
                <input value={iNome} onChange={(e) => setINome(e.target.value)} />
              </div>
              <div className="field">
                <label>CPF</label>
                <input value={iCpf} onChange={(e) => setICpf(e.target.value)} />
              </div>
              <div className="field">
                <label>Data de nascimento</label>
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
                <label>Senha do Wi-Fi</label>
                <input value={iWifiSenha} onChange={(e) => setIWifiSenha(e.target.value)} />
              </div>

              <div className="field grow">
                <label>Plano</label>
                <select value={iPlano} onChange={(e) => setIPlano(e.target.value)}>
                  {PLANOS.map((p) => (
                    <option key={p.codigo} value={p.codigo}>
                      {p.nome} ({p.mbps}MB) - {moneyBRLFromCents(p.valor)}
                    </option>
                  ))}
                </select>
              </div>

              {planoSelecionado && planoSelecionado.options.length > 1 && (
                <div className="field grow">
                  <label>Opção de Apps</label>
                  <select value={iOpcao} onChange={(e) => { setIOpcao(e.target.value); setIAppsSelecionados([]); }}>
                    {planoSelecionado.options.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="field" style={{ gridColumn: "span 3" }}>
                <label>Escolha os Apps</label>
                {planoSelecionado?.options.find((o) => o.id === iOpcao)?.choices.map((choice) => (
                  <div key={choice.category} style={{ marginBottom: "12px" }}>
                    <div style={{ fontWeight: 600, marginBottom: "6px" }}>
                      {choice.category} (escolha até {choice.count})
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                      {choice.options.map((app) => (
                        <label key={app} className="chip" style={{ cursor: "pointer" }}>
                          <input
                            type="checkbox"
                            checked={iAppsSelecionados.includes(app)}
                            onChange={() => handleAppToggle(app, choice.category, choice.count)}
                            style={{ marginRight: "6px" }}
                          />
                          {app}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="field" style={{ gridColumn: "span 3", display: "flex", justifyContent: "flex-end" }}>
                <button className="btn primary" onClick={addLocalInstallation}>
                  Salvar Ficha
                </button>
              </div>
            </div>

            <div className="hr" />

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px", marginBottom: "10px" }}>
              <div style={{ fontWeight: 950 }}>Fichas de Instalação salvas (neste navegador)</div>
              <div className="field grow search-field" style={{ margin: 0 }}>
                <input type="text" value={qInstallations} onChange={(e) => setQInstallations(e.target.value)} placeholder="Buscar instalações salvas..." />
              </div>
            </div>

            {filteredInstallations.length === 0 ? (
              <div className="chip">Nenhuma ficha de instalação salva ou encontrada com a busca.</div>
            ) : (
              <div className="installationsList">
                {filteredInstallations.map((inst) => (
                  <div key={inst.id} className="installationItem">
                    <div className="name">{inst.nomeCompleto}</div>
                    <div className="contact">
                      {inst.contato1} {inst.email ? `• ${inst.email}` : ""}
                    </div>
                    <div className="plan">
                      {inst.planoNome} • {inst.status}
                    </div>
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", gridColumn: "span 3" }}>
                      <button className="btn" onClick={() => setSelectedInstallation(inst)}>
                        Ver Detalhes
                      </button>
                      <button className="btn" onClick={() => removeLocalInstallation(inst.id)}>
                        Remover
                      </button>
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

      {selectedAgendaItem ? (
        <div className="overlay" onMouseDown={() => setSelectedAgendaItem(null)}>
          <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modalHead">
              <div>
                <div className="modalTitleMain">
                  {selectedAgendaItem.tipo === "reserva_local" ? "Reserva (local)" : "Ordem de Serviço"} •{" "}
                  {selectedAgendaItem._viatura} • {selectedAgendaItem._dia} {fmtHour(selectedAgendaItem.hora)}
                </div>
                <div className="modalTitleSub">
                  {safeText(selectedAgendaItem.motivo)} • {safeText(selectedAgendaItem.status)}
                </div>
              </div>
              <button className="iconBtn" onClick={() => setSelectedAgendaItem(null)}>
                X
              </button>
            </div>

            <div className="modalBody">
              <div className="modalGrid">
                <section className="modalBlock">
                  <div className="modalBlockTitle">Serviço</div>
                  <div className="kvRow">
                    <span className="k">Tipo</span>
                    <span className="v">{safeText(selectedAgendaItem.tipo)}</span>
                  </div>
                  <div className="kvRow">
                    <span className="k">ID</span>
                    <span className="v">{safeText(selectedAgendaItem.id)}</span>
                  </div>
                  <div className="kvRow">
                    <span className="k">Contrato</span>
                    <span className="v">{safeText(selectedAgendaItem.contrato)}</span>
                  </div>
                  <div className="kvRow">
                    <span className="k">Motivo</span>
                    <span className="v vClamp2">{safeText(selectedAgendaItem.motivo)}</span>
                  </div>
                  <div className="kvRow">
                    <span className="k">Usuário</span>
                    <span className="v">{safeText(selectedAgendaItem.usuario)}</span>
                  </div>
                  <div className="kvRow">
                    <span className="k">Resp.</span>
                    <span className="v">{safeText(selectedAgendaItem.responsavel)}</span>
                  </div>
                </section>

                <section className="modalBlock">
                  <div className="modalBlockTitle">Cliente</div>
                  <div className="kvRow">
                    <span className="k">Nome</span>
                    <span className="v vClamp2">{safeText(selectedAgendaItem.cliente?.nome)}</span>
                  </div>
                  <div className="kvRow">
                    <span className="k">Contato</span>
                    <span className="v">{safeText(phonesLinha(selectedAgendaItem.cliente))}</span>
                  </div>
                  <div className="kvRow">
                    <span className="k">Email</span>
                    <span className="v">{safeText(selectedAgendaItem.cliente?.email)}</span>
                  </div>
                  <div className="kvRow">
                    <span className="k">Plano</span>
                    <span className="v vClamp2">{safeText(selectedAgendaItem.cliente?.plano)}</span>
                  </div>
                  <div className="kvRow">
                    <span className="k">Endereço</span>
                    <span className="v vClamp2">{safeText(clienteEnderecoLinha(selectedAgendaItem.cliente))}</span>
                  </div>
                </section>
              </div>
            </div>

            <div className="modalFoot">
              <div className="chip small">ESC para fechar</div>
              <button className="btn" onClick={() => setSelectedAgendaItem(null)}>
                Fechar
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {selectedInstallation ? (
        <div className="overlay" onMouseDown={() => setSelectedInstallation(null)}>
          <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modalHead">
              <div>
                <div className="modalTitleMain">Ficha de Instalação • {selectedInstallation.nomeCompleto}</div>
                <div className="modalTitleSub">
                  {selectedInstallation.planoNome} • {selectedInstallation.status}
                </div>
              </div>
              <button className="iconBtn" onClick={() => setSelectedInstallation(null)}>
                X
              </button>
            </div>

            <div className="modalBody">
              <div className="modalGrid">
                <section className="modalBlock">
                  <div className="modalBlockTitle">Dados do Cliente</div>
                  <div className="kvRow">
                    <span className="k">Nome</span>
                    <span className="v vClamp2">{safeText(selectedInstallation.nomeCompleto)}</span>
                  </div>
                  <div className="kvRow">
                    <span className="k">CPF</span>
                    <span className="v">{safeText(selectedInstallation.cpf)}</span>
                  </div>
                  <div className="kvRow">
                    <span className="k">Nascimento</span>
                    <span className="v">{safeText(selectedInstallation.nascimento)}</span>
                  </div>
                  <div className="kvRow">
                    <span className="k">Contato 1</span>
                    <span className="v">{safeText(selectedInstallation.contato1)}</span>
                  </div>
                  <div className="kvRow">
                    <span className="k">Contato 2</span>
                    <span className="v">{safeText(selectedInstallation.contato2)}</span>
                  </div>
                  <div className="kvRow">
                    <span className="k">E-mail</span>
                    <span className="v">{safeText(selectedInstallation.email)}</span>
                  </div>
                </section>

                <section className="modalBlock">
                  <div className="modalBlockTitle">Endereço e Cobrança</div>
                  <div className="kvRow">
                    <span className="k">Endereço</span>
                    <span className="v vClamp2">{safeText(selectedInstallation.enderecoFull)}</span>
                  </div>
                  <div className="kvRow">
                    <span className="k">Referência</span>
                    <span className="v vClamp2">{safeText(selectedInstallation.referencia)}</span>
                  </div>
                  <div className="kvRow">
                    <span className="k">Vencimento</span>
                    <span className="v">Dia {selectedInstallation.vencimentoDia}</span>
                  </div>
                  <div className="kvRow">
                    <span className="k">Fatura</span>
                    <span className="v">{safeText(selectedInstallation.entregaFatura)}</span>
                  </div>
                  <div className="kvRow">
                    <span className="k">Taxa Inst.</span>
                    <span className="v">{safeText(selectedInstallation.taxaPagamento)}</span>
                  </div>
                </section>

                <section className="modalBlock" style={{ gridColumn: "1 / -1" }}>
                  <div className="modalBlockTitle">Detalhes do Serviço</div>
                  <div className="kvRow">
                    <span className="k">Plano</span>
                    <span className="v">
                      {safeText(selectedInstallation.planoNome)} ({selectedInstallation.planoMbps}MB)
                    </span>
                  </div>
                  <div className="kvRow">
                    <span className="k">Valor</span>
                    <span className="v">{moneyBRLFromCents(selectedInstallation.planoValor || 0)}</span>
                  </div>
                  <div className="kvRow">
                    <span className="k">Wi-Fi Nome</span>
                    <span className="v">{safeText(selectedInstallation.wifiNome)}</span>
                  </div>
                  <div className="kvRow">
                    <span className="k">Wi-Fi Senha</span>
                    <span className="v">{safeText(selectedInstallation.wifiSenha)}</span>
                  </div>
                  <div className="kvRow">
                    <span className="k">Apps Escolhidos</span>
                    <span className="v vClamp2">
                      {selectedInstallation.appsEscolhidos
                        .map((cat) => (cat.apps.length > 0 ? `${cat.category}: ${cat.apps.join(", ")}` : ""))
                        .filter(Boolean)
                        .join(" • ") || "Nenhum"}
                    </span>
                  </div>
                  <div className="kvRow">
                    <span className="k">Status</span>
                    <span className="v">{safeText(selectedInstallation.status)}</span>
                  </div>
                  <div className="kvRow">
                    <span className="k">Criado em</span>
                    <span className="v">{new Date(selectedInstallation.createdAt).toLocaleString("pt-BR")}</span>
                  </div>
                </section>
              </div>
            </div>

            <div className="modalFoot">
              <div className="chip small">ESC para fechar</div>
              <button className="btn" onClick={() => setSelectedInstallation(null)}>
                Fechar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
