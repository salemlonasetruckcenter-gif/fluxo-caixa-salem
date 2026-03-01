// ============================================
// SALÉM GESTÃO - MÓDULO CRM
// Gerenciamento de Clientes, Caminhões, Orçamentos
// ============================================

class ModuloCRM {
    constructor() {
        this.clientes = [];
        this.caminhoes = [];
        this.orcamentos = [];
        this.clienteAtual = null;
        this.caminhaoAtual = null;
        this.usuarioId = null;
        
        // Flags para evitar múltiplos submits
        this.salvandoCliente = false;
        this.salvandoCaminhao = false;
        this.salvandoOrcamento = false;
        this.salvandoInteracao = false;
        
        // Flag para evitar múltiplos event listeners
        this.eventListenersConfigurados = false;
    }

    async inicializar(usuarioId) {
        this.usuarioId = usuarioId;
        console.log('Inicializando módulo CRM...');
        
        await this.carregarDados();
        this.configurarEventListeners();
        this.renderizarDashboard();
    }

    async carregarDados() {
        const [clientes, caminhoes, orcamentos] = await Promise.all([
            databaseCRM.carregarClientes(),
            databaseCRM.carregarCaminhoes(),
            databaseCRM.carregarOrcamentos()
        ]);

        this.clientes = clientes.data || [];
        this.caminhoes = caminhoes.data || [];
        this.orcamentos = orcamentos.data || [];

        console.log('CRM carregado:', this.clientes.length, 'clientes,', this.caminhoes.length, 'caminhões');
    }

    configurarEventListeners() {
        // Evitar configurar múltiplas vezes
        if (this.eventListenersConfigurados) return;
        this.eventListenersConfigurados = true;

        // Formulário de Cliente
        const formCliente = document.getElementById('formCliente');
        if (formCliente) {
            formCliente.addEventListener('submit', (e) => {
                e.preventDefault();
                this.salvarCliente();
            });
        }

        // Formulário de Caminhão
        const formCaminhao = document.getElementById('formCaminhao');
        if (formCaminhao) {
            formCaminhao.addEventListener('submit', (e) => {
                e.preventDefault();
                this.salvarCaminhao();
            });
        }

        // Formulário de Orçamento
        const formOrcamento = document.getElementById('formOrcamento');
        if (formOrcamento) {
            formOrcamento.addEventListener('submit', (e) => {
                e.preventDefault();
                this.salvarOrcamento();
            });
        }

        // Formulário de Interação
        const formInteracao = document.getElementById('formInteracao');
        if (formInteracao) {
            formInteracao.addEventListener('submit', (e) => {
                e.preventDefault();
                this.salvarInteracao();
            });
        }

        // Busca de clientes
        const buscaClientes = document.getElementById('buscaClientes');
        if (buscaClientes) {
            buscaClientes.addEventListener('input', (e) => {
                this.filtrarClientes(e.target.value);
            });
        }

        // Filtro de classificação
        const filtroClassificacao = document.getElementById('filtroClassificacao');
        if (filtroClassificacao) {
            filtroClassificacao.addEventListener('change', (e) => {
                this.filtrarClientesPorClassificacao(e.target.value);
            });
        }

        // Filtro do dashboard
        const filtroDashboard = document.getElementById('filtroDashboard');
        if (filtroDashboard) {
            filtroDashboard.addEventListener('change', (e) => {
                this.renderizarDashboard(e.target.value);
            });
        }

        // Cálculo automático do orçamento
        const camposOrcamento = ['valorMaterial', 'valorMaoObra', 'margemPercent'];
        camposOrcamento.forEach(campo => {
            const el = document.getElementById(campo);
            if (el) {
                el.addEventListener('input', () => this.calcularValorFinal());
            }
        });

        // CEP - busca automática
        const cepInput = document.getElementById('clienteCep');
        if (cepInput) {
            cepInput.addEventListener('blur', (e) => this.buscarCEP(e.target.value));
        }
    }

    // ============================================
    // DASHBOARD COMERCIAL
    // ============================================

    async renderizarDashboard(periodo = '30dias') {
        const resultado = await databaseCRM.carregarDashboard(periodo);
        
        if (!resultado.success) {
            console.error('Erro ao carregar dashboard:', resultado.error);
            return;
        }

        const dados = resultado.data;

        // Atualizar cards
        this.atualizarCard('cardFechados', dados.fechados);
        this.atualizarCard('cardNegociando', dados.negociando);
        this.atualizarCard('cardGelados', dados.gelados);
        this.atualizarCard('cardPerdidos', dados.perdidos);
        this.atualizarCard('cardOrcamentoEnviado', dados.orcamentoEnviado);

        // Atualizar listas
        this.renderizarListaDashboard('listaFechados', dados.listaFechados);
        this.renderizarListaDashboard('listaNegociando', dados.listaNegociando);
        this.renderizarListaDashboard('listaGelados', dados.listaGelados);
        this.renderizarListaDashboard('listaOrcamentoEnviado', dados.listaOrcamentoEnviado);
    }

    atualizarCard(id, valor) {
        const el = document.getElementById(id);
        if (el) {
            el.textContent = valor || 0;
        }
    }

    renderizarListaDashboard(id, lista) {
        const container = document.getElementById(id);
        if (!container) return;

        if (!lista || lista.length === 0) {
            container.innerHTML = '<p class="text-muted small">Nenhum item</p>';
            return;
        }

        container.innerHTML = lista.slice(0, 5).map(item => {
            const nomeCliente = item.clientes?.nome_fantasia || item.clientes?.nome_razao || '';
            const placaInfo = item.placa || 'Sem placa';
            const displayText = nomeCliente ? `${placaInfo} - ${nomeCliente}` : placaInfo;
            return `
            <div class="d-flex justify-content-between align-items-center mb-2 p-2 bg-light rounded" 
                 style="cursor: pointer;" 
                 onclick="moduloCRM.verCaminhao('${item.id}')"
                 title="Clique para ver detalhes">
                <span class="small">${displayText}</span>
                <span class="badge bg-${databaseCRM.getEtapaCor(item.etapa)}">${databaseCRM.getEtapaLabel(item.etapa)}</span>
            </div>
        `}).join('');
    }

