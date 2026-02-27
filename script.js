// Sistema de Fluxo de Caixa
class FluxoCaixa {
    constructor() {
        this.vendas = [];
        this.parcelas = [];
        this.config = {
            prazoPadraoCartao: 30,
            intervaloPadraoParcelas: 30
        };
        this.usuarioId = null;
        
        // Aguardar autenticação antes de inicializar
        this.aguardarAutenticacao();
    }

    aguardarAutenticacao() {
        // Configurar callback de login
        if (typeof authModule !== 'undefined') {
            authModule.onLogin(async (user) => {
                this.usuarioId = user.id;
                database.setUserId(user.id);
                
                // Mostrar nome do usuário
                const usuarioEl = document.getElementById('usuarioLogado');
                if (usuarioEl) {
                    usuarioEl.innerHTML = `<i class="bi bi-person-circle me-1"></i>${authModule.getUserNome()}`;
                }
                
                await this.inicializarComDados();
            });

            authModule.onLogout(() => {
                this.vendas = [];
                this.parcelas = [];
                this.usuarioId = null;
            });

            // Iniciar autenticação
            authModule.init();
        } else {
            // Fallback para modo local (desenvolvimento)
            console.warn('AuthModule não encontrado, usando modo local');
            this.inicializarModoLocal();
        }
    }

    async inicializarComDados() {
        // Carregar dados do Supabase
        this.vendas = await database.carregarVendas();
        this.parcelas = await database.carregarParcelas();
        
        console.log('Dados carregados:', this.vendas.length, 'vendas,', this.parcelas.length, 'parcelas');
        
        this.inicializar();
        
        // Inicializar módulo de saídas com Supabase
        if (typeof moduloSaidas !== 'undefined') {
            await moduloSaidas.inicializarComSupabase(this.usuarioId);
        }
    }

    inicializarModoLocal() {
        // Modo local para desenvolvimento (usa localStorage)
        this.vendas = this.carregarDados('vendas') || [];
        this.parcelas = this.carregarDados('parcelas') || [];
        this.inicializar();
    }

    inicializar() {
        this.configurarEventListeners();
        this.atualizarDataAtual();
        this.definirDataPadrao();
        this.verificarECorrigirDatas();
        this.carregarVendas();
        this.atualizarResumo();
        this.inicializarGraficos();
    }

    iniciarBackupAutomatico() {
        // Fazer backup ao iniciar (se houver dados)
        if (this.vendas.length > 0 || this.parcelas.length > 0) {
            setTimeout(() => this.salvarBackupLocal(), 5000);
        }
        
        // Backup automático a cada 30 minutos
        setInterval(() => {
            if (this.vendas.length > 0 || this.parcelas.length > 0) {
                this.salvarBackupLocal();
            }
        }, 30 * 60 * 1000);
    }

    verificarECorrigirDatas() {
        // FUNÇÃO DESATIVADA - Não remover parcelas com datas futuras
        // Parcelas de boleto/crédito são parceladas para meses futuros e não devem ser removidas
        console.log('Verificação de datas desativada - parcelas futuras preservadas');
        return;
        
        /* CÓDIGO ANTIGO COMENTADO:
        // Verificar e corrigir datas futuras nos dados existentes
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        
        // Verificar vendas com datas futuras
        this.vendas = this.vendas.filter(venda => {
            const [ano, mes, dia] = venda.dataVenda.split('-').map(Number);
            const dataVenda = new Date(ano, mes - 1, dia);
            dataVenda.setHours(0, 0, 0, 0);
            
            if (dataVenda > hoje) {
                return false; // Remover venda com data futura
            }
            return true;
        });
        
        // Verificar parcelas com datas futuras
        this.parcelas = this.parcelas.filter(parcela => {
            const [ano, mes, dia] = parcela.dataVencimento.split('-').map(Number);
            const dataVenc = new Date(ano, mes - 1, dia);
            dataVenc.setHours(0, 0, 0, 0);
            
            if (dataVenc > hoje) {
                return false; // Remover parcela com data futura
            }
            return true;
        });
        
        // Salvar dados corrigidos
        this.salvarDados('vendas', this.vendas);
        this.salvarDados('parcelas', this.parcelas);
        
        if (this.vendas.length === 0 && this.parcelas.length === 0) {
            console.log('Todos os dados foram limpos devido a datas inconsistentes.');
        }
        */
    }

    configurarEventListeners() {
        console.log('configurarEventListeners() chamado');
        
        // Formulário de vendas
        const formVenda = document.getElementById('formVenda');
        console.log('formVenda encontrado:', !!formVenda);
        
        if (formVenda) {
            formVenda.addEventListener('submit', (e) => {
                e.preventDefault();
                console.log('Formulário submetido, chamando registrarVenda()');
                this.registrarVenda();
            });
        }

        // Tipo de venda
        const tipoVenda = document.getElementById('tipoVenda');
        console.log('tipoVenda encontrado:', !!tipoVenda);
        
        if (tipoVenda) {
            tipoVenda.addEventListener('change', (e) => {
                console.log('tipoVenda change event:', e.target.value);
                this.toggleParcelamento(e.target.value);
            });
        }

        // Botões
        const btnLimpar = document.getElementById('btnLimpar');
        if (btnLimpar) {
            btnLimpar.addEventListener('click', () => this.limparFormulario());
        }
        
        const btnExportar = document.getElementById('btnExportar');
        if (btnExportar) {
            btnExportar.addEventListener('click', () => this.exportarDados());
        }
        
        const btnImportarBackup = document.getElementById('btnImportarBackup');
        if (btnImportarBackup) {
            btnImportarBackup.addEventListener('click', () => this.restaurarBackup());
        }
        
        const btnRestaurarBackupLocal = document.getElementById('btnRestaurarBackupLocal');
        if (btnRestaurarBackupLocal) {
            btnRestaurarBackupLocal.addEventListener('click', () => this.restaurarUltimoBackupLocal());
        }
        
        const btnLimparDados = document.getElementById('btnLimparDados');
        if (btnLimparDados) {
            btnLimparDados.addEventListener('click', () => this.limparTodosDados());
        }
        
        const btnGerarRelatorio = document.getElementById('btnGerarRelatorio');
        if (btnGerarRelatorio) {
            btnGerarRelatorio.addEventListener('click', () => this.gerarRelatorioPDF());
        }
        
        const btnFiltrarRelatorio = document.getElementById('btnFiltrarRelatorio');
        if (btnFiltrarRelatorio) {
            btnFiltrarRelatorio.addEventListener('click', () => this.filtrarRelatorio());
        }
        
        // Auto preenchimento do campo cliente
        const clienteInput = document.getElementById('cliente');
        if (clienteInput) {
            clienteInput.addEventListener('input', (e) => {
                this.atualizarListaClientes(e.target.value);
            });
        }

        // Busca de vendas por texto (mantida)
        const buscaVendas = document.getElementById('buscaVendas');
        if (buscaVendas) {
            buscaVendas.addEventListener('input', (e) => {
                this.filtrarVendasPorTextoEPeriodo(e.target.value);
            });
        }

        // Filtro de vendas por período
        const btnFiltrarVendas = document.getElementById('btnFiltrarVendas');
        if (btnFiltrarVendas) {
            btnFiltrarVendas.addEventListener('click', () => {
                this.filtrarVendasPorPeriodo();
            });
        }
        
        const btnLimparFiltroVendas = document.getElementById('btnLimparFiltroVendas');
        if (btnLimparFiltroVendas) {
            btnLimparFiltroVendas.addEventListener('click', () => {
                this.limparFiltroVendas();
            });
        }

        // Filtro de período do Fluxo de Caixa
        const btnFiltrarFluxo = document.getElementById('btnFiltrarFluxo');
        if (btnFiltrarFluxo) {
            btnFiltrarFluxo.addEventListener('click', () => {
                this.filtrarFluxoPorPeriodo();
            });
        }
        
        const btnLimparFiltroFluxo = document.getElementById('btnLimparFiltroFluxo');
        if (btnLimparFiltroFluxo) {
            btnLimparFiltroFluxo.addEventListener('click', () => {
                this.limparFiltroFluxo();
            });
        }

        // Período do relatório
        const periodoRelatorio = document.getElementById('periodoRelatorio');
        if (periodoRelatorio) {
            periodoRelatorio.addEventListener('change', () => {
                this.atualizarRelatorio();
            });
        }

        // Modal de edição de parcela
        const btnSalvarEdicao = document.getElementById('btnSalvarEdicao');
        if (btnSalvarEdicao) {
            btnSalvarEdicao.addEventListener('click', () => {
                this.salvarEdicaoParcela();
            });
        }

        // Modal de edição de pagamento no fluxo
        const btnSalvarPagamento = document.getElementById('btnSalvarPagamento');
        if (btnSalvarPagamento) {
            btnSalvarPagamento.addEventListener('click', () => {
                this.salvarEdicaoPagamento();
            });
        }

        // Modal de edição de venda
        const btnSalvarEdicaoVenda = document.getElementById('btnSalvarEdicaoVenda');
        if (btnSalvarEdicaoVenda) {
            btnSalvarEdicaoVenda.addEventListener('click', () => {
                this.salvarEdicaoVenda();
            });
        }

        // Abas
        document.querySelectorAll('[data-bs-toggle="tab"]').forEach(tab => {
            tab.addEventListener('shown.bs.tab', (e) => {
                // Salvar aba ativa
                localStorage.setItem('abaAtiva', e.target.id);
                
                if (e.target.id === 'fluxo-tab') {
                    // Verificar se há datas selecionadas e usar
                    const dataInicio = document.getElementById('dataInicioFluxo')?.value;
                    const dataFim = document.getElementById('dataFimFluxo')?.value;
                    if (dataInicio && dataFim) {
                        this.atualizarFluxoCaixa(dataInicio, dataFim);
                    } else {
                        this.atualizarFluxoCaixa();
                    }
                } else if (e.target.id === 'relatorios-tab') {
                    // Verificar se há datas selecionadas e usar
                    const dataInicio = document.getElementById('dataInicioRelatorio')?.value;
                    const dataFim = document.getElementById('dataFimRelatorio')?.value;
                    if (dataInicio && dataFim) {
                        this.filtrarRelatorio();
                    } else {
                        this.atualizarRelatorio();
                    }
                }
            });
        });
        
        // Restaurar datas dos filtros ANTES de mostrar a aba
        this.restaurarDatasFiltros();
        
        // Restaurar aba ativa ao carregar
        const abaAtiva = localStorage.getItem('abaAtiva');
        if (abaAtiva) {
            const tabElement = document.getElementById(abaAtiva);
            if (tabElement) {
                const tab = new bootstrap.Tab(tabElement);
                tab.show();
            }
        }
    }
    
    // Salvar datas dos filtros no localStorage
    salvarDatasFiltros(prefixo) {
        const campos = {
            'vendas': ['dataInicioVendas', 'dataFimVendas'],
            'saidas': ['dataInicioSaidas', 'dataFimSaidas'],
            'fluxo': ['dataInicioFluxo', 'dataFimFluxo'],
            'relatorio': ['dataInicioRelatorio', 'dataFimRelatorio']
        };
        
        if (campos[prefixo]) {
            campos[prefixo].forEach(id => {
                const el = document.getElementById(id);
                if (el && el.value) {
                    localStorage.setItem('filtro_' + id, el.value);
                }
            });
        }
    }
    
    // Restaurar datas dos filtros do localStorage e aplicar filtros se necessário
    restaurarDatasFiltros() {
        const camposData = [
            'dataInicioVendas', 'dataFimVendas',
            'dataInicioSaidas', 'dataFimSaidas',
            'dataInicioFluxo', 'dataFimFluxo',
            'dataInicioRelatorio', 'dataFimRelatorio'
        ];
        
        // Primeiro, preencher todos os campos
        camposData.forEach(id => {
            const valorSalvo = localStorage.getItem('filtro_' + id);
            if (valorSalvo) {
                const el = document.getElementById(id);
                if (el) {
                    el.value = valorSalvo;
                }
            }
        });
        
        // Depois, aplicar filtros se houver datas completas
        // Vendas
        const dataInicioVendas = document.getElementById('dataInicioVendas')?.value;
        const dataFimVendas = document.getElementById('dataFimVendas')?.value;
        if (dataInicioVendas && dataFimVendas) {
            this.carregarVendasFiltradas(dataInicioVendas, dataFimVendas);
            this.atualizarResumoPorPeriodo(dataInicioVendas, dataFimVendas);
        }
        
        // Saídas
        const dataInicioSaidas = document.getElementById('dataInicioSaidas')?.value;
        const dataFimSaidas = document.getElementById('dataFimSaidas')?.value;
        if (dataInicioSaidas && dataFimSaidas && typeof moduloSaidas !== 'undefined') {
            moduloSaidas.carregarSaidasFiltradas(dataInicioSaidas, dataFimSaidas);
            moduloSaidas.atualizarResumoSaidas(dataInicioSaidas, dataFimSaidas);
        }
        
        // Fluxo de Caixa - será aplicado quando a aba for mostrada
        // Relatório - será aplicado quando a aba for mostrada
    }
    
    // Limpar datas salvas de um filtro específico
    limparDatasFiltros(prefixo) {
        const campos = {
            'vendas': ['dataInicioVendas', 'dataFimVendas'],
            'saidas': ['dataInicioSaidas', 'dataFimSaidas'],
            'fluxo': ['dataInicioFluxo', 'dataFimFluxo'],
            'relatorio': ['dataInicioRelatorio', 'dataFimRelatorio']
        };
        
        if (campos[prefixo]) {
            campos[prefixo].forEach(id => {
                localStorage.removeItem('filtro_' + id);
            });
        }
    }

