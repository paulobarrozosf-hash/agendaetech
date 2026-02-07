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
  appsEscolhidos: { category: string; apps: string[] }[]; // Lista de apps estruturada
  criadoPor?: string | null;
  notasInternas?: string | null;
  reservaId?: string | null; // Link para a reserva local
};

// --- Estrutura para os planos e suas opções de apps ---
type AppCategory = "STANDARD" | "ADVANCED" | "TOP" | "PREMIUM";

type PlanAppChoice = {
  category: AppCategory;
  count: number; // Quantos apps podem ser escolhidos desta categoria
  options: string[]; // Lista de apps disponíveis nesta categoria
};

type PlanOption = {
  id: string; // Ex: "A", "B", "UNICA"
  name: string; // Ex: "Opção A", "Formato Único"
  choices: PlanAppChoice[];
};

type Plan = {
  codigo: string;
  nome: string;
  mbps: number;
  valor: number; // em centavos
  options: PlanOption[];
};

// --- Dados dos Planos (detalhado conforme sua especificação) ---
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

// --- Motivos de Reserva ---
const RESERVA_MOTIVOS = [
  "Instalação",
  "Mudança de Endereço",
  "Reativação",
  "Suporte",
  "Recolhimento",
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
function statusTone(status?: string | null, tipo?: string) {
  if (tipo === "reserva_local") return "gold"; // Reservas locais sempre gold
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

// --- Componente principal da página ---
export default function HomePage() {
  // --- Estado da Agenda ---
  const [tab, setTab] = useState<TabKey>("agenda");
  const [data, setData] = useState<AgendaResp | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const [inicio, setInicio] = useState(hojeISO());
  const [dias, setDias] = useState(7);
  const fim = useMemo(() => addDays(inicio, dias - 1), [inicio, dias]);

  const [viatura, setViatura] = useState("");
  const [maxClientes, setMaxClientes] = useState("200");
  const [q, setQ] = useState("");

  const [selectedAgendaItem, setSelectedAgendaItem] = useState<FlatItem | null>(null); // Para modal da agenda

  // --- Estado das Reservas Locais (localStorage) ---
  const [localReserves, setLocalReserves] = useState<Item[]>([]);
  const [rData, setRData] = useState(hojeISO());
  const [rHora, setRHora] = useState("08:00");
  const [rViatura, setRViatura] = useState("VT01");
  const [rContrato, setRContrato] = useState("");
  const [rMotivo, setRMotivo] = useState(RESERVA_MOTIVOS[0]);
  const [rUsuario, setRUsuario] = useState("");
  const [rResp, setRResp] = useState("VT01");
  const [rClienteNome, setRClienteNome] = useState("");
  const [rEndereco, setREndereco] = useState("");
  const [rContato, setRContato] = useState("");

  // --- Estado das Instalações Locais (localStorage) ---
  const [localInstallations, setLocalInstallations] = useState<InstallationData[]>([]);
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
  const [iPlanoOptionId, setIPlanoOptionId] = useState(PLANOS[0].options[0].id);
  const [iAppsSelecionados, setIAppsSelecionados] = useState<string[]>([]);

  const [selectedInstallation, setSelectedInstallation] = useState<InstallationData | null>(null); // Para modal da instalação

  // --- Lógica de seleção de plano e opções ---
  const selectedPlan = useMemo(() => {
    return PLANOS.find((p) => p.codigo === iPlanoCodigo) || PLANOS[0];
  }, [iPlanoCodigo]);

  const selectedPlanOption = useMemo(() => {
    return selectedPlan.options.find((opt) => opt.id === iPlanoOptionId) || selectedPlan.options[0];
  }, [selectedPlan, iPlanoOptionId]);

  // --- Funções de manipulação de localStorage ---
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedReserves = localStorage.getItem("localReserves");
      if (storedReserves) {
        setLocalReserves(JSON.parse(storedReserves));
      }
      const storedInstallations = localStorage.getItem("localInstallations");
      if (storedInstallations) {
        setLocalInstallations(JSON.parse(storedInstallations));
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("localReserves", JSON.stringify(localReserves));
    }
  }, [localReserves]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("localInstallations", JSON.stringify(localInstallations));
    }
  }, [localInstallations]);

  // --- Funções para Reservas Locais ---
  const addLocalReserve = () => {
    if (!rData || !rHora || !rViatura || !rMotivo || !rClienteNome || !rEndereco || !rContato) {
      alert("Por favor, preencha todos os campos obrigatórios da reserva.");
      return;
    }

    const newReserve: Item = {
      tipo: "reserva_local",
      id: `LOCAL-${Date.now()}`,
      contrato: rContrato || null,
      status: "Reservado",
      data: rData,
      hora: rHora,
      motivo: rMotivo,
      responsavel: rViatura,
      usuario: rUsuario || null,
      cliente: {
        nome: rClienteNome,
        telefones: rContato ? [rContato] : [],
        endereco: { logradouro: rEndereco },
      },
      _internal: {
        // Dados adicionais para o modal, se necessário
      },
    };
    setLocalReserves((prev) => [...prev, newReserve]);
    alert("Reserva salva no navegador e adicionada à agenda!");
    // Limpar formulário
    setRData(hojeISO());
    setRHora("08:00");
    setRViatura("VT01");
    setRContrato("");
    setRMotivo(RESERVA_MOTIVOS[0]);
    setRUsuario("");
    setRResp("VT01");
    setRClienteNome("");
    setREndereco("");
    setRContato("");
  };

  const removeLocalReserve = (id: string) => {
    if (confirm("Tem certeza que deseja remover esta reserva local?")) {
      setLocalReserves((prev) => prev.filter((r) => r.id !== id));
    }
  };

  // --- Funções para Instalações Locais ---
  const handleAppToggle = (app: string, category: AppCategory, maxCount: number) => {
    setIAppsSelecionados((prev) => {
      const appsInCategory = selectedPlanOption.choices
        .find(c => c.category === category)?.options || [];

      const currentSelectedInCategory = prev.filter(a => appsInCategory.includes(a));

      if (prev.includes(app)) {
        return prev.filter((a) => a !== app);
      } else {
        if (currentSelectedInCategory.length < maxCount) {
          return [...prev, app];
        } else {
          alert(`Você pode escolher no máximo ${maxCount} app(s) da categoria ${category}.`);
          return prev;
        }
      }
    });
  };

  const addLocalInstallation = () => {
    if (!iNome || !iCpf || !iContato1 || !iEndereco || !iWifiNome || !iWifiSenha || iWifiSenha.length < 8) {
      alert("Por favor, preencha todos os campos obrigatórios da ficha de instalação e verifique a senha do Wi-Fi (mínimo 8 dígitos).");
      return;
    }

    // Validação de quantidade de apps selecionados por categoria
    for (const choice of selectedPlanOption.choices) {
      const appsInCategory = choice.options;
      const selectedCount = iAppsSelecionados.filter(a => appsInCategory.includes(a)).length;
      if (selectedCount !== choice.count) {
        alert(`Para o plano ${selectedPlan.nome} (${selectedPlanOption.name}), você deve escolher exatamente ${choice.count} app(s) da categoria ${choice.category}. Atualmente você selecionou ${selectedCount}.`);
        return;
      }
    }

    const newInstallation: InstallationData = {
      id: `INST-${Date.now()}`,
      createdAt: new Date().toISOString(),
      status: "CRIADO", // Ou "AGENDADO" se linkar com reserva
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
      appsEscolhidos: selectedPlanOption.choices.map(choice => ({
        category: choice.category,
        apps: iAppsSelecionados.filter(app => choice.options.includes(app))
      })),
      criadoPor: "Usuário Local", // Pode ser dinâmico
      notasInternas: null,
    };
    setLocalInstallations((prev) => [...prev, newInstallation]);
    alert("Ficha de instalação salva no navegador!");
    // Limpar formulário
    setINome(""); setICpf(""); setINasc("");
    setIContato1(""); setIContato2(""); setIEmail("");
    setIEndereco(""); setIRef("");
    setIVenc(10); setIFatura("WHATSAPP_EMAIL"); setITaxa("PIX");
    setIWifiNome(""); setIWifiSenha("");
    setIPlanoCodigo(PLANOS[0].codigo);
    setIPlanoOptionId(PLANOS[0].options[0].id);
    setIAppsSelecionados([]);
  };

  const removeLocalInstallation = (id: string) => {
    if (confirm("Tem certeza que deseja remover esta ficha de instalação local?")) {
      setLocalInstallations((prev) => prev.filter((inst) => inst.id !== id));
    }
  };

  // --- Lógica de carregamento da Agenda ---
  const loadAgenda = async () => {
    setLoading(true);
    setErr(null);
    try {
      const qs = new URLSearchParams({
        inicio,
        fim,
        max_clientes: maxClientes,
      });
      const r = await fetch(`/api/agenda?${qs.toString()}`, { cache: "no-store" });
      const t = await r.text();
      if (!r.ok) throw new Error(t);
      const j: AgendaResp = JSON.parse(t);
      setData(j);
      setLastUpdated(new Date().toLocaleString("pt-BR"));
    } catch (e: any) {
      setErr(e?.message || "Erro ao carregar agenda.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAgenda();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inicio, fim, maxClientes]); // Recarrega quando início, fim ou maxClientes mudam

  // --- Processamento e filtragem dos itens da agenda ---
  const flatItemsAll = useMemo(() => {
    const items: FlatItem[] = [];
    // Adiciona itens do SGP
    data?.dias?.forEach((dia) => {
      Object.entries(dia.porViatura).forEach(([viaturaKey, viaturaItems]) => {
        viaturaItems.forEach((item) => {
          items.push({ ...item, _dia: dia.data, _viatura: viaturaKey });
        });
      });
    });
    // Adiciona reservas locais
    localReserves.forEach((reserve) => {
      items.push({
        ...reserve,
        _dia: reserve.data || hojeISO(),
        _viatura: reserve.responsavel || "N/A",
      });
    });
    return items.sort((a, b) => {
      const timeA = `${a._dia} ${a.hora}`;
      const timeB = `${b._dia} ${b.hora}`;
      return timeA.localeCompare(timeB);
    });
  }, [data, localReserves]);

  const filtered = useMemo(() => {
    let currentItems = flatItemsAll;

    // Filtro por viatura
    if (viatura) {
      currentItems = currentItems.filter((it) => it._viatura === viatura);
    }

    // Filtro por busca (q)
    if (q) {
      const lowerQ = q.toLowerCase();
      currentItems = currentItems.filter((it) => {
        const searchString = [
          it.cliente?.nome,
          it.contrato,
          it.cliente?.endereco?.logradouro,
          it.motivo,
          phonesLinha(it.cliente),
          it.cliente?.plano,
        ].filter(Boolean).join(" ").toLowerCase();
        return searchString.includes(lowerQ);
      });
    }
    return currentItems;
  }, [flatItemsAll, viatura, q]);

  const grouped = useMemo(() => {
    const map = new Map<string, FlatItem[]>();
    filtered.forEach((item) => {
      const dia = item._dia;
      if (!map.has(dia)) {
        map.set(dia, []);
      }
      map.get(dia)?.push(item);
    });
    return Array.from(map.entries()).sort(([diaA], [diaB]) => diaA.localeCompare(diaB));
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
                            onClick={() => setSelectedAgendaItem(it)}
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
                  // Ao mudar de plano, resetar a opção e os apps selecionados
                  const newPlan = PLANOS.find(p => p.codigo === e.target.value) || PLANOS[0];
                  setIPlanoOptionId(newPlan.options[0].id);
                  setIAppsSelecionados([]);
                }}>
                  {PLANOS.map((p) => (
                    <option key={p.codigo} value={p.codigo}>
                      {p.nome} ({p.mbps}MB) - {moneyBRLFromCents(p.valor)}
                    </option>
                  ))}
                </select>
              </div>

              {selectedPlan.options.length > 1 && (
                <div className="field grow">
                  <label>Formato do Plano</label>
                  <select value={iPlanoOptionId} onChange={(e) => {
                    setIPlanoOptionId(e.target.value);
                    setIAppsSelecionados([]); // Limpa apps ao mudar de opção
                  }}>
                    {selectedPlan.options.map((opt) => (
                      <option key={opt.id} value={opt.id}>{opt.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="field grow" style={{ gridColumn: "1 / -1" }}>
                <label>Aplicativos do Plano ({selectedPlan.nome} - {selectedPlanOption.name})</label>
                {selectedPlanOption.choices.map((choice) => (
                  <div key={choice.category} className="appGroup">
                    <div className="appGroupTitle">
                      {choice.category} (Escolha {choice.count} app{choice.count > 1 ? 's' : ''})
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
                      <button className="btn" onClick={() => setSelectedInstallation(inst)}>Ver Detalhes</button>
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
                  <div className="kvRow"><span className="k">Tipo</span><span className="v">{safeText(selectedAgendaItem.tipo)}</span></div>
                  <div className="kvRow"><span className="k">ID</span><span className="v">{safeText(selectedAgendaItem.id)}</span></div>
                  <div className="kvRow"><span className="k">Contrato</span><span className="v">{safeText(selectedAgendaItem.contrato)}</span></div>
                  <div className="kvRow"><span className="k">Motivo</span><span className="v vClamp2">{safeText(selectedAgendaItem.motivo)}</span></div>
                  <div className="kvRow"><span className="k">Usuário</span><span className="v">{safeText(selectedAgendaItem.usuario)}</span></div>
                  <div className="kvRow"><span className="k">Resp.</span><span className="v">{safeText(selectedAgendaItem.responsavel)}</span></div>
                </section>

                <section className="modalBlock">
                  <div className="modalBlockTitle">Cliente</div>
                  <div className="kvRow"><span className="k">Nome</span><span className="v vClamp2">{safeText(selectedAgendaItem.cliente?.nome)}</span></div>
                  <div className="kvRow"><span className="k">Contato</span><span className="v">{safeText(phonesLinha(selectedAgendaItem.cliente))}</span></div>
                  <div className="kvRow"><span className="k">Email</span><span className="v">{safeText(selectedAgendaItem.cliente?.email)}</span></div>
                  <div className="kvRow"><span className="k">Plano</span><span className="v vClamp2">{safeText(selectedAgendaItem.cliente?.plano)}</span></div>
                  <div className="kvRow"><span className="k">Endereço</span><span className="v vClamp2">{safeText(clienteEnderecoLinha(selectedAgendaItem.cliente))}</span></div>
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

      {/* --- MODAL DETALHES (para fichas de instalação) --- */}
      {selectedInstallation ? (
        <div className="overlay" onMouseDown={() => setSelectedInstallation(null)}>
          <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modalHead">
              <div>
                <div className="modalTitleMain">
                  Ficha de Instalação • {selectedInstallation.nomeCompleto}
                </div>
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
                  <div className="kvRow"><span className="k">Nome</span><span className="v vClamp2">{safeText(selectedInstallation.nomeCompleto)}</span></div>
                  <div className="kvRow"><span className="k">CPF</span><span className="v">{safeText(selectedInstallation.cpf)}</span></div>
                  <div className="kvRow"><span className="k">Nascimento</span><span className="v">{safeText(selectedInstallation.nascimento)}</span></div>
                  <div className="kvRow"><span className="k">Contato 1</span><span className="v">{safeText(selectedInstallation.contato1)}</span></div>
                  <div className="kvRow"><span className="k">Contato 2</span><span className="v">{safeText(selectedInstallation.contato2)}</span></div>
                  <div className="kvRow"><span className="k">E-mail</span><span className="v">{safeText(selectedInstallation.email)}</span></div>
                </section>

                <section className="modalBlock">
                  <div className="modalBlockTitle">Endereço e Cobrança</div>
                  <div className="kvRow"><span className="k">Endereço</span><span className="v vClamp2">{safeText(selectedInstallation.enderecoFull)}</span></div>
                  <div className="kvRow"><span className="k">Referência</span><span className="v vClamp2">{safeText(selectedInstallation.referencia)}</span></div>
                  <div className="kvRow"><span className="k">Vencimento</span><span className="v">Dia {selectedInstallation.vencimentoDia}</span></div>
                  <div className="kvRow"><span className="k">Fatura</span><span className="v">{safeText(selectedInstallation.entregaFatura)}</span></div>
                  <div className="kvRow"><span className="k">Taxa Inst.</span><span className="v">{safeText(selectedInstallation.taxaPagamento)}</span></div>
                </section>

                <section className="modalBlock" style={{ gridColumn: "1 / -1" }}>
                  <div className="modalBlockTitle">Detalhes do Serviço</div>
                  <div className="kvRow"><span className="k">Plano</span><span className="v">{safeText(selectedInstallation.planoNome)} ({selectedInstallation.planoMbps}MB)</span></div>
                  <div className="kvRow"><span className="k">Valor</span><span className="v">{moneyBRLFromCents(selectedInstallation.planoValor || 0)}</span></div>
                  <div className="kvRow"><span className="k">Wi-Fi Nome</span><span className="v">{safeText(selectedInstallation.wifiNome)}</span></div>
                  <div className="kvRow"><span className="k">Wi-Fi Senha</span><span className="v">{safeText(selectedInstallation.wifiSenha)}</span></div>
                  <div className="kvRow"><span className="k">Apps Escolhidos</span><span className="v vClamp2">
                    {selectedInstallation.appsEscolhidos.map(cat =>
                      cat.apps.length > 0 ? `${cat.category}: ${cat.apps.join(", ")}` : ''
                    ).filter(Boolean).join(" • ") || "Nenhum"
                    }
                  </span></div>
                  <div className="kvRow"><span className="k">Status</span><span className="v">{safeText(selectedInstallation.status)}</span></div>
                  <div className="kvRow"><span className="k">Criado em</span><span className="v">{new Date(selectedInstallation.createdAt).toLocaleString('pt-BR')}</span></div>
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
