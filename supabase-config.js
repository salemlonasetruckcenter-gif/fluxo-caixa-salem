// Configuração do Supabase
const SUPABASE_URL = 'https://stbagczenpfxmfrvltis.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_m2hNU88RRtDeniz1-ZXlTQ_OXC8VFsl';

// Inicializar cliente Supabase
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Exportar para uso global
window.supabaseClient = supabaseClient;

console.log('Supabase configurado com sucesso!');