    atualizarDataAtual() {
        const data = new Date();
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        const dataAtualEl = document.getElementById('dataAtual');
        
        if (dataAtualEl) {
            dataAtualEl.textContent = data.toLocaleDateString('pt-BR', options);
        }
    }

    definirDataPadrao() {
        // Obter data local atual sem problemas de fuso horário
        const hoje = new Date();
        const ano = hoje.getFullYear();
        const mes = String(hoje.getMonth() + 1).padStart(2, '0');
        const dia = String(hoje.getDate()).padStart(2, '0');
        const dataLocal = `${ano}-${mes}-${dia}`;
        
        const dataVendaEl = document.getElementById('dataVenda');
        const mesSelecionadoEl = document.getElementById('mesSelecionado');
        
        if (dataVendaEl) {
            dataVendaEl.value = dataLocal;
            dataVendaEl.max = dataLocal; // Impedir datas futuras
        }
        
        if (mesSelecionadoEl) {
            const mesAtual = `${ano}-${mes}`;
            mesSelecionadoEl.value = mesAtual;
        }
    }

    toggleParcelamento(tipoVenda) {
        console.log('toggleParcelamento chamado com tipo:', tipoVenda);
        const opcoesParcelamento = document.getElementById('opcoesParcelamento');
        const campoParcelas = document.getElementById('parcelas');
        
        console.log('Elementos encontrados:', { opcoesParcelamento: !!opcoesParcelamento, campoParcelas: !!campoParcelas });
        
        if (!opcoesParcelamento || !campoParcelas) {
            console.error('ERRO: Elementos de parcelamento não encontrados!');
            return;
        }
        
        // Formas que permitem parcelamento
        const formasPermitidas = ['credito', 'boleto'];
        
        if (formasPermitidas.includes(tipoVenda)) {
            console.log('Tipo permitido, mostrando opções de parcelamento');
            opcoesParcelamento.classList.remove('d-none');
            campoParcelas.value = 1;
            
            // Ajustar limites por tipo
            if (tipoVenda === 'credito') {
                campoParcelas.min = 1;
                campoParcelas.max = 12;
            } else if (tipoVenda === 'boleto') {
                campoParcelas.min = 1;
                campoParcelas.max = 24;
            }
        } else {
            console.log('Tipo não permitido, escondendo opções de parcelamento');
            opcoesParcelamento.classList.add('d-none');
            campoParcelas.value = 1;
        }
    }

    async registrarVenda() {
        console.log('registrarVenda() chamado');
        
        // Evitar duplo submit
        if (this.registrandoVenda) {
            console.log('Já está registrando uma venda, ignorando...');
            return;
        }
        this.registrandoVenda = true;
        
        // Verificar se elementos existem
        const clienteEl = document.getElementById('cliente');
        const valorEl = document.getElementById('valor');
        const numeroPedidoEl = document.getElementById('numeroPedido');
        const tipoVendaEl = document.getElementById('tipoVenda');
        const dataVendaEl = document.getElementById('dataVenda');
        
        if (!clienteEl || !valorEl || !tipoVendaEl || !dataVendaEl) {
            console.error('ERRO: Elementos do formulário não encontrados!');
            this.mostrarAlerta('Erro no formulário. Recarregue a página.', 'danger');
            this.registrandoVenda = false;
            return;
        }
        
        const cliente = clienteEl.value.trim();
        const valor = parseFloat(valorEl.value);
        const numeroPedido = numeroPedidoEl ? numeroPedidoEl.value.trim() : '';
        const tipoVenda = tipoVendaEl.value;
        const dataVenda = dataVendaEl.value;
        
        console.log('Valores dos campos:', { cliente, valor, tipoVenda, dataVenda });
        
        if (!cliente || !valor || !tipoVenda || !dataVenda) {
            console.log('Campos obrigatórios não preenchidos');
            this.mostrarAlerta('Preencha todos os campos obrigatórios!', 'warning');
            this.registrandoVenda = false;
            return;
        }

        // Validar se a data da venda não é futura
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        
        // Parse da data da venda de forma mais segura
        const [anoVenda, mesVenda, diaVenda] = dataVenda.split('-').map(Number);
        const dataVendaObj = new Date(anoVenda, mesVenda - 1, diaVenda);
        dataVendaObj.setHours(0, 0, 0, 0);
        
        if (dataVendaObj > hoje) {
            this.mostrarAlerta(`A data da venda (${this.formatarData(dataVenda)}) não pode ser futura! Hoje é ${this.formatarData(hoje.toISOString().split('T')[0])}.`, 'warning');
            this.registrandoVenda = false;
            return;
        }

        const formasAVista = ['debito', 'pix', 'dinheiro', 'transferencia'];
        const parcelasEl = document.getElementById('parcelas');
        const numParcelas = formasAVista.includes(tipoVenda) ? 1 : (parcelasEl ? (parseInt(parcelasEl.value) || 1) : 1);

        const venda = {
            cliente,
            valor,
            numeroPedido: numeroPedido || 'N/A',
            tipo: tipoVenda,
            dataVenda,
            parcelas: numParcelas
        };

        // Salvar no Supabase
        if (this.usuarioId && typeof database !== 'undefined') {
            const resultado = await database.salvarVenda(venda);
            if (!resultado.success) {
                this.mostrarAlerta('Erro ao salvar venda: ' + resultado.error, 'danger');
                this.registrandoVenda = false;
                return;
            }
            
            // Usar o ID retornado pelo banco
            venda.id = resultado.id;
            
            // Gerar e salvar parcelas
            const parcelas = this.gerarParcelasParaBanco(venda);
            const resultadoParcelas = await database.salvarParcelas(parcelas);
            
            if (!resultadoParcelas.success) {
                this.mostrarAlerta('Erro ao salvar parcelas: ' + resultadoParcelas.error, 'danger');
                this.registrandoVenda = false;
                return;
            }
            
            // Recarregar dados do banco para evitar duplicação
            this.vendas = await database.carregarVendas();
            this.parcelas = await database.carregarParcelas();
        } else {
            // Modo local (fallback)
            venda.id = this.gerarId();
            const parcelas = this.gerarParcelas(venda);
            this.vendas.push(venda);
            this.parcelas.push(...parcelas);
            this.salvarDados('vendas', this.vendas);
            this.salvarDados('parcelas', this.parcelas);
        }
        
        // Atualizar interface
        this.carregarVendas();
        this.atualizarResumo();
        this.limparFormulario();
        
        // Prevenir resubmissão ao pressionar F5
        if (window.history.replaceState) {
            window.history.replaceState(null, null, window.location.href);
        }
        
        this.registrandoVenda = false;
        this.mostrarAlerta('Venda registrada com sucesso!', 'success');
    }
    
    gerarParcelasParaBanco(venda) {
        const parcelas = [];
        const tipoVenda = venda.tipo;
        const formasAVista = ['debito', 'pix', 'dinheiro', 'transferencia'];
        
        if (formasAVista.includes(tipoVenda)) {
            parcelas.push({
                vendaId: venda.id,
                numero: 1,
                valor: venda.valor,
                dataVencimento: venda.dataVenda,
                dataPagamento: venda.dataVenda,
                status: 'pago',
                tipo: tipoVenda
            });
        } else {
            const parcelasEl = document.getElementById('parcelas');
            const prazoEl = document.getElementById('prazoRecebimento');
            const intervaloEl = document.getElementById('intervaloParcelas');
            
            const numParcelas = parcelasEl ? (parseInt(parcelasEl.value) || 1) : 1;
            const prazoRecebimento = prazoEl ? (parseInt(prazoEl.value) || 30) : 30;
            const intervaloParcelas = intervaloEl ? (parseInt(intervaloEl.value) || 30) : 30;
            const valorParcela = venda.valor / numParcelas;
            
            const [ano, mes, dia] = venda.dataVenda.split('-').map(Number);
            const dataVencimentoBase = new Date(ano, mes - 1, dia);
            dataVencimentoBase.setDate(dataVencimentoBase.getDate() + prazoRecebimento);
            
            for (let i = 1; i <= numParcelas; i++) {
                const dataVencimento = new Date(dataVencimentoBase);
                dataVencimento.setDate(dataVencimento.getDate() + (i - 1) * intervaloParcelas);
                
                const anoV = dataVencimento.getFullYear();
                const mesV = String(dataVencimento.getMonth() + 1).padStart(2, '0');
                const diaV = String(dataVencimento.getDate()).padStart(2, '0');
                const dataFormatada = `${anoV}-${mesV}-${diaV}`;
                
                parcelas.push({
                    vendaId: venda.id,
                    numero: i,
                    valor: valorParcela,
                    dataVencimento: dataFormatada,
                    dataPagamento: null,
                    status: 'pendente',
                    tipo: tipoVenda
                });
            }
        }
        
        return parcelas;
    }

    gerarParcelas(venda) {
        const parcelas = [];
        const tipoVenda = venda.tipo;
        
        // Formas de pagamento à vista (não parcelam)
        const formasAVista = ['debito', 'pix', 'dinheiro', 'transferencia'];
        
        if (formasAVista.includes(tipoVenda)) {
            // Pagamento à vista - uma única parcela já paga
            parcelas.push({
                id: this.gerarId(),
                vendaId: venda.id,
                numero: 1,
                valor: venda.valor,
                dataVencimento: venda.dataVenda,
                dataPagamento: venda.dataVenda,
                status: 'pago',
                tipo: tipoVenda
            });
        } else {
            // Venda parcelada (crédito ou boleto)
            const parcelasEl = document.getElementById('parcelas');
            const prazoEl = document.getElementById('prazoRecebimento');
            const intervaloEl = document.getElementById('intervaloParcelas');
            
            const numParcelas = parcelasEl ? (parseInt(parcelasEl.value) || 1) : 1;
            const prazoRecebimento = prazoEl ? (parseInt(prazoEl.value) || 30) : 30;
            const intervaloParcelas = intervaloEl ? (parseInt(intervaloEl.value) || 30) : 30;
            const valorParcela = venda.valor / numParcelas;
            
            // Criar data base a partir da data da venda sem problemas de fuso horário
            const [ano, mes, dia] = venda.dataVenda.split('-').map(Number);
            const dataVencimentoBase = new Date(ano, mes - 1, dia);
            dataVencimentoBase.setDate(dataVencimentoBase.getDate() + prazoRecebimento);
            
            for (let i = 1; i <= numParcelas; i++) {
                const dataVencimento = new Date(dataVencimentoBase);
                dataVencimento.setDate(dataVencimento.getDate() + ((i - 1) * intervaloParcelas));
                
                // Formatar data sem problemas de fuso horário
                const dataFormatada = `${dataVencimento.getFullYear()}-${String(dataVencimento.getMonth() + 1).padStart(2, '0')}-${String(dataVencimento.getDate()).padStart(2, '0')}`;
                
                parcelas.push({
                    id: this.gerarId(),
                    vendaId: venda.id,
                    numero: i,
                    valor: valorParcela,
                    dataVencimento: dataFormatada,
                    dataPagamento: null,
                    status: 'pendente',
                    tipo: tipoVenda
                });
            }
        }
        
        return parcelas;
    }

    carregarVendas() {
        const tbody = document.getElementById('corpoTabelaVendas');
        if (!tbody) {
            console.error('ERRO: Elemento corpoTabelaVendas não encontrado!');
            return;
        }
        tbody.innerHTML = '';
        
        const vendasOrdenadas = [...this.vendas].sort((a, b) => 
            new Date(b.dataVenda) - new Date(a.dataVenda)
        );
        
        vendasOrdenadas.forEach(venda => {
            const tr = document.createElement('tr');
            const parcelasVenda = this.parcelas.filter(p => p.vendaId === venda.id);
            const statusGeral = this.getStatusGeral(parcelasVenda);
            const parcelasPagas = parcelasVenda.filter(p => p.status === 'pago').length;
            const totalParcelas = parcelasVenda.length;
            
            // Mostrar parcelas no formato "total x pagas" (ex: 10x3 = 10 parcelas, 3 pagas)
            let parcelasTexto = `${totalParcelas}x`;
            if (totalParcelas > 1) {
                parcelasTexto = `${totalParcelas}x${parcelasPagas}`;
            }
            
            tr.innerHTML = `
                <td>${this.formatarData(venda.dataVenda)}</td>
                <td><span class="badge bg-light text-dark">${venda.numeroPedido}</span></td>
                <td>${venda.cliente}</td>
                <td class="valor-monetario">${this.formatarDinheiro(venda.valor)}</td>
                <td><span class="badge bg-${this.getTipoCor(venda.tipo)}">${this.getTipoLabel(venda.tipo)}</span></td>
                <td><span class="badge ${parcelasPagas === totalParcelas ? 'bg-success' : 'bg-warning text-dark'}">${parcelasTexto}</span></td>
                <td><span class="badge ${statusGeral.classe}">${statusGeral.texto}</span></td>
                <td class="table-actions">
                    <button class="btn btn-sm btn-outline-primary" onclick="fluxoCaixa.verDetalhesVenda('${venda.id}')">
                        <i class="bi bi-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="fluxoCaixa.excluirVenda('${venda.id}')">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            `;
            
            tbody.appendChild(tr);
        });
    }

    getStatusGeral(parcelas) {
        if (parcelas.length === 0) return { classe: 'bg-secondary', texto: 'N/A' };
        
        const pagas = parcelas.filter(p => p.status === 'pago').length;
        const pendentes = parcelas.filter(p => p.status === 'pendente').length;
        const atrasadas = parcelas.filter(p => this.estaAtrasado(p)).length;
        
        if (pagas === parcelas.length) {
            return { classe: 'status-pago', texto: 'Pago' };
        } else if (atrasadas > 0) {
            return { classe: 'status-atrasado', texto: `${atrasadas} atrasado(s)` };
        } else if (pendentes > 0) {
            return { classe: 'status-pendente', texto: `${pendentes} pendente(s)` };
        }
        
        return { classe: 'bg-secondary', texto: 'N/A' };
    }

