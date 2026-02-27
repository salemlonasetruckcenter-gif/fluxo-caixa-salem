// Módulo de Banco de Dados - Supabase
// Substitui todas as funções de localStorage

class Database {
    constructor() {
        this.userId = null;
    }

    setUserId(userId) {
        this.userId = userId;
    }

    // ==================== VENDAS ====================
    
    async carregarVendas() {
        try {
            const { data, error } = await supabaseClient
                .from('vendas')
                .select('*')
                .eq('user_id', this.userId)
                .order('data_venda', { ascending: false });

            if (error) throw error;

            // Converter para formato do sistema
            return data.map(v => ({
                id: v.id,
                cliente: v.cliente,
                valor: parseFloat(v.valor),
                numeroPedido: v.numero_pedido,
                tipo: v.tipo,
                dataVenda: v.data_venda,
                parcelas: v.parcelas,
                dataRegistro: v.created_at
            }));
        } catch (error) {
            console.error('Erro ao carregar vendas:', error);
            return [];
        }
    }

    async salvarVenda(venda) {
        try {
            const { data, error } = await supabaseClient
                .from('vendas')
                .insert({
                    user_id: this.userId,
                    cliente: venda.cliente,
                    valor: venda.valor,
                    numero_pedido: venda.numeroPedido,
                    tipo: venda.tipo,
                    data_venda: venda.dataVenda,
                    parcelas: venda.parcelas
                })
                .select()
                .single();

            if (error) throw error;

            return {
                success: true,
                id: data.id,
                venda: {
                    id: data.id,
                    cliente: data.cliente,
                    valor: parseFloat(data.valor),
                    numeroPedido: data.numero_pedido,
                    tipo: data.tipo,
                    dataVenda: data.data_venda,
                    parcelas: data.parcelas,
                    dataRegistro: data.created_at
                }
            };
        } catch (error) {
            console.error('Erro ao salvar venda:', error);
            return { success: false, error: error.message };
        }
    }

    async atualizarVenda(vendaId, dadosAtualizados) {
        try {
            const { data, error } = await supabaseClient
                .from('vendas')
                .update({
                    cliente: dadosAtualizados.cliente,
                    valor: dadosAtualizados.valor,
                    numero_pedido: dadosAtualizados.numeroPedido,
                    tipo: dadosAtualizados.tipo,
                    data_venda: dadosAtualizados.dataVenda
                })
                .eq('id', vendaId)
                .eq('user_id', this.userId)
                .select()
                .single();

            if (error) throw error;
            return { success: true, venda: data };
        } catch (error) {
            console.error('Erro ao atualizar venda:', error);
            return { success: false, error: error.message };
        }
    }

    async excluirVenda(vendaId) {
        try {
            // Primeiro excluir parcelas relacionadas
            await supabaseClient
                .from('parcelas')
                .delete()
                .eq('venda_id', vendaId)
                .eq('user_id', this.userId);

            // Depois excluir a venda
            const { error } = await supabaseClient
                .from('vendas')
                .delete()
                .eq('id', vendaId)
                .eq('user_id', this.userId);

            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error('Erro ao excluir venda:', error);
            return { success: false, error: error.message };
        }
    }

    // ==================== PARCELAS ====================

    async carregarParcelas() {
        try {
            const { data, error } = await supabaseClient
                .from('parcelas')
                .select('*')
                .eq('user_id', this.userId)
                .order('data_vencimento', { ascending: true });

            if (error) throw error;

            return data.map(p => ({
                id: p.id,
                vendaId: p.venda_id,
                numero: p.numero,
                valor: parseFloat(p.valor),
                dataVencimento: p.data_vencimento,
                dataPagamento: p.data_pagamento,
                tipo: p.tipo,
                status: p.status
            }));
        } catch (error) {
            console.error('Erro ao carregar parcelas:', error);
            return [];
        }
    }

