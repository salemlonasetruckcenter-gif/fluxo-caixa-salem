// Módulo de Saídas do Fluxo de Caixa
class ModuloSaidas {
    constructor(fluxoCaixa) {
        this.fluxoCaixa = fluxoCaixa;
        this.saidas = [];
        this.usuarioId = null;
    }

    async inicializarComSupabase(userId) {
        this.usuarioId = userId;
        
        // Carregar saídas do Supabase
        if (typeof database !== 'undefined') {
            this.saidas = await database.carregarSaidas();
            console.log('Saídas carregadas do Supabase:', this.saidas.length);
        }
        
        this.inicializar();
    }

    inicializarModoLocal() {
        this.saidas = this.carregarDados('saidas') || [];
        this.inicializar();
    }

    inicializar() {
        this.configurarEventListeners();
        this.definirDataPadraoSaida();
        this.carregarSaidas();
        this.atualizarResumoSaidas();
        this.verificarContasAVencer();
    }
    
    verificarContasAVencer() {
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        
        const em5Dias = new Date(hoje);
        em5Dias.setDate(em5Dias.getDate() + 5);
        
        const contasAVencer = this.saidas.filter(s => {
            // Verificar se já foi paga (usando dataPagamento)
            if (s.dataPagamento) return false;
            
            const [ano, mes, dia] = s.dataVencimento.split('-').map(Number);
            const dataVenc = new Date(ano, mes - 1, dia);
            dataVenc.setHours(0, 0, 0, 0);
            
            return dataVenc >= hoje && dataVenc <= em5Dias;
        });
        
        if (contasAVencer.length > 0) {
            let mensagem = `⚠️ ATENÇÃO: Você tem ${contasAVencer.length} conta(s) a vencer nos próximos 5 dias:\n\n`;
            
            contasAVencer.forEach(conta => {
                const [ano, mes, dia] = conta.dataVencimento.split('-').map(Number);
                const dataFormatada = `${String(dia).padStart(2, '0')}/${String(mes).padStart(2, '0')}/${ano}`;
                mensagem += `• ${conta.descricao} - R$ ${conta.valor.toFixed(2).replace('.', ',')} - Vence: ${dataFormatada}\n`;
            });
            
            // Mostrar alerta na interface
            this.fluxoCaixa.mostrarAlerta(mensagem.replace(/\n/g, '<br>'), 'warning', 15000);
        }
    }

    configurarEventListeners() {
        // Verificar se o formulário existe
        const formSaida = document.getElementById('formSaida');
        if (!formSaida) {
            console.error('Formulário de saídas não encontrado!');
            return;
        }
        
        // Formulário de saídas
        formSaida.addEventListener('submit', (e) => {
            e.preventDefault();
            console.log('Formulário de saídas submetido');
            this.registrarSaida();
        });

        // Tipo de saída
        const tipoSaida = document.getElementById('tipoSaida');
        if (tipoSaida) {
            tipoSaida.addEventListener('change', (e) => {
                this.toggleRecorrencia(e.target.value);
            });
        }

        // Botões
        const btnLimparSaida = document.getElementById('btnLimparSaida');
        if (btnLimparSaida) {
            btnLimparSaida.addEventListener('click', () => this.limparFormularioSaida());
        }

        // Filtro de saídas por período
        const btnFiltrarSaidas = document.getElementById('btnFiltrarSaidas');
        if (btnFiltrarSaidas) {
            btnFiltrarSaidas.addEventListener('click', () => this.filtrarSaidasPorPeriodo());
        }
        
        const btnLimparFiltroSaidas = document.getElementById('btnLimparFiltroSaidas');
        if (btnLimparFiltroSaidas) {
            btnLimparFiltroSaidas.addEventListener('click', () => this.limparFiltroSaidas());
        }

        // Busca
        const buscaSaidas = document.getElementById('buscaSaidas');
        if (buscaSaidas) {
            buscaSaidas.addEventListener('input', (e) => {
                this.buscarSaidas(e.target.value);
            });
        }

        // Modal de edição de saída
        const btnSalvarEdicaoSaida = document.getElementById('btnSalvarEdicaoSaida');
        if (btnSalvarEdicaoSaida) {
            btnSalvarEdicaoSaida.addEventListener('click', () => {
                this.salvarEdicaoSaida();
            });
        }
    }

