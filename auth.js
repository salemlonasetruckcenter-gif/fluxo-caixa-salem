// Módulo de Autenticação com Supabase
class AuthModule {
    constructor() {
        this.user = null;
        this.onLoginCallback = null;
        this.onLogoutCallback = null;
    }

    async init() {
        // Verificar se há sessão ativa
        const { data: { session } } = await supabaseClient.auth.getSession();
        
        if (session) {
            this.user = session.user;
            console.log('Usuário logado:', this.user.email);
            this.ocultarTelaLogin();
            if (this.onLoginCallback) this.onLoginCallback(this.user);
        } else {
            this.mostrarTelaLogin();
        }

        // Listener para mudanças de autenticação
        supabaseClient.auth.onAuthStateChange((event, session) => {
            console.log('Auth state changed:', event);
            if (event === 'SIGNED_IN' && session) {
                this.user = session.user;
                this.ocultarTelaLogin();
                if (this.onLoginCallback) this.onLoginCallback(this.user);
            } else if (event === 'SIGNED_OUT') {
                this.user = null;
                this.mostrarTelaLogin();
                if (this.onLogoutCallback) this.onLogoutCallback();
            }
        });
    }

    async login(email, senha) {
        try {
            const { data, error } = await supabaseClient.auth.signInWithPassword({
                email: email,
                password: senha
            });

            if (error) {
                throw error;
            }

            this.user = data.user;
            return { success: true, user: data.user };
        } catch (error) {
            console.error('Erro no login:', error);
            return { success: false, error: this.traduzirErro(error.message) };
        }
    }

    async registrar(email, senha, nome) {
        try {
            const { data, error } = await supabaseClient.auth.signUp({
                email: email,
                password: senha,
                options: {
                    data: {
                        nome: nome
                    }
                }
            });

            if (error) {
                throw error;
            }

            return { success: true, user: data.user, message: 'Conta criada! Verifique seu email para confirmar.' };
        } catch (error) {
            console.error('Erro no registro:', error);
            return { success: false, error: this.traduzirErro(error.message) };
        }
    }

    async logout() {
        try {
            const { error } = await supabaseClient.auth.signOut();
            if (error) throw error;
            this.user = null;
            return { success: true };
        } catch (error) {
            console.error('Erro no logout:', error);
            return { success: false, error: error.message };
        }
    }

    async recuperarSenha(email) {
        try {
            const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
                redirectTo: window.location.origin + '/reset-password.html'
            });

            if (error) throw error;
            return { success: true, message: 'Email de recuperação enviado!' };
        } catch (error) {
            console.error('Erro na recuperação:', error);
            return { success: false, error: this.traduzirErro(error.message) };
        }
    }

    traduzirErro(mensagem) {
        const traducoes = {
            'Invalid login credentials': 'Email ou senha incorretos',
            'Email not confirmed': 'Email não confirmado. Verifique sua caixa de entrada.',
            'User already registered': 'Este email já está cadastrado',
            'Password should be at least 6 characters': 'A senha deve ter pelo menos 6 caracteres',
            'Unable to validate email address: invalid format': 'Formato de email inválido',
            'Email rate limit exceeded': 'Muitas tentativas. Aguarde alguns minutos.'
        };
        return traducoes[mensagem] || mensagem;
    }

    mostrarTelaLogin() {
        const telaLogin = document.getElementById('telaLogin');
        const telaApp = document.getElementById('telaApp');
        
        if (telaLogin) telaLogin.style.display = 'flex';
        if (telaApp) telaApp.style.display = 'none';
    }

    ocultarTelaLogin() {
        const telaLogin = document.getElementById('telaLogin');
        const telaApp = document.getElementById('telaApp');
        
        if (telaLogin) telaLogin.style.display = 'none';
        if (telaApp) telaApp.style.display = 'block';
    }

    getUserId() {
        return this.user ? this.user.id : null;
    }

    getUserEmail() {
        return this.user ? this.user.email : null;
    }

    getUserNome() {
        return this.user?.user_metadata?.nome || this.user?.email?.split('@')[0] || 'Usuário';
    }

    isLoggedIn() {
        return this.user !== null;
    }

    onLogin(callback) {
        this.onLoginCallback = callback;
    }

    onLogout(callback) {
        this.onLogoutCallback = callback;
    }
}