    async salvarParcela(parcela) {
        try {
            const { data, error } = await supabaseClient
                .from('parcelas')
                .insert({
                    user_id: this.userId,
                    venda_id: parcela.vendaId,
                    numero: parcela.numero,
                    valor: parcela.valor,
                    data_vencimento: parcela.dataVencimento,
                    data_pagamento: parcela.dataPagamento,
                    tipo: parcela.tipo,
                    status: parcela.status || 'pendente'
                })
                .select()
                .single();

            if (error) throw error;

            return {
                success: true,
                id: data.id,
                parcela: {
                    id: data.id,
                    vendaId: data.venda_id,
                    numero: data.numero,
                    valor: parseFloat(data.valor),
                    dataVencimento: data.data_vencimento,
                    dataPagamento: data.data_pagamento,
                    tipo: data.tipo,
                    status: data.status
                }
            };
        } catch (error) {
            console.error('Erro ao salvar parcela:', error);
            return { success: false, error: error.message };
        }
    }

    async salvarParcelas(parcelas) {
        try {
            const parcelasFormatadas = parcelas.map(p => ({
                user_id: this.userId,
                venda_id: p.vendaId,
                numero: p.numero,
                valor: p.valor,
                data_vencimento: p.dataVencimento,
                data_pagamento: p.dataPagamento,
                tipo: p.tipo,
                status: p.status || 'pendente'
            }));

            const { data, error } = await supabaseClient
                .from('parcelas')
                .insert(parcelasFormatadas)
                .select();

            if (error) throw error;

            return {
                success: true,
                parcelas: data.map(p => ({
                    id: p.id,
                    vendaId: p.venda_id,
                    numero: p.numero,
                    valor: parseFloat(p.valor),
                    dataVencimento: p.data_vencimento,
                    dataPagamento: p.data_pagamento,
                    tipo: p.tipo,
                    status: p.status
                }))
            };
        } catch (error) {
            console.error('Erro ao salvar parcelas:', error);
            return { success: false, error: error.message };
        }
    }

    async atualizarParcela(parcelaId, dadosAtualizados) {
        try {
            const updateData = {};
            if (dadosAtualizados.valor !== undefined) updateData.valor = dadosAtualizados.valor;
            if (dadosAtualizados.dataVencimento !== undefined) updateData.data_vencimento = dadosAtualizados.dataVencimento;
            if (dadosAtualizados.dataPagamento !== undefined) updateData.data_pagamento = dadosAtualizados.dataPagamento;
            if (dadosAtualizados.status !== undefined) updateData.status = dadosAtualizados.status;
            if (dadosAtualizados.tipo !== undefined) updateData.tipo = dadosAtualizados.tipo;

            const { data, error } = await supabaseClient
                .from('parcelas')
                .update(updateData)
                .eq('id', parcelaId)
                .eq('user_id', this.userId)
                .select()
                .single();

            if (error) throw error;
            return { success: true, parcela: data };
        } catch (error) {
            console.error('Erro ao atualizar parcela:', error);
            return { success: false, error: error.message };
        }
    }

    async excluirParcela(parcelaId) {
        try {
            const { error } = await supabaseClient
                .from('parcelas')
                .delete()
                .eq('id', parcelaId)
                .eq('user_id', this.userId);

            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error('Erro ao excluir parcela:', error);
            return { success: false, error: error.message };
        }
    }

    // ==================== SAÍDAS ====================

    async carregarSaidas() {
        try {
            const { data, error } = await supabaseClient
                .from('saidas')
                .select('*')
                .eq('user_id', this.userId)
                .order('data_vencimento', { ascending: false });

            if (error) throw error;

            return data.map(s => ({
                id: s.id,
                descricao: s.descricao,
                notaFiscal: s.nota_fiscal,
                valor: parseFloat(s.valor),
                categoria: s.categoria,
                tipo: s.tipo,
                dataVencimento: s.data_vencimento,
                dataPagamento: s.data_pagamento,
                recorrencia: s.recorrencia,
                dataRegistro: s.created_at
            }));
        } catch (error) {
            console.error('Erro ao carregar saídas:', error);
            return [];
        }
    }