    definirDataPadraoSaida() {
        const hoje = new Date();
        const ano = hoje.getFullYear();
        const mes = String(hoje.getMonth() + 1).padStart(2, '0');
        const dia = String(hoje.getDate()).padStart(2, '0');
        const dataLocal = `${ano}-${mes}-${dia}`;
        
        const dataVencimentoEl = document.getElementById('dataVencimentoSaida');
        const dataPagamentoEl = document.getElementById('dataPagamentoSaida');
        
        if (dataVencimentoEl) {
            dataVencimentoEl.value = dataLocal;
        }
        if (dataPagamentoEl) {
            dataPagamentoEl.value = '';
        }
    }

    toggleRecorrencia(tipoSaida) {
        const campoRecorrencia = document.getElementById('recorrencia');
        
        if (!campoRecorrencia) {
            console.log('Campo recorrência não encontrado');
            return;
        }
        
        // Habilitar/desabilitar recorrência baseado no tipo
        if (tipoSaida === 'fixo') {
            campoRecorrencia.disabled = false;
        } else {
            campoRecorrencia.value = 'unica';
            campoRecorrencia.disabled = true;
        }
    }

    async registrarSaida() {
        console.log('registrarSaida() chamado');
        
        const descricaoEl = document.getElementById('descricaoSaida');
        const notaFiscalEl = document.getElementById('notaFiscalSaida');
        const valorEl = document.getElementById('valorSaida');
        const categoriaEl = document.getElementById('categoriaSaida');
        const tipoSaidaEl = document.getElementById('tipoSaida');
        const dataVencimentoEl = document.getElementById('dataVencimentoSaida');
        const dataPagamentoEl = document.getElementById('dataPagamentoSaida');
        const recorrenciaEl = document.getElementById('recorrencia');
        
        // Verificar se elementos existem
        if (!descricaoEl || !valorEl || !categoriaEl || !tipoSaidaEl || !dataVencimentoEl) {
            console.error('ERRO: Elementos do formulário de saídas não encontrados!');
            if (this.fluxoCaixa) {
                this.fluxoCaixa.mostrarAlerta('Erro no formulário. Recarregue a página.', 'danger');
            }
            return;
        }
        
        const descricao = descricaoEl.value.trim();
        const notaFiscal = notaFiscalEl ? notaFiscalEl.value.trim() : '';
        const valor = parseFloat(valorEl.value);
        const categoria = categoriaEl.value;
        const tipoSaida = tipoSaidaEl.value;
        const dataVencimento = dataVencimentoEl.value;
        const dataPagamento = dataPagamentoEl ? dataPagamentoEl.value : '';
        const recorrencia = recorrenciaEl ? recorrenciaEl.value : 'unica';
        
        console.log('Dados capturados:', { descricao, notaFiscal, valor, categoria, tipoSaida, dataVencimento });
        
        if (!descricao || !valor || !categoria || !tipoSaida || !dataVencimento) {
            if (this.fluxoCaixa) {
                this.fluxoCaixa.mostrarAlerta('Preencha todos os campos obrigatórios!', 'warning');
            }
            return;
        }

        const saida = {
            descricao,
            notaFiscal: notaFiscal || null,
            valor,
            categoria,
            tipo: tipoSaida,
            dataVencimento,
            dataPagamento: dataPagamento || null,
            recorrencia
        };

        // Gerar saídas recorrentes se necessário
        const saidasParaSalvar = this.gerarSaidasRecorrentesParaBanco(saida);
        
        // Salvar no Supabase
        if (this.usuarioId && typeof database !== 'undefined') {
            const resultado = await database.salvarSaidas(saidasParaSalvar);
            if (!resultado.success) {
                if (this.fluxoCaixa) {
                    this.fluxoCaixa.mostrarAlerta('Erro ao salvar saída: ' + resultado.error, 'danger');
                }
                return;
            }
            this.saidas.push(...resultado.saidas);
        } else {
            // Modo local (fallback)
            saidasParaSalvar.forEach(s => s.id = this.gerarId());
            this.saidas.push(...saidasParaSalvar);
            this.salvarDados('saidas', this.saidas);
        }
        
        // Atualizar interface
        this.carregarSaidas();
        this.atualizarResumoSaidas();
        if (this.fluxoCaixa && this.fluxoCaixa.atualizarFluxoCaixa) {
            this.fluxoCaixa.atualizarFluxoCaixa();
        }
        this.limparFormularioSaida();
        
        // Prevenir resubmissão ao pressionar F5
        if (window.history.replaceState) {
            window.history.replaceState(null, null, window.location.href);
        }
        
        if (this.fluxoCaixa) {
            this.fluxoCaixa.mostrarAlerta('Saída registrada com sucesso!', 'success');
        }
        console.log('Saída registrada com sucesso:', saida);
    }
    
