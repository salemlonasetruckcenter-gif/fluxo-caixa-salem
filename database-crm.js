// ============================================
// SALÉM GESTÃO - DATABASE CRM
// Operações CRUD para o módulo CRM
// ============================================

const databaseCRM = {
    
    // ============================================
    // CLIENTES
    // ============================================
    
    async carregarClientes(filtros = {}) {
        try {
            let query = supabase
                .from('clientes')
                .select('*')
                .order('nome_razao', { ascending: true });
            
            if (filtros.busca) {
                query = query.or(`nome_razao.ilike.%${filtros.busca}%,cpf_cnpj.ilike.%${filtros.busca}%,nome_fantasia.ilike.%${filtros.busca}%`);
            }
            
            if (filtros.classificacao) {
                query = query.eq('classificacao', filtros.classificacao);
            }
            
            if (filtros.status) {
                query = query.eq('status', filtros.status);
            }
            
            const { data, error } = await query;
            
            if (error) throw error;
            return { success: true, data: data || [] };
        } catch (error) {
            console.error('Erro ao carregar clientes:', error);
            return { success: false, error: error.message, data: [] };
        }
    },
    
    async buscarCliente(id) {
        try {
            const { data, error } = await supabase
                .from('clientes')
                .select('*')
                .eq('id', id)
                .single();
            
            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Erro ao buscar cliente:', error);
            return { success: false, error: error.message };
        }
    },
    
    async salvarCliente(cliente) {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Usuário não autenticado');
            
            cliente.user_id = user.id;
            cliente.updated_at = new Date().toISOString();
            
            const { data, error } = await supabase
                .from('clientes')
                .insert([cliente])
                .select()
                .single();
            
            if (error) throw error;
            return { success: true, data, id: data.id };
        } catch (error) {
            console.error('Erro ao salvar cliente:', error);
            return { success: false, error: error.message };
        }
    },
    
    async atualizarCliente(id, dados) {
        try {
            dados.updated_at = new Date().toISOString();
            
            const { data, error } = await supabase
                .from('clientes')
                .update(dados)
                .eq('id', id)
                .select()
                .single();
            
            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Erro ao atualizar cliente:', error);
            return { success: false, error: error.message };
        }
    },
    
    async excluirCliente(id) {
        try {
            const { error } = await supabase
                .from('clientes')
                .delete()
                .eq('id', id);
            
            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error('Erro ao excluir cliente:', error);
            return { success: false, error: error.message };
        }
    },
    
    // ============================================
    // CAMINHÕES
    // ============================================
    
    async carregarCaminhoes(clienteId = null, filtros = {}) {
        try {
            let query = supabase
                .from('caminhoes')
                .select(`
                    *,
                    clientes (id, nome_razao, nome_fantasia, responsavel)
                `)
                .order('created_at', { ascending: false });
            
            if (clienteId) {
                query = query.eq('cliente_id', clienteId);
            }
            
            if (filtros.etapa) {
                query = query.eq('etapa', filtros.etapa);
            }
            
            if (filtros.placa) {
                query = query.ilike('placa', `%${filtros.placa}%`);
            }
            
            const { data, error } = await query;
            
            if (error) throw error;
            return { success: true, data: data || [] };
        } catch (error) {
            console.error('Erro ao carregar caminhões:', error);
            return { success: false, error: error.message, data: [] };
        }
    },
    
    async buscarCaminhao(id) {
        try {
            const { data, error } = await supabase
                .from('caminhoes')
                .select(`
                    *,
                    clientes (id, nome_razao, nome_fantasia, whatsapp, telefone, responsavel)
                `)
                .eq('id', id)
                .single();
            
            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Erro ao buscar caminhão:', error);
            return { success: false, error: error.message };
        }
    },
    
    async buscarCaminhaoPorPlaca(placa) {
        try {
            const { data, error } = await supabase
                .from('caminhoes')
                .select(`
                    *,
                    clientes (id, nome_razao, nome_fantasia, whatsapp, telefone, responsavel)
                `)
                .ilike('placa', `%${placa}%`)
                .limit(1)
                .single();
            
            if (error && error.code !== 'PGRST116') throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Erro ao buscar caminhão por placa:', error);
            return { success: false, error: error.message };
        }
    },
    
    async salvarCaminhao(caminhao) {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Usuário não autenticado');
            
            caminhao.user_id = user.id;
            caminhao.updated_at = new Date().toISOString();
            
            const { data, error } = await supabase
                .from('caminhoes')
                .insert([caminhao])
                .select()
                .single();
            
            if (error) throw error;
            return { success: true, data, id: data.id };
        } catch (error) {
            console.error('Erro ao salvar caminhão:', error);
            return { success: false, error: error.message };
        }
    },
    
    async atualizarCaminhao(id, dados) {
        try {
            dados.updated_at = new Date().toISOString();
            
            const { data, error } = await supabase
                .from('caminhoes')
                .update(dados)
                .eq('id', id)
                .select()
                .single();
            
            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Erro ao atualizar caminhão:', error);
            return { success: false, error: error.message };
        }
    },
    
    async excluirCaminhao(id) {
        try {
            const { error } = await supabase
                .from('caminhoes')
                .delete()
                .eq('id', id);
            
            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error('Erro ao excluir caminhão:', error);
            return { success: false, error: error.message };
        }
    },
    
    // ============================================
    // INTERAÇÕES
    // ============================================
    
    async carregarInteracoes(caminhaoId = null, clienteId = null) {
        try {
            let query = supabase
                .from('interacoes')
                .select('*')
                .order('created_at', { ascending: false });
            
            if (caminhaoId) {
                query = query.eq('caminhao_id', caminhaoId);
            }
            
            if (clienteId) {
                query = query.eq('cliente_id', clienteId);
            }
            
            const { data, error } = await query;
            
            if (error) throw error;
            return { success: true, data: data || [] };
        } catch (error) {
            console.error('Erro ao carregar interações:', error);
            return { success: false, error: error.message, data: [] };
        }
    },
    
    async salvarInteracao(interacao) {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Usuário não autenticado');
            
            interacao.user_id = user.id;
            
            const { data, error } = await supabase
                .from('interacoes')
                .insert([interacao])
                .select()
                .single();
            
            if (error) throw error;
            return { success: true, data, id: data.id };
        } catch (error) {
            console.error('Erro ao salvar interação:', error);
            return { success: false, error: error.message };
        }
    },
    
    async buscarInteracao(id) {
        try {
            const { data, error } = await supabase
                .from('interacoes')
                .select('*')
                .eq('id', id)
                .single();
            
            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Erro ao buscar interação:', error);
            return { success: false, error: error.message };
        }
    },

    async atualizarInteracao(id, dados) {
        try {
            dados.updated_at = new Date().toISOString();
            
            const { data, error } = await supabase
                .from('interacoes')
                .update(dados)
                .eq('id', id)
                .select()
                .single();
            
            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Erro ao atualizar interação:', error);
            return { success: false, error: error.message };
        }
    },

    async excluirInteracao(id) {
        try {
            const { error } = await supabase
                .from('interacoes')
                .delete()
                .eq('id', id);
            
            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error('Erro ao excluir interação:', error);
            return { success: false, error: error.message };
        }
    },
    
    // ============================================
    // ORÇAMENTOS
    // ============================================
    
    async carregarOrcamentos(filtros = {}) {
        try {
            let query = supabase
                .from('orcamentos')
                .select(`
                    *,
                    clientes (id, nome_razao, nome_fantasia),
                    caminhoes (id, placa, tipo)
                `)
                .order('created_at', { ascending: false });
            
            if (filtros.clienteId) {
                query = query.eq('cliente_id', filtros.clienteId);
            }
            
            if (filtros.caminhaoId) {
                query = query.eq('caminhao_id', filtros.caminhaoId);
            }
            
            if (filtros.status) {
                query = query.eq('status', filtros.status);
            }
            
            const { data, error } = await query;
            
            if (error) throw error;
            return { success: true, data: data || [] };
        } catch (error) {
            console.error('Erro ao carregar orçamentos:', error);
            return { success: false, error: error.message, data: [] };
        }
    },
    
    async buscarOrcamento(id) {
        try {
            const { data, error } = await supabase
                .from('orcamentos')
                .select(`
                    *,
                    clientes (id, nome_razao, nome_fantasia),
                    caminhoes (id, placa, tipo)
                `)
                .eq('id', id)
                .single();
            
            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Erro ao buscar orçamento:', error);
            return { success: false, error: error.message };
        }
    },
    
    async buscarOrcamentoRecente(caminhaoId) {
        try {
            const { data, error } = await supabase
                .from('orcamentos')
                .select('*')
                .eq('caminhao_id', caminhaoId)
                .in('status', ['enviado', 'aprovado', 'concluido'])
                .order('created_at', { ascending: false })
                .limit(1)
                .single();
            
            if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
            return { success: true, data: data || null };
        } catch (error) {
            console.error('Erro ao buscar orçamento recente:', error);
            return { success: false, error: error.message, data: null };
        }
    },
    
    async salvarOrcamento(orcamento) {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Usuário não autenticado');
            
            orcamento.user_id = user.id;
            orcamento.updated_at = new Date().toISOString();
            
            // Calcular valor final
            const valorMaterial = parseFloat(orcamento.valor_material) || 0;
            const valorMaoObra = parseFloat(orcamento.valor_mao_obra) || 0;
            const margemPercent = parseFloat(orcamento.margem_percent) || 0;
            
            let valorFinal = valorMaterial + valorMaoObra;
            if (margemPercent > 0) {
                valorFinal = valorFinal * (1 + margemPercent / 100);
            }
            orcamento.valor_final = valorFinal;
            
            const { data, error } = await supabase
                .from('orcamentos')
                .insert([orcamento])
                .select()
                .single();
            
            if (error) throw error;
            return { success: true, data, id: data.id };
        } catch (error) {
            console.error('Erro ao salvar orçamento:', error);
            return { success: false, error: error.message };
        }
    },
    
    async atualizarOrcamento(id, dados) {
        try {
            dados.updated_at = new Date().toISOString();
            
            // Recalcular valor final se necessário
            if (dados.valor_material !== undefined || dados.valor_mao_obra !== undefined || dados.margem_percent !== undefined) {
                const valorMaterial = parseFloat(dados.valor_material) || 0;
                const valorMaoObra = parseFloat(dados.valor_mao_obra) || 0;
                const margemPercent = parseFloat(dados.margem_percent) || 0;
                
                let valorFinal = valorMaterial + valorMaoObra;
                if (margemPercent > 0) {
                    valorFinal = valorFinal * (1 + margemPercent / 100);
                }
                dados.valor_final = valorFinal;
            }
            
            const { data, error } = await supabase
                .from('orcamentos')
                .update(dados)
                .eq('id', id)
                .select()
                .single();
            
            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Erro ao atualizar orçamento:', error);
            return { success: false, error: error.message };
        }
    },
    
    async excluirOrcamento(id) {
        try {
            const { error } = await supabase
                .from('orcamentos')
                .delete()
                .eq('id', id);
            
            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error('Erro ao excluir orçamento:', error);
            return { success: false, error: error.message };
        }
    },
    
    // ============================================
    // AGENDA (Próximos Contatos)
    // ============================================
    
    async carregarAgenda(filtros = {}) {
        try {
            const agora = new Date().toISOString();
            
            let query = supabase
                .from('caminhoes')
                .select(`
                    *,
                    clientes (id, nome_razao, nome_fantasia, whatsapp, telefone, responsavel)
                `)
                .not('proximo_contato_em', 'is', null)
                .order('proximo_contato_em', { ascending: true });
            
            if (filtros.atrasados) {
                query = query.lte('proximo_contato_em', agora);
            }
            
            if (filtros.hoje) {
                const hoje = new Date();
                hoje.setHours(0, 0, 0, 0);
                const amanha = new Date(hoje);
                amanha.setDate(amanha.getDate() + 1);
                
                query = query
                    .gte('proximo_contato_em', hoje.toISOString())
                    .lt('proximo_contato_em', amanha.toISOString());
            }
            
            const { data, error } = await query;
            
            if (error) throw error;
            return { success: true, data: data || [] };
        } catch (error) {
            console.error('Erro ao carregar agenda:', error);
            return { success: false, error: error.message, data: [] };
        }
    },
    
    // ============================================
    // DASHBOARD COMERCIAL
    // ============================================
    
    async carregarDashboard(periodo = '30dias') {
        try {
            let dataInicio = new Date();
            
            switch (periodo) {
                case 'hoje':
                    dataInicio.setHours(0, 0, 0, 0);
                    break;
                case '7dias':
                    dataInicio.setDate(dataInicio.getDate() - 7);
                    break;
                case '30dias':
                    dataInicio.setDate(dataInicio.getDate() - 30);
                    break;
                case 'mes':
                    dataInicio = new Date(dataInicio.getFullYear(), dataInicio.getMonth(), 1);
                    break;
            }
            
            const dataInicioISO = dataInicio.toISOString();
            
            // Buscar todos os orçamentos com dados do cliente e caminhão
            const { data: orcamentos, error: errOrcamentos } = await supabase
                .from('orcamentos')
                .select('id, status, valor_final, created_at, updated_at, clientes(nome_razao, nome_fantasia), caminhoes(placa)')
                .order('updated_at', { ascending: false });
            
            if (errOrcamentos) throw errOrcamentos;
            
            // Calcular métricas por status do orçamento
            const fechados = orcamentos.filter(o => o.status === 'fechado' && o.updated_at >= dataInicioISO);
            const negociando = orcamentos.filter(o => o.status === 'negociando');
            const gelados = orcamentos.filter(o => o.status === 'gelado');
            const perdidos = orcamentos.filter(o => o.status === 'perdido' && o.updated_at >= dataInicioISO);
            const orcamentoEnviado = orcamentos.filter(o => o.status === 'orcamento_enviado');
            
            return {
                success: true,
                data: {
                    fechados: fechados.length,
                    negociando: negociando.length,
                    gelados: gelados.length,
                    perdidos: perdidos.length,
                    orcamentoEnviado: orcamentoEnviado.length,
                    listaFechados: fechados,
                    listaNegociando: negociando,
                    listaGelados: gelados,
                    listaOrcamentoEnviado: orcamentoEnviado
                }
            };
        } catch (error) {
            console.error('Erro ao carregar dashboard:', error);
            return { success: false, error: error.message };
        }
    },
    
    // ============================================
    // UTILITÁRIOS
    // ============================================
    
    formatarWhatsApp(numero) {
        if (!numero) return null;
        // Remove tudo que não for número
        const limpo = numero.replace(/\D/g, '');
        // Adiciona 55 se não tiver
        const comDDI = limpo.startsWith('55') ? limpo : '55' + limpo;
        return `https://wa.me/${comDDI}`;
    },
    
    getEtapaLabel(etapa) {
        const labels = {
            'novo': 'Novo',
            'contato_1': '1° Contato',
            'contato_2': '2° Contato',
            'contato_3': '3° Contato',
            'orcamento_enviado': 'Orçamento Enviado',
            'negociando': 'Negociando',
            'fechado': 'Fechado',
            'perdido': 'Perdido',
            'gelado': 'Gelado'
        };
        return labels[etapa] || etapa;
    },
    
    getEtapaCor(etapa) {
        const cores = {
            'novo': 'secondary',
            'contato_1': 'info',
            'contato_2': 'info',
            'contato_3': 'info',
            'orcamento_enviado': 'warning',
            'negociando': 'primary',
            'fechado': 'success',
            'perdido': 'danger',
            'gelado': 'dark'
        };
        return cores[etapa] || 'secondary';
    },
    
    getClassificacaoLabel(classificacao) {
        const labels = {
            'vip': 'VIP',
            'normal': 'Normal',
            'risco': 'Risco'
        };
        return labels[classificacao] || classificacao;
    },
    
    getClassificacaoCor(classificacao) {
        const cores = {
            'vip': 'warning',
            'normal': 'secondary',
            'risco': 'danger'
        };
        return cores[classificacao] || 'secondary';
    },

    // ============================================
    // INTERAÇÕES DO ORÇAMENTO
    // ============================================

    async carregarInteracoesOrcamento(orcamentoId) {
        try {
            const { data, error } = await supabase
                .from('interacoes_orcamento')
                .select('*')
                .eq('orcamento_id', orcamentoId)
                .order('data', { ascending: false });
            
            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Erro ao carregar interações do orçamento:', error);
            return { success: false, error: error.message };
        }
    },

    async salvarInteracaoOrcamento(interacao) {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Usuário não autenticado');
            
            interacao.user_id = user.id;
            interacao.updated_at = new Date().toISOString();
            
            const { data, error } = await supabase
                .from('interacoes_orcamento')
                .insert([interacao])
                .select()
                .single();
            
            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Erro ao salvar interação do orçamento:', error);
            return { success: false, error: error.message };
        }
    },

    async atualizarInteracaoOrcamento(id, dados) {
        try {
            dados.updated_at = new Date().toISOString();
            
            const { data, error } = await supabase
                .from('interacoes_orcamento')
                .update(dados)
                .eq('id', id)
                .select()
                .single();
            
            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Erro ao atualizar interação do orçamento:', error);
            return { success: false, error: error.message };
        }
    },

    async excluirInteracaoOrcamento(id) {
        try {
            const { error } = await supabase
                .from('interacoes_orcamento')
                .delete()
                .eq('id', id);
            
            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error('Erro ao excluir interação do orçamento:', error);
            return { success: false, error: error.message };
        }
    },

    // ============================================
    // ANEXOS DO ORÇAMENTO
    // ============================================

    async carregarAnexosOrcamento(orcamentoId) {
        try {
            const { data, error } = await supabase
                .from('anexos_orcamento')
                .select('*')
                .eq('orcamento_id', orcamentoId)
                .order('data_upload', { ascending: false });
            
            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Erro ao carregar anexos do orçamento:', error);
            return { success: false, error: error.message };
        }
    },

    async uploadAnexoOrcamento(orcamentoId, arquivo) {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Usuário não autenticado');

            // Gerar nome único para o arquivo
            const extensao = arquivo.name.split('.').pop().toLowerCase();
            const nomeUnico = `${user.id}/${orcamentoId}/${Date.now()}_${arquivo.name}`;
            
            // Upload para o Storage
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('anexos-orcamentos')
                .upload(nomeUnico, arquivo);
            
            if (uploadError) throw uploadError;

            // Obter URL pública
            const { data: urlData } = supabase.storage
                .from('anexos-orcamentos')
                .getPublicUrl(nomeUnico);

            // Determinar tipo do arquivo
            let tipoArquivo = 'outro';
            if (['pdf'].includes(extensao)) tipoArquivo = 'pdf';
            else if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extensao)) tipoArquivo = 'imagem';
            else if (['doc', 'docx', 'xls', 'xlsx'].includes(extensao)) tipoArquivo = 'doc';

            // Salvar registro no banco
            const anexo = {
                user_id: user.id,
                orcamento_id: orcamentoId,
                nome_arquivo: arquivo.name,
                tipo_arquivo: tipoArquivo,
                url_arquivo: urlData.publicUrl,
                tamanho_bytes: arquivo.size
            };

            const { data, error } = await supabase
                .from('anexos_orcamento')
                .insert([anexo])
                .select()
                .single();
            
            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Erro ao fazer upload do anexo:', error);
            return { success: false, error: error.message };
        }
    },

    async excluirAnexoOrcamento(id, urlArquivo) {
        try {
            // Extrair caminho do arquivo da URL
            const urlParts = urlArquivo.split('/anexos-orcamentos/');
            if (urlParts.length > 1) {
                const caminhoArquivo = urlParts[1];
                // Tentar excluir do Storage
                await supabase.storage
                    .from('anexos-orcamentos')
                    .remove([caminhoArquivo]);
            }

            // Excluir registro do banco
            const { error } = await supabase
                .from('anexos_orcamento')
                .delete()
                .eq('id', id);
            
            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error('Erro ao excluir anexo:', error);
            return { success: false, error: error.message };
        }
    },

    // Helpers para interações de orçamento
    getTipoInteracaoOrcamentoLabel(tipo) {
        const labels = {
            'whatsapp': 'WhatsApp',
            'ligacao': 'Ligação',
            'visita': 'Visita',
            'email': 'E-mail',
            'outro': 'Outro'
        };
        return labels[tipo] || tipo;
    },

    getStatusNegociacaoLabel(status) {
        const labels = {
            'orcamento_enviado': 'Orçamento Enviado',
            'negociando': 'Negociando',
            'gelado': 'Gelado',
            'fechado': 'Fechado',
            'perdido': 'Perdido'
        };
        return labels[status] || status;
    },

    getStatusNegociacaoCor(status) {
        const cores = {
            'orcamento_enviado': 'info',
            'negociando': 'warning',
            'gelado': 'secondary',
            'fechado': 'success',
            'perdido': 'danger'
        };
        return cores[status] || 'secondary';
    },

    getTipoArquivoIcon(tipo) {
        const icons = {
            'pdf': 'bi-file-pdf text-danger',
            'imagem': 'bi-file-image text-primary',
            'doc': 'bi-file-word text-primary',
            'outro': 'bi-file-earmark text-secondary'
        };
        return icons[tipo] || 'bi-file-earmark';
    }
};