    async salvarSaida(saida) {
        try {
            const { data, error } = await supabaseClient
                .from('saidas')
                .insert({
                    user_id: this.userId,
                    descricao: saida.descricao,
                    nota_fiscal: saida.notaFiscal,
                    valor: saida.valor,
                    categoria: saida.categoria,
                    tipo: saida.tipo,
                    data_vencimento: saida.dataVencimento,
                    data_pagamento: saida.dataPagamento,
                    recorrencia: saida.recorrencia || 'unica'
                })
                .select()
                .single();

            if (error) throw error;

            return {
                success: true,
                id: data.id,
                saida: {
                    id: data.id,
                    descricao: data.descricao,
                    notaFiscal: data.nota_fiscal,
                    valor: parseFloat(data.valor),
                    categoria: data.categoria,
                    tipo: data.tipo,
                    dataVencimento: data.data_vencimento,
                    dataPagamento: data.data_pagamento,
                    recorrencia: data.recorrencia,
                    dataRegistro: data.created_at
                }
            };
        } catch (error) {
            console.error('Erro ao salvar saída:', error);
            return { success: false, error: error.message };
        }
    }

    async salvarSaidas(saidas) {
        try {
            const saidasFormatadas = saidas.map(s => ({
                user_id: this.userId,
                descricao: s.descricao,
                nota_fiscal: s.notaFiscal,
                valor: s.valor,
                categoria: s.categoria,
                tipo: s.tipo,
                data_vencimento: s.dataVencimento,
                data_pagamento: s.dataPagamento,
                recorrencia: s.recorrencia || 'unica'
            }));

            const { data, error } = await supabaseClient
                .from('saidas')
                .insert(saidasFormatadas)
                .select();

            if (error) throw error;

            return {
                success: true,
                saidas: data.map(s => ({
                    id: s.id,
                    descricao: s.descricao,
                    notaFiscal: s.nota_fiscal,
                    valor: parseFloat(s.valor),
                    categoria: s.categoria,
                    tipo: s.tipo,
                    dataVencimento: s.data_vencimento,
                    dataPagamento: s.data_pagamento,
                    recorrencia: s.recorrencia,
                    dataRegistro: s.created_at
                }))
            };
        } catch (error) {
            console.error('Erro ao salvar saídas:', error);
            return { success: false, error: error.message };
        }
    }

    async atualizarSaida(saidaId, dadosAtualizados) {
        try {
            const updateData = {};
            if (dadosAtualizados.descricao !== undefined) updateData.descricao = dadosAtualizados.descricao;
            if (dadosAtualizados.notaFiscal !== undefined) updateData.nota_fiscal = dadosAtualizados.notaFiscal;
            if (dadosAtualizados.valor !== undefined) updateData.valor = dadosAtualizados.valor;
            if (dadosAtualizados.categoria !== undefined) updateData.categoria = dadosAtualizados.categoria;
            if (dadosAtualizados.tipo !== undefined) updateData.tipo = dadosAtualizados.tipo;
            if (dadosAtualizados.dataVencimento !== undefined) updateData.data_vencimento = dadosAtualizados.dataVencimento;
            if (dadosAtualizados.dataPagamento !== undefined) updateData.data_pagamento = dadosAtualizados.dataPagamento;

            const { data, error } = await supabaseClient
                .from('saidas')
                .update(updateData)
                .eq('id', saidaId)
                .eq('user_id', this.userId)
                .select()
                .single();

            if (error) throw error;
            return { success: true, saida: data };
        } catch (error) {
            console.error('Erro ao atualizar saída:', error);
            return { success: false, error: error.message };
        }
    }

    async excluirSaida(saidaId) {
        try {
            const { error } = await supabaseClient
                .from('saidas')
                .delete()
                .eq('id', saidaId)
                .eq('user_id', this.userId);

            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error('Erro ao excluir saída:', error);
            return { success: false, error: error.message };
        }
    }

    // ==================== UTILIDADES ====================

    async limparTodosDados() {
        try {
            await supabaseClient.from('parcelas').delete().eq('user_id', this.userId);
            await supabaseClient.from('vendas').delete().eq('user_id', this.userId);
            await supabaseClient.from('saidas').delete().eq('user_id', this.userId);
            return { success: true };
        } catch (error) {
            console.error('Erro ao limpar dados:', error);
            return { success: false, error: error.message };
        }
    }
}

// Instância global
window.database = new Database();