    gerarSaidasRecorrentesParaBanco(saida) {
        const saidas = [{ ...saida }];
        
        if (saida.recorrencia === 'unica') {
            return saidas;
        }

        const [ano, mes, dia] = saida.dataVencimento.split('-').map(Number);
        const dataBase = new Date(ano, mes - 1, dia);
        
        for (let i = 1; i < 12; i++) {
            const novaData = new Date(dataBase);
            novaData.setMonth(novaData.getMonth() + i);
            
            const anoN = novaData.getFullYear();
            const mesN = String(novaData.getMonth() + 1).padStart(2, '0');
            const diaN = String(novaData.getDate()).padStart(2, '0');
            
            saidas.push({
                ...saida,
                dataVencimento: `${anoN}-${mesN}-${diaN}`,
                dataPagamento: null
            });
        }
        
        return saidas;
    }

    gerarSaidasRecorrentes(saida) {
        const saidas = [saida];
        
        if (saida.recorrencia === 'unica') {
            return saidas;
        }

        // Gerar saídas recorrentes para os próximos 12 meses
        const [ano, mes, dia] = saida.dataVencimento.split('-').map(Number);
        const dataBase = new Date(ano, mes - 1, dia);
        
        const intervalos = {
            'mensal': 1,
            'bimestral': 2,
            'trimestral': 3,
            'semestral': 6,
            'anual': 12
        };
        
        const intervalo = intervalos[saida.recorrencia] || 1;
        const quantidade = Math.floor(12 / intervalo);
        
        for (let i = 1; i < quantidade; i++) {
            const novaData = new Date(dataBase);
            novaData.setMonth(novaData.getMonth() + (i * intervalo));
            
            const novaSaida = {
                ...saida,
                id: this.gerarId(),
                dataVencimento: this.formatarDataISO(novaData),
                dataPagamento: null // Limpar data de pagamento para saídas futuras
            };
            
            saidas.push(novaSaida);
        }
        
        return saidas;
    }

    carregarSaidas() {
        const tbody = document.getElementById('corpoTabelaSaidas');
        if (!tbody) {
            console.error('ERRO: Elemento corpoTabelaSaidas não encontrado!');
            return;
        }
        tbody.innerHTML = '';
        
        const saidasOrdenadas = [...this.saidas].sort((a, b) => 
            new Date(b.dataVencimento) - new Date(a.dataVencimento)
        );
        
        saidasOrdenadas.forEach(saida => {
            const tr = document.createElement('tr');
            const valorFormatado = this.fluxoCaixa ? this.fluxoCaixa.formatarDinheiro(saida.valor) : `R$ ${saida.valor.toFixed(2)}`;
            
            tr.innerHTML = `
                <td>${this.formatarData(saida.dataVencimento)}</td>
                <td>${saida.dataPagamento ? this.formatarData(saida.dataPagamento) : '-'}</td>
                <td><span class="badge bg-light text-dark">${saida.notaFiscal || '-'}</span></td>
                <td>${saida.descricao}</td>
                <td><span class="badge bg-info">${this.getCategoriaLabel(saida.categoria)}</span></td>
                <td class="valor-monetario">${valorFormatado}</td>
                <td><span class="badge ${saida.tipo === 'fixo' ? 'bg-danger' : 'bg-warning'}">${saida.tipo === 'fixo' ? 'Fixo' : 'Variável'}</span></td>
                <td><span class="badge bg-secondary">${this.getRecorrenciaLabel(saida.recorrencia)}</span></td>
                <td class="table-actions">
                    <button class="btn btn-sm btn-outline-primary" onclick="moduloSaidas.editarSaida('${saida.id}')">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="moduloSaidas.excluirSaida('${saida.id}')">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            `;
            
            tbody.appendChild(tr);
        });
    }