    estaAtrasado(parcela) {
        if (parcela.status === 'pago') return false;
        const hoje = new Date();
        const vencimento = new Date(parcela.dataVencimento);
        return vencimento < hoje;
    }

    getTipoCor(tipo) {
        const cores = {
            'debito': 'info',
            'credito': 'primary',
            'pix': 'success',
            'boleto': 'warning',
            'dinheiro': 'dark',
            'transferencia': 'secondary'
        };
        return cores[tipo] || 'secondary';
    }

    getTipoLabel(tipo) {
        const labels = {
            'debito': 'Débito',
            'credito': 'Crédito',
            'pix': 'Pix',
            'boleto': 'Boleto',
            'dinheiro': 'Dinheiro',
            'transferencia': 'Transferência'
        };
        return labels[tipo] || tipo;
    }

    atualizarResumo() {
        const hoje = new Date();
        const mesAtual = hoje.getMonth();
        const anoAtual = hoje.getFullYear();
        
        // Vendas do mês
        const vendasMes = this.vendas.filter(v => {
            const dataVenda = new Date(v.dataVenda);
            return dataVenda.getMonth() === mesAtual && dataVenda.getFullYear() === anoAtual;
        });
        
        const totalVendasMes = vendasMes.reduce((sum, v) => sum + v.valor, 0);
        
        // A receber e recebido
        const parcelasPendentes = this.parcelas.filter(p => p.status === 'pendente');
        const parcelasPagas = this.parcelas.filter(p => p.status === 'pago');
        
        const totalAReceber = parcelasPendentes.reduce((sum, p) => sum + p.valor, 0);
        const totalRecebido = parcelasPagas.reduce((sum, p) => sum + p.valor, 0);
        
        // Atualizar interface
        document.getElementById('vendasMes').textContent = this.formatarDinheiro(totalVendasMes);
        document.getElementById('aReceber').textContent = this.formatarDinheiro(totalAReceber);
        document.getElementById('recebido').textContent = this.formatarDinheiro(totalRecebido);
    }

    atualizarFluxoCaixa(dataInicio = null, dataFim = null) {
        // Se não foi passado período, usar o período dos inputs ou mês atual
        if (!dataInicio || !dataFim) {
            dataInicio = document.getElementById('dataInicioFluxo')?.value;
            dataFim = document.getElementById('dataFimFluxo')?.value;
        }
        
        // Se ainda não tem datas, usar mês atual como padrão
        if (!dataInicio || !dataFim) {
            const hoje = new Date();
            const ano = hoje.getFullYear();
            const mes = hoje.getMonth() + 1;
            dataInicio = `${ano}-${String(mes).padStart(2, '0')}-01`;
            dataFim = `${ano}-${String(mes).padStart(2, '0')}-${String(new Date(ano, mes, 0).getDate()).padStart(2, '0')}`;
        }
        
        // Converter strings de data para objetos Date (sem problemas de fuso)
        const [anoInicio, mesInicio, diaInicio] = dataInicio.split('-').map(Number);
        const dataInicioObj = new Date(anoInicio, mesInicio - 1, diaInicio);
        
        const [anoFim, mesFim, diaFim] = dataFim.split('-').map(Number);
        const dataFimObj = new Date(anoFim, mesFim - 1, diaFim);
        dataFimObj.setHours(23, 59, 59, 999); // Incluir até o final do dia
        
        // Filtrar parcelas do período
        const parcelasPeriodo = this.parcelas.filter(p => {
            const [ano, mes, dia] = p.dataVencimento.split('-').map(Number);
            const dataVenc = new Date(ano, mes - 1, dia);
            return dataVenc >= dataInicioObj && dataVenc <= dataFimObj;
        });
        
        // Calcular totais de entradas (pagas)
        const entradas = parcelasPeriodo
            .filter(p => p.status === 'pago')
            .reduce((sum, p) => sum + p.valor, 0);
        
        // Calcular A Receber (pendentes no período)
        const aReceber = parcelasPeriodo
            .filter(p => p.status === 'pendente')
            .reduce((sum, p) => sum + p.valor, 0);
        
        // Calcular totais de saídas do período
        const saidasPeriodo = this.calcularSaidasPorPeriodo(dataInicioObj, dataFimObj);
        
        // Calcular saldo anterior (até o dia anterior ao início do período)
        const saldoAnterior = this.calcularSaldoAnteriorPorData(dataInicioObj);
        const saldoFinal = saldoAnterior + entradas - saidasPeriodo.total;
        const totalPeriodo = entradas + aReceber; // Total de entradas do período
        
        // Atualizar cards
        document.getElementById('saldoAnterior').textContent = this.formatarDinheiro(saldoAnterior);
        document.getElementById('entradasMes').textContent = this.formatarDinheiro(entradas);
        document.getElementById('aReceberMes').textContent = this.formatarDinheiro(aReceber);
        document.getElementById('saidasMes').textContent = this.formatarDinheiro(saidasPeriodo.total);
        document.getElementById('saldoFinal').textContent = this.formatarDinheiro(saldoFinal);
        document.getElementById('totalMes').textContent = this.formatarDinheiro(totalPeriodo);
        
        // Atualizar tabela detalhada (combinar entradas e saídas)
        this.carregarTabelaFluxoCompleta(parcelasPeriodo, saidasPeriodo.lista);
    }

    calcularSaidasPorPeriodo(dataInicio, dataFim) {
        if (typeof moduloSaidas === 'undefined' || !moduloSaidas || !moduloSaidas.saidas) {
            console.log('DEBUG: moduloSaidas não disponível');
            return { fixos: 0, variaveis: 0, total: 0, lista: [] };
        }
        
        console.log('DEBUG: Total de saídas cadastradas:', moduloSaidas.saidas.length);
        console.log('DEBUG: Período:', dataInicio, 'até', dataFim);
        
        // Filtrar TODAS as saídas do período por data de vencimento (para a tabela)
        const saidasPeriodo = moduloSaidas.saidas.filter(s => {
            const [ano, mes, dia] = s.dataVencimento.split('-').map(Number);
            const data = new Date(ano, mes - 1, dia);
            return data >= dataInicio && data <= dataFim;
        });
        
        console.log('DEBUG: Saídas no período:', saidasPeriodo.length);
        
        // Filtrar apenas PAGAS para o total do resumo (usa dataPagamento, não status)
        const saidasPagas = saidasPeriodo.filter(s => s.dataPagamento);
        console.log('DEBUG: Saídas PAGAS no período:', saidasPagas.length);
        
        // Separar fixos e variáveis
        const fixos = saidasPagas.filter(s => s.tipo === 'fixo');
        const variaveis = saidasPagas.filter(s => s.tipo === 'variavel');
        
        // Calcular totais
        const totalFixos = fixos.reduce((sum, s) => sum + s.valor, 0);
        const totalVariaveis = variaveis.reduce((sum, s) => sum + s.valor, 0);
        const total = totalFixos + totalVariaveis;
        
        return {
            fixos: totalFixos,
            variaveis: totalVariaveis,
            total: total,
            lista: saidasPeriodo
        };
    }

    calcularSaldoAnteriorPorData(dataInicio) {
        // Calcular saldo acumulado até o dia anterior ao início do período
        let saldo = 0;
        const dataLimite = new Date(dataInicio);
        dataLimite.setDate(dataLimite.getDate() - 1);
        dataLimite.setHours(23, 59, 59, 999);
        
        this.parcelas.forEach(parcela => {
            if (parcela.status === 'pago') {
                const [ano, mes, dia] = parcela.dataVencimento.split('-').map(Number);
                const dataVenc = new Date(ano, mes - 1, dia);
                if (dataVenc <= dataLimite) {
                    saldo += parcela.valor;
                }
            }
        });
        
        return saldo;
    }

    filtrarFluxoPorPeriodo() {
        const dataInicio = document.getElementById('dataInicioFluxo').value;
        const dataFim = document.getElementById('dataFimFluxo').value;
        
        if (!dataInicio || !dataFim) {
            this.mostrarAlerta('Selecione as datas de início e fim!', 'warning');
            return;
        }
        
        if (dataInicio > dataFim) {
            this.mostrarAlerta('Data inicial não pode ser maior que a data final!', 'warning');
            return;
        }
        
        // Salvar datas no localStorage
        this.salvarDatasFiltros('fluxo');
        
        this.atualizarFluxoCaixa(dataInicio, dataFim);
        this.mostrarAlerta(`Fluxo de caixa atualizado para o período: ${this.formatarData(dataInicio)} até ${this.formatarData(dataFim)}`, 'success');
    }

    limparFiltroFluxo() {
        document.getElementById('dataInicioFluxo').value = '';
        document.getElementById('dataFimFluxo').value = '';
        
        // Limpar datas salvas
        this.limparDatasFiltros('fluxo');
        
        this.atualizarFluxoCaixa();
        this.mostrarAlerta('Filtro do Fluxo de Caixa limpo!', 'info');
    }

    calcularSaidasMes(mes, ano) {
        if (typeof moduloSaidas === 'undefined' || !moduloSaidas || !moduloSaidas.saidas) {
            return { fixos: 0, variaveis: 0, total: 0, lista: [] };
        }
        
        // Filtrar TODAS as saídas do mês por data de vencimento (para a tabela)
        const todasSaidasMes = moduloSaidas.saidas.filter(s => {
            const data = new Date(s.dataVencimento);
            return data.getMonth() === mes - 1 && data.getFullYear() === ano;
        });
        
        // Filtrar apenas PAGAS para o total (usa dataPagamento)
        const saidasPagas = todasSaidasMes.filter(s => s.dataPagamento);
        
        // Separar fixos e variáveis (apenas pagas)
        const fixos = saidasPagas.filter(s => s.tipo === 'fixo');
        const variaveis = saidasPagas.filter(s => s.tipo === 'variavel');
        
        // Calcular totais (apenas pagas)
        const totalFixos = fixos.reduce((sum, s) => sum + s.valor, 0);
        const totalVariaveis = variaveis.reduce((sum, s) => sum + s.valor, 0);
        const total = totalFixos + totalVariaveis;
        
        return {
            fixos: totalFixos,
            variaveis: totalVariaveis,
            total: total,
            lista: todasSaidasMes // Retorna TODAS para a tabela
        };
    }

    carregarTabelaFluxoCompleta(parcelasMes, saidasMes) {
        const tbody = document.getElementById('corpoTabelaFluxo');
        tbody.innerHTML = '';
        
        // Combinar todas as movimentações e ordenar por data
        const movimentacoes = [
            ...parcelasMes.map(p => {
                const venda = this.vendas.find(v => v.id === p.vendaId);
                return {
                    tipo: 'entrada',
                    data: p.dataVencimento,
                    dataPagamento: p.dataPagamento,
                    numeroPedido: venda?.numeroPedido || '-',
                    cliente: venda?.cliente || 'N/A',
                    descricao: `Recebimento - ${venda?.cliente || 'N/A'}`,
                    valor: p.valor,
                    tipoVenda: this.getTipoLabel(p.tipo),
                    parcela: `${p.numero}/${this.parcelas.filter(par => par.vendaId === p.vendaId).length}`,
                    status: p.status,
                    id: p.id
                };
            }),
            ...saidasMes.map(s => ({
                tipo: 'saida',
                data: s.dataVencimento,
                dataPagamento: s.dataPagamento,
                numeroPedido: s.notaFiscal || '-',
                cliente: '-',
                descricao: s.descricao,
                valor: s.valor,
                tipoVenda: 'Compras',
                parcela: '-',
                status: s.dataPagamento ? 'pago' : 'pendente',
                id: s.id
            }))
        ].sort((a, b) => new Date(a.data) - new Date(b.data));
        
        movimentacoes.forEach(mov => {
            const tr = document.createElement('tr');
            const tipoClasse = mov.tipo === 'entrada' ? 'text-success' : 'text-danger';
            const tipoBadge = mov.tipo === 'entrada' ? 'bg-info' : 'bg-warning';
            
            tr.innerHTML = `
                <td>${this.formatarData(mov.data)}</td>
                <td>${mov.dataPagamento ? this.formatarData(mov.dataPagamento) : '-'}</td>
                <td>${mov.numeroPedido}</td>
                <td>${mov.cliente}</td>
                <td>${mov.descricao}</td>
                <td class="valor-monetario ${tipoClasse}">${mov.tipo === 'entrada' ? '+' : '-'} ${this.formatarDinheiro(mov.valor)}</td>
                <td><span class="badge ${tipoBadge}">${mov.tipoVenda}</span></td>
                <td><span class="badge bg-light text-dark">${mov.parcela}</span></td>
                <td><span class="badge ${mov.status === 'pago' ? 'status-pago' : 'status-pendente'}">${mov.status}</span></td>
                <td class="table-actions">
                    <button class="btn btn-sm btn-outline-primary" onclick="fluxoCaixa.editarMovimentacao('${mov.id}', '${mov.tipo}')">
                        <i class="bi bi-pencil"></i>
                    </button>
                </td>
            `;
            
            tbody.appendChild(tr);
        });
    }

    editarMovimentacao(id, tipo) {
        if (tipo === 'saida') {
            this.abrirModalEdicaoPagamento(id, 'saida');
        } else {
            this.abrirModalEdicaoPagamento(id, 'entrada');
        }
    }

