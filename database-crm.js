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
                    clientes (id, nome_razao, nome_fantasia)
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
                    clientes (id, nome_razao, nome_fantasia, whatsapp, telefone)
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
                    clientes (id, nome_razao, nome_fantasia, whatsapp, telefone)
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
            const agora = new Date().toISOString();
            
            // Buscar todos os caminhões
            const { data: caminhoes, error: errCaminhoes } = await supabase
                .from('caminhoes')
                .select('id, etapa, proximo_contato_em, updated_at');
            
            if (errCaminhoes) throw errCaminhoes;
            
            // Calcular métricas
            const fechados = caminhoes.filter(c => c.etapa === 'fechado' && c.updated_at >= dataInicioISO);
            const negociando = caminhoes.filter(c => c.etapa === 'negociando');
            const gelados = caminhoes.filter(c => c.etapa === 'gelado');
            const perdidos = caminhoes.filter(c => c.etapa === 'perdido' && c.updated_at >= dataInicioISO);
            const orcamentosSemResposta = caminhoes.filter(c => 
                c.etapa === 'orcamento_enviado' && 
                c.proximo_contato_em && 
                c.proximo_contato_em < agora
            );
            
            return {
                success: true,
                data: {
                    fechados: fechados.length,
                    negociando: negociando.length,
                    gelados: gelados.length,
                    perdidos: perdidos.length,
                    orcamentosSemResposta: orcamentosSemResposta.length,
                    listaFechados: fechados,
                    listaNegociando: negociando,
                    listaGelados: gelados,
                    listaOrcamentosSemResposta: orcamentosSemResposta
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
    }
};