    atualizarResumoSaidas(dataInicio = null, dataFim = null) {
        let saidasFiltradas;
        
        if (dataInicio && dataFim) {
            // Filtrar por período específico
            const [anoInicio, mesInicio, diaInicio] = dataInicio.split('-').map(Number);
            const dataInicioObj = new Date(anoInicio, mesInicio - 1, diaInicio);
            dataInicioObj.setHours(0, 0, 0, 0); // Início do dia
            
            const [anoFim, mesFim, diaFim] = dataFim.split('-').map(Number);
            const dataFimObj = new Date(anoFim, mesFim - 1, diaFim);
            dataFimObj.setHours(23, 59, 59, 999); // Fim do dia
            
            console.log('Filtro resumo - Início:', dataInicioObj, 'Fim:', dataFimObj);
            
            saidasFiltradas = this.saidas.filter(s => {
                const [ano, mes, dia] = s.dataVencimento.split('-').map(Number);
                const dataVenc = new Date(ano, mes - 1, dia);
                dataVenc.setHours(12, 0, 0, 0); // Meio do dia para evitar problemas de fuso
                const incluir = dataVenc >= dataInicioObj && dataVenc <= dataFimObj;
                console.log('Saída:', s.descricao, 'Data:', s.dataVencimento, 'Incluir:', incluir);
                return incluir;
            });
        } else {
            // Filtrar pelo mês atual
            const hoje = new Date();
            const mesAtual = hoje.getMonth();
            const anoAtual = hoje.getFullYear();
            
            saidasFiltradas = this.saidas.filter(s => {
                const [ano, mes, dia] = s.dataVencimento.split('-').map(Number);
                const data = new Date(ano, mes - 1, dia);
                return data.getMonth() === mesAtual && data.getFullYear() === anoAtual;
            });
        }
        
        console.log('Saídas filtradas para resumo:', saidasFiltradas.length);
        
        // Separar por tipo
        const fixos = saidasFiltradas.filter(s => s.tipo === 'fixo');
        const variaveis = saidasFiltradas.filter(s => s.tipo === 'variavel');
        
        // Calcular VENCIDOS (total na tabela)
        const totalFixosVencidos = fixos.reduce((sum, s) => sum + s.valor, 0);
        const totalVariaveisVencidos = variaveis.reduce((sum, s) => sum + s.valor, 0);
        const totalVencido = totalFixosVencidos + totalVariaveisVencidos;
        
        // Calcular PAGOS (apenas com data de pagamento)
        const fixosPagos = fixos.filter(s => s.dataPagamento);
        const variaveisPagas = variaveis.filter(s => s.dataPagamento);
        
        const totalFixosPagos = fixosPagos.reduce((sum, s) => sum + s.valor, 0);
        const totalVariaveisPagas = variaveisPagas.reduce((sum, s) => sum + s.valor, 0);
        const totalPago = totalFixosPagos + totalVariaveisPagas;
        
        // Calcular A PAGAR (diferença)
        const totalAPagar = totalVencido - totalPago;
        
        // Atualizar interface - Vencidos
        const gastosFixosVencidosEl = document.getElementById('gastosFixosVencidos');
        const gastosVariaveisVencidosEl = document.getElementById('gastosVariaveisVencidos');
        const totalVencidoEl = document.getElementById('totalVencido');
        
        // Atualizar interface - Pagos
        const gastosFixosPagosEl = document.getElementById('gastosFixosPagos');
        const gastosVariaveisPagasEl = document.getElementById('gastosVariaveisPagas');
        const totalPagoEl = document.getElementById('totalPago');
        
        // Atualizar interface - A Pagar
        const totalAPagarEl = document.getElementById('totalAPagar');
        
        if (this.fluxoCaixa) {
            // Vencidos
            if (gastosFixosVencidosEl) {
                gastosFixosVencidosEl.textContent = this.fluxoCaixa.formatarDinheiro(totalFixosVencidos);
            }
            if (gastosVariaveisVencidosEl) {
                gastosVariaveisVencidosEl.textContent = this.fluxoCaixa.formatarDinheiro(totalVariaveisVencidos);
            }
            if (totalVencidoEl) {
                totalVencidoEl.textContent = this.fluxoCaixa.formatarDinheiro(totalVencido);
            }
            
            // Pagos
            if (gastosFixosPagosEl) {
                gastosFixosPagosEl.textContent = this.fluxoCaixa.formatarDinheiro(totalFixosPagos);
            }
            if (gastosVariaveisPagasEl) {
                gastosVariaveisPagasEl.textContent = this.fluxoCaixa.formatarDinheiro(totalVariaveisPagas);
            }
            if (totalPagoEl) {
                totalPagoEl.textContent = this.fluxoCaixa.formatarDinheiro(totalPago);
            }
            
            // A Pagar
            if (totalAPagarEl) {
                totalAPagarEl.textContent = this.fluxoCaixa.formatarDinheiro(totalAPagar);
            }
        }
    }