    abrirModalEdicaoPagamento(id, tipo) {
        let item;
        
        if (tipo === 'entrada') {
            item = this.parcelas.find(p => p.id === id);
            if (!item) {
                this.mostrarAlerta('Parcela não encontrada!', 'danger');
                return;
            }
            document.getElementById('novoValorPagamento').value = item.valor;
            document.getElementById('novaDataVencimentoPagamento').value = item.dataVencimento;
            document.getElementById('novaDataPagamentoFluxo').value = item.dataPagamento || '';
        } else {
            item = moduloSaidas.saidas.find(s => s.id === id);
            if (!item) {
                this.mostrarAlerta('Saída não encontrada!', 'danger');
                return;
            }
            document.getElementById('novoValorPagamento').value = item.valor;
            document.getElementById('novaDataVencimentoPagamento').value = item.dataVencimento;
            document.getElementById('novaDataPagamentoFluxo').value = item.dataPagamento || '';
        }
        
        document.getElementById('pagamentoId').value = id;
        document.getElementById('pagamentoTipo').value = tipo;
        
        const modal = new bootstrap.Modal(document.getElementById('modalEdicaoPagamento'));
        modal.show();
    }

    async salvarEdicaoPagamento() {
        const id = document.getElementById('pagamentoId').value;
        const tipo = document.getElementById('pagamentoTipo').value;
        const novoValor = parseFloat(document.getElementById('novoValorPagamento').value);
        const novaDataVencimento = document.getElementById('novaDataVencimentoPagamento').value;
        const novaDataPagamento = document.getElementById('novaDataPagamentoFluxo').value;
        
        if (!novoValor || !novaDataVencimento) {
            this.mostrarAlerta('Preencha todos os campos obrigatórios!', 'warning');
            return;
        }
        
        if (tipo === 'entrada') {
            // Atualizar parcela no Supabase
            if (this.usuarioId && typeof database !== 'undefined') {
                const resultado = await database.atualizarParcela(id, {
                    valor: novoValor,
                    dataVencimento: novaDataVencimento,
                    dataPagamento: novaDataPagamento || null,
                    status: novaDataPagamento ? 'pago' : 'pendente'
                });
                
                if (!resultado.success) {
                    this.mostrarAlerta('Erro ao atualizar: ' + resultado.error, 'danger');
                    return;
                }
                
                // Recarregar dados do banco
                this.parcelas = await database.carregarParcelas();
            } else {
                const parcelaIndex = this.parcelas.findIndex(p => p.id === id);
                if (parcelaIndex !== -1) {
                    this.parcelas[parcelaIndex].valor = novoValor;
                    this.parcelas[parcelaIndex].dataVencimento = novaDataVencimento;
                    this.parcelas[parcelaIndex].dataPagamento = novaDataPagamento || null;
                    this.parcelas[parcelaIndex].status = novaDataPagamento ? 'pago' : 'pendente';
                    this.salvarDados('parcelas', this.parcelas);
                }
            }
        } else {
            // Atualizar saída no Supabase
            if (moduloSaidas.usuarioId && typeof database !== 'undefined') {
                const resultado = await database.atualizarSaida(id, {
                    valor: novoValor,
                    dataVencimento: novaDataVencimento,
                    dataPagamento: novaDataPagamento || null
                });
                
                if (!resultado.success) {
                    this.mostrarAlerta('Erro ao atualizar: ' + resultado.error, 'danger');
                    return;
                }
                
                // Recarregar dados do banco
                moduloSaidas.saidas = await database.carregarSaidas();
            } else {
                const saidaIndex = moduloSaidas.saidas.findIndex(s => s.id === id);
                if (saidaIndex !== -1) {
                    moduloSaidas.saidas[saidaIndex].valor = novoValor;
                    moduloSaidas.saidas[saidaIndex].dataVencimento = novaDataVencimento;
                    moduloSaidas.saidas[saidaIndex].dataPagamento = novaDataPagamento || null;
                    moduloSaidas.salvarDados('saidas', moduloSaidas.saidas);
                }
            }
        }
        
        const modal = bootstrap.Modal.getInstance(document.getElementById('modalEdicaoPagamento'));
        modal.hide();
        
        this.atualizarFluxoCaixa();
        if (tipo === 'saida') {
            // Verificar se há filtro de período ativo
            const dataInicio = document.getElementById('dataInicioSaidas')?.value;
            const dataFim = document.getElementById('dataFimSaidas')?.value;
            const termoBusca = document.getElementById('buscaSaidas')?.value;
            
            if (dataInicio && dataFim) {
                // Se tem filtro de data, recarrega filtrado
                if (termoBusca) {
                    moduloSaidas.filtrarSaidasPorTextoEPeriodo(termoBusca);
                } else {
                    moduloSaidas.carregarSaidasFiltradas(dataInicio, dataFim);
                    moduloSaidas.atualizarResumoSaidas(dataInicio, dataFim);
                }
            } else {
                // Sem filtro, carrega tudo
                moduloSaidas.carregarSaidas();
                moduloSaidas.atualizarResumoSaidas();
            }
        }
        
        this.mostrarAlerta('Alterações salvas com sucesso!', 'success');
    }

    calcularSaldoAnterior(ano, mes) {
        // Calcular saldo acumulado até o mês anterior
        let saldo = 0;
        
        this.parcelas.forEach(parcela => {
            const data = new Date(parcela.dataVencimento);
            if (data.getFullYear() < ano || 
                (data.getFullYear() === ano && data.getMonth() < mes)) {
                if (parcela.status === 'pago') {
                    saldo += parcela.valor;
                }
            }
        });
        
        return saldo;
    }

    carregarTabelaFluxo(parcelas) {
        const tbody = document.getElementById('corpoTabelaFluxo');
        tbody.innerHTML = '';
        
        const parcelasOrdenadas = [...parcelas].sort((a, b) => 
            new Date(a.dataVencimento) - new Date(b.dataVencimento)
        );
        
        parcelasOrdenadas.forEach(parcela => {
            const venda = this.vendas.find(v => v.id === parcela.vendaId);
            const tr = document.createElement('tr');
            
            const statusClasse = parcela.status === 'pago' ? 'status-pago' : 
                               this.estaAtrasado(parcela) ? 'status-atrasado' : 'status-pendente';
            
            tr.innerHTML = `
                <td>${this.formatarData(parcela.dataVencimento)}</td>
                <td>${parcela.dataPagamento ? this.formatarData(parcela.dataPagamento) : '-'}</td>
                <td><span class="badge bg-light text-dark">${venda ? venda.numeroPedido : 'N/A'}</span></td>
                <td>${venda ? venda.cliente : 'N/A'}</td>
                <td class="valor-monetario">${this.formatarDinheiro(parcela.valor)}</td>
                <td><span class="badge bg-${this.getTipoCor(parcela.tipo)}">${this.getTipoLabel(parcela.tipo)}</span></td>
                <td>${parcela.numero}/${this.parcelas.filter(p => p.vendaId === parcela.vendaId).length}</td>
                <td><span class="badge ${statusClasse}">${parcela.status}</span></td>
                <td class="table-actions">
                    <button class="btn btn-sm btn-outline-primary" onclick="fluxoCaixa.editarParcela('${parcela.id}')">
                        <i class="bi bi-pencil"></i>
                    </button>
                    ${parcela.status === 'pendente' ? 
                        `<button class="btn btn-sm btn-outline-success" onclick="fluxoCaixa.marcarComoPago('${parcela.id}')">
                            <i class="bi bi-check-circle"></i>
                        </button>` : ''
                    }
                </td>
            `;
            
            tbody.appendChild(tr);
        });
    }

    editarParcela(parcelaId) {
        const parcela = this.parcelas.find(p => p.id === parcelaId);
        if (!parcela) return;
        
        // Preencher modal
        document.getElementById('parcelaId').value = parcelaId;
        document.getElementById('novoValor').value = parcela.valor;
        document.getElementById('novaDataVencimento').value = parcela.dataVencimento;
        document.getElementById('novaDataPagamento').value = parcela.dataPagamento || '';
        
        // Abrir modal
        const modal = new bootstrap.Modal(document.getElementById('modalEdicaoParcela'));
        modal.show();
    }

    async salvarEdicaoParcela() {
        const parcelaId = document.getElementById('parcelaId').value;
        const novoValor = parseFloat(document.getElementById('novoValor').value);
        const novaDataVencimento = document.getElementById('novaDataVencimento').value;
        const novaDataPagamento = document.getElementById('novaDataPagamento').value;
        
        const parcela = this.parcelas.find(p => p.id === parcelaId);
        if (!parcela) return;
        
        const novoStatus = novaDataPagamento ? 'pago' : 'pendente';
        
        // Atualizar no Supabase
        if (this.usuarioId && typeof database !== 'undefined') {
            const resultado = await database.atualizarParcela(parcelaId, {
                valor: novoValor,
                dataVencimento: novaDataVencimento,
                dataPagamento: novaDataPagamento || null,
                status: novoStatus
            });
            
            if (!resultado.success) {
                this.mostrarAlerta('Erro ao atualizar parcela: ' + resultado.error, 'danger');
                return;
            }
            
            // Recarregar dados do banco
            this.parcelas = await database.carregarParcelas();
        } else {
            // Modo local (fallback)
            parcela.valor = novoValor;
            parcela.dataVencimento = novaDataVencimento;
            parcela.dataPagamento = novaDataPagamento || null;
            parcela.status = novoStatus;
            this.salvarDados('parcelas', this.parcelas);
        }
        
        this.carregarVendas();
        this.atualizarResumo();
        this.atualizarFluxoCaixa();
        
        // Fechar modal
        bootstrap.Modal.getInstance(document.getElementById('modalEdicaoParcela')).hide();
        
        this.mostrarAlerta('Parcela atualizada com sucesso!', 'success');
    }

    async marcarComoPago(parcelaId) {
        const parcela = this.parcelas.find(p => p.id === parcelaId);
        if (!parcela) return;
        
        const dataPagamento = new Date().toISOString().split('T')[0];
        
        // Atualizar no Supabase
        if (this.usuarioId && typeof database !== 'undefined') {
            const resultado = await database.atualizarParcela(parcelaId, {
                status: 'pago',
                dataPagamento: dataPagamento
            });
            
            if (!resultado.success) {
                this.mostrarAlerta('Erro ao atualizar parcela: ' + resultado.error, 'danger');
                return;
            }
        } else {
            this.salvarDados('parcelas', this.parcelas);
        }
        
        // Atualizar localmente
        parcela.status = 'pago';
        parcela.dataPagamento = dataPagamento;
        
        this.carregarVendas();
        this.atualizarResumo();
        this.atualizarFluxoCaixa();
        
        this.mostrarAlerta('Parcela marcada como paga!', 'success');
    }

    verDetalhesVenda(vendaId) {
        const venda = this.vendas.find(v => v.id === vendaId);
        if (!venda) return;
        
        const parcelas = this.parcelas.filter(p => p.vendaId === vendaId);
        
        let detalhes = `Número do Pedido: ${venda.numeroPedido}\n`;
        detalhes += `Cliente: ${venda.cliente}\n`;
        detalhes += `Valor Total: ${this.formatarDinheiro(venda.valor)}\n`;
        detalhes += `Tipo: ${this.getTipoLabel(venda.tipo)}\n`;
        detalhes += `Data: ${this.formatarData(venda.dataVenda)}\n\n`;
        detalhes += `Parcelas:\n`;
        
        parcelas.forEach(p => {
            detalhes += `${p.numero}/${parcelas.length} - ${this.formatarDinheiro(p.valor)} - `;
            detalhes += `Venc: ${this.formatarData(p.dataVencimento)} - `;
            detalhes += `Status: ${p.status}\n`;
        });
        
        alert(detalhes);
    }

    async excluirVenda(vendaId) {
        if (!confirm('Tem certeza que deseja excluir esta venda e todas as suas parcelas?')) {
            return;
        }
        
        // Excluir do Supabase
        if (this.usuarioId && typeof database !== 'undefined') {
            const resultado = await database.excluirVenda(vendaId);
            if (!resultado.success) {
                this.mostrarAlerta('Erro ao excluir venda: ' + resultado.error, 'danger');
                return;
            }
        } else {
            this.salvarDados('vendas', this.vendas);
            this.salvarDados('parcelas', this.parcelas);
        }
        
        // Remover localmente
        this.vendas = this.vendas.filter(v => v.id !== vendaId);
        this.parcelas = this.parcelas.filter(p => p.vendaId !== vendaId);
        
        this.carregarVendas();
        this.atualizarResumo();
        this.atualizarFluxoCaixa();
        
        this.mostrarAlerta('Venda excluída com sucesso!', 'success');
    }

    editarVenda(vendaId) {
        const venda = this.vendas.find(v => v.id === vendaId);
        if (!venda) {
            this.mostrarAlerta('Venda não encontrada!', 'danger');
            return;
        }

        // Preencher o modal com os dados da venda
        document.getElementById('vendaEditId').value = venda.id;
        document.getElementById('vendaEditCliente').value = venda.cliente;
        document.getElementById('vendaEditValor').value = venda.valor;
        document.getElementById('vendaEditNumeroPedido').value = venda.numeroPedido || '';
        document.getElementById('vendaEditTipo').value = venda.tipo;
        document.getElementById('vendaEditData').value = venda.dataVenda;

        // Abrir o modal
        const modal = new bootstrap.Modal(document.getElementById('modalEdicaoVenda'));
        modal.show();
    }

