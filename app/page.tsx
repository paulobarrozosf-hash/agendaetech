"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  InstallationData,
  InstallStatus,
  BillingDelivery,
  InstallFeePayment,
  PLANOS,
  hojeISO,
  moneyBRLFromCents,
  cx,
} from "../page"; // Importar tipos e funções globais de page.tsx

export default function InstalacaoTab() {
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
  const [qInstallations, setQInstallations] = useState(""); // Campo de busca para instalações

  const [selectedInstallation, setSelectedInstallation] = useState<InstallationData | null>(null); // Para modal da instalação

  // --- Lógica de seleção de plano e opções ---
  const selectedPlan = useMemo(() => {
    return PLANOS.find((p) => p.codigo === iPlanoCodigo) || PLANOS[0];
  }, [iPlanoCodigo]);

  const selectedPlanOption = useMemo(() => {
    return selectedPlan.options.find((opt) => opt.id === iPlanoOptionId) || selectedPlan.options[0];
  }, [selectedPlan, iPlanoOptionId]);

  // Carregar instalações locais do localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedInstallations = localStorage.getItem("localInstallations");
      if (storedInstallations) {
        setLocalInstallations(JSON.parse(storedInstallations));
      }
    }
  }, []);

  // Salvar instalações locais no localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("localInstallations", JSON.stringify(localInstallations));
    }
  }, [localInstallations]);

  // --- Funções para Instalações Locais ---
  const handleAppToggle = useCallback((app: string, category: string, maxCount: number) => {
    setIAppsSelecionados((prev) => {
      const currentAppsInCategory = selectedPlanOption.choices
        .find(c => c.category === category)
        ?.options.filter(opt => prev.includes(opt)) || [];

      if (prev.includes(app)) {
        return prev.filter((a) => a !== app);
      } else {
        if (currentAppsInCategory.length < maxCount) {
          return [...prev, app];
        } else {
          alert(`Você pode escolher no máximo ${maxCount} app(s) da categoria ${category}.`);
          return prev;
        }
      }
    });
  }, [selectedPlanOption]);

  const addLocalInstallation = () => {
    if (!iNome || !iCpf || !iContato1 || !iEndereco || !iWifiNome || !iWifiSenha || !iPlanoCodigo) {
      alert("Por favor, preencha todos os campos obrigatórios da ficha de instalação.");
      return;
    }
    if (iWifiSenha.length < 8) {
      alert("A senha do Wi-Fi deve ter no mínimo 8 dígitos.");
      return;
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
      planoCodigo: iPlanoCodigo,
      planoNome: selectedPlan.nome,
      planoMbps: selectedPlan.mbps,
      planoValor: selectedPlan.valor,
      appsEscolhidos: selectedPlanOption.choices.map(choice => ({
        category: choice.category,
        apps: iAppsSelecionados.filter(app => choice.options.includes(app))
      })),
      criadoPor: "Usuário Local", // Pode ser dinâmico no futuro
      notasInternas: null,
      reservaId: null, // Pode ser linkado a uma reserva futura
    };
    setLocalInstallations((prev) => [...prev, newInstallation]);
    alert("Ficha de instalação salva localmente!");
    // Limpar formulário
    setINome("");
    setICpf("");
    setINasc("");
    setIContato1("");
    setIContato2("");
    setIEmail("");
    setIEndereco("");
    setIRef("");
    setIWifiNome("");
    setIWifiSenha("");
    setIAppsSelecionados([]);
  };

  const removeLocalInstallation = (id: string) => {
    if (confirm("Tem certeza que deseja remover esta ficha de instalação?")) {
      setLocalInstallations((prev) => prev.filter((inst) => inst.id !== id));
      setSelectedInstallation(null); // Fecha o modal se a instalação removida estiver aberta
    }
  };

  const filteredInstallations = localInstallations.filter((inst) => {
    const query = qInstallations.toLowerCase();
    return (
      inst.nomeCompleto.toLowerCase().includes(query) ||
      inst.cpf.toLowerCase().includes(query) ||
      inst.contato1.toLowerCase().includes(query) ||
      inst.enderecoFull.toLowerCase().includes(query) ||
      inst.planoNome.toLowerCase().includes(query) ||
      inst.status.toLowerCase().includes(query)
    );
  });

  return (
    <section className="section">
      <h2 className="sectionTitle">Nova Instalação</h2>
      <div className="formGrid">
        <div className="field grow">
          <label>Nome Completo</label>
          <input value={iNome} onChange={(e) => setINome(e.target.value)} />
        </div>
        <div className="field">
          <label>CPF</label>
          <input value={iCpf} onChange={(e) => setICpf(e.target.value)} />
        </div>
        <div className="field">
          <label>Data de Nascimento (opcional)</label>
          <input type="date" value={iNasc} onChange={(e) => setINasc(e.target.value)} />
        </div>
        <div className="field">
          <label>Contato 1</label>
          <input value={iContato1} onChange={(e) => setIContato1(e.target.value)} />
        </div>
        <div className="field">
          <label>Contato 2 (opcional)</label>
          <input value={iContato2} onChange={(e) => setIContato2(e.target.value)} />
        </div>
        <div className="field grow">
          <label>E-mail (opcional)</label>
          <input type="email" value={iEmail} onChange={(e) => setIEmail(e.target.value)} />
        </div>
        <div className="field grow" style={{ gridColumn: "1 / -1" }}>
          <label>Endereço Completo (Rua, Número, Bairro, Cidade, UF, CEP)</label>
          <input value={iEndereco} onChange={(e) => setIEndereco(e.target.value)} />
        </div>
        <div className="field grow" style={{ gridColumn: "1 / -1" }}>
          <label>Ponto de Referência (opcional)</label>
          <input value={iRef} onChange={(e) => setIRef(e.target.value)} />
        </div>

        <div className="field">
          <label>Dia de Vencimento</label>
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
                  <div className="kvRow"><span className="k">Nome</span><span className="v vClamp2">{selectedInstallation.nomeCompleto}</span></div>
                  <div className="kvRow"><span className="k">CPF</span><span className="v">{selectedInstallation.cpf}</span></div>
                  <div className="kvRow"><span className="k">Nascimento</span><span className="v">{selectedInstallation.nascimento || '—'}</span></div>
                  <div className="kvRow"><span className="k">Contato 1</span><span className="v">{selectedInstallation.contato1}</span></div>
                  <div className="kvRow"><span className="k">Contato 2</span><span className="v">{selectedInstallation.contato2 || '—'}</span></div>
                  <div className="kvRow"><span className="k">E-mail</span><span className="v">{selectedInstallation.email || '—'}</span></div>
                </section>

                <section className="modalBlock">
                  <div className="modalBlockTitle">Endereço e Cobrança</div>
                  <div className="kvRow"><span className="k">Endereço</span><span className="v vClamp2">{selectedInstallation.enderecoFull}</span></div>
                  <div className="kvRow"><span className="k">Referência</span><span className="v vClamp2">{selectedInstallation.referencia || '—'}</span></div>
                  <div className="kvRow"><span className="k">Vencimento</span><span className="v">Dia {selectedInstallation.vencimentoDia}</span></div>
                  <div className="kvRow"><span className="k">Fatura</span><span className="v">{selectedInstallation.entregaFatura}</span></div>
                  <div className="kvRow"><span className="k">Taxa Inst.</span><span className="v">{selectedInstallation.taxaPagamento}</span></div>
                </section>

                <section className="modalBlock" style={{ gridColumn: "1 / -1" }}>
                  <div className="modalBlockTitle">Detalhes do Serviço</div>
                  <div className="kvRow"><span className="k">Plano</span><span className="v">{selectedInstallation.planoNome} ({selectedInstallation.planoMbps}MB)</span></div>
                  <div className="kvRow"><span className="k">Valor</span><span className="v">{moneyBRLFromCents(selectedInstallation.planoValor || 0)}</span></div>
                  <div className="kvRow"><span className="k">Wi-Fi Nome</span><span className="v">{selectedInstallation.wifiNome}</span></div>
                  <div className="kvRow"><span className="k">Wi-Fi Senha</span><span className="v">{selectedInstallation.wifiSenha}</span></div>
                  <div className="kvRow"><span className="k">Apps Escolhidos</span><span className="v vClamp2">
                    {selectedInstallation.appsEscolhidos.map(cat =>
                      cat.apps.length > 0 ? `${cat.category}: ${cat.apps.join(", ")}` : ''
                    ).filter(Boolean).join(" • ") || "Nenhum"
                    }
                  </span></div>
                  <div className="kvRow"><span className="k">Status</span><span className="v">{selectedInstallation.status}</span></div>
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
    </section>
  );
}