    buscarSaidas(termo) {
        const tbody = document.getElementById('corpoTabelaSaidas');
        if (!tbody) return;
        
        const linhas = tbody.getElementsByTagName('tr');
        Array.from(linhas).forEach(linha => {
            const texto = linha.textContent.toLowerCase();
            linha.style.display = texto.includes(termo.toLowerCase()) ? '' : 'none';
        });
    }

    filtrarSaidasPorPeriodo() {
        const dataInicio = document.getElementById('dataInicioSaidas').value;
        const dataFim = document.getElementById('dataFimSaidas').value;
        
        if (!dataInicio || !dataFim) {
            if (this.fluxoCaixa) {
                this.fluxoCaixa.mostrarAlerta('Selecione as datas de início e fim!', 'warning');
            }
            return;
        }
        
        if (dataInicio > dataFim) {
            if (this.fluxoCaixa) {
                this.fluxoCaixa.mostrarAlerta('Data inicial não pode ser maior que a data final!', 'warning');
            }
            return;
        }
        
        // Salvar datas no localStorage
        if (this.fluxoCaixa) {
            this.fluxoCaixa.salvarDatasFiltros('saidas');
        }
        
        this.carregarSaidasFiltradas(dataInicio, dataFim);
        this.atualizarResumoSaidas(dataInicio, dataFim);
    }

    limparFiltroSaidas() {
        document.getElementById('dataInicioSaidas').value = '';
        document.getElementById('dataFimSaidas').value = '';
        document.getElementById('buscaSaidas').value = '';
        
        // Limpar datas salvas
        if (this.fluxoCaixa) {
            this.fluxoCaixa.limparDatasFiltros('saidas');
        }
        
        this.carregarSaidas();
        this.atualizarResumoSaidas();
        this.fluxoCaixa.mostrarAlerta('Filtro de saídas limpo!', 'info');
    }