    async salvarEdicaoVenda() {
        const vendaId = document.getElementById('vendaEditId').value;
        const cliente = document.getElementById('vendaEditCliente').value.trim();
        const valor = parseFloat(document.getElementById('vendaEditValor').value);
        const numeroPedido = document.getElementById('vendaEditNumeroPedido').value.trim();
        const tipo = document.getElementById('vendaEditTipo').value;
        const dataVenda = document.getElementById('vendaEditData').value;

        if (!cliente || !valor || !tipo || !dataVenda) {
            this.mostrarAlerta('Preencha todos os campos obrigatórios!', 'warning');
            return;
        }

        // Encontrar a venda
        const vendaIndex = this.vendas.findIndex(v => v.id === vendaId);
        if (vendaIndex === -1) {
            this.mostrarAlerta('Venda não encontrada!', 'danger');
            return;
        }

        const vendaAntiga = this.vendas[vendaIndex];
        const dadosAtualizados = {
            cliente,
            valor,
            numeroPedido: numeroPedido || 'N/A',
            tipo,
            dataVenda
        };

        // Atualizar no Supabase
        if (this.usuarioId && typeof database !== 'undefined') {
            const resultado = await database.atualizarVenda(vendaId, dadosAtualizados);
            if (!resultado.success) {
                this.mostrarAlerta('Erro ao atualizar venda: ' + resultado.error, 'danger');
                return;
            }

            // Se o valor mudou, atualizar as parcelas proporcionalmente
            if (vendaAntiga.valor !== valor) {
                const parcelasVenda = this.parcelas.filter(p => p.vendaId === vendaId);
                const fator = valor / vendaAntiga.valor;
                
                for (const parcela of parcelasVenda) {
                    const novoValor = parcela.valor * fator;
                    await database.atualizarParcela(parcela.id, { valor: novoValor });
                }
            }

            // Recarregar dados do banco
            this.vendas = await database.carregarVendas();
            this.parcelas = await database.carregarParcelas();
        } else {
            // Modo local (fallback)
            this.vendas[vendaIndex] = { ...vendaAntiga, ...dadosAtualizados };

            if (vendaAntiga.valor !== valor) {
                const parcelasVenda = this.parcelas.filter(p => p.vendaId === vendaId);
                const fator = valor / vendaAntiga.valor;
                
                parcelasVenda.forEach(parcela => {
                    const parcelaIndex = this.parcelas.findIndex(p => p.id === parcela.id);
                    if (parcelaIndex !== -1) {
                        this.parcelas[parcelaIndex].valor = parcela.valor * fator;
                    }
                });
            }

            this.salvarDados('vendas', this.vendas);
            this.salvarDados('parcelas', this.parcelas);
        }

        // Fechar modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('modalEdicaoVenda'));
        modal.hide();

        // Atualizar interface
        this.carregarVendas();
        this.atualizarResumo();
        this.atualizarFluxoCaixa();

        this.mostrarAlerta('Venda atualizada com sucesso!', 'success');
    }

    buscarVendas(termo) {
        const tbody = document.getElementById('corpoTabelaVendas');
        const linhas = tbody.getElementsByTagName('tr');
        
        Array.from(linhas).forEach(linha => {
            const texto = linha.textContent.toLowerCase();
            linha.style.display = texto.includes(termo.toLowerCase()) ? '' : 'none';
        });
    }

    filtrarVendasPorPeriodo() {
        const dataInicio = document.getElementById('dataInicioVendas').value;
        const dataFim = document.getElementById('dataFimVendas').value;
        
        if (!dataInicio || !dataFim) {
            this.mostrarAlerta('Selecione as datas de início e fim!', 'warning');
            return;
        }
        
        if (dataInicio > dataFim) {
            this.mostrarAlerta('Data inicial não pode ser maior que a data final!', 'warning');
            return;
        }
        
        // Salvar datas no localStorage
        this.salvarDatasFiltros('vendas');
        
        this.carregarVendasFiltradas(dataInicio, dataFim);
        this.atualizarResumoPorPeriodo(dataInicio, dataFim);
    }

    carregarVendasFiltradas(dataInicio, dataFim) {
        const tbody = document.getElementById('corpoTabelaVendas');
        tbody.innerHTML = '';
        
        // Converter strings de data para objetos Date (sem problemas de fuso)
        const [anoInicio, mesInicio, diaInicio] = dataInicio.split('-').map(Number);
        const dataInicioObj = new Date(anoInicio, mesInicio - 1, diaInicio);
        
        const [anoFim, mesFim, diaFim] = dataFim.split('-').map(Number);
        const dataFimObj = new Date(anoFim, mesFim - 1, diaFim);
        dataFimObj.setHours(23, 59, 59, 999); // Incluir até o final do dia
        
        const vendasFiltradas = this.vendas.filter(venda => {
            const [ano, mes, dia] = venda.dataVenda.split('-').map(Number);
            const dataVenda = new Date(ano, mes - 1, dia);
            return dataVenda >= dataInicioObj && dataVenda <= dataFimObj;
        });
        
        vendasFiltradas.forEach(venda => {
            const parcelasVenda = this.parcelas.filter(p => p.vendaId === venda.id);
            const totalParcelas = parcelasVenda.length || 1;
            const parcelasPagas = parcelasVenda.filter(p => p.status === 'pago').length;
            
            // Mostrar parcelas no formato "total x pagas" (ex: 10x3 = 10 parcelas, 3 pagas)
            let parcelasTexto = `${totalParcelas}x`;
            if (totalParcelas > 1) {
                parcelasTexto = `${totalParcelas}x${parcelasPagas}`;
            }
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${this.formatarData(venda.dataVenda)}</td>
                <td><span class="badge bg-light text-dark">${venda.numeroPedido}</span></td>
                <td>${venda.cliente}</td>
                <td class="valor-monetario text-success">${this.formatarDinheiro(venda.valor)}</td>
                <td><span class="badge bg-${this.getTipoCor(venda.tipo)}">${this.getTipoLabel(venda.tipo)}</span></td>
                <td><span class="badge ${parcelasPagas === totalParcelas ? 'bg-success' : 'bg-warning text-dark'}">${parcelasTexto}</span></td>
                <td class="table-actions">
                    <button class="btn btn-sm btn-outline-primary" onclick="fluxoCaixa.editarVenda('${venda.id}')">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-info" onclick="fluxoCaixa.verDetalhesVenda('${venda.id}')">
                        <i class="bi bi-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="fluxoCaixa.excluirVenda('${venda.id}')">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    filtrarVendasPorTextoEPeriodo(termoBusca) {
        const dataInicio = document.getElementById('dataInicioVendas')?.value;
        const dataFim = document.getElementById('dataFimVendas')?.value;
        
        // Se tem filtro de data ativo, recarrega com o texto
        if (dataInicio && dataFim) {
            this.carregarVendasFiltradasPorTextoEPeriodo(termoBusca, dataInicio, dataFim);
        } else {
            // Se não tem filtro de data, filtra apenas por texto
            this.buscarVendas(termoBusca);
        }
    }

    carregarVendasFiltradasPorTextoEPeriodo(termoBusca, dataInicio, dataFim) {
        const tbody = document.getElementById('corpoTabelaVendas');
        tbody.innerHTML = '';
        
        const termo = termoBusca.toLowerCase();
        
        // Converter strings de data para objetos Date
        const [anoInicio, mesInicio, diaInicio] = dataInicio.split('-').map(Number);
        const dataInicioObj = new Date(anoInicio, mesInicio - 1, diaInicio);
        
        const [anoFim, mesFim, diaFim] = dataFim.split('-').map(Number);
        const dataFimObj = new Date(anoFim, mesFim - 1, diaFim);
        dataFimObj.setHours(23, 59, 59, 999);
        
        const vendasFiltradas = this.vendas.filter(venda => {
            const [ano, mes, dia] = venda.dataVenda.split('-').map(Number);
            const dataVenda = new Date(ano, mes - 1, dia);
            const dentroDoPeriodo = dataVenda >= dataInicioObj && dataVenda <= dataFimObj;
            const correspondeTexto = venda.cliente.toLowerCase().includes(termo) || 
                                     venda.numeroPedido.toLowerCase().includes(termo);
            return dentroDoPeriodo && correspondeTexto;
        });
        
        vendasFiltradas.forEach(venda => {
            const parcelasVenda = this.parcelas.filter(p => p.vendaId === venda.id);
            const totalParcelas = parcelasVenda.length || 1;
            const parcelasPagas = parcelasVenda.filter(p => p.status === 'pago').length;
            
            // Mostrar parcelas no formato "total x pagas" (ex: 10x3 = 10 parcelas, 3 pagas)
            let parcelasTexto = `${totalParcelas}x`;
            if (totalParcelas > 1) {
                parcelasTexto = `${totalParcelas}x${parcelasPagas}`;
            }
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${this.formatarData(venda.dataVenda)}</td>
                <td><span class="badge bg-light text-dark">${venda.numeroPedido}</span></td>
                <td>${venda.cliente}</td>
                <td class="valor-monetario text-success">${this.formatarDinheiro(venda.valor)}</td>
                <td><span class="badge bg-${this.getTipoCor(venda.tipo)}">${this.getTipoLabel(venda.tipo)}</span></td>
                <td><span class="badge ${parcelasPagas === totalParcelas ? 'bg-success' : 'bg-warning text-dark'}">${parcelasTexto}</span></td>
                <td class="table-actions">
                    <button class="btn btn-sm btn-outline-primary" onclick="fluxoCaixa.editarVenda('${venda.id}')">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-info" onclick="fluxoCaixa.verDetalhesVenda('${venda.id}')">
                        <i class="bi bi-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="fluxoCaixa.excluirVenda('${venda.id}')">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    limparFiltroVendas() {
        document.getElementById('dataInicioVendas').value = '';
        document.getElementById('dataFimVendas').value = '';
        document.getElementById('buscaVendas').value = '';
        
        // Limpar datas salvas
        this.limparDatasFiltros('vendas');
        
        this.carregarVendas();
        this.atualizarResumo();
    }

    atualizarResumoPorPeriodo(dataInicio, dataFim) {
        // Converter strings de data para objetos Date
        const [anoInicio, mesInicio, diaInicio] = dataInicio.split('-').map(Number);
        const dataInicioObj = new Date(anoInicio, mesInicio - 1, diaInicio);
        
        const [anoFim, mesFim, diaFim] = dataFim.split('-').map(Number);
        const dataFimObj = new Date(anoFim, mesFim - 1, diaFim);
        dataFimObj.setHours(23, 59, 59, 999);
        
        // Filtrar vendas do período
        const vendasPeriodo = this.vendas.filter(v => {
            const [ano, mes, dia] = v.dataVenda.split('-').map(Number);
            const dataVenda = new Date(ano, mes - 1, dia);
            return dataVenda >= dataInicioObj && dataVenda <= dataFimObj;
        });
        
        const totalVendasPeriodo = vendasPeriodo.reduce((sum, v) => sum + v.valor, 0);
        
        // Filtrar parcelas do período (por data de vencimento)
        const parcelasPeriodo = this.parcelas.filter(p => {
            const [ano, mes, dia] = p.dataVencimento.split('-').map(Number);
            const dataVenc = new Date(ano, mes - 1, dia);
            return dataVenc >= dataInicioObj && dataVenc <= dataFimObj;
        });
        
        const totalAReceber = parcelasPeriodo
            .filter(p => p.status === 'pendente')
            .reduce((sum, p) => sum + p.valor, 0);
        
        const totalRecebido = parcelasPeriodo
            .filter(p => p.status === 'pago')
            .reduce((sum, p) => sum + p.valor, 0);
        
        // Atualizar interface
        document.getElementById('vendasMes').textContent = this.formatarDinheiro(totalVendasPeriodo);
        document.getElementById('aReceber').textContent = this.formatarDinheiro(totalAReceber);
        document.getElementById('recebido').textContent = this.formatarDinheiro(totalRecebido);
    }

    inicializarGraficos() {
        // Gráfico de recebimentos mensais
        const ctxRecebimentos = document.getElementById('graficoRecebimentos').getContext('2d');
        this.graficoRecebimentos = new Chart(ctxRecebimentos, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Recebimentos',
                    data: [],
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: (value) => 'R$ ' + value.toLocaleString('pt-BR')
                        }
                    }
                }
            }
        });

