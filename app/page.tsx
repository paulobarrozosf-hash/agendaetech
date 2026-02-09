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
  appsEscolhidos: { category: string; apps: string[] }[];
  criadoPor?: string | null;
  notasInternas?: string | null;
  reservaId?: string | null;
};

// --- Estrutura para os planos e suas opções de apps ---
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

// --- Dados dos Planos ---
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
  const [qAgenda, setQAgenda] = useState("");

  const [selectedAgendaItem, setSelectedAgendaItem] = useState<FlatItem | null>(null);

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
  const [qInstallations, setQInstallations] = useState("");

  const [selectedInstallation, setSelectedInstallation] = useState<InstallationData | null>(null);

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
      _internal: {},
    };
    setLocalReserves((prev) => [...prev, newReserve]);
    alert("Reserva salva no navegador e adicionada à agenda!");
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
  const addLocalInstallation = () => {
    if (!iNome || !iCpf || !iContato1 || !iEndereco || !iWifiNome || !iWifiSenha) {
      alert("Por favor, preencha todos os campos obrigatórios da instalação.");
      return;
    }

    if (iWifiSenha.length < 8) {
      alert("A senha do Wi-Fi deve ter no mínimo 8 caracteres.");
      return;
    }

    // Validar se a quantidade de apps selecionados está correta
    const appsGrouped: { category: string; apps: string[] }[] = [];
    for (const choice of selectedPlanOption.choices) {
      const appsInCategory = iAppsSelecionados.filter(app => choice.options.includes(app));
      if (appsInCategory.length !== choice.count) {
        alert(`Você deve escolher exatamente ${choice.count} app(s) da categoria ${choice.category}.`);
        return;
      }
      appsGrouped.push({ category: choice.category, apps: appsInCategory });
    }

    const newInstallation: InstallationData = {
      id: `INST-${Date.now()}`,
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
      appsEscolhidos: appsGrouped,
      criadoPor: null,
      notasInternas: null,
      reservaId: null,
    };

    setLocalInstallations((prev) => [...prev, newInstallation]);
    alert("Ficha de instalação salva com sucesso!");

    // Limpar formulário
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
    setITaxa("PIX");
    setIWifiNome("");
    setIWifiSenha("");
    setIPlanoCodigo(PLANOS[0].codigo);
    setIPlanoOptionId(PLANOS[0].options[0].id);
    setIAppsSelecionados([]);
  };

  const removeLocalInstallation = (id: string) => {
    if (confirm("Tem certeza que deseja remover esta ficha de instalação?")) {
      setLocalInstallations((prev) => prev.filter((inst) => inst.id !== id));
    }
  };

  const handleAppToggle = (app: string, category: AppCategory, maxCount: number) => {
    const currentCategoryApps = iAppsSelecionados.filter(a =>
      selectedPlanOption.choices.find(c => c.category === category)?.options.includes(a)
    );

    if (iAppsSelecionados.includes(app)) {
      setIAppsSelecionados(prev => prev.filter(a => a !== app));
    } else {
      if (currentCategoryApps.length < maxCount) {
        setIAppsSelecionados(prev => [...prev, app]);
      } else {
        alert(`Você já selecionou o máximo de ${maxCount} app(s) para a categoria ${category}.`);
      }
    }
  };

  // --- Filtros de busca ---
  const filteredInstallations = useMemo(() => {
    if (!qInstallations.trim()) return localInstallations;
    const q = qInstallations.toLowerCase();
    return localInstallations.filter(inst =>
      inst.nomeCompleto.toLowerCase().includes(q) ||
      inst.cpf.includes(q) ||
      inst.contato1.includes(q) ||
      inst.planoNome.toLowerCase().includes(q)
    );
  }, [localInstallations, qInstallations]);

  // --- Carregar dados da agenda ---
  const loadData = async () => {
    setLoading(true);
    setErr(null);
    try {
      const qs = new URLSearchParams();
      qs.append("inicio", inicio);
      qs.append("fim", fim);
      qs.append("cliente", "1");
      qs.append("max_clientes", maxClientes);

      const resp = await fetch(`/api/agenda?${qs.toString()}`);
      const text = await resp.text();

      if (!resp.ok) {
        let errorMsg = `Erro ${resp.status}`;
        try {
          const errJson = JSON.parse(text);
          if (errJson.error) errorMsg = errJson.error;
          if (errJson.details) errorMsg += ` (${errJson.details})`;
        } catch {
          errorMsg += `: ${text.slice(0, 200)}`;
        }
        throw new Error(errorMsg);
      }

      const json: AgendaResp = JSON.parse(text);

      // Mesclar com reservas locais
      const merged: Dia[] = json.dias.map((d) => {
        const localForDay = localReserves.filter((r) => r.data === d.data);
        const porViatura: Record<string, Item[]> = { ...d.porViatura };

        localForDay.forEach((lr) => {
          const vt = lr.responsavel || "VT01";
          if (!porViatura[vt]) porViatura[vt] = [];
          porViatura[vt].push(lr);
        });

        // Ordenar cada viatura por hora
        Object.keys(porViatura).forEach((vt) => {
          porViatura[vt].sort((a, b) => {
            const ha = a.hora || "00:00";
            const hb = b.hora || "00:00";
            if (ha < hb) return -1;
            if (ha > hb) return 1;
            // Se mesma hora, priorizar reserva local
            if (a.tipo === "reserva_local" && b.tipo !== "reserva_local") return -1;
            if (a.tipo !== "reserva_local" && b.tipo === "reserva_local") return 1;
            return 0;
          });
        });

        return { ...d, porViatura };
      });

      setData({ ...json, dias: merged });
      setLastUpdated(new Date().toLocaleTimeString("pt-BR"));
    } catch (e: any) {
      setErr(e.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inicio, dias, maxClientes]);

  // --- Flat items (para filtro e modal) ---
  const flatItems = useMemo(() => {
    if (!data) return [];
    const arr: FlatItem[] = [];
    data.dias.forEach((d) => {
      Object.entries(d.porViatura).forEach(([vt, items]) => {
        items.forEach((it) => {
          arr.push({ ...it, _dia: d.data, _viatura: vt });
        });
      });
    });
    return arr;
  }, [data]);

  const filteredFlatItems = useMemo(() => {
    if (!qAgenda.trim()) return flatItems;
    const q = qAgenda.toLowerCase();
    return flatItems.filter(
      (it) =>
        it.id?.toLowerCase().includes(q) ||
        it.contrato?.toLowerCase().includes(q) ||
        it.motivo?.toLowerCase().includes(q) ||
        it.cliente?.nome?.toLowerCase().includes(q) ||
        it._viatura.toLowerCase().includes(q)
    );
  }, [flatItems, qAgenda]);

  const groupedByDay = useMemo(() => {
    const map: Record<string, FlatItem[]> = {};
    filteredFlatItems.forEach((it) => {
      if (!map[it._dia]) map[it._dia] = [];
      map[it._dia].push(it);
    });
    return map;
  }, [filteredFlatItems]);

  // --- Keyboard shortcuts ---
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedAgendaItem(null);
        setSelectedInstallation(null);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  // --- Render ---
  const viaturas = data?.viaturas || ["VT01", "VT02", "VT03", "VT04"];

  return (
    <>
      <div className="container">
        <header className="header">
          <div className="headerLeft">
            <Image
              src="/logo.png"
              alt="Logo E-TECH"
              width={40}
              height={40}
              className="logo"
            />
            <h1 className="title">Agenda E-TECH</h1>
          </div>
          {lastUpdated && (
            <div className="chip small muted">
              Última atualização: {lastUpdated}
            </div>
          )}
        </header>

        <nav className="tabs">
          <button
            className={cx("tab", tab === "agenda" && "active")}
            onClick={() => setTab("agenda")}
          >
            📅 Agenda
          </button>
          <button
            className={cx("tab", tab === "reservar" && "active")}
            onClick={() => setTab("reservar")}
          >
            ➕ Reservar Horário
          </button>
          <button
            className={cx("tab", tab === "instalacao" && "active")}
            onClick={() => setTab("instalacao")}
          >
            📋 Ficha de Instalação
          </button>
        </nav>

        {tab === "agenda" ? (
          <section className="section">
            <div className="controls">
              <div className="field">
                <label>Início</label>
                <input
                  type="date"
                  value={inicio}
                  onChange={(e) => setInicio(e.target.value)}
                />
              </div>
              <div className="field">
                <label>Dias</label>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={dias}
                  onChange={(e) => setDias(Number(e.target.value))}
                />
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
              <div className="field">
                <label>Max Clientes</label>
                <input
                  type="number"
                  min={1}
                  max={500}
                  value={maxClientes}
                  onChange={(e) => setMaxClientes(e.target.value)}
                />
              </div>
              <div className="field grow search-field">
                <input
                  type="text"
                  value={qAgenda}
                  onChange={(e) => setQAgenda(e.target.value)}
                  placeholder="Buscar..."
                />
              </div>
              <button className="btn primary" onClick={loadData} disabled={loading}>
                {loading ? "Carregando..." : "Atualizar"}
              </button>
            </div>

            {err && <div className="error">{err}</div>}

            {data && (
              <div className="stats">
                <div className="chip">
                  Total de O.S.: {data.totais?.os || 0}
                </div>
                <div className="chip">
                  Reservas locais: {localReserves.length}
                </div>
                {data.meta?.contratos_unicos_total != null && (
                  <div className="chip">
                    Contratos únicos: {data.meta.contratos_unicos_total}
                  </div>
                )}
                {data.meta?.contratos_consultados != null && (
                  <div className="chip">
                    Clientes consultados: {data.meta.contratos_consultados}
                  </div>
                )}
              </div>
            )}

            {Object.keys(groupedByDay).length === 0 && !loading && (
              <div className="chip">Nenhuma O.S. ou reserva encontrada.</div>
            )}

            {Object.entries(groupedByDay).map(([dia, items]) => {
              const byViatura: Record<string, FlatItem[]> = {};
              items.forEach((it) => {
                if (!byViatura[it._viatura]) byViatura[it._viatura] = [];
                byViatura[it._viatura].push(it);
              });

              const viaturasFiltradas = viatura
                ? viaturas.filter((v) => v === viatura)
                : viaturas;

              return (
                <div key={dia} className="dayBlock">
                  <div className="dayHeader">{dia}</div>
                  <div className="dayGrid">
                    {viaturasFiltradas.map((vt) => {
                      const osVt = byViatura[vt] || [];
                      return (
                        <div key={vt} className="viaturaCol">
                          <div className="viaturaHeader">{vt}</div>
                          {osVt.length === 0 ? (
                            <div className="chip small muted">Nenhuma O.S.</div>
                          ) : (
                            osVt.map((it) => (
                              <div
                                key={it.id}
                                className={cx("osCard", statusTone(it.status, it.tipo))}
                                onClick={() => setSelectedAgendaItem(it)}
                              >
                                <div className="osCardTop">
                                  <span className="osId">{it.id}</span>
                                  <span className="osHora">{fmtHour(it.hora)}</span>
                                </div>
                                <div className="osCardMid">
                                  {safeText(it.cliente?.nome)}
                                </div>
                                <div className="osCardBot">
                                  <span className="chip tiny">
                                    {safeText(it.motivo)}
                                  </span>
                                  <span className="chip tiny">
                                    {safeText(it.status)}
                                  </span>
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
            })}
          </section>
        ) : null}

        {tab === "reservar" ? (
          <section className="section">
            <div className="sectionTitle">Criar Reserva Local</div>
            <div className="form">
              <div className="field">
                <label>Data</label>
                <input
                  type="date"
                  value={rData}
                  onChange={(e) => setRData(e.target.value)}
                />
              </div>
              <div className="field">
                <label>Hora</label>
                <input
                  type="time"
                  value={rHora}
                  onChange={(e) => setRHora(e.target.value)}
                />
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
                <input
                  value={rContrato}
                  onChange={(e) => setRContrato(e.target.value)}
                />
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
                <input
                  value={rUsuario}
                  onChange={(e) => setRUsuario(e.target.value)}
                />
              </div>
              <div className="field grow">
                <label>Nome do Cliente</label>
                <input
                  value={rClienteNome}
                  onChange={(e) => setRClienteNome(e.target.value)}
                />
              </div>
              <div className="field grow">
                <label>Endereço</label>
                <input
                  value={rEndereco}
                  onChange={(e) => setREndereco(e.target.value)}
                />
              </div>
              <div className="field grow">
                <label>Contato</label>
                <input
                  value={rContato}
                  onChange={(e) => setRContato(e.target.value)}
                />
              </div>
              <div className="field" style={{ gridColumn: "span 3" }}>
                <button className="btn primary" onClick={addLocalReserve}>
                  Salvar Reserva
                </button>
              </div>
            </div>

            <div className="hr" />

            <div style={{ fontWeight: 950, marginBottom: "10px" }}>
              Reservas salvas (neste navegador)
            </div>
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
                    <button
                      className="btn"
                      onClick={() => removeLocalReserve(r.id)}
                    >
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
                <input
                  type="date"
                  value={iNasc}
                  onChange={(e) => setINasc(e.target.value)}
                />
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
                <input value={iWifiNome} onChange={(e) => setIWifiNome(e.target