    carregarSaidasFiltradas(dataInicio, dataFim) {
        const tbody = document.getElementById('corpoTabelaSaidas');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        const [anoInicio, mesInicio, diaInicio] = dataInicio.split('-').map(Number);
        const dataInicioObj = new Date(anoInicio, mesInicio - 1, diaInicio);
        
        const [anoFim, mesFim, diaFim] = dataFim.split('-').map(Number);
        const dataFimObj = new Date(anoFim, mesFim - 1, diaFim);
        dataFimObj.setHours(23, 59, 59, 999);
        
        const saidasFiltradas = this.saidas.filter(saida => {
            const [ano, mes, dia] = saida.dataVencimento.split('-').map(Number);
            const dataVenc = new Date(ano, mes - 1, dia);
            return dataVenc >= dataInicioObj && dataVenc <= dataFimObj;
        });
        
        const saidasOrdenadas = [...saidasFiltradas].sort((a, b) => 
            new Date(b.dataVencimento) - new Date(a.dataVencimento)
        );
        
        saidasOrdenadas.forEach(saida => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${this.formatarData(saida.dataVencimento)}</td>
                <td>${saida.dataPagamento ? this.formatarData(saida.dataPagamento) : '-'}</td>
                <td><span class="badge bg-light text-dark">${saida.notaFiscal || '-'}</span></td>
                <td>${saida.descricao}</td>
                <td><span class="badge bg-info">${this.getCategoriaLabel(saida.categoria)}</span></td>
                <td class="valor-monetario">${this.fluxoCaixa.formatarDinheiro(saida.valor)}</td>
                <td><span class="badge ${saida.tipo === 'fixo' ? 'bg-danger' : 'bg-warning'}">${saida.tipo === 'fixo' ? 'Fixo' : 'Variável'}</span></td>
                <td><span class="badge bg-secondary">${this.getRecorrenciaLabel(saida.recorrencia)}</span></td>
                <td class="table-actions">
                    <button class="btn btn-sm btn-outline-primary" onclick="moduloSaidas.editarSaida('${saida.id}')">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="moduloSaidas.excluirSaida('${saida.id}')">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    atualizarResumoSaidasPorPeriodo(dataInicio, dataFim) {
        const [anoInicio, mesInicio, diaInicio] = dataInicio.split('-').map(Number);
        const dataInicioObj = new Date(anoInicio, mesInicio - 1, diaInicio);
        
        const [anoFim, mesFim, diaFim] = dataFim.split('-').map(Number);
        const dataFimObj = new Date(anoFim, mesFim - 1, diaFim);
        dataFimObj.setHours(23, 59, 59, 999);
        
        const saidasPeriodo = this.saidas.filter(saida => {
            const [ano, mes, dia] = saida.dataVencimento.split('-').map(Number);
            const dataVenc = new Date(ano, mes - 1, dia);
            return dataVenc >= dataInicioObj && dataVenc <= dataFimObj;
        });
        
        const fixos = saidasPeriodo.filter(s => s.tipo === 'fixo');
        const variaveis = saidasPeriodo.filter(s => s.tipo === 'variavel');
        
        const totalFixos = fixos.reduce((sum, s) => sum + s.valor, 0);
        const totalVariaveis = variaveis.reduce((sum, s) => sum + s.valor, 0);
        const totalGeral = totalFixos + totalVariaveis;
        
        document.getElementById('gastosFixosMes').textContent = this.fluxoCaixa.formatarDinheiro(totalFixos);
        document.getElementById('gastosVariaveisMes').textContent = this.fluxoCaixa.formatarDinheiro(totalVariaveis);
        document.getElementById('totalSaidasMes').textContent = this.fluxoCaixa.formatarDinheiro(totalGeral);
    }

    async excluirSaida(saidaId) {
        if (!confirm('Tem certeza que deseja excluir esta saída?')) {
            return;
        }
        
        // Excluir do Supabase
        if (this.usuarioId && typeof database !== 'undefined') {
            const resultado = await database.excluirSaida(saidaId);
            if (!resultado.success) {
                if (this.fluxoCaixa) {
                    this.fluxoCaixa.mostrarAlerta('Erro ao excluir saída: ' + resultado.error, 'danger');
                }
                return;
            }
        } else {
            this.salvarDados('saidas', this.saidas);
        }
        
        this.saidas = this.saidas.filter(s => s.id !== saidaId);
        
        this.carregarSaidas();
        this.atualizarResumoSaidas();
        if (this.fluxoCaixa && this.fluxoCaixa.atualizarFluxoCaixa) {
            this.fluxoCaixa.atualizarFluxoCaixa();
        }
        
        if (this.fluxoCaixa) {
            this.fluxoCaixa.mostrarAlerta('Saída excluída com sucesso!', 'success');
        }
    }

    editarSaida(saidaId) {
        const saida = this.saidas.find(s => s.id === saidaId);
        if (!saida) {
            if (this.fluxoCaixa) {
                this.fluxoCaixa.mostrarAlerta('Saída não encontrada!', 'danger');
            }
            return;
        }

        // Preencher o modal com os dados da saída
        document.getElementById('saidaEditId').value = saida.id;
        document.getElementById('saidaEditDescricao').value = saida.descricao;
        document.getElementById('saidaEditNotaFiscal').value = saida.notaFiscal || '';
        document.getElementById('saidaEditValor').value = saida.valor;
        document.getElementById('saidaEditCategoria').value = saida.categoria;
        document.getElementById('saidaEditTipo').value = saida.tipo;
        document.getElementById('saidaEditDataVencimento').value = saida.dataVencimento;
        document.getElementById('saidaEditDataPagamento').value = saida.dataPagamento || '';

        // Abrir o modal
        const modal = new bootstrap.Modal(document.getElementById('modalEdicaoSaida'));
        modal.show();
    }

    async salvarEdicaoSaida() {
        const saidaId = document.getElementById('saidaEditId').value;
        const descricao = document.getElementById('saidaEditDescricao').value.trim();
        const notaFiscal = document.getElementById('saidaEditNotaFiscal').value.trim();
        const valor = parseFloat(document.getElementById('saidaEditValor').value);
        const categoria = document.getElementById('saidaEditCategoria').value;
        const tipo = document.getElementById('saidaEditTipo').value;
        const dataVencimento = document.getElementById('saidaEditDataVencimento').value;
        const dataPagamento = document.getElementById('saidaEditDataPagamento').value;

        if (!descricao || !valor || !categoria || !tipo || !dataVencimento) {
            if (this.fluxoCaixa) {
                this.fluxoCaixa.mostrarAlerta('Preencha todos os campos obrigatórios!', 'warning');
            }
            return;
        }

        // Encontrar e atualizar a saída
        const saidaIndex = this.saidas.findIndex(s => s.id === saidaId);
        if (saidaIndex === -1) {
            if (this.fluxoCaixa) {
                this.fluxoCaixa.mostrarAlerta('Saída não encontrada!', 'danger');
            }
            return;
        }

        const dadosAtualizados = {
            descricao,
            notaFiscal: notaFiscal || null,
            valor,
            categoria,
            tipo,
            dataVencimento,
            dataPagamento: dataPagamento || null
        };

        // Atualizar no Supabase
        if (this.usuarioId && typeof database !== 'undefined') {
            const resultado = await database.atualizarSaida(saidaId, dadosAtualizados);
            if (!resultado.success) {
                if (this.fluxoCaixa) {
                    this.fluxoCaixa.mostrarAlerta('Erro ao atualizar saída: ' + resultado.error, 'danger');
                }
                return;
            }
            // Recarregar dados do banco
            this.saidas = await database.carregarSaidas();
        } else {
            const saidaAntiga = this.saidas[saidaIndex];
            this.saidas[saidaIndex] = { ...saidaAntiga, ...dadosAtualizados };
            this.salvarDados('saidas', this.saidas);
        }

        // Fechar modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('modalEdicaoSaida'));
        modal.hide();

        // Atualizar interface
        this.carregarSaidas();
        this.atualizarResumoSaidas();
        this.verificarContasAVencer();
        if (this.fluxoCaixa && this.fluxoCaixa.atualizarFluxoCaixa) {
            this.fluxoCaixa.atualizarFluxoCaixa();
        }

        if (this.fluxoCaixa) {
            this.fluxoCaixa.mostrarAlerta('Saída atualizada com sucesso!', 'success');
        }
    }

    limparFormularioSaida() {
        const formSaida = document.getElementById('formSaida');
        if (formSaida) {
            formSaida.reset();
        }
        this.definirDataPadraoSaida();
    }

    getCategoriaLabel(categoria) {
        const labels = {
            'aluguel': 'Aluguel',
            'energia': 'Energia',
            'agua': 'Água',
            'telefone': 'Telefone/Internet',
            'salarios': 'Salários',
            'contabilidade': 'Contabilidade',
            'impostos': 'Impostos',
            'sistema': 'Sistema/Software',
            'seguro': 'Seguros',
            'compras': 'Compras',
            'combustivel': 'Combustível',
            'manutencao': 'Manutenção',
            'comissao': 'Comissões',
            'taxas': 'Taxas',
            'marketing': 'Marketing',
            'fretes': 'Fretes',
            'material': 'Material',
            'outros': 'Outros'
        };
        return labels[categoria] || categoria;
    }

    getRecorrenciaLabel(recorrencia) {
        const labels = {
            'unica': 'Única',
            'mensal': 'Mensal',
            'bimestral': 'Bimestral',
            'trimestral': 'Trimestral',
            'semestral': 'Semestral',
            'anual': 'Anual'
        };
        return labels[recorrencia] || recorrencia;
    }

    // Utilitários
    gerarId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    formatarData(dataString) {
        if (!dataString) return '-';
        
        const [ano, mes, dia] = dataString.split('-').map(Number);
        const data = new Date(ano, mes - 1, dia);
        
        return data.toLocaleDateString('pt-BR');
    }

    formatarDataISO(data) {
        const ano = data.getFullYear();
        const mes = String(data.getMonth() + 1).padStart(2, '0');
        const dia = String(data.getDate()).padStart(2, '0');
        return `${ano}-${mes}-${dia}`;
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
