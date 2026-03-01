-- ============================================
-- ALTERAÇÕES NO CRM - Script de Migração
-- Execute este script no SQL Editor do Supabase
-- ============================================

-- 1. Renomear coluna data_ultima_troca para ultimo_servico na tabela caminhoes
ALTER TABLE caminhoes RENAME COLUMN data_ultima_troca TO ultimo_servico;

-- 2. Adicionar coluna motivo na tabela caminhoes (se não existir)
ALTER TABLE caminhoes ADD COLUMN IF NOT EXISTS motivo TEXT;

-- ============================================
-- FIM DAS ALTERAÇÕES
-- ============================================