    // ============================================
    // CLIENTES
    // ============================================

    async renderizarClientes() {
        const resultado = await databaseCRM.carregarClientes();
        this.clientes = resultado.data || [];
        
        const tbody = document.getElementById('corpoTabelaClientes');
        if (!tbody) return;

        tbody.innerHTML = '';

        if (this.clientes.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">Nenhum cliente cadastrado</td></tr>';
            return;
        }

        this.clientes.forEach(cliente => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>
                    <strong>${cliente.nome_razao}</strong>
                    ${cliente.nome_fantasia ? `<br><small class="text-muted">${cliente.nome_fantasia}</small>` : ''}
                </td>
                <td>${cliente.cpf_cnpj || '-'}</td>
                <td>${cliente.telefone || '-'}</td>
                <td>${cliente.cidade || '-'}${cliente.uf ? '/' + cliente.uf : ''}</td>
                <td><span class="badge bg-${databaseCRM.getClassificacaoCor(cliente.classificacao)}">${databaseCRM.getClassificacaoLabel(cliente.classificacao)}</span></td>
                <td>
                    ${cliente.whatsapp ? `
                        <a href="${databaseCRM.formatarWhatsApp(cliente.whatsapp)}" target="_blank" class="btn btn-sm btn-success me-1" title="WhatsApp">
                            <i class="bi bi-whatsapp"></i>
                        </a>
                    ` : ''}
                    <button class="btn btn-sm btn-outline-primary me-1" onclick="moduloCRM.verCliente('${cliente.id}')" title="Ver detalhes">
                        <i class="bi bi-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-secondary me-1" onclick="moduloCRM.editarCliente('${cliente.id}')" title="Editar">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="moduloCRM.excluirCliente('${cliente.id}')" title="Excluir">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    async filtrarClientes(busca) {
        const resultado = await databaseCRM.carregarClientes({ busca });
        this.clientes = resultado.data || [];
        this.renderizarTabelaClientes();
    }

    async filtrarClientesPorClassificacao(classificacao) {
        const filtros = classificacao ? { classificacao } : {};
        const resultado = await databaseCRM.carregarClientes(filtros);
        this.clientes = resultado.data || [];
        this.renderizarTabelaClientes();
    }

    renderizarTabelaClientes() {
        const tbody = document.getElementById('corpoTabelaClientes');
        if (!tbody) return;

        tbody.innerHTML = '';

        this.clientes.forEach(cliente => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>
                    <strong>${cliente.nome_razao}</strong>
                    ${cliente.nome_fantasia ? `<br><small class="text-muted">${cliente.nome_fantasia}</small>` : ''}
                </td>
                <td>${cliente.cpf_cnpj || '-'}</td>
                <td>${cliente.telefone || '-'}</td>
                <td>${cliente.cidade || '-'}${cliente.uf ? '/' + cliente.uf : ''}</td>
                <td><span class="badge bg-${databaseCRM.getClassificacaoCor(cliente.classificacao)}">${databaseCRM.getClassificacaoLabel(cliente.classificacao)}</span></td>
                <td>
                    ${cliente.whatsapp ? `
                        <a href="${databaseCRM.formatarWhatsApp(cliente.whatsapp)}" target="_blank" class="btn btn-sm btn-success me-1" title="WhatsApp">
                            <i class="bi bi-whatsapp"></i>
                        </a>
                    ` : ''}
                    <button class="btn btn-sm btn-outline-primary me-1" onclick="moduloCRM.verCliente('${cliente.id}')" title="Ver detalhes">
                        <i class="bi bi-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-secondary me-1" onclick="moduloCRM.editarCliente('${cliente.id}')" title="Editar">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="moduloCRM.excluirCliente('${cliente.id}')" title="Excluir">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    novoCliente() {
        this.clienteAtual = null;
        document.getElementById('formCliente').reset();
        document.getElementById('clienteId').value = '';
        document.getElementById('modalClienteTitulo').textContent = 'Novo Cliente';
        
        const modal = new bootstrap.Modal(document.getElementById('modalCliente'));
        modal.show();
    }

    async editarCliente(id) {
        const resultado = await databaseCRM.buscarCliente(id);
        if (!resultado.success) {
            this.mostrarAlerta('Erro ao carregar cliente', 'danger');
            return;
        }

        this.clienteAtual = resultado.data;
        const cliente = resultado.data;

        document.getElementById('clienteId').value = cliente.id;
        document.getElementById('clienteTipoPessoa').value = cliente.tipo_pessoa || 'F';
        document.getElementById('clienteNomeRazao').value = cliente.nome_razao || '';
        document.getElementById('clienteNomeFantasia').value = cliente.nome_fantasia || '';
        document.getElementById('clienteCpfCnpj').value = cliente.cpf_cnpj || '';
        document.getElementById('clienteIe').value = cliente.ie || '';
        document.getElementById('clienteIm').value = cliente.im || '';
        document.getElementById('clienteEmail').value = cliente.email || '';
        document.getElementById('clienteEmailFinanceiro').value = cliente.email_financeiro || '';
        document.getElementById('clienteTelefone').value = cliente.telefone || '';
        document.getElementById('clienteWhatsapp').value = cliente.whatsapp || '';
        document.getElementById('clienteCep').value = cliente.cep || '';
        document.getElementById('clienteLogradouro').value = cliente.logradouro || '';
        document.getElementById('clienteNumero').value = cliente.numero || '';
        document.getElementById('clienteBairro').value = cliente.bairro || '';
        document.getElementById('clienteCidade').value = cliente.cidade || '';
        document.getElementById('clienteUf').value = cliente.uf || '';
        document.getElementById('clienteComplemento').value = cliente.complemento || '';
        document.getElementById('clienteClassificacao').value = cliente.classificacao || 'normal';
        document.getElementById('clienteObservacao').value = cliente.observacao || '';

        document.getElementById('modalClienteTitulo').textContent = 'Editar Cliente';
        
        const modal = new bootstrap.Modal(document.getElementById('modalCliente'));
        modal.show();
    }

    async salvarCliente() {
        // Evitar duplo submit
        if (this.salvandoCliente) return;
        this.salvandoCliente = true;

        const id = document.getElementById('clienteId').value;
        
        const cliente = {
            tipo_pessoa: document.getElementById('clienteTipoPessoa').value,
            nome_razao: document.getElementById('clienteNomeRazao').value.trim(),
            nome_fantasia: document.getElementById('clienteNomeFantasia').value.trim() || null,
            cpf_cnpj: document.getElementById('clienteCpfCnpj').value.trim() || null,
            ie: document.getElementById('clienteIe').value.trim() || null,
            im: document.getElementById('clienteIm').value.trim() || null,
            email: document.getElementById('clienteEmail').value.trim() || null,
            email_financeiro: document.getElementById('clienteEmailFinanceiro').value.trim() || null,
            telefone: document.getElementById('clienteTelefone').value.trim() || null,
            whatsapp: document.getElementById('clienteWhatsapp').value.trim() || null,
            cep: document.getElementById('clienteCep').value.trim() || null,
            logradouro: document.getElementById('clienteLogradouro').value.trim() || null,
            numero: document.getElementById('clienteNumero').value.trim() || null,
            bairro: document.getElementById('clienteBairro').value.trim() || null,
            cidade: document.getElementById('clienteCidade').value.trim() || null,
            uf: document.getElementById('clienteUf').value.trim() || null,
            complemento: document.getElementById('clienteComplemento').value.trim() || null,
            classificacao: document.getElementById('clienteClassificacao').value,
            observacao: document.getElementById('clienteObservacao').value.trim() || null
        };

        if (!cliente.nome_razao) {
            this.mostrarAlerta('Nome/Razão Social é obrigatório', 'warning');
            return;
        }

        let resultado;
        if (id) {
            resultado = await databaseCRM.atualizarCliente(id, cliente);
        } else {
            resultado = await databaseCRM.salvarCliente(cliente);
        }

        if (resultado.success) {
            bootstrap.Modal.getInstance(document.getElementById('modalCliente')).hide();
            this.renderizarClientes();
            this.mostrarAlerta(id ? 'Cliente atualizado!' : 'Cliente cadastrado!', 'success');
        } else {
            this.mostrarAlerta('Erro: ' + resultado.error, 'danger');
        }
        
        this.salvandoCliente = false;
    }

    async verCliente(id) {
        const resultado = await databaseCRM.buscarCliente(id);
        if (!resultado.success) {
            this.mostrarAlerta('Erro ao carregar cliente', 'danger');
            return;
        }

        this.clienteAtual = resultado.data;
        
        // Carregar caminhões do cliente
        const caminhoes = await databaseCRM.carregarCaminhoes(id);
        
        // Renderizar detalhes
        this.renderizarDetalheCliente(resultado.data, caminhoes.data || []);
        
        // Mostrar modal
        const modal = new bootstrap.Modal(document.getElementById('modalDetalheCliente'));
        modal.show();
    }

    async renderizarDetalheCliente(cliente, caminhoes) {
        // Info do cliente
        document.getElementById('detalheClienteNome').textContent = cliente.nome_razao;
        document.getElementById('detalheClienteFantasia').textContent = cliente.nome_fantasia || '-';
        document.getElementById('detalheClienteCpfCnpj').textContent = cliente.cpf_cnpj || '-';
        document.getElementById('detalheClienteTelefone').textContent = cliente.telefone || '-';
        document.getElementById('detalheClienteEmail').textContent = cliente.email || '-';
        document.getElementById('detalheClienteEndereco').textContent = 
            cliente.logradouro ? `${cliente.logradouro}, ${cliente.numero || 'S/N'} - ${cliente.bairro || ''} - ${cliente.cidade || ''}/${cliente.uf || ''}` : '-';

        // Botão WhatsApp
        const btnWhatsapp = document.getElementById('btnWhatsappCliente');
        if (btnWhatsapp) {
            if (cliente.whatsapp) {
                btnWhatsapp.href = databaseCRM.formatarWhatsApp(cliente.whatsapp);
                btnWhatsapp.classList.remove('d-none');
            } else {
                btnWhatsapp.classList.add('d-none');
            }
        }

        // Tabela de caminhões
        const tbody = document.getElementById('corpoTabelaCaminhoesCliente');
        if (tbody) {
            tbody.innerHTML = '';

            if (caminhoes.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">Nenhum caminhão cadastrado</td></tr>';
            } else {
                for (const caminhao of caminhoes) {
                    // Buscar orçamento recente para N° Pedido
                    const orcamento = await databaseCRM.buscarOrcamentoRecente(caminhao.id);
                    const numeroPedido = orcamento.data?.numero_pedido || orcamento.data?.bling_pedido_id || '-';

                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td><strong>${caminhao.placa || '-'}</strong></td>
                        <td>${caminhao.tipo || '-'}</td>
                        <td>${caminhao.data_ultima_troca ? this.formatarData(caminhao.data_ultima_troca) : '-'}</td>
                        <td><span class="badge bg-${databaseCRM.getEtapaCor(caminhao.etapa)}">${databaseCRM.getEtapaLabel(caminhao.etapa)}</span></td>
                        <td>${numeroPedido}</td>
                        <td>${caminhao.proximo_contato_em ? this.formatarDataHora(caminhao.proximo_contato_em) : '-'}</td>
                        <td>
                            <button class="btn btn-sm btn-outline-primary me-1" onclick="moduloCRM.verCaminhao('${caminhao.id}')" title="Ver">
                                <i class="bi bi-eye"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-secondary me-1" onclick="moduloCRM.editarCaminhao('${caminhao.id}')" title="Editar">
                                <i class="bi bi-pencil"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-danger" onclick="moduloCRM.excluirCaminhao('${caminhao.id}')" title="Excluir">
                                <i class="bi bi-trash"></i>
                            </button>
                        </td>
                    `;
                    tbody.appendChild(tr);
                }
            }
        }
    }

    async excluirCliente(id) {
        if (!confirm('Tem certeza que deseja excluir este cliente? Todos os caminhões e orçamentos vinculados também serão excluídos.')) {
            return;
        }

        const resultado = await databaseCRM.excluirCliente(id);
        if (resultado.success) {
            this.renderizarClientes();
            this.mostrarAlerta('Cliente excluído!', 'success');
        } else {
            this.mostrarAlerta('Erro: ' + resultado.error, 'danger');
        }
    }

    async buscarCEP(cep) {
        if (!cep || cep.length < 8) return;

        const cepLimpo = cep.replace(/\D/g, '');
        if (cepLimpo.length !== 8) return;

        try {
            const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
            const data = await response.json();

            if (!data.erro) {
                document.getElementById('clienteLogradouro').value = data.logradouro || '';
                document.getElementById('clienteBairro').value = data.bairro || '';
                document.getElementById('clienteCidade').value = data.localidade || '';
                document.getElementById('clienteUf').value = data.uf || '';
            }
        } catch (error) {
            console.error('Erro ao buscar CEP:', error);
        }
    }

    // ============================================
    // CAMINHÕES
    // ============================================

    novoCaminhao(clienteId = null) {
        this.caminhaoAtual = null;
        document.getElementById('formCaminhao').reset();
        document.getElementById('caminhaoId').value = '';
        document.getElementById('caminhaoClienteId').value = clienteId || this.clienteAtual?.id || '';
        document.getElementById('modalCaminhaoTitulo').textContent = 'Novo Caminhão';
        
        // Carregar select de clientes se não tiver clienteId
        if (!clienteId && !this.clienteAtual) {
            this.carregarSelectClientes('caminhaoClienteId');
        }
        
        const modal = new bootstrap.Modal(document.getElementById('modalCaminhao'));
        modal.show();
    }

    async carregarSelectClientes(selectId) {
        const select = document.getElementById(selectId);
        if (!select) return;

        const resultado = await databaseCRM.carregarClientes();
        const clientes = resultado.data || [];

        select.innerHTML = '<option value="">Selecione o cliente</option>';
        clientes.forEach(cliente => {
            select.innerHTML += `<option value="${cliente.id}">${cliente.nome_razao}</option>`;
        });
    }

    async verCaminhao(id) {
        const resultado = await databaseCRM.buscarCaminhao(id);
        if (!resultado.success) {
            this.mostrarAlerta('Erro ao carregar caminhão', 'danger');
            return;
        }

        this.caminhaoAtual = resultado.data;
        const caminhao = resultado.data;

        // Carregar interações
        const interacoes = await databaseCRM.carregarInteracoes(id);
        
        // Carregar orçamentos
        const orcamentos = await databaseCRM.carregarOrcamentos({ caminhaoId: id });

        this.renderizarDetalheCaminhao(caminhao, interacoes.data || [], orcamentos.data || []);

        const modal = new bootstrap.Modal(document.getElementById('modalDetalheCaminhao'));
        modal.show();
    }

    renderizarDetalheCaminhao(caminhao, interacoes, orcamentos) {
        // Info básica
        document.getElementById('detalheCaminhaoPlaca').textContent = caminhao.placa || '-';
        document.getElementById('detalheCaminhaoTipo').textContent = caminhao.tipo || '-';
        document.getElementById('detalheCaminhaoModelo').textContent = caminhao.marca_modelo || '-';
        document.getElementById('detalheCaminhaoLona').textContent = caminhao.tipo_lona || '-';
        document.getElementById('detalheCaminhaoUltimoServico').textContent = caminhao.data_ultima_troca ? this.formatarData(caminhao.data_ultima_troca) : '-';
        document.getElementById('detalheCaminhaoCliente').textContent = caminhao.clientes?.nome_razao || '-';

        // Pipeline
        this.renderizarPipeline(caminhao.etapa);

        // Próximo contato
        document.getElementById('detalheCaminhaoProximoContato').textContent = caminhao.proximo_contato_em ? this.formatarDataHora(caminhao.proximo_contato_em) : '-';
        document.getElementById('detalheCaminhaoCanal').textContent = caminhao.canal_proximo_contato || '-';
        document.getElementById('detalheCaminhaoMotivo').textContent = caminhao.motivo || '-';

        // Botão WhatsApp
        const btnWhatsapp = document.getElementById('btnWhatsappCaminhao');
        if (btnWhatsapp) {
            const whatsapp = caminhao.clientes?.whatsapp || caminhao.clientes?.telefone;
            if (whatsapp) {
                btnWhatsapp.href = databaseCRM.formatarWhatsApp(whatsapp);
                btnWhatsapp.classList.remove('d-none');
            } else {
                btnWhatsapp.classList.add('d-none');
            }
        }

        // Histórico de interações
        const listaInteracoes = document.getElementById('listaInteracoes');
        if (listaInteracoes) {
            if (interacoes.length === 0) {
                listaInteracoes.innerHTML = '<p class="text-muted">Nenhuma interação registrada</p>';
            } else {
                listaInteracoes.innerHTML = interacoes.map(i => `
                    <div class="border-start border-3 border-primary ps-3 mb-3">
                        <div class="d-flex justify-content-between align-items-start">
                            <div>
                                <strong>${this.getTipoInteracaoLabel(i.tipo)}</strong>
                                <small class="text-muted ms-2">${this.formatarDataHora(i.created_at)}</small>
                            </div>
                            <button class="btn btn-sm btn-outline-danger" onclick="event.stopPropagation(); moduloCRM.excluirInteracao('${i.id}')" title="Excluir">
                                <i class="bi bi-trash"></i>
                            </button>
                        </div>
                        <p class="mb-1">${i.resumo || '-'}</p>
                        <span class="badge bg-secondary">${this.getResultadoLabel(i.resultado)}</span>
                        ${i.proxima_acao_em ? `<small class="text-muted d-block mt-1"><i class="bi bi-calendar-event me-1"></i>Agendado: ${this.formatarDataHora(i.proxima_acao_em)}</small>` : ''}
                    </div>
                `).join('');
            }
        }

        // Orçamentos
        const listaOrcamentos = document.getElementById('listaOrcamentosCaminhao');
        if (listaOrcamentos) {
            if (orcamentos.length === 0) {
                listaOrcamentos.innerHTML = '<p class="text-muted">Nenhum orçamento</p>';
            } else {
                listaOrcamentos.innerHTML = orcamentos.map(o => `
                    <div class="card mb-2" style="cursor: pointer;" onclick="moduloCRM.editarOrcamento('${o.id}')" title="Clique para editar">
                        <div class="card-body py-2">
                            <div class="d-flex justify-content-between align-items-center">
                                <div>
                                    <strong>R$ ${this.formatarDinheiro(o.valor_final)}</strong>
                                    <span class="badge bg-${this.getStatusOrcamentoCor(o.status)} ms-2">${this.getStatusOrcamentoLabel(o.status)}</span>
                                </div>
                                <small class="text-muted">${this.formatarData(o.created_at)}</small>
                            </div>
                            ${o.numero_pedido ? `<small class="text-muted">Pedido: ${o.numero_pedido}</small>` : ''}
                        </div>
                    </div>
                `).join('');
            }
        }
    }

    renderizarPipeline(etapaAtual) {
        const etapas = ['novo', 'contato_1', 'contato_2', 'contato_3', 'orcamento_enviado', 'negociando', 'fechado'];
        const container = document.getElementById('pipelineCaminhao');
        if (!container) return;

        container.innerHTML = etapas.map(etapa => {
            const ativo = etapa === etapaAtual;
            const cor = databaseCRM.getEtapaCor(etapa);
            return `
                <button class="btn btn-sm ${ativo ? 'btn-' + cor : 'btn-outline-' + cor} me-1 mb-1" 
                        onclick="moduloCRM.mudarEtapa('${etapa}')"
                        ${ativo ? 'disabled' : ''}>
                    ${databaseCRM.getEtapaLabel(etapa)}
                </button>
            `;
        }).join('');

        // Botões especiais
        container.innerHTML += `
            <button class="btn btn-sm btn-outline-dark me-1 mb-1" onclick="moduloCRM.mudarEtapa('gelado')">
                <i class="bi bi-snow"></i> Gelado
            </button>
            <button class="btn btn-sm btn-outline-danger mb-1" onclick="moduloCRM.mudarEtapa('perdido')">
                <i class="bi bi-x-circle"></i> Perdido
            </button>
        `;
    }

    async mudarEtapa(novaEtapa) {
        if (!this.caminhaoAtual) return;

        const resultado = await databaseCRM.atualizarCaminhao(this.caminhaoAtual.id, { etapa: novaEtapa });
        
        if (resultado.success) {
            this.caminhaoAtual.etapa = novaEtapa;
            this.renderizarPipeline(novaEtapa);
            this.mostrarAlerta(`Etapa alterada para: ${databaseCRM.getEtapaLabel(novaEtapa)}`, 'success');
        } else {
            this.mostrarAlerta('Erro ao mudar etapa', 'danger');
        }
    }

    async salvarCaminhao() {
        // Evitar duplo submit
        if (this.salvandoCaminhao) return;
        this.salvandoCaminhao = true;

        const id = document.getElementById('caminhaoId').value;
        const clienteId = document.getElementById('caminhaoClienteId').value;

        if (!clienteId) {
            this.mostrarAlerta('Selecione um cliente', 'warning');
            this.salvandoCaminhao = false;
            return;
        }

        const caminhao = {
            cliente_id: clienteId,
            placa: document.getElementById('caminhaoPlaca').value.trim().toUpperCase() || null,
            tipo: document.getElementById('caminhaoTipo').value.trim() || null,
            marca_modelo: document.getElementById('caminhaoMarcaModelo').value.trim() || null,
            tipo_lona: document.getElementById('caminhaoTipoLona').value.trim() || null,
            data_ultima_troca: document.getElementById('caminhaoUltimoServico').value || null,
            ciclo_meses: parseInt(document.getElementById('caminhaoCicloMeses').value) || 12
        };

        let resultado;
        if (id) {
            resultado = await databaseCRM.atualizarCaminhao(id, caminhao);
        } else {
            resultado = await databaseCRM.salvarCaminhao(caminhao);
        }

        if (resultado.success) {
            bootstrap.Modal.getInstance(document.getElementById('modalCaminhao')).hide();
            
            // Atualizar lista de caminhões do cliente se estiver aberta
            if (this.clienteAtual) {
                const caminhoes = await databaseCRM.carregarCaminhoes(this.clienteAtual.id);
                this.renderizarDetalheCliente(this.clienteAtual, caminhoes.data || []);
            }
            
            this.mostrarAlerta(id ? 'Caminhão atualizado!' : 'Caminhão cadastrado!', 'success');
        } else {
            this.mostrarAlerta('Erro: ' + resultado.error, 'danger');
        }
        
        this.salvandoCaminhao = false;
    }

    async editarCaminhao(id) {
        const resultado = await databaseCRM.buscarCaminhao(id);
        if (!resultado.success) {
            this.mostrarAlerta('Erro ao carregar caminhão', 'danger');
            return;
        }

        const caminhao = resultado.data;
        this.caminhaoAtual = caminhao;

        document.getElementById('caminhaoId').value = caminhao.id;
        document.getElementById('caminhaoClienteId').value = caminhao.cliente_id;
        document.getElementById('caminhaoPlaca').value = caminhao.placa || '';
        document.getElementById('caminhaoTipo').value = caminhao.tipo || '';
        document.getElementById('caminhaoMarcaModelo').value = caminhao.marca_modelo || '';
        document.getElementById('caminhaoTipoLona').value = caminhao.tipo_lona || '';
        document.getElementById('caminhaoUltimoServico').value = caminhao.data_ultima_troca || '';
        document.getElementById('caminhaoCicloMeses').value = caminhao.ciclo_meses || 12;

        document.getElementById('modalCaminhaoTitulo').textContent = 'Editar Caminhão';
        
        const modal = new bootstrap.Modal(document.getElementById('modalCaminhao'));
        modal.show();
    }

    async excluirCaminhao(id) {
        if (!confirm('Tem certeza que deseja excluir este caminhão? Esta ação não pode ser desfeita.')) {
            return;
        }

        const resultado = await databaseCRM.excluirCaminhao(id);
        
        if (resultado.success) {
            this.mostrarAlerta('Caminhão excluído!', 'success');
            
            // Atualizar lista de caminhões do cliente se estiver aberta
            if (this.clienteAtual) {
                const caminhoes = await databaseCRM.carregarCaminhoes(this.clienteAtual.id);
                this.renderizarDetalheCliente(this.clienteAtual, caminhoes.data || []);
            }
        } else {
            this.mostrarAlerta('Erro: ' + resultado.error, 'danger');
        }
    }

    // ============================================
    // INTERAÇÕES
    // ============================================

    novaInteracao() {
        if (!this.caminhaoAtual) {
            this.mostrarAlerta('Selecione um caminhão primeiro', 'warning');
            return;
        }

        document.getElementById('formInteracao').reset();
        document.getElementById('interacaoCaminhaoId').value = this.caminhaoAtual.id;
        document.getElementById('interacaoClienteId').value = this.caminhaoAtual.cliente_id;

        const modal = new bootstrap.Modal(document.getElementById('modalInteracao'));
        modal.show();
    }

    async salvarInteracao() {
        // Evitar duplo submit
        if (this.salvandoInteracao) return;
        this.salvandoInteracao = true;

        // Converter datetime-local para ISO com timezone correto
        const proximaAcaoInput = document.getElementById('interacaoProximaAcao').value;
        let proximaAcaoISO = null;
        if (proximaAcaoInput) {
            // datetime-local retorna "2026-03-05T21:40" - converter para ISO mantendo o horário local
            const dataLocal = new Date(proximaAcaoInput);
            proximaAcaoISO = dataLocal.toISOString();
        }

        const interacao = {
            caminhao_id: document.getElementById('interacaoCaminhaoId').value,
            cliente_id: document.getElementById('interacaoClienteId').value,
            tipo: document.getElementById('interacaoTipo').value,
            resultado: document.getElementById('interacaoResultado').value,
            resumo: document.getElementById('interacaoResumo').value.trim() || null,
            proxima_acao_em: proximaAcaoISO
        };

        const resultado = await databaseCRM.salvarInteracao(interacao);

        if (resultado.success) {
            bootstrap.Modal.getInstance(document.getElementById('modalInteracao')).hide();

            // Atualizar próximo contato do caminhão se informado
            if (interacao.proxima_acao_em) {
                await databaseCRM.atualizarCaminhao(interacao.caminhao_id, {
                    proximo_contato_em: interacao.proxima_acao_em,
                    canal_proximo_contato: interacao.tipo,
                    motivo: interacao.resumo
                });
            }

            // Recarregar detalhes do caminhão
            this.verCaminhao(interacao.caminhao_id);
            
            this.mostrarAlerta('Interação registrada!', 'success');
        } else {
            this.mostrarAlerta('Erro: ' + resultado.error, 'danger');
        }
        
        this.salvandoInteracao = false;
    }

    async excluirInteracao(id) {
        if (!confirm('Tem certeza que deseja excluir esta interação?')) {
            return;
        }

        const resultado = await databaseCRM.excluirInteracao(id);
        
        if (resultado.success) {
            this.mostrarAlerta('Interação excluída!', 'success');
            
            // Recarregar detalhes do caminhão
            if (this.caminhaoAtual) {
                this.verCaminhao(this.caminhaoAtual.id);
            }
        } else {
            this.mostrarAlerta('Erro: ' + resultado.error, 'danger');
        }
    }

    // ============================================
    // ORÇAMENTOS
    // ============================================

    async renderizarOrcamentos() {
        const resultado = await databaseCRM.carregarOrcamentos();
        this.orcamentos = resultado.data || [];

        const tbody = document.getElementById('corpoTabelaOrcamentos');
        if (!tbody) return;

        tbody.innerHTML = '';

        if (this.orcamentos.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">Nenhum orçamento cadastrado</td></tr>';
            return;
        }

        this.orcamentos.forEach(orcamento => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${this.formatarData(orcamento.created_at)}</td>
                <td>${orcamento.clientes?.nome_razao || '-'}</td>
                <td>${orcamento.caminhoes?.placa || '-'}</td>
                <td><strong>R$ ${this.formatarDinheiro(orcamento.valor_final)}</strong></td>
                <td><span class="badge bg-${this.getStatusOrcamentoCor(orcamento.status)}">${this.getStatusOrcamentoLabel(orcamento.status)}</span></td>
                <td>${orcamento.numero_pedido || '-'}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary me-1" onclick="moduloCRM.editarOrcamento('${orcamento.id}')" title="Editar">
                        <i class="bi bi-pencil"></i>
                    </button>
                    ${orcamento.status === 'rascunho' ? `
                        <button class="btn btn-sm btn-outline-success me-1" onclick="moduloCRM.aprovarOrcamento('${orcamento.id}')" title="Aprovar">
                            <i class="bi bi-check-lg"></i>
                        </button>
                    ` : ''}
                    <button class="btn btn-sm btn-outline-danger me-1" onclick="moduloCRM.excluirOrcamento('${orcamento.id}')" title="Excluir">
                        <i class="bi bi-trash"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-secondary" onclick="moduloCRM.enviarBling('${orcamento.id}')" title="Enviar para Bling" disabled>
                        <i class="bi bi-cloud-upload"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    novoOrcamento(caminhaoId = null, clienteId = null) {
        document.getElementById('formOrcamento').reset();
        document.getElementById('orcamentoId').value = '';
        document.getElementById('orcamentoCaminhaoId').value = caminhaoId || this.caminhaoAtual?.id || '';
        document.getElementById('orcamentoClienteId').value = clienteId || this.clienteAtual?.id || '';
        document.getElementById('valorFinalCalculado').textContent = 'R$ 0,00';

        // Carregar selects se necessário
        if (!caminhaoId && !this.caminhaoAtual) {
            this.carregarSelectClientes('orcamentoClienteId');
        }

        const modal = new bootstrap.Modal(document.getElementById('modalOrcamento'));
        modal.show();
    }

    calcularValorFinal() {
        const valorMaterial = parseFloat(document.getElementById('valorMaterial').value) || 0;
        const valorMaoObra = parseFloat(document.getElementById('valorMaoObra').value) || 0;
        const margemPercent = parseFloat(document.getElementById('margemPercent').value) || 0;

        let valorFinal = valorMaterial + valorMaoObra;
        if (margemPercent > 0) {
            valorFinal = valorFinal * (1 + margemPercent / 100);
        }

        document.getElementById('valorFinalCalculado').textContent = `R$ ${this.formatarDinheiro(valorFinal)}`;
    }

    async salvarOrcamento() {
        // Evitar duplo submit
        if (this.salvandoOrcamento) return;
        this.salvandoOrcamento = true;

        const id = document.getElementById('orcamentoId').value;

        const orcamento = {
            cliente_id: document.getElementById('orcamentoClienteId').value || null,
            caminhao_id: document.getElementById('orcamentoCaminhaoId').value || null,
            descricao: document.getElementById('orcamentoDescricao').value.trim() || null,
            valor_material: parseFloat(document.getElementById('valorMaterial').value) || 0,
            valor_mao_obra: parseFloat(document.getElementById('valorMaoObra').value) || 0,
            margem_percent: parseFloat(document.getElementById('margemPercent').value) || 0,
            forma_pagamento: document.getElementById('orcamentoFormaPagamento').value || null,
            parcelas: parseInt(document.getElementById('orcamentoParcelas').value) || 1,
            data_prevista: document.getElementById('orcamentoDataPrevista').value || null,
            numero_pedido: document.getElementById('orcamentoNumeroPedido').value.trim() || null
        };

        let resultado;
        if (id) {
            resultado = await databaseCRM.atualizarOrcamento(id, orcamento);
        } else {
            resultado = await databaseCRM.salvarOrcamento(orcamento);
        }

        if (resultado.success) {
            bootstrap.Modal.getInstance(document.getElementById('modalOrcamento')).hide();
            this.renderizarOrcamentos();
            this.mostrarAlerta(id ? 'Orçamento atualizado!' : 'Orçamento criado!', 'success');
        } else {
            this.mostrarAlerta('Erro: ' + resultado.error, 'danger');
        }
        
        this.salvandoOrcamento = false;
    }

    async editarOrcamento(id) {
        const resultado = await databaseCRM.buscarOrcamento(id);
        if (!resultado.success) {
            this.mostrarAlerta('Erro ao carregar orçamento', 'danger');
            return;
        }

        const orcamento = resultado.data;

        document.getElementById('orcamentoId').value = orcamento.id;
        document.getElementById('orcamentoClienteId').value = orcamento.cliente_id || '';
        document.getElementById('orcamentoCaminhaoId').value = orcamento.caminhao_id || '';
        document.getElementById('orcamentoDescricao').value = orcamento.descricao || '';
        document.getElementById('valorMaterial').value = orcamento.valor_material || 0;
        document.getElementById('valorMaoObra').value = orcamento.valor_mao_obra || 0;
        document.getElementById('margemPercent').value = orcamento.margem_percent || 0;
        document.getElementById('orcamentoFormaPagamento').value = orcamento.forma_pagamento || '';
        document.getElementById('orcamentoParcelas').value = orcamento.parcelas || 1;
        document.getElementById('orcamentoDataPrevista').value = orcamento.data_prevista || '';
        document.getElementById('orcamentoNumeroPedido').value = orcamento.numero_pedido || '';

        this.calcularValorFinal();

        const modal = new bootstrap.Modal(document.getElementById('modalOrcamento'));
        modal.show();
    }

    async aprovarOrcamento(id) {
        if (!confirm('Aprovar este orçamento?')) return;

        const resultado = await databaseCRM.atualizarOrcamento(id, { status: 'aprovado' });
        
        if (resultado.success) {
            this.renderizarOrcamentos();
            this.mostrarAlerta('Orçamento aprovado!', 'success');
        } else {
            this.mostrarAlerta('Erro: ' + resultado.error, 'danger');
        }
    }

    async excluirOrcamento(id) {
        if (!confirm('Tem certeza que deseja excluir este orçamento? Esta ação não pode ser desfeita.')) {
            return;
        }

        const resultado = await databaseCRM.excluirOrcamento(id);
        
        if (resultado.success) {
            this.renderizarOrcamentos();
            
            // Atualizar lista de orçamentos do caminhão se estiver aberta
            if (this.caminhaoAtual) {
                const orcamentos = await databaseCRM.carregarOrcamentos({ caminhaoId: this.caminhaoAtual.id });
                const interacoes = await databaseCRM.carregarInteracoes(this.caminhaoAtual.id);
                this.renderizarDetalheCaminhao(this.caminhaoAtual, interacoes.data || [], orcamentos.data || []);
            }
            
            this.mostrarAlerta('Orçamento excluído!', 'success');
        } else {
            this.mostrarAlerta('Erro: ' + resultado.error, 'danger');
        }
    }

    enviarBling(id) {
        this.mostrarAlerta('Integração com Bling será implementada em breve!', 'info');
    }

    // ============================================
    // AGENDA
    // ============================================

    async renderizarAgenda() {
        const resultado = await databaseCRM.carregarAgenda({ atrasados: false });
        const agendaAtrasados = await databaseCRM.carregarAgenda({ atrasados: true });

        const containerAtrasados = document.getElementById('agendaAtrasados');
        const containerHoje = document.getElementById('agendaHoje');
        const containerProximos = document.getElementById('agendaProximos');

        // Atrasados
        if (containerAtrasados) {
            this.renderizarListaAgenda(containerAtrasados, agendaAtrasados.data || [], 'danger');
        }

        // Separar hoje e próximos
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        const amanha = new Date(hoje);
        amanha.setDate(amanha.getDate() + 1);

        const todosContatos = resultado.data || [];
        const contatosHoje = todosContatos.filter(c => {
            const data = new Date(c.proximo_contato_em);
            return data >= hoje && data < amanha;
        });
        const contatosProximos = todosContatos.filter(c => {
            const data = new Date(c.proximo_contato_em);
            return data >= amanha;
        });

        if (containerHoje) {
            this.renderizarListaAgenda(containerHoje, contatosHoje, 'warning');
        }

        if (containerProximos) {
            this.renderizarListaAgenda(containerProximos, contatosProximos, 'info');
        }
    }

    renderizarListaAgenda(container, lista, cor) {
        if (lista.length === 0) {
            container.innerHTML = '<p class="text-muted">Nenhum contato agendado</p>';
            return;
        }

        container.innerHTML = lista.map(item => `
            <div class="card mb-2 border-${cor}">
                <div class="card-body py-2">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <strong>${item.placa || 'Sem placa'}</strong>
                            <span class="text-muted ms-2">${item.clientes?.nome_razao || '-'}</span>
                        </div>
                        <div>
                            ${item.clientes?.whatsapp ? `
                                <a href="${databaseCRM.formatarWhatsApp(item.clientes.whatsapp)}" target="_blank" class="btn btn-sm btn-success me-1">
                                    <i class="bi bi-whatsapp"></i>
                                </a>
                            ` : ''}
                            <button class="btn btn-sm btn-outline-primary me-1" onclick="moduloCRM.verCaminhao('${item.id}')">
                                <i class="bi bi-eye"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-secondary" onclick="moduloCRM.caminhaoAtual = {id: '${item.id}', cliente_id: '${item.cliente_id}'}; moduloCRM.novaInteracao()">
                                <i class="bi bi-chat-dots"></i>
                            </button>
                        </div>
                    </div>
                    <small class="text-muted">
                        <i class="bi bi-clock"></i> ${this.formatarDataHora(item.proximo_contato_em)}
                        ${item.canal_proximo_contato ? ` | ${item.canal_proximo_contato}` : ''}
                    </small>
                </div>
            </div>
        `).join('');
    }

    // ============================================
    // UTILITÁRIOS
    // ============================================

    formatarData(data) {
        if (!data) return '-';
        const d = new Date(data);
        return d.toLocaleDateString('pt-BR');
    }

    formatarDataHora(data) {
        if (!data) return '-';
        const d = new Date(data);
        return d.toLocaleString('pt-BR');
    }

    formatarDinheiro(valor) {
        return (valor || 0).toFixed(2).replace('.', ',');
    }

    getTipoInteracaoLabel(tipo) {
        const labels = {
            'ligacao': 'Ligação',
            'whatsapp': 'WhatsApp',
            'visita': 'Visita',
            'email': 'E-mail'
        };
        return labels[tipo] || tipo;
    }

    getResultadoLabel(resultado) {
        const labels = {
            'atendeu': 'Atendeu',
            'nao_atendeu': 'Não atendeu',
            'pediu_retorno': 'Pediu retorno',
            'orcamento': 'Solicitou orçamento',
            'negociando': 'Negociando',
            'fechou': 'Fechou',
            'recusou': 'Recusou'
        };
        return labels[resultado] || resultado;
    }

    getStatusOrcamentoLabel(status) {
        const labels = {
            'rascunho': 'Rascunho',
            'enviado': 'Enviado',
            'aprovado': 'Aprovado',
            'concluido': 'Concluído',
            'cancelado': 'Cancelado'
        };
        return labels[status] || status;
    }

    getStatusOrcamentoCor(status) {
        const cores = {
            'rascunho': 'secondary',
            'enviado': 'info',
            'aprovado': 'success',
            'concluido': 'primary',
            'cancelado': 'danger'
        };
        return cores[status] || 'secondary';
    }

    mostrarAlerta(mensagem, tipo = 'info') {
        if (typeof fluxoCaixa !== 'undefined' && fluxoCaixa.mostrarAlerta) {
            fluxoCaixa.mostrarAlerta(mensagem, tipo);
        } else {
            alert(mensagem);
        }
    }
}

// Instância global
const moduloCRM = new ModuloCRM();