        // Gráfico de distribuição por tipo
        const ctxTipos = document.getElementById('graficoTipos').getContext('2d');
        this.graficoTipos = new Chart(ctxTipos, {
            type: 'doughnut',
            data: {
                labels: ['À Vista', 'Cartão', 'Boleto'],
                datasets: [{
                    data: [0, 0, 0],
                    backgroundColor: ['#28a745', '#667eea', '#ffc107']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    atualizarRelatorio() {
        // Definir datas padrão (mês atual)
        const hoje = new Date();
        const primeiroDia = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
        const ultimoDia = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
        
        const dataInicioInput = document.getElementById('dataInicioRelatorio');
        const dataFimInput = document.getElementById('dataFimRelatorio');
        
        if (dataInicioInput && !dataInicioInput.value) {
            dataInicioInput.value = primeiroDia.toISOString().split('T')[0];
        }
        if (dataFimInput && !dataFimInput.value) {
            dataFimInput.value = ultimoDia.toISOString().split('T')[0];
        }
        
        // Gerar relatório com as datas
        this.filtrarRelatorio();
    }

    filtrarRelatorio() {
        const dataInicio = document.getElementById('dataInicioRelatorio').value;
        const dataFim = document.getElementById('dataFimRelatorio').value;
        
        if (!dataInicio || !dataFim) {
            this.mostrarAlerta('Selecione as datas de início e fim!', 'warning');
            return;
        }
        
        // Salvar datas no localStorage
        this.salvarDatasFiltros('relatorio');
        
        // Converter para objetos Date
        const [anoInicio, mesInicio, diaInicio] = dataInicio.split('-').map(Number);
        const dataInicioObj = new Date(anoInicio, mesInicio - 1, diaInicio);
        
        const [anoFim, mesFim, diaFim] = dataFim.split('-').map(Number);
        const dataFimObj = new Date(anoFim, mesFim - 1, diaFim);
        dataFimObj.setHours(23, 59, 59, 999);
        
        // Atualizar gráficos com período
        this.atualizarGraficoRecebimentosPorPeriodo(dataInicioObj, dataFimObj);
        this.atualizarGraficoTiposPorPeriodo(dataInicioObj, dataFimObj);
        
        // Atualizar conteúdo do relatório
        this.gerarConteudoRelatorioPorPeriodo(dataInicioObj, dataFimObj);
    }

    atualizarGraficoRecebimentosPorPeriodo(dataInicio, dataFim) {
        const labels = [];
        const valores = [];
        
        // Gerar labels para cada mês no período
        let dataAtual = new Date(dataInicio.getFullYear(), dataInicio.getMonth(), 1);
        const dataFimMes = new Date(dataFim.getFullYear(), dataFim.getMonth(), 1);
        
        while (dataAtual <= dataFimMes) {
            const mesAno = dataAtual.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
            labels.push(mesAno);
            
            const totalMes = this.parcelas
                .filter(p => {
                    const [ano, mes, dia] = p.dataVencimento.split('-').map(Number);
                    const dataParcela = new Date(ano, mes - 1, dia);
                    return p.status === 'pago' && 
                           dataParcela.getMonth() === dataAtual.getMonth() && 
                           dataParcela.getFullYear() === dataAtual.getFullYear();
                })
                .reduce((sum, p) => sum + p.valor, 0);
            
            valores.push(totalMes);
            dataAtual.setMonth(dataAtual.getMonth() + 1);
        }
        
        if (this.graficoRecebimentos) {
            this.graficoRecebimentos.data.labels = labels;
            this.graficoRecebimentos.data.datasets[0].data = valores;
            this.graficoRecebimentos.update();
        }
    }

    atualizarGraficoTiposPorPeriodo(dataInicio, dataFim) {
        const vendasPeriodo = this.vendas.filter(v => {
            const [ano, mes, dia] = v.dataVenda.split('-').map(Number);
            const dataVenda = new Date(ano, mes - 1, dia);
            return dataVenda >= dataInicio && dataVenda <= dataFim;
        });
        
        const contagem = {
            vista: vendasPeriodo.filter(v => ['pix', 'dinheiro', 'transferencia'].includes(v.tipo)).length,
            cartao: vendasPeriodo.filter(v => ['debito', 'credito'].includes(v.tipo)).length,
            boleto: vendasPeriodo.filter(v => v.tipo === 'boleto').length
        };
        
        // Calcular valores totais por tipo
        const valores = {
            vista: vendasPeriodo.filter(v => ['pix', 'dinheiro', 'transferencia'].includes(v.tipo)).reduce((sum, v) => sum + v.valor, 0),
            cartao: vendasPeriodo.filter(v => ['debito', 'credito'].includes(v.tipo)).reduce((sum, v) => sum + v.valor, 0),
            boleto: vendasPeriodo.filter(v => v.tipo === 'boleto').reduce((sum, v) => sum + v.valor, 0)
        };
        
        // Atualizar valores na interface
        const totalVistaEl = document.getElementById('totalVista');
        const totalCartaoEl = document.getElementById('totalCartao');
        const totalBoletoEl = document.getElementById('totalBoleto');
        
        if (totalVistaEl) totalVistaEl.textContent = this.formatarDinheiro(valores.vista);
        if (totalCartaoEl) totalCartaoEl.textContent = this.formatarDinheiro(valores.cartao);
        if (totalBoletoEl) totalBoletoEl.textContent = this.formatarDinheiro(valores.boleto);
        
        this.graficoTipos.data.datasets[0].data = [contagem.vista, contagem.cartao, contagem.boleto];
        this.graficoTipos.update();
    }

    gerarConteudoRelatorioPorPeriodo(dataInicio, dataFim) {
        const vendasPeriodo = this.vendas.filter(v => {
            const [ano, mes, dia] = v.dataVenda.split('-').map(Number);
            const dataVenda = new Date(ano, mes - 1, dia);
            return dataVenda >= dataInicio && dataVenda <= dataFim;
        });
        
        const parcelasPeriodo = this.parcelas.filter(p => {
            const [ano, mes, dia] = p.dataVencimento.split('-').map(Number);
            const dataVenc = new Date(ano, mes - 1, dia);
            return dataVenc >= dataInicio && dataVenc <= dataFim;
        });
        
        // Calcular saídas do período (apenas pagas - com dataPagamento)
        let saidasPeriodo = [];
        if (typeof moduloSaidas !== 'undefined' && moduloSaidas.saidas) {
            saidasPeriodo = moduloSaidas.saidas.filter(s => {
                if (!s.dataPagamento) return false;
                const [ano, mes, dia] = s.dataVencimento.split('-').map(Number);
                const dataVenc = new Date(ano, mes - 1, dia);
                return dataVenc >= dataInicio && dataVenc <= dataFim;
            });
        }
        
        const totalVendas = vendasPeriodo.reduce((sum, v) => sum + v.valor, 0);
        const parcelasPagas = parcelasPeriodo.filter(p => p.status === 'pago');
        const totalRecebido = parcelasPagas.reduce((sum, p) => sum + p.valor, 0);
        const totalAReceber = parcelasPeriodo.filter(p => p.status === 'pendente').reduce((sum, p) => sum + p.valor, 0);
        const totalSaidas = saidasPeriodo.reduce((sum, s) => sum + s.valor, 0);
        const saldo = totalRecebido - totalSaidas;
        
        // Calcular recebido por tipo de pagamento
        const recebidoPorTipo = {
            pix: 0,
            dinheiro: 0,
            transferencia: 0,
            debito: 0,
            credito: 0,
            boleto: 0
        };
        
        parcelasPagas.forEach(p => {
            // Encontrar a venda correspondente para saber o tipo
            const venda = this.vendas.find(v => v.id === p.vendaId);
            if (venda) {
                if (recebidoPorTipo.hasOwnProperty(venda.tipo)) {
                    recebidoPorTipo[venda.tipo] += p.valor;
                }
            }
        });
        
        // Agrupar à vista (pix + dinheiro + transferência)
        const recebidoVista = recebidoPorTipo.pix + recebidoPorTipo.dinheiro + recebidoPorTipo.transferencia;
        const recebidoCartao = recebidoPorTipo.debito + recebidoPorTipo.credito;
        const recebidoBoleto = recebidoPorTipo.boleto;
        
        // Formatar datas corretamente (sem usar toISOString que usa UTC)
        const formatarDataLocal = (data) => {
            const dia = String(data.getDate()).padStart(2, '0');
            const mes = String(data.getMonth() + 1).padStart(2, '0');
            const ano = data.getFullYear();
            return `${dia}/${mes}/${ano}`;
        };
        
        const periodoFormatado = `${formatarDataLocal(dataInicio)} a ${formatarDataLocal(dataFim)}`;
        
        const conteudo = `
            <div class="mb-3">
                <h6 class="text-muted">Período: ${periodoFormatado}</h6>
            </div>
            <div class="row">
                <div class="col-md-2">
                    <div class="card bg-light">
                        <div class="card-body text-center">
                            <h6 class="text-muted">Total Vendas</h6>
                            <h5 class="text-primary">${this.formatarDinheiro(totalVendas)}</h5>
                            <small class="text-muted">${vendasPeriodo.length} vendas</small>
                        </div>
                    </div>
                </div>
                <div class="col-md-2">
                    <div class="card bg-light">
                        <div class="card-body text-center">
                            <h6 class="text-muted">Recebido</h6>
                            <h5 class="text-success">${this.formatarDinheiro(totalRecebido)}</h5>
                            <small class="text-muted">${parcelasPagas.length} parcelas</small>
                            <hr class="my-2">
                            <div class="text-start small">
                                <div class="d-flex justify-content-between">
                                    <span>À Vista:</span>
                                    <strong class="text-success">${this.formatarDinheiro(recebidoVista)}</strong>
                                </div>
                                <div class="d-flex justify-content-between">
                                    <span>Cartão:</span>
                                    <strong class="text-primary">${this.formatarDinheiro(recebidoCartao)}</strong>
                                </div>
                                <div class="d-flex justify-content-between">
                                    <span>Boleto:</span>
                                    <strong class="text-warning">${this.formatarDinheiro(recebidoBoleto)}</strong>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-md-2">
                    <div class="card bg-light">
                        <div class="card-body text-center">
                            <h6 class="text-muted">A Receber</h6>
                            <h5 class="text-warning">${this.formatarDinheiro(totalAReceber)}</h5>
                            <small class="text-muted">${parcelasPeriodo.filter(p => p.status === 'pendente').length} parcelas</small>
                        </div>
                    </div>
                </div>
                <div class="col-md-2">
                    <div class="card bg-light">
                        <div class="card-body text-center">
                            <h6 class="text-muted">Saídas</h6>
                            <h5 class="text-danger">${this.formatarDinheiro(totalSaidas)}</h5>
                            <small class="text-muted">${saidasPeriodo.length} saídas</small>
                        </div>
                    </div>
                </div>
                <div class="col-md-2">
                    <div class="card bg-light">
                        <div class="card-body text-center">
                            <h6 class="text-muted">Saldo</h6>
                            <h5 class="${saldo >= 0 ? 'text-success' : 'text-danger'}">${this.formatarDinheiro(saldo)}</h5>
                            <small class="text-muted">recebido - saídas</small>
                        </div>
                    </div>
                </div>
                <div class="col-md-2">
                    <div class="card bg-light">
                        <div class="card-body text-center">
                            <h6 class="text-muted">Ticket Médio</h6>
                            <h5 class="text-info">${this.formatarDinheiro(vendasPeriodo.length > 0 ? totalVendas / vendasPeriodo.length : 0)}</h5>
                            <small class="text-muted">por venda</small>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.getElementById('conteudoRelatorio').innerHTML = conteudo;
    }

    atualizarGraficoRecebimentos(periodo) {
        const dados = this.getDadosRecebimentos(periodo);
        
        this.graficoRecebimentos.data.labels = dados.labels;
        this.graficoRecebimentos.data.datasets[0].data = dados.valores;
        this.graficoRecebimentos.update();
    }

    atualizarGraficoTipos(periodo) {
        const dataLimite = this.getDataLimite(periodo);
        
        const vendasPeriodo = this.vendas.filter(v => 
            new Date(v.dataVenda) >= dataLimite
        );
        
        const contagem = {
            vista: vendasPeriodo.filter(v => ['pix', 'dinheiro', 'transferencia'].includes(v.tipo)).length,
            cartao: vendasPeriodo.filter(v => ['debito', 'credito'].includes(v.tipo)).length,
            boleto: vendasPeriodo.filter(v => v.tipo === 'boleto').length
        };
        
        // Calcular valores totais por tipo
        const valores = {
            vista: vendasPeriodo.filter(v => ['pix', 'dinheiro', 'transferencia'].includes(v.tipo)).reduce((sum, v) => sum + v.valor, 0),
            cartao: vendasPeriodo.filter(v => ['debito', 'credito'].includes(v.tipo)).reduce((sum, v) => sum + v.valor, 0),
            boleto: vendasPeriodo.filter(v => v.tipo === 'boleto').reduce((sum, v) => sum + v.valor, 0)
        };
        
        // Atualizar valores na interface
        const totalVistaEl = document.getElementById('totalVista');
        const totalCartaoEl = document.getElementById('totalCartao');
        const totalBoletoEl = document.getElementById('totalBoleto');
        
        if (totalVistaEl) totalVistaEl.textContent = this.formatarDinheiro(valores.vista);
        if (totalCartaoEl) totalCartaoEl.textContent = this.formatarDinheiro(valores.cartao);
        if (totalBoletoEl) totalBoletoEl.textContent = this.formatarDinheiro(valores.boleto);
        
        this.graficoTipos.data.datasets[0].data = [contagem.vista, contagem.cartao, contagem.boleto];
        this.graficoTipos.update();
    }

    getDadosRecebimentos(periodo) {
        const hoje = new Date();
        const labels = [];
        const valores = [];
        
        let meses = 1;
        if (periodo === 'trimestre') meses = 3;
        else if (periodo === 'semestre') meses = 6;
        else if (periodo === 'ano') meses = 12;
        
        for (let i = meses - 1; i >= 0; i--) {
            const data = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
            const mesAno = data.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
            
            labels.push(mesAno);
            
            const totalMes = this.parcelas
                .filter(p => {
                    const dataParcela = new Date(p.dataVencimento);
                    return p.status === 'pago' && 
                           dataParcela.getMonth() === data.getMonth() && 
                           dataParcela.getFullYear() === data.getFullYear();
                })
                .reduce((sum, p) => sum + p.valor, 0);
            
            valores.push(totalMes);
        }
        
        return { labels, valores };
    }

    getDadosPorTipo(periodo) {
        const dataLimite = this.getDataLimite(periodo);
        
        const vendasPeriodo = this.vendas.filter(v => 
            new Date(v.dataVenda) >= dataLimite
        );
        
        const contagem = {
            vista: vendasPeriodo.filter(v => ['pix', 'dinheiro', 'transferencia'].includes(v.tipo)).length,
            cartao: vendasPeriodo.filter(v => ['debito', 'credito'].includes(v.tipo)).length,
            boleto: vendasPeriodo.filter(v => v.tipo === 'boleto').length
        };
        
        return [contagem.vista, contagem.cartao, contagem.boleto];
    }

    getDataLimite(periodo) {
        const hoje = new Date();
        let meses = 0;
        
        if (periodo === 'mes') meses = 1;
        else if (periodo === 'trimestre') meses = 3;
        else if (periodo === 'semestre') meses = 6;
        else if (periodo === 'ano') meses = 12;
        
        return new Date(hoje.getFullYear(), hoje.getMonth() - meses + 1, 1);
    }

    gerarConteudoRelatorio(periodo) {
        const dataLimite = this.getDataLimite(periodo);
        const vendasPeriodo = this.vendas.filter(v => new Date(v.dataVenda) >= dataLimite);
        const parcelasPeriodo = this.parcelas.filter(p => new Date(p.dataVencimento) >= dataLimite);
        
        const totalVendas = vendasPeriodo.reduce((sum, v) => sum + v.valor, 0);
        const totalRecebido = parcelasPeriodo.filter(p => p.status === 'pago').reduce((sum, p) => sum + p.valor, 0);
        const totalAReceber = parcelasPeriodo.filter(p => p.status === 'pendente').reduce((sum, p) => sum + p.valor, 0);
        
        const conteudo = `
            <div class="row">
                <div class="col-md-3">
                    <div class="card bg-light">
                        <div class="card-body text-center">
                            <h6 class="text-muted">Total de Vendas</h6>
                            <h4 class="text-primary">${this.formatarDinheiro(totalVendas)}</h4>
                            <small class="text-muted">${vendasPeriodo.length} vendas</small>
                        </div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="card bg-light">
                        <div class="card-body text-center">
                            <h6 class="text-muted">Total Recebido</h6>
                            <h4 class="text-success">${this.formatarDinheiro(totalRecebido)}</h4>
                            <small class="text-muted">${parcelasPeriodo.filter(p => p.status === 'pago').length} parcelas</small>
                        </div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="card bg-light">
                        <div class="card-body text-center">
                            <h6 class="text-muted">A Receber</h6>
                            <h4 class="text-warning">${this.formatarDinheiro(totalAReceber)}</h4>
                            <small class="text-muted">${parcelasPeriodo.filter(p => p.status === 'pendente').length} parcelas</small>
                        </div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="card bg-light">
                        <div class="card-body text-center">
                            <h6 class="text-muted">Ticket Médio</h6>
                            <h4 class="text-info">${this.formatarDinheiro(vendasPeriodo.length > 0 ? totalVendas / vendasPeriodo.length : 0)}</h4>
                            <small class="text-muted">por venda</small>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.getElementById('conteudoRelatorio').innerHTML = conteudo;
    }

    gerarRelatorioPDF() {
        const dataInicio = document.getElementById('dataInicioRelatorio').value;
        const dataFim = document.getElementById('dataFimRelatorio').value;
        
        if (!dataInicio || !dataFim) {
            this.mostrarAlerta('Selecione as datas de início e fim primeiro!', 'warning');
            return;
        }
        
        // Converter para objetos Date
        const [anoInicio, mesInicio, diaInicio] = dataInicio.split('-').map(Number);
        const dataInicioObj = new Date(anoInicio, mesInicio - 1, diaInicio);
        
        const [anoFim, mesFim, diaFim] = dataFim.split('-').map(Number);
        const dataFimObj = new Date(anoFim, mesFim - 1, diaFim);
        dataFimObj.setHours(23, 59, 59, 999);
        
        // Filtrar dados do período
        const vendasPeriodo = this.vendas.filter(v => {
            const [ano, mes, dia] = v.dataVenda.split('-').map(Number);
            const dataVenda = new Date(ano, mes - 1, dia);
            return dataVenda >= dataInicioObj && dataVenda <= dataFimObj;
        });
        
        const parcelasPeriodo = this.parcelas.filter(p => {
            const [ano, mes, dia] = p.dataVencimento.split('-').map(Number);
            const dataVenc = new Date(ano, mes - 1, dia);
            return dataVenc >= dataInicioObj && dataVenc <= dataFimObj;
        });
        
        let saidasPeriodo = [];
        if (typeof moduloSaidas !== 'undefined' && moduloSaidas.saidas) {
            saidasPeriodo = moduloSaidas.saidas.filter(s => {
                if (!s.dataPagamento) return false;
                const [ano, mes, dia] = s.dataVencimento.split('-').map(Number);
                const dataVenc = new Date(ano, mes - 1, dia);
                return dataVenc >= dataInicioObj && dataVenc <= dataFimObj;
            });
        }
        
        // Calcular totais
        const totalVendas = vendasPeriodo.reduce((sum, v) => sum + v.valor, 0);
        const parcelasPagas = parcelasPeriodo.filter(p => p.status === 'pago');
        const totalRecebido = parcelasPagas.reduce((sum, p) => sum + p.valor, 0);
        const totalAReceber = parcelasPeriodo.filter(p => p.status === 'pendente').reduce((sum, p) => sum + p.valor, 0);
        const totalSaidas = saidasPeriodo.reduce((sum, s) => sum + s.valor, 0);
        const saldo = totalRecebido - totalSaidas;
        
        // Calcular recebido por tipo de pagamento
        const recebidoPorTipo = {
            pix: 0,
            dinheiro: 0,
            transferencia: 0,
            debito: 0,
            credito: 0,
            boleto: 0
        };
        
        parcelasPagas.forEach(p => {
            const venda = this.vendas.find(v => v.id === p.vendaId);
            if (venda && recebidoPorTipo.hasOwnProperty(venda.tipo)) {
                recebidoPorTipo[venda.tipo] += p.valor;
            }
        });
        
        const recebidoVista = recebidoPorTipo.pix + recebidoPorTipo.dinheiro + recebidoPorTipo.transferencia;
        const recebidoCartao = recebidoPorTipo.debito + recebidoPorTipo.credito;
        const recebidoBoleto = recebidoPorTipo.boleto;
        
        // Criar PDF
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        const periodoFormatado = `${this.formatarData(dataInicio)} a ${this.formatarData(dataFim)}`;
        
        // Cabeçalho
        doc.setFontSize(18);
        doc.setTextColor(40, 40, 40);
        doc.text('Relatório de Fluxo de Caixa', 105, 20, { align: 'center' });
        
        doc.setFontSize(12);
        doc.setTextColor(100, 100, 100);
        doc.text(`Período: ${periodoFormatado}`, 105, 30, { align: 'center' });
        doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 105, 37, { align: 'center' });
        
        // Linha separadora
        doc.setDrawColor(200, 200, 200);
        doc.line(20, 42, 190, 42);
        
        // Resumo
        doc.setFontSize(14);
        doc.setTextColor(40, 40, 40);
        doc.text('Resumo do Período', 20, 52);
        
        doc.setFontSize(11);
        let y = 62;
        
        doc.setTextColor(0, 0, 0);
        doc.text(`Total de Vendas: ${this.formatarDinheiro(totalVendas)} (${vendasPeriodo.length} vendas)`, 20, y);
        y += 8;
        
        doc.setTextColor(0, 128, 0);
        doc.text(`Total Recebido: ${this.formatarDinheiro(totalRecebido)}`, 20, y);
        y += 7;
        
        // Detalhamento por tipo
        doc.setFontSize(10);
        doc.setTextColor(80, 80, 80);
        doc.text(`   • À Vista (PIX/Dinheiro/Transf.): ${this.formatarDinheiro(recebidoVista)}`, 25, y);
        y += 6;
        doc.text(`   • Cartão (Débito/Crédito): ${this.formatarDinheiro(recebidoCartao)}`, 25, y);
        y += 6;
        doc.text(`   • Boleto: ${this.formatarDinheiro(recebidoBoleto)}`, 25, y);
        y += 8;
        
        doc.setFontSize(11);
        
        doc.setTextColor(200, 150, 0);
        doc.text(`A Receber: ${this.formatarDinheiro(totalAReceber)}`, 20, y);
        y += 8;
        
        doc.setTextColor(200, 0, 0);
        doc.text(`Total Saídas: ${this.formatarDinheiro(totalSaidas)} (${saidasPeriodo.length} saídas)`, 20, y);
        y += 8;
        
        doc.setTextColor(saldo >= 0 ? 0 : 200, saldo >= 0 ? 128 : 0, 0);
        doc.text(`Saldo: ${this.formatarDinheiro(saldo)}`, 20, y);
        y += 15;
        
        // Lista de Vendas
        doc.setDrawColor(200, 200, 200);
        doc.line(20, y, 190, y);
        y += 10;
        
        doc.setFontSize(14);
        doc.setTextColor(40, 40, 40);
        doc.text('Vendas do Período', 20, y);
        y += 10;
        
        doc.setFontSize(9);
        doc.setTextColor(100, 100, 100);
        doc.text('Data', 20, y);
        doc.text('Pedido', 40, y);
        doc.text('Cliente', 65, y);
        doc.text('Valor', 130, y);
        doc.text('Tipo', 165, y);
        y += 5;
        doc.line(20, y, 190, y);
        y += 5;
        
        doc.setTextColor(0, 0, 0);
        vendasPeriodo.slice(0, 20).forEach(v => {
            if (y > 270) {
                doc.addPage();
                y = 20;
            }
            doc.text(this.formatarData(v.dataVenda), 20, y);
            doc.text((v.numeroPedido || 'N/A').substring(0, 10), 40, y);
            doc.text(v.cliente.substring(0, 22), 65, y);
            doc.text(this.formatarDinheiro(v.valor), 130, y);
            doc.text(this.getTipoLabel(v.tipo), 165, y);
            y += 6;
        });
        
        if (vendasPeriodo.length > 20) {
            doc.text(`... e mais ${vendasPeriodo.length - 20} vendas`, 20, y);
            y += 10;
        }
        
        // ========== DETALHAMENTO DE RECEBIMENTOS POR CLIENTE ==========
        if (y > 200) {
            doc.addPage();
            y = 20;
        }
        
        y += 5;
        doc.setDrawColor(200, 200, 200);
        doc.line(20, y, 190, y);
        y += 10;
        
        doc.setFontSize(14);
        doc.setTextColor(40, 40, 40);
        doc.text('Recebimentos por Cliente', 20, y);
        y += 10;
        
        // Agrupar parcelas pagas por cliente
        const recebimentosPorCliente = {};
        parcelasPagas.forEach(p => {
            const venda = this.vendas.find(v => v.id === p.vendaId);
            if (venda) {
                const cliente = venda.cliente;
                if (!recebimentosPorCliente[cliente]) {
                    recebimentosPorCliente[cliente] = {
                        total: 0,
                        parcelas: [],
                        pedidos: new Set()
                    };
                }
                recebimentosPorCliente[cliente].total += p.valor;
                recebimentosPorCliente[cliente].pedidos.add(venda.numeroPedido || 'N/A');
                recebimentosPorCliente[cliente].parcelas.push({
                    valor: p.valor,
                    data: p.dataPagamento || p.dataVencimento,
                    tipo: venda.tipo,
                    pedido: venda.numeroPedido
                });
            }
        });
        
        doc.setFontSize(9);
        doc.setTextColor(100, 100, 100);
        doc.text('Cliente', 20, y);
        doc.text('Pedido(s)', 75, y);
        doc.text('Qtd Parc.', 120, y);
        doc.text('Total Recebido', 150, y);
        y += 5;
        doc.line(20, y, 190, y);
        y += 5;
        
        doc.setTextColor(0, 0, 0);
        Object.keys(recebimentosPorCliente).sort().forEach(cliente => {
            if (y > 270) {
                doc.addPage();
                y = 20;
            }
            const dados = recebimentosPorCliente[cliente];
            const pedidosStr = Array.from(dados.pedidos).join(', ').substring(0, 15);
            doc.text(cliente.substring(0, 20), 20, y);
            doc.text(pedidosStr, 75, y);
            doc.text(dados.parcelas.length.toString(), 125, y);
            doc.setTextColor(0, 128, 0);
            doc.text(this.formatarDinheiro(dados.total), 150, y);
            doc.setTextColor(0, 0, 0);
            y += 6;
        });
        
        // ========== DETALHAMENTO DE BOLETOS ==========
        const vendasBoleto = vendasPeriodo.filter(v => v.tipo === 'boleto');
        
        if (vendasBoleto.length > 0) {
            if (y > 180) {
                doc.addPage();
                y = 20;
            }
            
            y += 5;
            doc.setDrawColor(200, 200, 200);
            doc.line(20, y, 190, y);
            y += 10;
            
            doc.setFontSize(14);
            doc.setTextColor(40, 40, 40);
            doc.text('Detalhamento de Boletos', 20, y);
            y += 10;
            
            doc.setFontSize(9);
            doc.setTextColor(100, 100, 100);
            doc.text('Pedido', 20, y);
            doc.text('Cliente', 45, y);
            doc.text('Parcela', 95, y);
            doc.text('Valor', 115, y);
            doc.text('Vencimento', 150, y);
            doc.text('Status', 180, y);
            y += 5;
            doc.line(20, y, 190, y);
            y += 5;
            
            vendasBoleto.forEach(venda => {
                const parcelasVenda = this.parcelas.filter(p => p.vendaId === venda.id);
                const totalParcelas = parcelasVenda.length;
                
                parcelasVenda.forEach(p => {
                    if (y > 270) {
                        doc.addPage();
                        y = 20;
                    }
                    
                    doc.setTextColor(0, 0, 0);
                    doc.text((venda.numeroPedido || 'N/A').substring(0, 8), 20, y);
                    doc.text(venda.cliente.substring(0, 18), 45, y);
                    doc.text(`${p.numero}/${totalParcelas}`, 95, y);
                    doc.text(this.formatarDinheiro(p.valor), 115, y);
                    doc.text(this.formatarData(p.dataVencimento), 150, y);
                    
                    if (p.status === 'pago') {
                        doc.setTextColor(0, 128, 0);
                        doc.text('PAGO', 180, y);
                    } else {
                        doc.setTextColor(200, 0, 0);
                        doc.text('PEND.', 180, y);
                    }
                    y += 6;
                });
            });
            
            // Resumo de boletos
            const totalBoletosPagos = vendasBoleto.reduce((sum, v) => {
                return sum + this.parcelas.filter(p => p.vendaId === v.id && p.status === 'pago').reduce((s, p) => s + p.valor, 0);
            }, 0);
            const totalBoletosPendentes = vendasBoleto.reduce((sum, v) => {
                return sum + this.parcelas.filter(p => p.vendaId === v.id && p.status === 'pendente').reduce((s, p) => s + p.valor, 0);
            }, 0);
            
            y += 5;
            doc.setFontSize(10);
            doc.setTextColor(0, 128, 0);
            doc.text(`Total Boletos Recebidos: ${this.formatarDinheiro(totalBoletosPagos)}`, 20, y);
            y += 6;
            doc.setTextColor(200, 0, 0);
            doc.text(`Total Boletos Pendentes: ${this.formatarDinheiro(totalBoletosPendentes)}`, 20, y);
            y += 10;
        }
        
        // Lista de Saídas
        if (saidasPeriodo.length > 0) {
            if (y > 240) {
                doc.addPage();
                y = 20;
            }
            
            y += 5;
            doc.setDrawColor(200, 200, 200);
            doc.line(20, y, 190, y);
            y += 10;
            
            doc.setFontSize(14);
            doc.setTextColor(40, 40, 40);
            doc.text('Saídas do Período', 20, y);
            y += 10;
            
            doc.setFontSize(9);
            doc.setTextColor(100, 100, 100);
            doc.text('Data', 20, y);
            doc.text('Descrição', 45, y);
            doc.text('Valor', 140, y);
            doc.text('Tipo', 170, y);
            y += 5;
            doc.line(20, y, 190, y);
            y += 5;
            
            doc.setTextColor(0, 0, 0);
            saidasPeriodo.slice(0, 15).forEach(s => {
                if (y > 270) {
                    doc.addPage();
                    y = 20;
                }
                doc.text(this.formatarData(s.dataVencimento), 20, y);
                doc.text(s.descricao.substring(0, 35), 45, y);
                doc.text(this.formatarDinheiro(s.valor), 140, y);
                doc.text(s.tipo === 'fixo' ? 'Fixo' : 'Variável', 170, y);
                y += 6;
            });
            
            if (saidasPeriodo.length > 15) {
                doc.text(`... e mais ${saidasPeriodo.length - 15} saídas`, 20, y);
            }
        }
        
        // Salvar PDF
        const nomeArquivo = `relatorio_${dataInicio}_a_${dataFim}.pdf`;
        doc.save(nomeArquivo);
        
        this.mostrarAlerta('PDF gerado com sucesso!', 'success');
    }

    exportarDados() {
        // Incluir saídas no backup
        let saidas = [];
        if (typeof moduloSaidas !== 'undefined' && moduloSaidas.saidas) {
            saidas = moduloSaidas.saidas;
        }
        
        const dados = {
            vendas: this.vendas,
            parcelas: this.parcelas,
            saidas: saidas,
            config: this.config,
            versao: '1.0',
            dataExportacao: new Date().toISOString()
        };
        
        const blob = new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `backup-fluxo-caixa-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        // Salvar também como backup local
        this.salvarBackupLocal();
        
        this.mostrarAlerta('Backup exportado com sucesso! Guarde este arquivo em local seguro.', 'success');
    }

    salvarBackupLocal() {
        let saidas = [];
        if (typeof moduloSaidas !== 'undefined' && moduloSaidas.saidas) {
            saidas = moduloSaidas.saidas;
        }
        
        const backup = {
            vendas: this.vendas,
            parcelas: this.parcelas,
            saidas: saidas,
            config: this.config,
            versao: '1.0',
            dataBackup: new Date().toISOString()
        };
        
        // Manter últimos 5 backups automáticos
        const backups = this.carregarDados('backups') || [];
        backups.unshift(backup);
        if (backups.length > 5) {
            backups.pop();
        }
        this.salvarDados('backups', backups);
        
        console.log('Backup local salvo:', new Date().toLocaleString('pt-BR'));
    }

    restaurarBackup() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const dados = JSON.parse(event.target.result);
                    
                    if (!dados.vendas || !dados.parcelas) {
                        this.mostrarAlerta('Arquivo de backup inválido!', 'danger');
                        return;
                    }
                    
                    if (!confirm(`Restaurar backup de ${new Date(dados.dataExportacao || dados.dataBackup).toLocaleString('pt-BR')}?\n\nIsso substituirá TODOS os dados atuais!`)) {
                        return;
                    }
                    
                    // Restaurar dados
                    this.vendas = dados.vendas;
                    this.parcelas = dados.parcelas;
                    if (dados.config) this.config = dados.config;
                    
                    this.salvarDados('vendas', this.vendas);
                    this.salvarDados('parcelas', this.parcelas);
                    this.salvarDados('config', this.config);
                    
                    // Restaurar saídas se existirem
                    if (dados.saidas && typeof moduloSaidas !== 'undefined') {
                        moduloSaidas.saidas = dados.saidas;
                        moduloSaidas.salvarDados('saidas', dados.saidas);
                        moduloSaidas.carregarSaidas();
                        moduloSaidas.atualizarResumoSaidas();
                    }
                    
                    // Atualizar interface
                    this.carregarVendas();
                    this.atualizarResumo();
                    this.atualizarFluxoCaixa();
                    
                    this.mostrarAlerta('Backup restaurado com sucesso!', 'success');
                } catch (error) {
                    console.error('Erro ao restaurar backup:', error);
                    this.mostrarAlerta('Erro ao ler arquivo de backup!', 'danger');
                }
            };
            reader.readAsText(file);
        };
        
        input.click();
    }

    restaurarUltimoBackupLocal() {
        const backups = this.carregarDados('backups') || [];
        
        if (backups.length === 0) {
            this.mostrarAlerta('Nenhum backup local encontrado!', 'warning');
            return;
        }
        
        const ultimoBackup = backups[0];
        const dataBackup = new Date(ultimoBackup.dataBackup).toLocaleString('pt-BR');
        
        if (!confirm(`Restaurar último backup local de ${dataBackup}?\n\nIsso substituirá TODOS os dados atuais!`)) {
            return;
        }
        
        // Restaurar dados
        this.vendas = ultimoBackup.vendas;
        this.parcelas = ultimoBackup.parcelas;
        if (ultimoBackup.config) this.config = ultimoBackup.config;
        
        this.salvarDados('vendas', this.vendas);
        this.salvarDados('parcelas', this.parcelas);
        this.salvarDados('config', this.config);
        
        // Restaurar saídas
        if (ultimoBackup.saidas && typeof moduloSaidas !== 'undefined') {
            moduloSaidas.saidas = ultimoBackup.saidas;
            moduloSaidas.salvarDados('saidas', ultimoBackup.saidas);
            moduloSaidas.carregarSaidas();
            moduloSaidas.atualizarResumoSaidas();
        }
        
        // Atualizar interface
        this.carregarVendas();
        this.atualizarResumo();
        this.atualizarFluxoCaixa();
        
        this.mostrarAlerta('Backup local restaurado com sucesso!', 'success');
    }

    limparTodosDados() {
        const senha = prompt('Digite a senha para autorizar a exclusão de todos os dados:\n\n(Clique em Cancelar e digite "ESQUECI" para redefinir a senha)');
        
        // Opção de redefinir senha
        if (senha === 'ESQUECI' || senha === 'esqueci') {
            this.redefinirSenhaLimpeza();
            return;
        }
        
        // Verificar senha (personalizada ou padrão)
        const senhaPersonalizada = localStorage.getItem('senhaLimpezaDados');
        const senhaCorreta = senhaPersonalizada || 'S@LEM2026';
        
        if (senha !== senhaCorreta) {
            this.mostrarAlerta('Senha incorreta! Operação cancelada.', 'danger');
            return;
        }
        
        if (!confirm('ATENÇÃO: Todos os vendas e parcelas serão excluídos permanentemente! Confirmar?')) {
            return;
        }
        
        this.vendas = [];
        this.parcelas = [];
        
        this.salvarDados('vendas', this.vendas);
        this.salvarDados('parcelas', this.parcelas);
        
        this.carregarVendas();
        this.atualizarResumo();
        this.atualizarFluxoCaixa();
        
        this.mostrarAlerta('Todos os dados foram limpos!', 'info');
    }
    
    redefinirSenhaLimpeza() {
        // Gerar código de recuperação aleatório
        const codigoRecuperacao = Math.random().toString(36).substring(2, 8).toUpperCase();
        
        // Salvar código temporariamente
        localStorage.setItem('codigoRecuperacaoSenha', codigoRecuperacao);
        localStorage.setItem('codigoRecuperacaoExpira', Date.now() + (30 * 60 * 1000)); // 30 minutos
        
        // Abrir cliente de email com o código
        const email = 'jonasfelipe.lima@gmail.com';
        const assunto = encodeURIComponent('Código de Recuperação - Sistema Fluxo de Caixa');
        const corpo = encodeURIComponent(`Seu código de recuperação de senha é: ${codigoRecuperacao}\n\nEste código expira em 30 minutos.\n\nData/Hora: ${new Date().toLocaleString('pt-BR')}`);
        
        window.open(`mailto:${email}?subject=${assunto}&body=${corpo}`, '_blank');
        
        this.mostrarAlerta('Um email será aberto com o código de recuperação. Envie o email para receber o código.', 'info', 10000);
        
        // Aguardar usuário inserir o código
        setTimeout(() => {
            const codigoDigitado = prompt('Digite o código de recuperação que foi enviado por email:');
            
            if (!codigoDigitado) {
                this.mostrarAlerta('Operação cancelada.', 'warning');
                return;
            }
            
            const codigoSalvo = localStorage.getItem('codigoRecuperacaoSenha');
            const expira = parseInt(localStorage.getItem('codigoRecuperacaoExpira'));
            
            if (Date.now() > expira) {
                this.mostrarAlerta('Código expirado! Tente novamente.', 'danger');
                localStorage.removeItem('codigoRecuperacaoSenha');
                localStorage.removeItem('codigoRecuperacaoExpira');
                return;
            }
            
            if (codigoDigitado.toUpperCase() === codigoSalvo) {
                // Código correto - permitir definir nova senha
                const novaSenha = prompt('Código válido! Digite a nova senha para limpeza de dados:');
                
                if (novaSenha && novaSenha.length >= 4) {
                    localStorage.setItem('senhaLimpezaDados', novaSenha);
                    this.mostrarAlerta(`Nova senha definida com sucesso! Sua nova senha é: ${novaSenha}`, 'success', 10000);
                } else {
                    this.mostrarAlerta('Senha deve ter pelo menos 4 caracteres.', 'danger');
                }
                
                localStorage.removeItem('codigoRecuperacaoSenha');
                localStorage.removeItem('codigoRecuperacaoExpira');
            } else {
                this.mostrarAlerta('Código incorreto!', 'danger');
            }
        }, 2000);
    }

    atualizarListaClientes(termo) {
        const datalist = document.getElementById('lista-clientes');
        datalist.innerHTML = '';
        
        if (termo.length < 2) return;
        
        // Obter clientes únicos das vendas
        const clientesUnicos = [...new Set(this.vendas.map(v => v.cliente))];
        
        // Filtrar clientes que contêm o termo
        const clientesFiltrados = clientesUnicos.filter(cliente => 
            cliente.toLowerCase().includes(termo.toLowerCase())
        );
        
        // Limitar a 10 sugestões
        clientesFiltrados.slice(0, 10).forEach(cliente => {
            const option = document.createElement('option');
            option.value = cliente;
            datalist.appendChild(option);
        });
    }

    limparFormulario() {
        document.getElementById('formVenda').reset();
        this.definirDataPadrao();
        document.getElementById('opcoesParcelamento').classList.add('d-none');
    }

    // Utilitários
    gerarId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    formatarData(dataString) {
        if (!dataString) return '-';
        
        // Parse seguro da data sem problemas de fuso horário
        const [ano, mes, dia] = dataString.split('-').map(Number);
        const data = new Date(ano, mes - 1, dia);
        
        return data.toLocaleDateString('pt-BR');
    }

    formatarDinheiro(valor) {
        return valor.toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        });
    }

    mostrarAlerta(mensagem, tipo, duracao = 5000) {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${tipo} alert-dismissible fade show position-fixed`;
        alertDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px; max-width: 500px;';
        alertDiv.innerHTML = `
            ${mensagem}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        document.body.appendChild(alertDiv);
        
        setTimeout(() => {
            alertDiv.remove();
        }, duracao);
    }

    // Storage
    salvarDados(chave, dados) {
        localStorage.setItem(chave, JSON.stringify(dados));
    }

    carregarDados(chave) {
        const dados = localStorage.getItem(chave);
        return dados ? JSON.parse(dados) : null;
    }
}

// Inicialização do sistema
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM carregado, inicializando sistema...');
    
    // Verificar se estamos na página principal
    if (document.getElementById('formVenda')) {
        console.log('Página principal detectada, inicializando FluxoCaixa...');
        window.fluxoCaixa = new FluxoCaixa();
        
        // Criar módulo de saídas (será inicializado após login)
        if (typeof ModuloSaidas !== 'undefined' && document.getElementById('formSaida')) {
            console.log('Módulo de saídas disponível, criando instância...');
            window.moduloSaidas = new ModuloSaidas(window.fluxoCaixa);
        }
    }
});

// Função para inicializar módulo de saídas após login
async function inicializarModuloSaidasComSupabase(userId) {
    if (typeof moduloSaidas !== 'undefined') {
        await moduloSaidas.inicializarComSupabase(userId);
        console.log('Módulo de saídas inicializado com Supabase');
    }
}
