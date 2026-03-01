// Configuração do Supabase
const SUPABASE_URL = 'https://stbagczenpfxmfrvltis.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_m2hNU88RRtDeniz1-ZXlTQ_OXC8VFsl';

// Guardar referência da biblioteca antes de sobrescrever
const supabaseLib = window.supabase;

// Inicializar cliente Supabase
const supabaseClient = supabaseLib.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Exportar para uso global (supabase e supabaseClient apontam para o mesmo cliente)
window.supabaseClient = supabaseClient;
window.supabase = supabaseClient;

console.log('Supabase configurado com sucesso!');