// Instância global
window.authModule = new AuthModule();

// Funções auxiliares para o HTML
async function fazerLogin() {
    const email = document.getElementById('loginEmail').value;
    const senha = document.getElementById('loginSenha').value;
    const btnLogin = document.getElementById('btnLogin');
    const msgErro = document.getElementById('loginErro');

    if (!email || !senha) {
        msgErro.textContent = 'Preencha todos os campos';
        msgErro.style.display = 'block';
        return;
    }

    btnLogin.disabled = true;
    btnLogin.textContent = 'Entrando...';
    msgErro.style.display = 'none';

    const resultado = await authModule.login(email, senha);

    if (resultado.success) {
        msgErro.style.display = 'none';
    } else {
        msgErro.textContent = resultado.error;
        msgErro.style.display = 'block';
    }

    btnLogin.disabled = false;
    btnLogin.textContent = 'Entrar';
}

async function fazerRegistro() {
    const nome = document.getElementById('registroNome').value;
    const email = document.getElementById('registroEmail').value;
    const senha = document.getElementById('registroSenha').value;
    const confirmarSenha = document.getElementById('registroConfirmarSenha').value;
    const btnRegistro = document.getElementById('btnRegistro');
    const msgErro = document.getElementById('registroErro');
    const msgSucesso = document.getElementById('registroSucesso');

    msgErro.style.display = 'none';
    msgSucesso.style.display = 'none';

    if (!nome || !email || !senha || !confirmarSenha) {
        msgErro.textContent = 'Preencha todos os campos';
        msgErro.style.display = 'block';
        return;
    }

    if (senha !== confirmarSenha) {
        msgErro.textContent = 'As senhas não coincidem';
        msgErro.style.display = 'block';
        return;
    }

    if (senha.length < 6) {
        msgErro.textContent = 'A senha deve ter pelo menos 6 caracteres';
        msgErro.style.display = 'block';
        return;
    }

    btnRegistro.disabled = true;
    btnRegistro.textContent = 'Criando conta...';

    const resultado = await authModule.registrar(email, senha, nome);

    if (resultado.success) {
        msgSucesso.textContent = resultado.message;
        msgSucesso.style.display = 'block';
        // Limpar campos
        document.getElementById('registroNome').value = '';
        document.getElementById('registroEmail').value = '';
        document.getElementById('registroSenha').value = '';
        document.getElementById('registroConfirmarSenha').value = '';
    } else {
        msgErro.textContent = resultado.error;
        msgErro.style.display = 'block';
    }

    btnRegistro.disabled = false;
    btnRegistro.textContent = 'Criar Conta';
}

async function fazerLogout() {
    if (confirm('Deseja realmente sair?')) {
        await authModule.logout();
    }
}

async function recuperarSenha() {
    const email = prompt('Digite seu email para recuperar a senha:');
    if (email) {
        const resultado = await authModule.recuperarSenha(email);
        if (resultado.success) {
            alert(resultado.message);
        } else {
            alert('Erro: ' + resultado.error);
        }
    }
}

function mostrarFormLogin() {
    document.getElementById('formLogin').style.display = 'block';
    document.getElementById('formRegistro').style.display = 'none';
    document.getElementById('tabLogin').classList.add('active');
    document.getElementById('tabRegistro').classList.remove('active');
}

function mostrarFormRegistro() {
    document.getElementById('formLogin').style.display = 'none';
    document.getElementById('formRegistro').style.display = 'block';
    document.getElementById('tabLogin').classList.remove('active');
    document.getElementById('tabRegistro').classList.add('active');
}
