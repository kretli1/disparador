// CONFIGURADO AUTOMATICAMENTE - 26/07/2025, 23:34:54
// Webhooks: https://n8n-2025n8n.wjemh8.easypanel.host/webhook/2fa4dafe-d9c4-4072-bb74-af75801adf3d | https://n8n-2025n8n.wjemh8.easypanel.host/webhook/ca658654-80a0-41e5-838f-8c8fd1af661e

// ========================================
// DISPARADOR PRO - MAIN.JS
// ========================================

// ========================================
// 1. CONFIGURAÇÕES E CONSTANTES
// ========================================
const APP_CONFIG = {
    webhookUrl: 'https://n8n-2025n8n.wjemh8.easypanel.host/webhook/2fa4dafe-d9c4-4072-bb74-af75801adf3d',
    webhookConexao: 'https://n8n-2025n8n.wjemh8.easypanel.host/webhook/ca658654-80a0-41e5-838f-8c8fd1af661e',
    version: '2.3',
    updateCheckInterval: 5 * 60 * 1000, // 5 minutos
    scheduledCheckInterval: 30000, // 30 segundos
    maxHistoryEntries: 50,
    qrRefreshTime: 30000 // 30 segundos
};

const isFileProtocol = window.location.protocol === 'file:';
const supportsBlob = !isFileProtocol && 'URL' in window && 'createObjectURL' in URL;

console.log('🔍 Protocolo atual:', window.location.protocol);
console.log('📁 É protocolo file:', isFileProtocol);
console.log('🔗 Suporte a blob:', supportsBlob);

const isLocalhost = window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname === '';

if (isLocalhost && window.location.protocol.startsWith('http')) {
    console.log('🌐 Servidor local detectado - blob URLs habilitadas');
    window.supportsBlob = true;
} else {
    window.supportsBlob = supportsBlob;
}

// ========================================
// 1.1 SISTEMA DE AUTENTICAÇÃO - LOGO APÓS APP_CONFIG
// ========================================
const AuthManager = {
    isAuthenticated: false,
    currentUser: null,

    initialize() {
        console.log('🔐 Inicializando sistema de autenticação...');
        this.checkSavedCredentials();
        this.setupLoginEvents();
    },

    setupLoginEvents() {
        const loginForm = document.getElementById('loginForm');
        const logoutBtn = document.getElementById('logoutBtn');

        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleLogin();
            });
        }

        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                this.handleLogout();
            });
        }
    },

    checkSavedCredentials() {
        const saved = localStorage.getItem('disparador_auth');
        if (saved) {
            try {
                const credentials = JSON.parse(saved);
                if (credentials.instanceName && credentials.apikey) {
                    console.log('🔑 Credenciais salvas encontradas, fazendo login automático...');

                    this.currentUser = {
                        instanceName: credentials.instanceName,
                        apikey: credentials.apikey,
                        connectionStatus: 'unknown',
                        loginTime: new Date()
                    };

                    this.isAuthenticated = true;
                    this.showMainApp();
                    this.populatePanelCredentials();

                    setTimeout(() => {
                        App.initializeApp().then(() => {
                            this.verifyConnectionInBackground(credentials.instanceName, credentials.apikey);
                        });
                    }, 300);

                    return;
                }
            } catch (error) {
                console.warn('⚠️ Erro ao carregar credenciais salvas:', error);
                localStorage.removeItem('disparador_auth');
            }
        }

        this.showLoginScreen();
    },

    async handleLogin() {
        const instanceName = document.getElementById('loginInstanceName')?.value?.trim();
        const apikey = document.getElementById('loginAPIKEY')?.value?.trim();
        const remember = document.getElementById('rememberCredentials')?.checked;

        if (!instanceName || !apikey) {
            this.showError('Preencha nome da instância e APIKEY');
            return;
        }

        await this.verifyAndLogin(instanceName, apikey, remember);
    },

    async verifyAndLogin(instanceName, apikey, remember = false) {
        this.showLoading('Verificando credenciais...');

        try {
            const response = await fetch(APP_CONFIG.webhookConexao, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    instanceName: instanceName,
                    instanceAPIKEY: apikey
                })
            });

            const data = await response.json();
            this.hideLoading();

            if (data.result === 'error') {
                this.showError('❌ Credenciais inválidas! Verifique o nome da instância e APIKEY.');
                this.showLoginScreen();
                return;
            }

            console.log('✅ Login realizado com sucesso!');

            this.currentUser = {
                instanceName: instanceName,
                apikey: apikey,
                connectionStatus: data.result === 'open' ? 'connected' : 'disconnected',
                loginTime: new Date()
            };

            if (remember) {
                localStorage.setItem('disparador_auth', JSON.stringify({
                    instanceName: instanceName,
                    apikey: apikey
                }));
            }

            this.isAuthenticated = true;
            this.populatePanelCredentials();
            this.showMainApp();

            setTimeout(() => {
                App.initializeApp().then(() => {
                    this.addInstanceToManager(instanceName, apikey, data.result);
                });
            }, 200);

        } catch (error) {
            this.hideLoading();
            console.error('❌ Erro no login:', error);
            this.showError('Erro ao verificar credenciais. Tente novamente.');
            this.showLoginScreen();
        }
    },

    async verifyConnectionInBackground(instanceName, apikey) {
        try {
            const response = await fetch(APP_CONFIG.webhookConexao, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    instanceName: instanceName,
                    instanceAPIKEY: apikey
                })
            });

            const data = await response.json();

            if (data.result === 'error') {
                console.warn('⚠️ Credenciais salvas inválidas, fazendo logout...');
                this.performLogout();
                return;
            }

            this.currentUser.connectionStatus = data.result === 'open' ? 'connected' : 'disconnected';
            this.addInstanceToManager(instanceName, apikey, data.result);


        } catch (error) {
            console.warn('⚠️ Erro na verificação de credenciais salvas:', error);
            this.showWarning('Conectado com credenciais salvas, mas não foi possível verificar status do WhatsApp');
        }
    },

    addInstanceToManager(instanceName, apikey, connectionResult) {
        const existingInstance = AppState.instances.find(inst =>
            inst.name === instanceName && inst.apikey === apikey
        );

        if (!existingInstance) {
            console.log('📱 Adicionando instância ao gerenciador automaticamente...');

            const newInstance = {
                id: Date.now(),
                name: instanceName,
                apikey: apikey,
                status: connectionResult === 'open' ? 'connected' : 'disconnected',
                qrCode: connectionResult !== 'open' ? connectionResult : null,
                lastCheck: new Date(),
                totalSent: 0,
                successCount: 0,
                errorCount: 0
            };

            AppState.instances.push(newInstance);

            if (typeof InstanceManager !== 'undefined') {
                InstanceManager.saveInstances();
                InstanceManager.updateInstancesList();
            }

            console.log('✅ Instância adicionada automaticamente ao gerenciador');
        } else {
            console.log('📱 Instância já existe no gerenciador');
            existingInstance.status = connectionResult === 'open' ? 'connected' : 'disconnected';
            existingInstance.lastCheck = new Date();

            if (typeof InstanceManager !== 'undefined') {
                InstanceManager.saveInstances();
                InstanceManager.updateInstancesList();
            }
        }
    },

    populatePanelCredentials() {
        setTimeout(() => {
            const instanceNameField = document.getElementById('instanceName');
            const instanceAPIKEYField = document.getElementById('instanceAPIKEY');

            if (instanceNameField && this.currentUser) {
                instanceNameField.value = this.currentUser.instanceName;
            }

            if (instanceAPIKEYField && this.currentUser) {
                instanceAPIKEYField.value = this.currentUser.apikey;
            }

        }, 300);
    },

    handleLogout() {
        this.confirm(
            'Confirmar Logout',
            'Tem certeza que deseja sair? Suas configurações serão mantidas.',
            () => {
                this.performLogout();
            }
        );
    },

    performLogout() {
        console.log('👋 Realizando logout...');

        // ✅ LIMPAR ChartManager
        if (typeof ChartManager !== 'undefined') {
            ChartManager.destroy();
            console.log('📊 ChartManager limpo no logout');
        }

        if (typeof TimerManager !== 'undefined') {
            TimerManager.cleanup();
            console.log('⏱️ TimerManager limpo no logout');
        }

        this.isAuthenticated = false;
        this.currentUser = null;
        this.clearLoginForm();
        this.forceShowLoginScreen();

        // Limpar localStorage
        localStorage.clear();
        // Limpar sessionStorage
        sessionStorage.clear();

        setTimeout(() => {
            this.showInfo('Logout realizado com sucesso!');
        }, 100);
    },

    clearLoginForm() {
        setTimeout(() => {
            const fields = ['loginInstanceName', 'loginAPIKEY'];
            fields.forEach(fieldId => {
                const field = document.getElementById(fieldId);
                if (field) {
                    field.value = '';
                    console.log(`🧹 Campo ${fieldId} limpo`);
                }
            });

            const rememberCheckbox = document.getElementById('rememberCredentials');
            if (rememberCheckbox) {
                rememberCheckbox.checked = false;
                console.log('🧹 Checkbox "lembrar" desmarcado');
            }
        }, 50);
    },

    showLoginScreen() {
        const loginScreen = document.getElementById('loginScreen');
        const mainApp = document.getElementById('mainApp');

        if (loginScreen) {
            loginScreen.classList.remove('hidden');
            loginScreen.style.display = 'block';
        }

        if (mainApp) {
            mainApp.classList.remove('authenticated');
            mainApp.style.display = 'none';
        }

        this.isAuthenticated = false;
        this.disableMainAppButtons();

        console.log('🔐 Tela de login exibida');
    },

    showMainApp() {
        const loginScreen = document.getElementById('loginScreen');
        const mainApp = document.getElementById('mainApp');

        if (loginScreen) {
            loginScreen.classList.add('hidden');
            loginScreen.style.display = 'none';
        }

        if (mainApp) {
            mainApp.classList.add('authenticated');
            mainApp.style.display = 'block';
        }

        this.isAuthenticated = true;

        if (typeof TimerManager !== 'undefined') {
            TimerManager.initialize();
            console.log('⏱️ TimerManager inicializado após login');
        }

        this.enableMainAppButtons();

        console.log('🎉 Painel principal exibido - usuário autenticado');
    },

    forceShowLoginScreen() {
        const loginScreen = document.getElementById('loginScreen');
        const mainApp = document.getElementById('mainApp');

        console.log('🔐 Forçando exibição da tela de login...');

        // ✅ LIMPAR ChartManager
        if (typeof ChartManager !== 'undefined') {
            ChartManager.destroy();
        }

        if (typeof TimerManager !== 'undefined') {
            TimerManager.cleanup();
        }

        if (mainApp) {
            mainApp.classList.remove('authenticated');
            mainApp.style.display = 'none';
            console.log('📱 Painel principal escondido');
        }

        if (loginScreen) {
            loginScreen.classList.remove('hidden');
            loginScreen.style.display = 'block';
            console.log('🔐 Tela de login exibida');
        }

        this.isAuthenticated = false;

        if (document.activeElement) {
            document.activeElement.blur();
        }

        console.log('✅ Logout visual concluído');
    },

    disableMainAppButtons() {
        const submitBtn = document.querySelector('#mainApp button[type="submit"]');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.style.pointerEvents = 'none';
        }

        const importantButtons = document.querySelectorAll('#mainApp .btn-whatsapp, #mainApp #pauseButton, #mainApp #stopButton');
        importantButtons.forEach(btn => {
            btn.disabled = true;
            btn.style.pointerEvents = 'none';
        });

        console.log('🔒 Botões do painel principal desabilitados');
    },

    enableMainAppButtons() {
        const submitBtn = document.querySelector('#mainApp button[type="submit"]');
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.style.pointerEvents = 'auto';
        }

        const importantButtons = document.querySelectorAll('#mainApp .btn-whatsapp, #mainApp #pauseButton, #mainApp #stopButton');
        importantButtons.forEach(btn => {
            btn.disabled = false;
            btn.style.pointerEvents = 'auto';
        });

        console.log('🔓 Botões do painel principal habilitados');
    },

    requireAuth(skipLoginCheck = false) {
        if (skipLoginCheck) {
            return true;
        }

        if (!this.isAuthenticated || !this.currentUser) {
            this.showError('Sessão expirada. Faça login novamente.');
            this.showLoginScreen();
            return false;
        }
        return true;
    },

    getCurrentUser() {
        return this.currentUser;
    },

    // Métodos auxiliares para UI
    showLoading(message) {
        if (typeof Notiflix !== 'undefined') {
            Notiflix.Loading.hourglass(message);
        } else {
            console.log('Loading:', message);
        }
    },

    hideLoading() {
        if (typeof Notiflix !== 'undefined') {
            Notiflix.Loading.remove();
        }
    },

    showSuccess(message) {
        if (typeof Notiflix !== 'undefined') {
            Notiflix.Notify.success(message);
        } else {
            alert('Sucesso: ' + message);
        }
    },

    showError(message) {
        if (typeof Notiflix !== 'undefined') {
            Notiflix.Notify.failure(message);
        } else {
            alert('Erro: ' + message);
        }
    },

    showInfo(message) {
        if (typeof Notiflix !== 'undefined') {
            Notiflix.Notify.info(message);
        } else {
            alert('Info: ' + message);
        }
    },

    showWarning(message) {
        if (typeof Notiflix !== 'undefined') {
            Notiflix.Notify.warning(message);
        } else {
            alert('Aviso: ' + message);
        }
    },

    confirm(title, message, onConfirm) {
        if (typeof Notiflix !== 'undefined') {
            Notiflix.Confirm.show(title, message, 'Sim', 'Cancelar', onConfirm, () => { });
        } else {
            if (confirm(title + '\n\n' + message)) {
                onConfirm();
            }
        }
    }
};


// ========================================
// 2. ESTADO DA APLICAÇÃO
// ========================================
const AppState = {
    contacts: [],
    sendingInProgress: false,
    stopSending: false,
    isPaused: false,
    results: { success: 0, error: 0 },
    chart: null,
    sendingDetails: [],
    sendingHistory: [],
    scheduledDispatches: [],
    estimatedTime: 0,
    startTime: null,
    instances: [],
    activeInstances: [],

    batchPauseEnabled: false,
    batchSize: 10,
    batchPauseDuration: 10,
    currentBatchCount: 0,
    batchPauseActive: false,
    batchTimer: null,
    totalBatches: 0,
    currentBatchNumber: 1,

    // PWA e updates
    registration: null,
    deferredPrompt: null,

    // Multiplas mensagens:
    multipleMessagesEnabled: false,
    messagesConfig: {
        msg1: { enabled: true, text: '', media: null },
        msg2: { enabled: false, text: '', media: null },
        msg3: { enabled: false, text: '', media: null }
    },
};

// ========================================
// 3. GERENCIAMENTO DE INTERVALOS
// ========================================
const AppIntervals = {
    qrRefresh: null,
    scheduledCheck: null,
    updateCheck: null,

    clear(intervalName) {
        if (this[intervalName]) {
            clearInterval(this[intervalName]);
            this[intervalName] = null;
        }
    },

    clearAll() {
        Object.keys(this).forEach(key => {
            if (key !== 'clear' && key !== 'clearAll' && this[key]) {
                clearInterval(this[key]);
                this[key] = null;
            }
        });
    }
};

// ========================================
// 4. UTILITÁRIOS E HELPERS
// ========================================
const Utils = {
    // Debounce function
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    // Throttle function
    throttle(func, delay) {
        let timeoutId;
        let lastExecTime = 0;
        return function (...args) {
            const currentTime = Date.now();

            if (currentTime - lastExecTime > delay) {
                func.apply(this, args);
                lastExecTime = currentTime;
            } else {
                clearTimeout(timeoutId);
                timeoutId = setTimeout(() => {
                    func.apply(this, args);
                    lastExecTime = Date.now();
                }, delay - (currentTime - lastExecTime));
            }
        };
    },

    // Async wrapper with error handling
    async safeAsyncCall(fn, errorMessage = 'Erro inesperado') {
        try {
            return await fn();
        } catch (error) {
            console.error(errorMessage, error);
            Notiflix.Notify.failure(errorMessage);
            return null;
        }
    },

    // Saudação baseada no horário
    getSaudacao() {
        const hora = new Date().getHours();
        if (hora >= 5 && hora < 12) return "Bom dia";
        if (hora >= 12 && hora < 18) return "Boa tarde";
        return "Boa noite";
    },

    // Formatação de tempo
    formatTime(milliseconds) {
        const seconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);

        if (hours > 0) {
            return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds % 60}s`;
        }
        return `${seconds}s`;
    },

    // Formatação de tempo restante
    formatTimeRemaining(milliseconds) {
        const totalSeconds = Math.floor(milliseconds / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds}s`;
        }
        return `${seconds}s`;
    },

    // Sleep function
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },

    // File to base64
    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            console.log('🔄 Iniciando conversão para base64:', file.name, file.type);

            const reader = new FileReader();

            reader.onload = () => {
                try {
                    const result = reader.result;
                    if (!result) {
                        throw new Error('Resultado da leitura está vazio');
                    }

                    const base64Data = result.split(',')[1];
                    if (!base64Data) {
                        throw new Error('Dados base64 não encontrados');
                    }

                    console.log('✅ Conversão base64 concluída:', {
                        fileType: file.type,
                        originalSize: file.size,
                        base64Size: base64Data.length
                    });

                    resolve(base64Data);
                } catch (error) {
                    console.error('❌ Erro no processamento do resultado:', error);
                    reject(error);
                }
            };

            reader.onerror = (error) => {
                console.error('❌ Erro na leitura do arquivo:', error);
                reject(new Error('Erro ao ler arquivo: ' + error.message));
            };

            reader.onabort = () => {
                console.error('❌ Leitura do arquivo foi abortada');
                reject(new Error('Leitura do arquivo foi abortada'));
            };

            // ✅ VERIFICAÇÃO ADICIONAL PARA ÁUDIO
            if (file.type.startsWith('audio/')) {
                console.log('🔊 Iniciando leitura de arquivo de áudio...');
            }

            try {
                reader.readAsDataURL(file);
            } catch (error) {
                console.error('❌ Erro ao iniciar leitura:', error);
                reject(error);
            }
        });
    },


    // Format date safely
    safeFormatDate(dateValue) {
        try {
            if (!dateValue) return 'Data inválida';
            const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
            return date.toLocaleString('pt-BR');
        } catch (error) {
            return 'Data inválida';
        }
    },

    // Format time safely
    safeFormatTime(dateValue) {
        try {
            const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
            return date.toLocaleTimeString('pt-BR');
        } catch (error) {
            return 'Hora inválida';
        }
    }
};

// ========================================
// 5. VALIDADORES
// ========================================
const Validators = {
    instanceData() {
        const instanceName = document.getElementById('instanceName')?.value?.trim() || '';
        const instanceAPIKEY = document.getElementById('instanceAPIKEY')?.value?.trim() || '';
        return {
            valid: !!(instanceName && instanceAPIKEY),
            instanceName,
            instanceAPIKEY
        };
    },

    intervals() {
        const min = parseInt(document.getElementById('minInterval')?.value || 0);
        const max = parseInt(document.getElementById('maxInterval')?.value || 0);
        return { valid: min <= max && min > 0 && max > 0, min, max };
    },

    contacts() {
        return { valid: AppState.contacts.length > 0, count: AppState.contacts.length };
    },

    messages() {
        // Sempre usar validação de múltiplas mensagens
        const validation = MultipleMessagesManager.validateMessages();
        return { valid: validation.valid, error: validation.error, type: 'multiple' };
    },

    schedule() {
        const scheduleDate = document.getElementById('scheduleDate')?.value;
        const scheduleTime = document.getElementById('scheduleTime')?.value;

        if (!scheduleDate || !scheduleTime) {
            return { valid: false, error: 'Data e horário obrigatórios' };
        }

        const [year, month, day] = scheduleDate.split('-');
        const [hour, minute] = scheduleTime.split(':');
        const scheduledDateTime = new Date(year, month - 1, day, hour, minute);
        const minScheduleTime = new Date(Date.now() + 60 * 1000);

        return {
            valid: scheduledDateTime > minScheduleTime,
            scheduledDateTime,
            error: scheduledDateTime <= minScheduleTime ? 'Horário deve ser no futuro' : null
        };
    },

    mail(email) {
        if (!email || !email.trim()) {
            return { valid: true, email: '' }; // E-mail opcional
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const cleanEmail = email.trim().toLowerCase();

        return {
            valid: emailRegex.test(cleanEmail),
            email: cleanEmail,
            error: emailRegex.test(cleanEmail) ? null : 'E-mail inválido'
        };
    }
};

// ========================================
// 6. GERENCIAMENTO DE TELEFONES ATUALIZADO
// ========================================
const PhoneUtils = {
    // Verificar se validação brasileira está ativada
    isBrazilianValidationEnabled() {
        const checkbox = document.getElementById('enableBrazilianValidation');
        return checkbox ? checkbox.checked : true; // Default: ativado
    },

    // Formatar número brasileiro
    formatBrazilianPhone(phone) {
        const cleaned = phone.replace(/\D/g, '');
        let number = cleaned;

        // Se já começar com 55 e tiver mais de 11 dígitos, manter como está
        if (number.startsWith('55') && number.length > 11) {
            number = cleaned; // Já tem 55, manter
        } else {
            // Remover 55 se existir para processar
            if (number.startsWith('55') && number.length > 11) {
                number = number.substring(2);
            }

            // Adicionar 9 se necessário (celular com DDD válido)
            const validDDDs = [
                '11', '12', '13', '14', '15', '16', '17', '18', '19',
                '21', '22', '24', '27', '28', '31', '32', '33', '34',
                '35', '37', '38', '41', '42', '43', '44', '45', '46',
                '47', '48', '49', '51', '53', '54', '55', '61', '62',
                '64', '63', '65', '66', '67', '68', '69', '71', '73',
                '74', '75', '77', '79', '81', '87', '82', '83', '84',
                '85', '88', '86', '89', '91', '93', '94', '92', '97',
                '95', '96', '98', '99'
            ];

            if (number.length === 10 && validDDDs.includes(number.substring(0, 2))) {
                number = number.substring(0, 2) + '9' + number.substring(2);
            }

            // ✅ SEMPRE ADICIONAR 55 NO INÍCIO
            number = '55' + number;
        }

        return number;
    },

    // Formatar número internacional (básico)
    formatInternationalPhone(phone) {
        // Remove todos os caracteres não numéricos exceto +
        let cleaned = phone.replace(/[^\d+]/g, '');

        return cleaned;
    },

    // Função principal de formatação
    formatPhone(phone) {
        if (!phone) return '';

        if (this.isBrazilianValidationEnabled()) {
            return this.formatBrazilianPhone(phone);
        } else {
            return this.formatInternationalPhone(phone);
        }
    },

    // Validação brasileira (código existente)
    isValidBrazilianPhone(phone) {
        const cleaned = phone.replace(/\D/g, '');

        // Remover 55 temporariamente para validação
        let numberToValidate = cleaned;
        if (cleaned.startsWith('55') && cleaned.length > 11) {
            numberToValidate = cleaned.substring(2);
        }

        const validDDDs = [
            '11', '12', '13', '14', '15', '16', '17', '18', '19',
            '21', '22', '24', '27', '28', '31', '32', '33', '34',
            '35', '37', '38', '41', '42', '43', '44', '45', '46',
            '47', '48', '49', '51', '53', '54', '55', '61', '62',
            '64', '63', '65', '66', '67', '68', '69', '71', '73',
            '74', '75', '77', '79', '81', '87', '82', '83', '84',
            '85', '88', '86', '89', '91', '93', '94', '92', '97',
            '95', '96', '98', '99'
        ];

        // Validar tamanho (deve ter 10 ou 11 dígitos SEM o 55)
        if (numberToValidate.length !== 10 && numberToValidate.length !== 11) {
            return { valid: false, error: 'Telefone brasileiro deve ter 10 ou 11 dígitos' };
        }

        // Validar DDD
        const ddd = numberToValidate.substring(0, 2);
        if (!validDDDs.includes(ddd)) {
            return { valid: false, error: 'DDD inválido' };
        }

        // Validar formato de celular
        if (numberToValidate.length === 11 && numberToValidate[2] !== '9') {
            return { valid: false, error: 'Celular deve começar com 9 após o DDD' };
        }

        // Validar formato de fixo
        if (numberToValidate.length === 10 && numberToValidate[2] === '9') {
            return { valid: false, error: 'Telefone fixo não deve começar com 9' };
        }

        // Verificar dígitos repetidos
        const uniqueDigits = new Set(numberToValidate).size;
        if (uniqueDigits <= 2) {
            return { valid: false, error: 'Número inválido (muitos dígitos repetidos)' };
        }

        // ✅ RETORNAR COM 55 + FORMATAÇÃO
        let finalNumber = numberToValidate;

        // Adicionar 9 se necessário
        if (finalNumber.length === 10 && validDDDs.includes(finalNumber.substring(0, 2))) {
            finalNumber = finalNumber.substring(0, 2) + '9' + finalNumber.substring(2);
        }

        // Adicionar 55
        finalNumber = '55' + finalNumber;

        return { valid: true, formatted: finalNumber };
    },

    // Validação internacional (mais flexível)
    isValidInternationalPhone(phone) {
        const cleaned = this.formatInternationalPhone(phone);

        // Verificações básicas para números internacionais

        // Deve ter pelo menos 7 dígitos (números mais curtos são muito raros)
        const numbersOnly = cleaned.replace(/[^\d]/g, '');
        if (numbersOnly.length < 7) {
            return { valid: false, error: 'Número muito curto (mínimo 7 dígitos)' };
        }

        // Máximo 15 dígitos (padrão ITU-T E.164)
        if (numbersOnly.length > 15) {
            return { valid: false, error: 'Número muito longo (máximo 15 dígitos)' };
        }

        // Verificar se não é só dígitos repetidos
        const uniqueDigits = new Set(numbersOnly).size;
        if (uniqueDigits <= 2 && numbersOnly.length > 4) {
            return { valid: false, error: 'Número inválido (muitos dígitos repetidos)' };
        }

        // Verificar padrões obviamente inválidos
        const invalidPatterns = [
            /^0+$/, // Só zeros
            /^1+$/, // Só uns
            /^12345/, // Sequência simples
            /^11111/, // Repetição
            /^00000/, // Zeros
        ];

        for (const pattern of invalidPatterns) {
            if (pattern.test(numbersOnly)) {
                return { valid: false, error: 'Padrão de número inválido' };
            }
        }

        return { valid: true, formatted: cleaned };
    },

    // Função principal de validação
    isValidPhone(phone) {
        if (!phone || typeof phone !== 'string') {
            return { valid: false, error: 'Número não fornecido' };
        }

        if (this.isBrazilianValidationEnabled()) {
            return this.isValidBrazilianPhone(phone);
        } else {
            return this.isValidInternationalPhone(phone);
        }
    },

    // Função para exibir número formatado
    displayFormattedPhone(phone) {
        if (!phone) return '';

        if (this.isBrazilianValidationEnabled()) {
            return this.displayBrazilianFormattedPhone(phone);
        } else {
            return this.displayInternationalFormattedPhone(phone);
        }
    },

    // Exibir número brasileiro formatado
    displayBrazilianFormattedPhone(phone) {
        let cleaned = phone.replace(/\D/g, '');

        // ✅ REMOVER 55 APENAS PARA DISPLAY
        if (cleaned.startsWith('55') && cleaned.length > 11) {
            cleaned = cleaned.substring(2);
        }

        if (cleaned.length === 11) {
            return `(${cleaned.substring(0, 2)}) ${cleaned.substring(2, 7)}-${cleaned.substring(7)}`;
        } else if (cleaned.length === 10) {
            return `(${cleaned.substring(0, 2)}) ${cleaned.substring(2, 6)}-${cleaned.substring(6)}`;
        }

        return phone;
    },

    // Exibir número internacional formatado
    displayInternationalFormattedPhone(phone) {
        const cleaned = phone.replace(/[^\d+]/g, '');

        return cleaned;
    },

    // Função para obter informações do modo atual
    getValidationMode() {
        return {
            isBrazilian: this.isBrazilianValidationEnabled(),
            modeName: this.isBrazilianValidationEnabled() ? 'Validação Brasileira' : 'Validação Internacional',
            description: this.isBrazilianValidationEnabled()
                ? 'Valida DDD e formato brasileiro (10-11 dígitos)'
                : 'Aceita números internacionais (7-15 dígitos)'
        };
    }
};

// ========================================
// 7. GERENCIAMENTO DE UI
// ========================================
const UI = {
    showLoading(message = 'Carregando...') {
        Notiflix.Loading.hourglass(message);
    },

    hideLoading() {
        Notiflix.Loading.remove();
    },

    showSuccess(message) {
        Notiflix.Notify.success(message);
    },

    showError(message) {
        Notiflix.Notify.failure(message);
    },

    showWarning(message) {
        Notiflix.Notify.warning(message);
    },

    showInfo(message) {
        Notiflix.Notify.info(message);
    },

    confirm(title, message, onConfirm, onCancel = () => { }) {
        Notiflix.Confirm.show(title, message, 'Sim', 'Cancelar', onConfirm, onCancel);
    },

    alternarTema() {
        const html = document.documentElement;
        const temaAtual = html.getAttribute('data-theme');
        const novoTema = temaAtual === 'dark' ? 'light' : 'dark';
        html.setAttribute('data-theme', novoTema);

        const themeIcon = document.getElementById('themeIcon');
        if (themeIcon) {
            themeIcon.className = novoTema === 'dark' ? 'bi bi-moon-fill me-2' : 'bi bi-sun-fill me-2';
        }
    }
};

// ========================================
// 8. GERENCIAMENTO DE ESTIMATIVAS DE TEMPO
// ========================================

const TimeEstimator = {
    calculate() {
        if (AppState.contacts.length === 0) return 0;

        const minInterval = parseInt(document.getElementById('minInterval')?.value || 0) * 1000;
        const maxInterval = parseInt(document.getElementById('maxInterval')?.value || 0) * 1000;
        const avgInterval = (minInterval + maxInterval) / 2;

        let totalTime = ((AppState.contacts.length - 1) * avgInterval) + (AppState.contacts.length * 2000);

        // ✅ ADICIONAR TEMPO DAS PAUSAS EM LOTES
        if (AppState.batchPauseEnabled && AppState.batchSize) {
            const batchSize = AppState.batchSize;
            const batchPause = AppState.batchPauseDuration * 60 * 1000;
            const totalBatches = Math.ceil(AppState.contacts.length / batchSize);
            const batchPauses = Math.max(0, totalBatches - 1);

            totalTime += batchPauses * batchPause;

            console.log(`⏱️ Estimativa com lotes: ${totalBatches} lotes, ${batchPauses} pausas de ${AppState.batchPauseDuration}min`);
        }

        return totalTime;
    },

    // ✅ CORREÇÃO: Usar TimeEstimator.calculate() em vez de this.calculate()
    update: Utils.throttle(function () {
        const estimateElement = document.getElementById('timeEstimate');
        if (!estimateElement) return;

        if (AppState.sendingInProgress && AppState.startTime) {
            const elapsed = Date.now() - AppState.startTime;
            const progress = (AppState.results.success + AppState.results.error) / AppState.contacts.length;

            if (progress > 0) {
                const totalEstimated = elapsed / progress;
                const remaining = totalEstimated - elapsed;

                estimateElement.innerHTML = `
                    <div class="row text-center">
                        <div class="col-4">
                            <small class="text-muted">Decorrido</small>
                            <div class="fw-bold">${Utils.formatTime(elapsed)}</div>
                        </div>
                        <div class="col-4">
                            <small class="text-muted">Restante</small>
                            <div class="fw-bold text-warning">${Utils.formatTime(Math.max(0, remaining))}</div>
                        </div>
                        <div class="col-4">
                            <small class="text-muted">Total Est.</small>
                            <div class="fw-bold">${Utils.formatTime(totalEstimated)}</div>
                        </div>
                    </div>
                `;
            }
        } else if (AppState.contacts.length > 0) {
            // ✅ CORREÇÃO: Usar TimeEstimator.calculate() em vez de this.calculate()
            AppState.estimatedTime = TimeEstimator.calculate();

            let extraInfo = '';
            if (AppState.batchPauseEnabled) {
                const batches = Math.ceil(AppState.contacts.length / AppState.batchSize);
                extraInfo = `<small class="text-muted">Com ${batches} lotes e pausas</small>`;
            }

            estimateElement.innerHTML = `
                <div class="text-center">
                    <small class="text-muted">Tempo Estimado</small>
                    <div class="fw-bold text-info">${Utils.formatTime(AppState.estimatedTime)}</div>
                    <small class="text-muted">Para ${AppState.contacts.length} contatos</small>
                    ${extraInfo}
                </div>
            `;
        } else {
            estimateElement.innerHTML = `
                <div class="text-center text-muted">
                    <small>Importe contatos para ver estimativa</small>
                </div>
            `;
        }
    }, 500)
};

// ========================================
// 9. GERENCIAMENTO DE CONTATOS
// ========================================
const ContactManager = {
    processExcelFile(file) {
        UI.showLoading('Processando arquivo Excel...');

        const reader = new FileReader();
        reader.onload = (e) => {
            Utils.safeAsyncCall(async () => {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                const jsonData = XLSX.utils.sheet_to_json(firstSheet);

                const processedContacts = this.processContactData(jsonData);
                const { uniqueContacts, duplicates } = this.removeDuplicates(processedContacts);

                const validContacts = uniqueContacts.filter(c => c.isValid);
                const invalidContacts = uniqueContacts.filter(c => !c.isValid);

                AppState.contacts = validContacts;

                UI.hideLoading();
                this.showProcessingSummary(processedContacts.length, validContacts.length, duplicates.length, invalidContacts.length);
                this.updateContactsList();
                TimeEstimator.update();

                document.getElementById('fileInfo').style.display = 'block';
                UI.showSuccess(`${AppState.contacts.length} contatos importados com sucesso!`);
            }, 'Erro ao processar arquivo Excel');
        };

        reader.onerror = () => {
            UI.hideLoading();
            UI.showError('Erro ao ler o arquivo');
        };

        reader.readAsArrayBuffer(file);
    },

    // Substitua a função processContactData no ContactManager
    processContactData(jsonData) {
        return jsonData.map((row, index) => {
            // ✅ CORREÇÃO: Usar toString() com tratamento de encoding
            const name = this.cleanText(row.Nome || row.nome || row.NOME || row.Name || row.name || row.NAME || '');
            const rawPhone = String(row.Telefone || row.telefone || row.TELEFONE || row.Phone || row.phone || row.PHONE || row.Celular || row.celular || row.CELULAR || '');
            const email = this.cleanText(row.Email || row.email || row.EMAIL || row.EMail || row['E-mail'] || row['e-mail'] || row['E-MAIL'] || '');

            // ✅ USAR A NOVA FUNÇÃO DE VALIDAÇÃO
            const phoneValidation = PhoneUtils.isValidPhone(rawPhone);

            return {
                name,
                phone: phoneValidation.valid ? phoneValidation.formatted : PhoneUtils.formatPhone(rawPhone),
                email,
                rawPhone,
                isValid: phoneValidation.valid,
                error: phoneValidation.error || null,
                row: index + 1,
                validationMode: PhoneUtils.getValidationMode().modeName
            };
        }).filter(contact => contact.name && contact.phone && contact.phone.length >= 4);
    },

    // limpar texto com acentos
    cleanText(text) {
        if (!text) return '';

        // Converter para string e remover espaços extras
        let cleanText = String(text).trim();

        // Normalizar caracteres especiais (remove problemas de encoding)
        try {
            cleanText = cleanText.normalize('NFC');
        } catch (error) {
            console.warn('Erro na normalização de texto:', error);
        }

        return cleanText;
    },

    removeDuplicates(contacts) {
        const seenPhones = new Map();
        const uniqueContacts = [];
        const duplicates = [];

        contacts.forEach(contact => {
            if (seenPhones.has(contact.phone)) {
                duplicates.push({
                    duplicate: contact,
                    original: seenPhones.get(contact.phone),
                    phone: contact.phone
                });
            } else {
                seenPhones.set(contact.phone, contact);
                uniqueContacts.push(contact);
            }
        });

        return { uniqueContacts, duplicates };
    },

    showProcessingSummary(total, valid, duplicates, invalid) {
        const validationMode = PhoneUtils.getValidationMode();

        const summaryText = `
        <div style="text-align: left; line-height: 1.6; padding: 0px 20px">
            <strong>🔧 Modo:</strong> ${validationMode.modeName}<br>
            <strong>📋 Descrição:</strong> ${validationMode.description}<br><br>
            • Total processados: <strong>${total}</strong><br>
            • Contatos válidos: <strong style="color: #28a745;">${valid}</strong><br>
            • Duplicados removidos: <strong style="color: #ffc107;">${duplicates}</strong><br>
            • Inválidos ignorados: <strong style="color: #dc3545;">${invalid}</strong>
        </div>
    `;

        Notiflix.Report.success(
            'Resumo do Processamento',
            summaryText,
            'OK',
            {
                width: '550px',
                //svgSize: '60px',
                messageMaxLength: 3000,
                plainText: false, // ✅ IMPORTANTE: Habilita HTML
                titleFontSize: '22px',
                messageFontSize: '14px'
            }
        );
    },

    updateContactsList() {
        const contactsList = document.getElementById('contactsList');
        const contactCount = document.getElementById('contactCount');
        const clearContactsBtn = document.getElementById('clearContactsBtn');
        const exportContactsBtn = document.getElementById('exportContactsBtn');

        if (!contactsList || !contactCount) return;

        contactCount.textContent = `${AppState.contacts.length} contatos`;

        if (AppState.contacts.length === 0) {
            contactsList.innerHTML = '<p class="text-muted text-center mb-0">Importe um arquivo Excel para visualizar os contatos</p>';
            if (clearContactsBtn) clearContactsBtn.style.display = 'none';
            if (exportContactsBtn) exportContactsBtn.style.display = 'none';
            return;
        }

        if (clearContactsBtn) clearContactsBtn.style.display = 'inline-block';
        if (exportContactsBtn) exportContactsBtn.style.display = 'inline-block';

        contactsList.innerHTML = AppState.contacts.map((contact, index) =>
            `<div class="contact-item">
            <div class="d-flex justify-content-between align-items-center">
                <small class="text-muted">#${index + 1}</small>
                <div>
                    <strong>${contact.name}</strong> - ${PhoneUtils.displayFormattedPhone(contact.phone)}
                    ${contact.email ? `<br><small class="text-muted"><i class="bi bi-envelope me-1"></i>${contact.email}</small>` : ''}
                    ${!contact.isValid ? '<span class="badge bg-warning ms-2">Verificar</span>' : ''}
                </div>
            </div>
        </div>`
        ).join('');
    },

    // Adicionar dentro do ContactManager, após as outras funções:

    revalidateContacts() {
        UI.showLoading('Revalidando contatos com novo modo...');

        console.log('🔄 Revalidando contatos com modo:', PhoneUtils.getValidationMode().modeName);

        // Revalidar todos os contatos
        const revalidatedContacts = AppState.contacts.map(contact => {
            const phoneValidation = PhoneUtils.isValidPhone(contact.rawPhone || contact.phone);

            return {
                ...contact,
                phone: phoneValidation.valid ? phoneValidation.formatted : PhoneUtils.formatPhone(contact.rawPhone || contact.phone),
                isValid: phoneValidation.valid,
                error: phoneValidation.error || null,
                validationMode: PhoneUtils.getValidationMode().modeName
            };
        });

        // Separar válidos e inválidos
        const validContacts = revalidatedContacts.filter(c => c.isValid);
        const invalidContacts = revalidatedContacts.filter(c => !c.isValid);

        // Atualizar estado
        AppState.contacts = validContacts;

        UI.hideLoading();

        // Mostrar resultado
        this.showRevalidationSummary(revalidatedContacts.length, validContacts.length, invalidContacts.length);

        // Atualizar interface
        this.updateContactsList();
        TimeEstimator.update();
    },

    showRevalidationSummary(total, valid, invalid) {
        const validationMode = PhoneUtils.getValidationMode();

        const summaryText = `
        🔄 <strong>Revalidação Concluída:</strong><br>
        🔧 <strong>Novo Modo:</strong> ${validationMode.modeName}<br><br>
        • Total revalidados: ${total}<br>
        • Válidos no novo modo: ${valid}<br>
        • Inválidos removidos: ${invalid}
    `;

        Notiflix.Notify.success(summaryText, {
            timeout: 6000,
            width: '400px'
        });
    },

    clear() {
        UI.confirm(
            'Limpar Lista',
            'Tem certeza que deseja remover todos os contatos da lista?',
            () => {
                AppState.contacts = [];
                this.updateContactsList();
                document.getElementById('fileInfo').style.display = 'none';
                TimeEstimator.update();
                UI.showSuccess('Lista de contatos limpa');
            }
        );
    }
};

// ========================================
// 11. GERENCIAMENTO DE PREVIEW
// ========================================
const PreviewManager = {
    update() {
        const message = document.getElementById('message')?.value || '';
        const mediaFile = document.getElementById('mediaFile')?.files[0];
        const previewContent = document.getElementById('previewContent');

        if (!previewContent) return;

        const hasValidFile = mediaFile &&
            mediaFile.size > 0 &&
            mediaFile.name &&
            mediaFile.type;

        if (!message.trim() && !hasValidFile) {
            previewContent.innerHTML = `
            <div class="preview-placeholder">
                <i class="bi bi-chat-text fs-3 mb-2 d-block"></i>
                Digite uma mensagem para visualizar o preview
            </div>
        `;
            return;
        }

        let exampleName = 'João Silva';
        if (AppState.contacts.length > 0) {
            exampleName = AppState.contacts[0].name;
            this.updateContact(exampleName);
        }

        // ✅ APENAS personalizar (SEM converter para HTML ainda)
        let personalizedMessage = message
            .replace(/{nome}/g, exampleName)
            .replace(/{saudacao}/g, Utils.getSaudacao());

        // ✅ CONVERTER PARA HTML APENAS PARA O PREVIEW
        let previewHTML = '<div class="whatsapp-message text-white">';

        // Processar mídia
        if (hasValidFile) {
            console.log('📎 Adicionando mídia ao preview:', mediaFile.name, mediaFile.type);

            if (mediaFile.type.startsWith('image/')) {
                // ✅ VERIFICAR PROTOCOLO E SUPORTE
                if (window.location.protocol === 'file:' || !window.supportsBlob) {
                    console.log('📁 Usando FileReader para preview da imagem');

                    const reader = new FileReader();
                    reader.onload = function (e) {
                        const imgElement = previewContent.querySelector('.temp-image-placeholder');
                        if (imgElement) {
                            imgElement.outerHTML = `<img src="${e.target.result}" class="whatsapp-media" alt="Preview da imagem">`;
                        }
                    };
                    reader.readAsDataURL(mediaFile);

                    // Placeholder temporário
                    previewHTML += `<div class="temp-image-placeholder whatsapp-media d-flex align-items-center justify-content-center bg-light" style="height: 200px;">
                    <i class="bi bi-image fs-1 text-primary"></i>
                </div>`;
                } else {
                    try {
                        let imageUrl = window.currentMediaURL;
                        if (!imageUrl) {
                            imageUrl = URL.createObjectURL(mediaFile);
                            window.currentMediaURL = imageUrl;
                        }
                        previewHTML += `<img src="${imageUrl}" class="whatsapp-media" alt="Preview da imagem">`;
                    } catch (error) {
                        console.error('❌ Erro ao processar imagem:', error);
                        previewHTML += `<div class="whatsapp-media d-flex align-items-center justify-content-center bg-light" style="height: 200px;">
                        <i class="bi bi-image fs-1 text-primary"></i>
                    </div>`;
                    }
                }
            } else if (mediaFile.type.startsWith('video/')) {
                if (window.location.protocol === 'file:' || !window.supportsBlob) {
                    console.log('📁 Usando FileReader para preview do vídeo');

                    const reader = new FileReader();
                    reader.onload = function (e) {
                        const videoElement = previewContent.querySelector('.temp-video-placeholder');
                        if (videoElement) {
                            videoElement.outerHTML = `<video controls class="whatsapp-media" style="max-width: 100%; width: 100%; height: auto; border-radius: 10px;"><source src="${e.target.result}" type="${mediaFile.type}"></video>`;
                        }
                    };
                    reader.readAsDataURL(mediaFile);

                    // Placeholder temporário
                    previewHTML += `<div class="temp-video-placeholder whatsapp-media d-flex align-items-center justify-content-center bg-light" style="height: 200px;">
                    <i class="bi bi-play-circle fs-1 text-primary"></i>
                    </div>`;
                } else {
                    try {
                        let videoUrl = window.currentMediaURL;
                        if (!videoUrl) {
                            videoUrl = URL.createObjectURL(mediaFile);
                            window.currentMediaURL = videoUrl;
                        }
                        previewHTML += `<video controls class="whatsapp-media" style="max-width: 100%; width: 100%; height: auto; border-radius: 10px;"><source src="${videoUrl}" type="${mediaFile.type}"></video>`;
                    } catch (error) {
                        previewHTML += `<div class="whatsapp-media d-flex align-items-center justify-content-center bg-light" style="height: 200px;">
                        <i class="bi bi-play-circle fs-1 text-primary"></i>
                        </div>`;
                    }
                }
            } else if (mediaFile.type === 'application/pdf') {
                previewHTML += `<div class="whatsapp-media d-flex align-items-center justify-content-center bg-light" style="height: 200px;">
                <div class="text-center">
                    <i class="bi bi-file-pdf fs-1 text-danger"></i>
                    <div class="mt-2 small text-muted">${mediaFile.name}</div>
                </div>
            </div>`;
            } else if (mediaFile.type.startsWith('audio/')) {
                if (window.location.protocol === 'file:' || !window.supportsBlob) {
                    console.log('📁 Usando FileReader para preview do áudio');

                    const reader = new FileReader();
                    reader.onload = function (e) {
                        const audioElement = previewContent.querySelector('.temp-audio-placeholder');
                        if (audioElement) {
                            audioElement.outerHTML = `<audio controls class="whatsapp-media" style="width: 100%; border-radius: 10px;"><source src="${e.target.result}" type="${mediaFile.type}"></audio>`;
                        }
                    };
                    reader.readAsDataURL(mediaFile);

                    // Placeholder temporário
                    previewHTML += `<div class="temp-audio-placeholder whatsapp-media d-flex align-items-center justify-content-center bg-light" style="height: 60px;">
            <i class="bi bi-music-note fs-1 text-success"></i>
        </div>`;
                } else {
                    try {
                        let audioUrl = window.currentMediaURL;
                        if (!audioUrl) {
                            audioUrl = URL.createObjectURL(mediaFile);
                            window.currentMediaURL = audioUrl;
                        }
                        previewHTML += `<audio controls class="whatsapp-media" style="width: 100%; border-radius: 10px;"><source src="${audioUrl}" type="${mediaFile.type}"></audio>`;
                    } catch (error) {
                        previewHTML += `<div class="whatsapp-media d-flex align-items-center justify-content-center bg-light" style="height: 60px;">
                <i class="bi bi-music-note fs-1 text-success"></i>
            </div>`;
                    }
                }
            } else {
                previewHTML += `<div class="d-flex align-items-center mb-2">
                <i class="bi bi-file-earmark me-2"></i>
                <span>${mediaFile.name}</span>
            </div>`;
            }
        }

        // ✅ CONVERTER PARA HTML SÓ AQUI (apenas para exibição)
        if (message.trim()) {
            const htmlForPreview = personalizedMessage
                .replace(/\*([^*]+)\*/g, '<strong>$1</strong>') // Para preview
                .replace(/_([^_]+)_/g, '<em>$1</em>')           // Para preview
                .replace(/\n/g, '<br>');                        // Para preview

            previewHTML += `<div>${htmlForPreview}</div>`;
        }

        previewHTML += `
        <div class="whatsapp-time text-white">
            ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            <i class="bi bi-check2-all"></i>
        </div>
    </div>`;

        previewContent.innerHTML = previewHTML;
    },

    loadImageWithFileReader(file, tempId) {
        const tempElement = document.getElementById(tempId);
        if (!tempElement) return;

        const reader = new FileReader();
        reader.onload = function (e) {
            const img = document.createElement('img');
            img.src = e.target.result;
            img.className = 'whatsapp-media';
            img.alt = 'Preview da imagem';
            img.style.cssText = 'max-width: 100%; height: auto; border-radius: 10px;';
            tempElement.parentNode.replaceChild(img, tempElement);
        };
        reader.readAsDataURL(file);
    },

    updateContact(name) {
        const previewAvatar = document.getElementById('previewAvatar');
        const previewContactName = document.getElementById('previewContactName');

        if (previewAvatar) previewAvatar.textContent = name.charAt(0).toUpperCase();
        if (previewContactName) previewContactName.textContent = name;
    }
};

function showMediaPreview(file) {
    const preview = document.getElementById('mediaPreview');
    const content = document.getElementById('mediaPreviewContent');
    const fileName = document.getElementById('mediaFileName');
    const fileSize = document.getElementById('mediaFileSize');

    if (!preview || !content || !fileName || !fileSize) {
        console.warn('⚠️ Elementos de preview não encontrados');
        return;
    }

    // ✅ VALIDAÇÃO DE TAMANHO ANTES DE MOSTRAR PREVIEW
    const maxSize = 16 * 1024 * 1024; // 16MB
    if (file.size > maxSize) {
        UI.showError(`Arquivo muito grande: ${(file.size / 1024 / 1024).toFixed(1)}MB. Máximo permitido: 16MB`);

        // Limpar o input de arquivo
        const mediaInput = document.getElementById('mediaFile');
        if (mediaInput) {
            mediaInput.value = '';
        }

        // Esconder preview
        preview.style.display = 'none';
        return;
    }

    console.log('📎 Criando preview para:', file.name, file.type, file.size);

    // ✅ LIMPAR CONTEÚDO ANTERIOR
    content.innerHTML = '';

    // ✅ REVOGAR URL ANTERIOR APENAS SE EXISTIR
    if (window.currentMediaURL) {
        URL.revokeObjectURL(window.currentMediaURL);
        window.currentMediaURL = null;
        console.log('🗑️ URL anterior revogada');
    }

    // Mostrar informações do arquivo
    fileName.textContent = file.name;
    fileSize.textContent = `${(file.size / 1024).toFixed(1)} KB`;

    // ✅ VERIFICAR SE SUPORTA BLOB URLS
    if (!window.supportsBlob && window.location.protocol === 'file:') {
        console.log('⚠️ Blob URLs não suportadas em file://, usando FileReader');

        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = function (e) {
                const img = document.createElement('img');
                img.src = e.target.result;
                img.style.cssText = 'width: 50px; height: 50px; object-fit: cover; border-radius: 5px;';
                img.alt = 'Preview';
                content.appendChild(img);
            };
            reader.readAsDataURL(file);
        } else if (file.type.startsWith('video/')) {
            const reader = new FileReader();
            reader.onload = function (e) {
                const video = document.createElement('video');
                video.src = e.target.result;
                video.style.cssText = 'width: 50px; height: 50px; object-fit: cover; border-radius: 5px;';
                video.controls = false;
                video.muted = true;
                content.appendChild(video);
            };
            reader.readAsDataURL(file);
        } else if (file.type.startsWith('audio/')) {
            const reader = new FileReader();
            reader.onload = function (e) {
                const audio = document.createElement('audio');
                audio.src = e.target.result;
                audio.style.cssText = 'width: 50px; height: 30px;';
                audio.controls = true;
                audio.volume = 0.3;
                content.appendChild(audio);
            };
            reader.readAsDataURL(file);
        } else if (file.type === 'application/pdf') {
            content.innerHTML = '<i class="bi bi-file-pdf fs-2 text-danger"></i>';
        } else {
            content.innerHTML = '<i class="bi bi-file-earmark fs-2 text-secondary"></i>';
        }
    } else {
        // ✅ CRIAR UMA ÚNICA URL E REUTILIZAR
        const fileURL = URL.createObjectURL(file);
        window.currentMediaURL = fileURL;

        console.log('🔗 Nova URL criada:', fileURL);

        // ✅ PREVIEW BASEADO NO TIPO (SEM TIMESTAMP)
        if (file.type.startsWith('image/')) {
            const img = document.createElement('img');
            img.src = fileURL;
            img.style.cssText = 'width: 50px; height: 50px; object-fit: cover; border-radius: 5px;';
            img.alt = 'Preview';

            img.onload = () => {
                console.log('✅ Imagem carregada no preview lateral:', file.name);
            };

            img.onerror = (error) => {
                console.error('❌ Erro ao carregar imagem no preview lateral:', error);
                content.innerHTML = '<i class="bi bi-image fs-2 text-danger"></i>';
            };

            content.appendChild(img);

        } else if (file.type.startsWith('video/')) {
            content.innerHTML = '<i class="bi bi-play-circle fs-2 text-primary"></i>';

        } else if (file.type.startsWith('audio/')) {
            content.innerHTML = '<i class="bi bi-music-note fs-2 text-success"></i>';

        } else if (file.type === 'application/pdf') {
            content.innerHTML = '<i class="bi bi-file-pdf fs-2 text-danger"></i>';

        } else {
            content.innerHTML = '<i class="bi bi-file-earmark fs-2 text-secondary"></i>';
        }
    }

    preview.style.display = 'block';
    console.log('✅ Preview lateral exibido para:', file.name, file.type);
}

// FUNÇÃO PARA LIMPAR MÍDIA
function clearMedia() {
    console.log('🗑️ Removendo mídia (preservando texto)...');

    // ✅ USAR FUNÇÃO DE LIMPEZA FORÇADA
    forceCleanAllMedia();

    // ✅ ATUALIZAR PREVIEW MANTENDO O TEXTO
    setTimeout(() => {
        const message = document.getElementById('message')?.value || '';

        // ✅ SEMPRE ATUALIZAR COM PreviewManager para manter o texto
        PreviewManager.update();

        console.log('✅ Preview atualizado - texto preservado, mídia removida');

        // ✅ LOG PARA VERIFICAR ESTADO
        const mediaFile = document.getElementById('mediaFile')?.files[0];
        console.log('📊 Estado após limpeza:', {
            temTexto: !!message.trim(),
            temArquivo: !!mediaFile,
            nomeArquivo: mediaFile?.name || 'nenhum'
        });

    }, 200);

    UI.showInfo('Mídia removida - texto preservado');
}

// ========================================
// FUNÇÃO DE LIMPEZA FORÇADA DE MÍDIA (MANTENDO TEXTO)
// ========================================
function forceCleanAllMedia() {
    console.log('🧹 LIMPEZA FORÇADA DE MÍDIA (mantendo texto)');

    // ✅ 1. REVOGAR TODAS AS URLs DE BLOB ATIVAS
    if (window.currentMediaURL) {
        URL.revokeObjectURL(window.currentMediaURL);
        window.currentMediaURL = null;
        console.log('🗑️ URL principal revogada');
    }

    // ✅ 2. LIMPAR PREVIEW LATERAL COMPLETAMENTE
    const mediaPreview = document.getElementById('mediaPreview');
    const mediaContent = document.getElementById('mediaPreviewContent');
    const mediaFileName = document.getElementById('mediaFileName');
    const mediaFileSize = document.getElementById('mediaFileSize');

    if (mediaPreview) {
        mediaPreview.style.display = 'none';
        console.log('✅ Preview lateral escondido');
    }

    if (mediaContent) {
        // Revogar URLs de imagens no preview lateral
        const images = mediaContent.querySelectorAll('img[src^="blob:"]');
        images.forEach(img => {
            URL.revokeObjectURL(img.src);
            console.log('🗑️ URL de imagem lateral revogada:', img.src);
        });
        mediaContent.innerHTML = '';
        console.log('✅ Conteúdo do preview lateral limpo');
    }

    if (mediaFileName) mediaFileName.textContent = '';
    if (mediaFileSize) mediaFileSize.textContent = '';

    // ✅ 3. LIMPAR APENAS MÍDIA DO PREVIEW PRINCIPAL (MANTER TEXTO)
    const previewContent = document.getElementById('previewContent');
    if (previewContent) {
        // Revogar URLs de mídia no preview principal
        const allMedia = previewContent.querySelectorAll('img[src^="blob:"], video[src^="blob:"], source[src^="blob:"]');
        allMedia.forEach(element => {
            const src = element.src || element.getAttribute('src');
            if (src && src.startsWith('blob:')) {
                URL.revokeObjectURL(src);
                console.log('🗑️ URL do preview principal revogada:', src);
            }
        });

        // ✅ NÃO RESETAR O HTML - deixar o PreviewManager.update() cuidar disso
        console.log('✅ URLs de mídia do preview principal limpas');
    }

    // ✅ 4. RESETAR APENAS CAMPO DE ARQUIVO (NÃO O FORM TODO)
    const mediaFile = document.getElementById('mediaFile');
    if (mediaFile) {
        // ✅ NÃO RESETAR O FORM INTEIRO - apenas o campo de arquivo
        mediaFile.value = '';

        // Forçar recriação apenas do input de arquivo
        const parent = mediaFile.parentNode;
        const newInput = mediaFile.cloneNode(true);
        newInput.value = '';
        parent.replaceChild(newInput, mediaFile);

        console.log('✅ Apenas campo de arquivo resetado');

        // ✅ RECRIAR EVENT LISTENER
        setTimeout(() => {
            const resetInput = document.getElementById('mediaFile');
            if (resetInput) {
                resetInput.addEventListener('change', (e) => {
                    console.log('📎 Novo evento change após reset');
                    const file = e.target.files[0];

                    if (file && file.size > 0) {
                        // Limpar qualquer mídia anterior primeiro
                        if (window.currentMediaURL) {
                            URL.revokeObjectURL(window.currentMediaURL);
                            window.currentMediaURL = null;
                        }

                        console.log('📎 Processando novo arquivo:', file.name, file.type);
                        showMediaPreview(file);

                        setTimeout(() => {
                            PreviewManager.update();
                        }, 300);
                    } else {
                        forceCleanAllMedia();
                    }
                });
            }
        }, 100);
    }

    // ✅ 5. LIMPAR VARIÁVEIS GLOBAIS DE MÍDIA
    window.lastProcessedFile = null;
    window.currentMediaURL = null;

    console.log('🧹 LIMPEZA DE MÍDIA CONCLUÍDA (texto preservado)');
}

// ========================================
// 12. GERENCIAMENTO DE CHARTS
// ========================================
const ChartManager = {
    isInitialized: false,

    initialize() {
        // ✅ PREVENIR INICIALIZAÇÃO MÚLTIPLA
        if (this.isInitialized) {
            console.log('⚠️ ChartManager já inicializado, pulando...');
            return;
        }

        const ctx = document.getElementById('resultsChart')?.getContext('2d');
        if (!ctx) {
            console.warn('⚠️ Canvas resultsChart não encontrado');
            return;
        }

        // ✅ DESTRUIR GRÁFICO EXISTENTE SE HOUVER
        if (AppState.chart) {
            try {
                AppState.chart.destroy();
                console.log('🗑️ Gráfico anterior destruído');
            } catch (error) {
                console.warn('⚠️ Erro ao destruir gráfico anterior:', error);
            }
            AppState.chart = null;
        }

        try {
            AppState.chart = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: ['Sucesso', 'Erro'],
                    datasets: [{
                        data: [0, 0],
                        backgroundColor: ['#28a745', '#dc3545'],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                color: 'white'
                            }
                        }
                    }
                }
            });

            this.isInitialized = true;
            console.log('✅ ChartManager inicializado com sucesso');

        } catch (error) {
            console.error('❌ Erro ao inicializar ChartManager:', error);
            this.isInitialized = false;
        }
    },

    update() {
        if (AppState.chart && this.isInitialized) {
            try {
                AppState.chart.data.datasets[0].data = [AppState.results.success, AppState.results.error];
                AppState.chart.update();
            } catch (error) {
                console.warn('⚠️ Erro ao atualizar gráfico:', error);
                // Se der erro, tentar reinicializar
                this.isInitialized = false;
                this.initialize();
            }
        }
    },

    // ✅ NOVO: Método para destruir e limpar
    destroy() {
        if (AppState.chart) {
            try {
                AppState.chart.destroy();
                console.log('🗑️ Gráfico destruído no cleanup');
            } catch (error) {
                console.warn('⚠️ Erro ao destruir gráfico:', error);
            }
            AppState.chart = null;
        }
        this.isInitialized = false;
    }
};

// ========================================
// 13. GERENCIAMENTO DE ENVIO
// ========================================
const SendingManager = {
    async start() {

        // ✅ ADICIONAR ESTA LINHA NO INÍCIO DO MÉTODO
        if (typeof MultipleMessagesManager !== 'undefined' && MultipleMessagesManager.resetMessageRotation) {
            MultipleMessagesManager.resetMessageRotation();
        }

        // Verificar se estamos na tela de login
        const loginScreen = document.getElementById('loginScreen');
        const isLoginVisible = loginScreen && !loginScreen.classList.contains('hidden');

        if (isLoginVisible) {
            console.log('🔐 Tentativa de envio na tela de login ignorada');
            return;
        }

        // Verificar autenticação antes de iniciar
        if (!AuthManager.requireAuth()) {
            return;
        }

        const validation = this.validateBeforeSending();
        if (!validation.valid) {
            UI.showError(validation.error);
            return;
        }

        this.initializeSending();

        // Verificar e informar qual modo está sendo usado
        if (AppState.activeInstances.length > 0) {
            UI.showInfo(`Iniciando disparo com ${AppState.activeInstances.length} instância(s) conectada(s)...`);
        } else {
            const instanceName = document.getElementById('instanceName')?.value || 'Manual';
            UI.showInfo(`Iniciando disparo no modo manual com instância: ${instanceName}...`);
        }

        const { instanceName, instanceAPIKEY } = Validators.instanceData();
        const ia = document.getElementById('ia')?.value || '';
        const { min: minInterval, max: maxInterval } = Validators.intervals();

        UI.showInfo('Iniciando disparo em massa...');

        for (let i = 0; i < AppState.contacts.length; i++) {
            if (AppState.stopSending) break;

            const contact = AppState.contacts[i];
            TimerManager.showSending(contact.name, i, AppState.contacts.length);
            //const messageData = await this.prepareMessageData(contact);
            const messageData = await this.prepareMessageData(contact);
            console.log(`🎯 Mensagem preparada para ${contact.name}: "${messageData.messageId}"`);

            await this.waitWhilePaused();
            if (AppState.stopSending) break;

            await this.sendMessage(instanceName, instanceAPIKEY, ia, contact, messageData);
            this.updateProgress(i);

            // ✅ VERIFICAR SE DEVE PAUSAR POR LOTE
            if (BatchManager.shouldPauseBatch(i)) {
                console.log(`📦 Fim do lote - pausando...`);
                await BatchManager.startBatchPause();

                // Verificar se foi cancelado durante a pausa
                if (AppState.stopSending) break;
            }

            // ✅ TEMPORIZADOR PARA PRÓXIMO ENVIO (se não for último e não for pausa de lote)
            const isLastMessage = i >= AppState.contacts.length - 1;
            const willPauseBatch = BatchManager.shouldPauseBatch(i);

            if (!isLastMessage && !willPauseBatch && !AppState.stopSending) {
                const delay = Math.random() * (maxInterval * 1000 - minInterval * 1000) + minInterval * 1000;

                console.log(`⏱️ Iniciando temporizador para próximo envio: ${delay}ms`);

                // Mostrar temporizador
                TimerManager.startCountdown(delay, i + 1, AppState.contacts.length);

                // Aguardar o delay
                await Utils.sleep(delay);

                // Esconder temporizador
                TimerManager.hide();
            }
        }

        this.finishSending();

        BatchManager.reset();
        if (AppState.batchPauseEnabled) {
            BatchManager.updateBatchInfo();
        }
    },

    validateBeforeSending() {
        if (AppState.sendingInProgress) {
            return { valid: false, error: 'Envio já está em andamento' };
        }

        const contactsValidation = Validators.contacts();
        if (!contactsValidation.valid) {
            const validationMode = PhoneUtils.getValidationMode();
            return {
                valid: false,
                error: `Importe uma lista de contatos primeiro. Modo atual: ${validationMode.modeName}`
            };
        }

        // Verificar instâncias
        const hasActiveInstances = AppState.activeInstances.length > 0;
        const hasLegacyConfig = document.getElementById('instanceName')?.value?.trim() &&
            document.getElementById('instanceAPIKEY')?.value?.trim();

        if (!hasActiveInstances && !hasLegacyConfig) {
            return {
                valid: false,
                error: 'Configure pelo menos uma instância WhatsApp conectada ou preencha os campos de instância manual.'
            };
        }

        const intervalsValidation = Validators.intervals();
        if (!intervalsValidation.valid) {
            return { valid: false, error: 'Intervalo mínimo deve ser menor que o máximo' };
        }

        // NOVA VALIDAÇÃO DE MÍDIA
        const mediaFile = document.getElementById('mediaFile')?.files[0];
        if (mediaFile) {
            console.log('🔍 Validando arquivo de mídia:', {
                name: mediaFile.name,
                type: mediaFile.type,
                size: mediaFile.size
            });

            // Verificar tamanho do arquivo (máximo 16MB para WhatsApp)
            const maxSize = 16 * 1024 * 1024; // 16MB
            if (mediaFile.size > maxSize) {
                return {
                    valid: false,
                    error: `Arquivo muito grande: ${(mediaFile.size / 1024 / 1024).toFixed(1)}MB. Máximo: 16MB`
                };
            }

            // Verificar se é um tipo suportado
            const supportedTypes = [
                'image/', 'video/', 'audio/', 'application/pdf',
                'application/msword', 'application/vnd.openxmlformats-officedocument'
            ];

            const isSupported = supportedTypes.some(type => mediaFile.type.startsWith(type));
            if (!isSupported) {
                console.warn('⚠️ Tipo de arquivo pode não ser suportado:', mediaFile.type);
            }

            // ✅ VALIDAÇÃO ESPECÍFICA PARA ÁUDIO
            if (mediaFile.type.startsWith('audio/')) {
                console.log('🔊 Validando arquivo de áudio...');

                const audioMaxSize = 16 * 1024 * 1024; // 16MB para áudio
                if (mediaFile.size > audioMaxSize) {
                    return {
                        valid: false,
                        error: `Arquivo de áudio muito grande: ${(mediaFile.size / 1024 / 1024).toFixed(1)}MB. Máximo: 16MB`
                    };
                }
            }
        }

        const messagesValidation = Validators.messages();
        if (!messagesValidation.valid) {
            return {
                valid: false,
                error: messagesValidation.type === 'multiple'
                    ? 'Configure pelo menos uma mensagem ativa no modo múltiplas mensagens'
                    : 'Digite uma mensagem para enviar'
            };
        }

        // Verificar e-mail se habilitado
        const emailEnabled = document.getElementById('enableEmailSending')?.checked;
        if (emailEnabled) {
            const contactsWithEmail = AppState.contacts.filter(contact => contact.email && contact.email.trim());
            if (contactsWithEmail.length === 0) {
                return {
                    valid: false,
                    error: 'Envio por e-mail ativado, mas nenhum contato possui e-mail válido.'
                };
            }
        }

        return { valid: true };
    },

    initializeSending() {
        AppState.sendingInProgress = true;
        AppState.startTime = Date.now();
        AppState.stopSending = false;
        AppState.results = { success: 0, error: 0 };
        AppState.sendingDetails = [];
        AppState.isPaused = false;

        document.getElementById('progressBar').style.width = '0%';
        document.getElementById('reportButton').style.display = 'none';
        this.updateStats();
        ChartManager.update();
        this.updatePauseButton();
        document.getElementById('pauseButton').style.display = 'block';
        TimeEstimator.update();

        BatchManager.reset();
        if (AppState.batchPauseEnabled) {
            BatchManager.updateBatchInfo();
        }
    },

    async prepareMessageData(contact) {
        let messageData = '';
        let mediaData = null;
        let mediaInfo = null;
        let selectedMessageId = null; // ✅ NOVO: Armazenar ID da mensagem

        // Sempre usar modo múltiplas mensagens
        const randomMessage = MultipleMessagesManager.getRandomActiveMessage();
        selectedMessageId = randomMessage.id; // ✅ NOVO: Capturar ID
        messageData = randomMessage.text;

        console.log(`🎲 Mensagem "${selectedMessageId}" selecionada para ${contact.name}`);

        if (randomMessage.media) {
            mediaInfo = {
                filename: randomMessage.media.filename,
                mimetype: randomMessage.media.mimetype,
                size: randomMessage.media.size
            };
            mediaData = randomMessage.media.data;
            console.log(`📎 Mídia da "${selectedMessageId}" selecionada:`, {
                filename: mediaInfo.filename,
                mimetype: mediaInfo.mimetype,
                size: mediaInfo.size,
                dataLength: mediaData.length
            });
        }

        // Verificação: Se não há mensagem nem mídia
        if (!messageData.trim() && !mediaData) {
            throw new Error('Configure pelo menos uma mensagem com texto ou mídia');
        }

        return {
            messageData,
            mediaData,
            mediaInfo,
            messageId: selectedMessageId // ✅ NOVO: Retornar ID da mensagem
        };
    },


    // async sendMessage(instanceName, instanceAPIKEY, ia, contact, messageDataObj) {
    //     const { messageData, mediaData, mediaInfo } = messageDataObj;
    //     let selectedInstance;
    //     let currentMedia = null;

    //     // Selecionar instância
    //     if (AppState.activeInstances.length > 0) {
    //         selectedInstance = InstanceManager.getRandomActiveInstance();
    //         if (!selectedInstance) {
    //             throw new Error('Nenhuma instância conectada disponível');
    //         }
    //         instanceName = selectedInstance.name;
    //         instanceAPIKEY = selectedInstance.apikey;
    //     } else {
    //         selectedInstance = {
    //             id: 'legacy',
    //             name: instanceName || 'Instância Manual',
    //             apikey: instanceAPIKEY || ''
    //         };
    //     }

    //     // Garantir que messageData existe e não é undefined
    //     const currentMessage = messageData || '';

    //     // Se não há mensagem nem mídia, é erro
    //     if (!currentMessage.trim() && !mediaData) {
    //         throw new Error('Nenhuma mensagem ou mídia para enviar');
    //     }

    //     // Preparar mídia se existir
    //     if (mediaData && mediaInfo) {
    //         console.log('📎 Processando mídia para envio:', {
    //             filename: mediaInfo.filename,
    //             mimetype: mediaInfo.mimetype,
    //             size: mediaInfo.size,
    //             dataLength: mediaData.length
    //         });

    //         // ✅ USAR INFORMAÇÕES CORRETAS DA MÍDIA
    //         currentMedia = {
    //             filename: mediaInfo.filename,
    //             data: mediaData,
    //             mimetype: mediaInfo.mimetype
    //         };
    //     }

    //     // ✅ PREPARAR MENSAGEM COM LIMPEZA FORÇADA
    //     let personalizedMessage = currentMessage.trim() ?
    //         currentMessage
    //             .replace(/{nome}/g, contact.name)
    //             .replace(/{saudacao}/g, Utils.getSaudacao())
    //         : '';

    //     // ✅ APLICAR LIMPEZA DE SEGURANÇA
    //     personalizedMessage = cleanMessageForWhatsApp(personalizedMessage);

    //     console.log('📤 Mensagem final para WhatsApp:', personalizedMessage);

    //     const payload = {
    //         instanceName,
    //         instanceAPIKEY,
    //         ia,
    //         contact: {
    //             name: contact.name,
    //             phone: contact.phone,
    //             email: contact.email || null
    //         },
    //         message: personalizedMessage, // ✅ Esta deve ter *texto* e _texto_
    //         media: currentMedia,
    //         sendEmail: !!contact.email && document.getElementById('enableEmailSending')?.checked
    //     };

    //     console.log('📤 Payload final sendo enviado:', {
    //         instanceName: payload.instanceName,
    //         contactName: payload.contact.name,
    //         hasMessage: !!payload.message,
    //         hasMedia: !!payload.media,
    //         mediaInfo: payload.media ? {
    //             filename: payload.media.filename,
    //             mimetype: payload.media.mimetype,
    //             dataLength: payload.media.data?.length
    //         } : null
    //     });

    //     const sendTime = new Date();

    //     // Verificar se não é a última mensagem e não está em pausa de lote
    //     const currentIndex = AppState.contacts.indexOf(contact);
    //     const isLastMessage = currentIndex >= AppState.contacts.length - 1;
    //     const willPauseBatch = BatchManager.shouldPauseBatch(currentIndex);

    //     if (!isLastMessage && !willPauseBatch && !AppState.stopSending) {
    //         // Calcular próximo intervalo
    //         const { min: minInterval, max: maxInterval } = Validators.intervals();
    //         const delay = Math.random() * (maxInterval * 1000 - minInterval * 1000) + minInterval * 1000;

    //         // Iniciar temporizador visual
    //         TimerManager.startSendTimer(delay);

    //         // Aguardar o delay
    //         await Utils.sleep(delay);

    //         // Esconder temporizador
    //         TimerManager.hide();
    //     }

    //     try {
    //         const response = await fetch(APP_CONFIG.webhookUrl, {
    //             method: 'POST',
    //             headers: { 'Content-Type': 'application/json' },
    //             body: JSON.stringify(payload)
    //         });

    //         console.log('📡 Resposta do servidor:', {
    //             status: response.status,
    //             statusText: response.statusText,
    //             ok: response.ok
    //         });

    //         const responseText = await response.text();
    //         console.log('📄 Resposta completa:', responseText);

    //         let responseData;
    //         try {
    //             responseData = JSON.parse(responseText);
    //         } catch (parseError) {
    //             console.error('❌ Erro ao parsear resposta:', parseError);
    //             console.log('📄 Resposta bruta:', responseText);
    //         }

    //         if (response.ok) {
    //             AppState.results.success++;

    //             if (selectedInstance.id !== 'legacy') {
    //                 InstanceManager.updateInstanceStats(selectedInstance.id, true);
    //             }

    //             AppState.sendingDetails.push({
    //                 datetime: sendTime,
    //                 phone: contact.phone,
    //                 name: contact.name,
    //                 email: contact.email || '',
    //                 message: personalizedMessage,
    //                 instance: selectedInstance.name,
    //                 instanceId: selectedInstance.id,
    //                 status: 'Sucesso',
    //                 mediaType: currentMedia?.mimetype || null,
    //                 sentEmail: !!contact.email && payload.sendEmail
    //             });

    //             const instanceInfo = AppState.activeInstances.length > 0 ? ` via ${selectedInstance.name}` : '';
    //             const emailInfo = contact.email && payload.sendEmail ? ' + E-mail' : '';
    //             const mediaInfo = currentMedia ? ` + ${currentMedia.mimetype.split('/')[0]}` : '';

    //             UI.showSuccess(`Enviado para ${contact.name}${instanceInfo}${emailInfo}${mediaInfo}`);
    //         } else {
    //             throw new Error(`HTTP ${response.status}: ${responseText}`);
    //         }
    //     } catch (error) {
    //         AppState.results.error++;

    //         if (selectedInstance.id !== 'legacy') {
    //             InstanceManager.updateInstanceStats(selectedInstance.id, false);
    //         }

    //         AppState.sendingDetails.push({
    //             datetime: sendTime,
    //             phone: contact.phone,
    //             name: contact.name,
    //             email: contact.email || '',
    //             message: personalizedMessage,
    //             instance: selectedInstance.name,
    //             instanceId: selectedInstance.id,
    //             status: 'Erro',
    //             error: error.message,
    //             mediaType: currentMedia?.mimetype || null,
    //             sentEmail: false
    //         });

    //         console.error('❌ Erro detalhado no envio:', {
    //             contact: contact.name,
    //             error: error.message,
    //             hasMedia: !!currentMedia,
    //             mediaType: currentMedia?.mimetype,
    //             stack: error.stack
    //         });

    //         //UI.showError(`Erro ao enviar para ${contact.name} via ${selectedInstance.name}: ${error.message}`);
    //         UI.showError(`Erro ao enviar para ${contact.name} via ${selectedInstance.name}`);

    //         // ✅ DEBUG FINAL ANTES DO ENVIO
    //         console.log('=== DEBUG FINAL ANTES ENVIO ===');
    //         console.log('Payload.message:', payload.message);
    //         console.log('JSON que será enviado:', JSON.stringify(payload.message));
    //         console.log('Tem <strong>?', payload.message.includes('<strong>'));
    //         console.log('Tem <em>?', payload.message.includes('<em>'));
    //         console.log('Tem <i>?', payload.message.includes('<i>'));
    //         console.log('================================');
    //     }
    // },

    // async sendMessage(instanceName, instanceAPIKEY, ia, contact, messageDataObj) {
    //     const { messageData, mediaData, mediaInfo } = messageDataObj;
    //     let selectedInstance;
    //     let currentMedia = null;

    //     // Selecionar instância
    //     if (AppState.activeInstances.length > 0) {
    //         selectedInstance = InstanceManager.getRandomActiveInstance();
    //         if (!selectedInstance) {
    //             throw new Error('Nenhuma instância conectada disponível');
    //         }
    //         instanceName = selectedInstance.name;
    //         instanceAPIKEY = selectedInstance.apikey;
    //     } else {
    //         selectedInstance = {
    //             id: 'legacy',
    //             name: instanceName || 'Instância Manual',
    //             apikey: instanceAPIKEY || ''
    //         };
    //     }

    //     // ✅ IDENTIFICAR QUAL MENSAGEM ESTÁ SENDO USADA
    //     const activeMessages = Object.entries(AppState.messagesConfig)
    //         .filter(([id, config]) => config.enabled && (config.text.trim() || config.media));

    //     const currentMessageId = activeMessages.find(([id, config]) =>
    //         config.text === messageData || (config.media && mediaData)
    //     )?.[0] || 'msg1';

    //     console.log(`📤 Enviando mensagem "${currentMessageId}" para ${contact.name}`);

    //     // Garantir que messageData existe e não é undefined
    //     const currentMessage = messageData || '';

    //     // Se não há mensagem nem mídia, é erro
    //     if (!currentMessage.trim() && !mediaData) {
    //         throw new Error('Nenhuma mensagem ou mídia para enviar');
    //     }

    //     // Preparar mídia se existir
    //     if (mediaData && mediaInfo) {
    //         console.log(`📎 Processando mídia (${currentMessageId}):`, {
    //             filename: mediaInfo.filename,
    //             mimetype: mediaInfo.mimetype,
    //             size: mediaInfo.size,
    //             dataLength: mediaData.length
    //         });

    //         // ✅ VALIDAÇÃO ADICIONAL ANTES DO ENVIO
    //         if (mediaInfo.mimetype.startsWith('video/') && mediaInfo.size > 10 * 1024 * 1024) {
    //             throw new Error(`Vídeo muito grande para envio: ${(mediaInfo.size / 1024 / 1024).toFixed(1)}MB`);
    //         }

    //         currentMedia = {
    //             filename: mediaInfo.filename,
    //             data: mediaData,
    //             mimetype: mediaInfo.mimetype
    //         };
    //     }

    //     // ✅ PREPARAR MENSAGEM COM LIMPEZA FORÇADA
    //     let personalizedMessage = currentMessage.trim() ?
    //         currentMessage
    //             .replace(/{nome}/g, contact.name)
    //             .replace(/{saudacao}/g, Utils.getSaudacao())
    //         : '';

    //     // ✅ APLICAR LIMPEZA DE SEGURANÇA
    //     personalizedMessage = cleanMessageForWhatsApp(personalizedMessage);

    //     console.log(`📤 Enviando "${currentMessageId}" para ${contact.name}:`, {
    //         temTexto: !!personalizedMessage,
    //         temMidia: !!currentMedia,
    //         tipoMidia: currentMedia?.mimetype || 'nenhuma'
    //     });

    //     const payload = {
    //         instanceName,
    //         instanceAPIKEY,
    //         ia,
    //         contact: {
    //             name: contact.name,
    //             phone: contact.phone,
    //             email: contact.email || null
    //         },
    //         message: personalizedMessage,
    //         media: currentMedia,
    //         sendEmail: !!contact.email && document.getElementById('enableEmailSending')?.checked,
    //         messageId: currentMessageId // ✅ NOVO: Identificador da mensagem
    //     };

    //     console.log(`📤 Payload "${currentMessageId}" sendo enviado:`, {
    //         instanceName: payload.instanceName,
    //         contactName: payload.contact.name,
    //         messageId: payload.messageId,
    //         hasMessage: !!payload.message,
    //         hasMedia: !!payload.media,
    //         mediaInfo: payload.media ? {
    //             filename: payload.media.filename,
    //             mimetype: payload.media.mimetype,
    //             dataLength: payload.media.data?.length
    //         } : null
    //     });

    //     const sendTime = new Date();

    //     try {
    //         const response = await fetch(APP_CONFIG.webhookUrl, {
    //             method: 'POST',
    //             headers: { 'Content-Type': 'application/json' },
    //             body: JSON.stringify(payload)
    //         });

    //         console.log(`📡 Resposta para "${currentMessageId}":`, {
    //             status: response.status,
    //             statusText: response.statusText,
    //             ok: response.ok
    //         });

    //         const responseText = await response.text();
    //         console.log(`📄 Resposta completa "${currentMessageId}":`, responseText);

    //         let responseData;
    //         try {
    //             responseData = JSON.parse(responseText);
    //         } catch (parseError) {
    //             console.error(`❌ Erro ao parsear resposta "${currentMessageId}":`, parseError);
    //             console.log('📄 Resposta bruta:', responseText);
    //         }

    //         if (response.ok) {
    //             AppState.results.success++;

    //             if (selectedInstance.id !== 'legacy') {
    //                 InstanceManager.updateInstanceStats(selectedInstance.id, true);
    //             }

    //             AppState.sendingDetails.push({
    //                 datetime: sendTime,
    //                 phone: contact.phone,
    //                 name: contact.name,
    //                 email: contact.email || '',
    //                 message: personalizedMessage,
    //                 instance: selectedInstance.name,
    //                 instanceId: selectedInstance.id,
    //                 messageId: currentMessageId, // ✅ NOVO: Salvar ID da mensagem
    //                 status: 'Sucesso',
    //                 mediaType: currentMedia?.mimetype || null,
    //                 sentEmail: !!contact.email && payload.sendEmail
    //             });

    //             const instanceInfo = AppState.activeInstances.length > 0 ? ` via ${selectedInstance.name}` : '';
    //             const emailInfo = contact.email && payload.sendEmail ? ' + E-mail' : '';
    //             const mediaInfo = currentMedia ? ` + ${currentMedia.mimetype.split('/')[0]}` : '';
    //             const messageInfo = ` (${currentMessageId})`; // ✅ NOVO: Mostrar qual mensagem

    //             UI.showSuccess(`Enviado para ${contact.name}${instanceInfo}${emailInfo}${mediaInfo}${messageInfo}`);
    //         } else {
    //             throw new Error(`HTTP ${response.status}: ${responseText}`);
    //         }
    //     } catch (error) {
    //         AppState.results.error++;

    //         if (selectedInstance.id !== 'legacy') {
    //             InstanceManager.updateInstanceStats(selectedInstance.id, false);
    //         }

    //         AppState.sendingDetails.push({
    //             datetime: sendTime,
    //             phone: contact.phone,
    //             name: contact.name,
    //             email: contact.email || '',
    //             message: personalizedMessage,
    //             instance: selectedInstance.name,
    //             instanceId: selectedInstance.id,
    //             messageId: currentMessageId, // ✅ NOVO: Salvar ID da mensagem mesmo em erro
    //             status: 'Erro',
    //             error: error.message,
    //             mediaType: currentMedia?.mimetype || null,
    //             sentEmail: false
    //         });

    //         console.error(`❌ Erro detalhado no envio "${currentMessageId}":`, {
    //             contact: contact.name,
    //             messageId: currentMessageId,
    //             error: error.message,
    //             hasMedia: !!currentMedia,
    //             mediaType: currentMedia?.mimetype,
    //             stack: error.stack
    //         });

    //         UI.showError(`Erro ao enviar "${currentMessageId}" para ${contact.name} via ${selectedInstance.name}: ${error.message}`);
    //     }
    // },


    async sendMessage(instanceName, instanceAPIKEY, ia, contact, messageDataObj) {
        const { messageData, mediaData, mediaInfo, messageId } = messageDataObj; // ✅ NOVO: Extrair messageId
        let selectedInstance;
        let currentMedia = null;

        // Selecionar instância
        if (AppState.activeInstances.length > 0) {
            selectedInstance = InstanceManager.getRandomActiveInstance();
            if (!selectedInstance) {
                throw new Error('Nenhuma instância conectada disponível');
            }
            instanceName = selectedInstance.name;
            instanceAPIKEY = selectedInstance.apikey;
        } else {
            selectedInstance = {
                id: 'legacy',
                name: instanceName || 'Instância Manual',
                apikey: instanceAPIKEY || ''
            };
        }

        // ✅ USAR O messageId QUE VEM DO prepareMessageData
        const currentMessageId = messageId || 'msg1';

        console.log(`📤 Enviando mensagem "${currentMessageId}" para ${contact.name}`);

        // Garantir que messageData existe e não é undefined
        const currentMessage = messageData || '';

        // Se não há mensagem nem mídia, é erro
        if (!currentMessage.trim() && !mediaData) {
            throw new Error('Nenhuma mensagem ou mídia para enviar');
        }

        // Preparar mídia se existir
        if (mediaData && mediaInfo) {
            console.log(`📎 Processando mídia (${currentMessageId}):`, {
                filename: mediaInfo.filename,
                mimetype: mediaInfo.mimetype,
                size: mediaInfo.size,
                dataLength: mediaData.length
            });

            // ✅ VALIDAÇÃO ADICIONAL ANTES DO ENVIO
            if (mediaInfo.mimetype.startsWith('video/') && mediaInfo.size > 10 * 1024 * 1024) {
                throw new Error(`Vídeo muito grande para envio: ${(mediaInfo.size / 1024 / 1024).toFixed(1)}MB`);
            }

            currentMedia = {
                filename: mediaInfo.filename,
                data: mediaData,
                mimetype: mediaInfo.mimetype
            };
        }

        // ✅ PREPARAR MENSAGEM COM LIMPEZA FORÇADA
        let personalizedMessage = currentMessage.trim() ?
            currentMessage
                .replace(/{nome}/g, contact.name)
                .replace(/{saudacao}/g, Utils.getSaudacao())
            : '';

        // ✅ APLICAR LIMPEZA DE SEGURANÇA
        personalizedMessage = cleanMessageForWhatsApp(personalizedMessage);

        console.log(`📤 Enviando "${currentMessageId}" para ${contact.name}:`, {
            temTexto: !!personalizedMessage,
            temMidia: !!currentMedia,
            tipoMidia: currentMedia?.mimetype || 'nenhuma'
        });

        const payload = {
            instanceName,
            instanceAPIKEY,
            ia,
            contact: {
                name: contact.name,
                phone: contact.phone,
                email: contact.email || null
            },
            message: personalizedMessage,
            media: currentMedia,
            sendEmail: !!contact.email && document.getElementById('enableEmailSending')?.checked,
            messageId: currentMessageId // ✅ USAR O ID CORRETO
        };

        console.log(`📤 Payload "${currentMessageId}" sendo enviado:`, {
            instanceName: payload.instanceName,
            contactName: payload.contact.name,
            messageId: payload.messageId,
            hasMessage: !!payload.message,
            hasMedia: !!payload.media,
            mediaInfo: payload.media ? {
                filename: payload.media.filename,
                mimetype: payload.media.mimetype,
                dataLength: payload.media.data?.length
            } : null
        });

        const sendTime = new Date();

        try {
            const response = await fetch(APP_CONFIG.webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            console.log(`📡 Resposta para "${currentMessageId}":`, {
                status: response.status,
                statusText: response.statusText,
                ok: response.ok
            });

            const responseText = await response.text();
            console.log(`📄 Resposta completa "${currentMessageId}":`, responseText);

            let responseData;
            try {
                responseData = JSON.parse(responseText);
            } catch (parseError) {
                console.error(`❌ Erro ao parsear resposta "${currentMessageId}":`, parseError);
                console.log('📄 Resposta bruta:', responseText);
            }

            if (response.ok) {
                AppState.results.success++;

                if (selectedInstance.id !== 'legacy') {
                    InstanceManager.updateInstanceStats(selectedInstance.id, true);
                }

                AppState.sendingDetails.push({
                    datetime: sendTime,
                    phone: contact.phone,
                    name: contact.name,
                    email: contact.email || '',
                    message: personalizedMessage,
                    instance: selectedInstance.name,
                    instanceId: selectedInstance.id,
                    messageId: currentMessageId, // ✅ USAR O ID CORRETO
                    status: 'Sucesso',
                    mediaType: currentMedia?.mimetype || null,
                    sentEmail: !!contact.email && payload.sendEmail
                });

                const instanceInfo = AppState.activeInstances.length > 0 ? ` via ${selectedInstance.name}` : '';
                const emailInfo = contact.email && payload.sendEmail ? ' + E-mail' : '';
                const mediaInfo = currentMedia ? ` + ${currentMedia.mimetype.split('/')[0]}` : '';
                const messageInfo = ` (${currentMessageId})`; // ✅ MOSTRAR ID CORRETO

                UI.showSuccess(`Enviado para ${contact.name}${instanceInfo}${emailInfo}${mediaInfo}${messageInfo}`);
            } else {
                throw new Error(`HTTP ${response.status}: ${responseText}`);
            }
        } catch (error) {
            AppState.results.error++;

            if (selectedInstance.id !== 'legacy') {
                InstanceManager.updateInstanceStats(selectedInstance.id, false);
            }

            AppState.sendingDetails.push({
                datetime: sendTime,
                phone: contact.phone,
                name: contact.name,
                email: contact.email || '',
                message: personalizedMessage,
                instance: selectedInstance.name,
                instanceId: selectedInstance.id,
                messageId: currentMessageId, // ✅ USAR O ID CORRETO
                status: 'Erro',
                error: error.message,
                mediaType: currentMedia?.mimetype || null,
                sentEmail: false
            });

            console.error(`❌ Erro detalhado no envio "${currentMessageId}":`, {
                contact: contact.name,
                messageId: currentMessageId,
                error: error.message,
                hasMedia: !!currentMedia,
                mediaType: currentMedia?.mimetype,
                stack: error.stack
            });

            UI.showError(`Erro ao enviar "${currentMessageId}" para ${contact.name} via ${selectedInstance.name}: ${error.message}`);
        }
    },

    updateProgress(currentIndex) {
        const progress = ((currentIndex + 1) / AppState.contacts.length) * 100;
        document.getElementById('progressBar').style.width = `${progress}%`;
        document.getElementById('progressText').textContent = `${currentIndex + 1}/${AppState.contacts.length}`;
        this.updateStats();
        ChartManager.update();
        TimeEstimator.update();
    },

    updateStats() {
        const totalSentElement = document.getElementById('totalSent');
        const successCountElement = document.getElementById('successCount');
        const errorCountElement = document.getElementById('errorCount');

        if (totalSentElement) totalSentElement.textContent = AppState.results.success + AppState.results.error;
        if (successCountElement) successCountElement.textContent = AppState.results.success;
        if (errorCountElement) errorCountElement.textContent = AppState.results.error;
    },

    async waitWhilePaused() {
        while (AppState.isPaused && !AppState.stopSending) {
            await Utils.sleep(500);
        }
    },

    stop() {
        AppState.stopSending = true;
        AppState.isPaused = false;
        TimerManager.showStopped();
        UI.showWarning('Parando envio...');
    },

    pause() {
        AppState.isPaused = true;
        TimerManager.pause();
        this.updatePauseButton();
        UI.showWarning('Envio pausado');
    },

    resume() {
        AppState.isPaused = false;
        TimerManager.resume(); // Retomar temporizador
        this.updatePauseButton();
        UI.showInfo('Envio retomado');
    },

    updatePauseButton() {
        const pauseButton = document.getElementById('pauseButton');
        if (!pauseButton) return;

        if (AppState.isPaused) {
            pauseButton.className = 'btn btn-success';
            pauseButton.innerHTML = '<i class="bi bi-play-circle me-2"></i>Retomar Envio';
        } else {
            pauseButton.className = 'btn btn-warning';
            pauseButton.innerHTML = '<i class="bi bi-pause-circle me-2"></i>Pausar Envio';
        }
    },

    finishSending() {
        AppState.isPaused = false;
        document.getElementById('pauseButton').style.display = 'none';

        // ✅ CALCULAR DURAÇÃO REAL BASEADA NO startTime
        const totalDuration = AppState.startTime ? Date.now() - AppState.startTime : 0;

        console.log('⏱️ Disparo finalizado:', {
            startTime: AppState.startTime ? new Date(AppState.startTime).toLocaleTimeString() : 'N/A',
            endTime: new Date().toLocaleTimeString(),
            duracaoReal: Utils.formatTime(totalDuration),
            totalEnvios: AppState.sendingDetails.length
        });

        TimerManager.showCompleted(AppState.results.success, AppState.results.error, totalDuration);
        AppState.sendingInProgress = false;

        const sessionData = {
            instanceName: document.getElementById('instanceName')?.value || '',
            totalContacts: AppState.contacts.length,
            successCount: AppState.results.success,
            errorCount: AppState.results.error,
            duration: totalDuration, // ✅ Duração real do processo
            details: AppState.sendingDetails
        };

        HistoryManager.saveToHistory(sessionData);

        if (AppState.sendingDetails.length > 0) {
            document.getElementById('reportButton').style.display = 'block';
        }

        // RESETAR startTime APÓS usar
        AppState.startTime = null;

        if (AppState.stopSending) {
            UI.showWarning('Envio interrompido pelo usuário');
        } else {
            UI.showSuccess('Disparo concluído!');
        }
    }
};

// ========================================
// 14. GERENCIAMENTO DE HISTÓRICO
// ========================================
const HistoryManager = {
    saveToHistory(sessionData) {
        const safeDetails = Array.isArray(sessionData.details) ? sessionData.details : [];

        // Coletar informações de instâncias usadas
        const instancesUsed = [...new Set(safeDetails.map(detail => detail.instance || 'Desconhecido'))];
        const instanceName = instancesUsed.length > 1 ?
            `Múltiplas (${instancesUsed.length})` :
            (instancesUsed[0] || sessionData.instanceName || 'Desconhecido');

        // ✅ CORREÇÃO: Usar duração recebida ou calcular melhor
        let calculatedDuration = sessionData.duration || 0; // Priorizar duração recebida

        // Se não tiver duração e houver detalhes, calcular
        if (calculatedDuration === 0 && safeDetails.length > 1) {
            const startTime = safeDetails[0]?.datetime || new Date();
            const endTime = safeDetails[safeDetails.length - 1]?.datetime || new Date();
            calculatedDuration = new Date(endTime) - new Date(startTime);

            // ✅ ADICIONAR um buffer mínimo (tempo de processamento)
            calculatedDuration += safeDetails.length * 500; // 500ms por mensagem de buffer
        }

        // ✅ Se ainda for muito pequeno, usar estimativa baseada na quantidade
        if (calculatedDuration < 1000 && safeDetails.length > 0) {
            calculatedDuration = safeDetails.length * 2000; // 2s por mensagem
        }

        console.log('💾 Salvando no histórico:', {
            duracaoRecebida: sessionData.duration ? Utils.formatTime(sessionData.duration) : 'N/A',
            duracaoCalculada: Utils.formatTime(calculatedDuration),
            totalContatos: sessionData.totalContacts
        });

        const historyEntry = {
            id: Date.now(),
            datetime: new Date(),
            instanceName: instanceName,
            instancesUsed: instancesUsed,
            totalContacts: sessionData.totalContacts || 0,
            successCount: sessionData.successCount || 0,
            errorCount: sessionData.errorCount || 0,
            successRate: sessionData.totalContacts > 0 ? ((sessionData.successCount / sessionData.totalContacts) * 100).toFixed(1) : 0,
            duration: calculatedDuration, // ✅ Usar duração corrigida
            details: safeDetails.map(detail => ({
                ...detail,
                datetime: detail.datetime instanceof Date ? detail.datetime : new Date(detail.datetime || Date.now()),
                instance: detail.instance || 'Desconhecido',
                instanceId: detail.instanceId || null
            }))
        };

        AppState.sendingHistory.unshift(historyEntry);

        if (AppState.sendingHistory.length > APP_CONFIG.maxHistoryEntries) {
            AppState.sendingHistory = AppState.sendingHistory.slice(0, APP_CONFIG.maxHistoryEntries);
        }

        this.updateTable();
    },

    updateTable() {
        const tbody = document.getElementById('historyTableBody');
        const exportBtn = document.getElementById('exportHistoryBtn');

        if (!tbody) return;

        if (AppState.sendingHistory.length === 0) {
            tbody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center text-muted py-4">
                    <i class="bi bi-inbox fs-3 d-block mb-2"></i>
                    Nenhum envio realizado ainda
                </td>
            </tr>
        `;
            if (exportBtn) exportBtn.style.display = 'none';
            return;
        }

        if (exportBtn) exportBtn.style.display = 'inline-block';

        tbody.innerHTML = AppState.sendingHistory.map(entry => `
        <tr>
            <td>${Utils.safeFormatDate(entry.datetime)}</td>
            <td><span class="badge bg-info">${entry.instanceName || 'N/A'}</span></td>
            <td>${entry.totalContacts || 0}</td>
            <td><span class="text-success fw-bold">${entry.successCount || 0}</span></td>
            <td><span class="text-danger fw-bold">${entry.errorCount || 0}</span></td>
            <td>
                <span class="badge ${(entry.successRate || 0) >= 80 ? 'bg-success' : (entry.successRate || 0) >= 50 ? 'bg-warning' : 'bg-danger'}">
                    ${entry.successRate || 0}%
                </span>
            </td>
            <td>
                <div class="btn-group" role="group">
                    <button class="btn btn-outline-primary btn-sm view-details-btn" data-entry-id="${entry.id}" title="Ver detalhes">
                        <i class="bi bi-eye"></i>
                    </button>
                    <button class="btn btn-outline-success btn-sm generate-report-btn" data-entry-id="${entry.id}" title="Relatório Completo">
                        <i class="bi bi-file-earmark-pdf"></i>
                    </button>
                    <button class="btn btn-outline-danger btn-sm delete-entry-btn" data-entry-id="${entry.id}" title="Excluir">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
    },

    viewDetails(entryId) {
        const entry = AppState.sendingHistory.find(h => h.id === entryId);
        if (!entry) return;

        const modalContent = `
        <div class="modal fade" id="historyModal" tabindex="-1">
            <div class="modal-dialog modal-xl">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Detalhes do Envio - ${Utils.safeFormatDate(entry.datetime)}</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="row mb-3">
                            <div class="col-md-6">
                                <strong>Instância:</strong> ${entry.instanceName || 'N/A'}<br>
                                <strong>Total de Contatos:</strong> ${entry.totalContacts || 0}<br>
                                <strong>Taxa de Sucesso:</strong> <span class="badge ${entry.successRate >= 80 ? 'bg-success' : entry.successRate >= 50 ? 'bg-warning' : 'bg-danger'}">${entry.successRate || 0}%</span>
                            </div>
                            <div class="col-md-6">
                                <strong>Sucessos:</strong> <span class="text-success">${entry.successCount || 0}</span><br>
                                <strong>Erros:</strong> <span class="text-danger">${entry.errorCount || 0}</span><br>
                            </div>
                        </div>
                        ${entry.details && entry.details.length > 0 ? `
                            <h6>Detalhes dos Envios:</h6>
                            <div class="table-responsive" style="max-height: 400px; overflow-y: auto;">
                                <table class="table table-sm table-striped">
                                    <thead class="table-dark sticky-top">
                                        <tr>
                                            <th>Hora</th>
                                            <th>Nome</th>
                                            <th>Telefone</th>
                                            <th>Instância</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${entry.details.map(detail => `
                                            <tr>
                                                <td>${Utils.safeFormatTime(detail.datetime)}</td>
                                                <td>${detail.name || 'N/A'}</td>
                                                <td>${detail.phone || 'N/A'}</td>
                                                <td>
                                                    <span class="badge bg-info">${detail.instance || 'N/A'}</span>
                                                </td>
                                                <td>
                                                    <span class="badge ${detail.status === 'Sucesso' ? 'bg-success' : 'bg-danger'}">
                                                        ${detail.status || 'N/A'}
                                                    </span>
                                                </td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                        ` : '<p class="text-muted">Detalhes não disponíveis para este envio.</p>'}
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Fechar</button>
                    </div>
                </div>
            </div>
        </div>
    `;

        const existingModal = document.getElementById('historyModal');
        if (existingModal) existingModal.remove();

        document.body.insertAdjacentHTML('beforeend', modalContent);
        const modal = new bootstrap.Modal(document.getElementById('historyModal'));
        modal.show();
    },

    deleteEntry(entryId) {
        AppState.sendingHistory = AppState.sendingHistory.filter(h => h.id !== entryId);
        this.updateTable();
        UI.showSuccess('Entrada do histórico removida');
    },

    generateReport(entryId) {
        const entry = AppState.sendingHistory.find(h => h.id === entryId);
        if (!entry) {
            UI.showError('Entrada do histórico não encontrada');
            return;
        }

        if (!entry.details || entry.details.length === 0) {
            UI.showWarning('Não há detalhes suficientes para gerar o relatório');
            return;
        }

        // Usar o mesmo formato do ReportManager
        const instancesUsed = [...new Set(entry.details.map(detail => detail.instance || 'Desconhecido'))];
        const instanceStats = {};

        // Calcular estatísticas por instância
        entry.details.forEach(detail => {
            const instanceName = detail.instance || 'Desconhecido';
            if (!instanceStats[instanceName]) {
                instanceStats[instanceName] = { total: 0, success: 0, error: 0 };
            }
            instanceStats[instanceName].total++;
            if (detail.status === 'Sucesso') {
                instanceStats[instanceName].success++;
            } else {
                instanceStats[instanceName].error++;
            }
        });

        // Usar duração salva ou calcular se não existir
        let reportDuration = entry.duration || 0;
        if (!reportDuration && entry.details.length > 1) {
            const startTime = entry.details[0]?.datetime || new Date();
            const endTime = entry.details[entry.details.length - 1]?.datetime || new Date();
            reportDuration = new Date(endTime) - new Date(startTime);
        }

        const reportData = {
            datetime: entry.datetime,
            instanceName: instancesUsed.length > 1 ? 'Múltiplas Instâncias' : (instancesUsed[0] || 'Desconhecido'),
            instancesUsed: instancesUsed,
            instanceStats: instanceStats,
            totalContacts: entry.totalContacts || 0,
            successCount: entry.successCount || 0,
            errorCount: entry.errorCount || 0,
            duration: reportDuration,
            details: entry.details.map(detail => ({
                datetime: detail.datetime ? detail.datetime.toISOString() : new Date().toISOString(),
                name: detail.name || 'Sem nome',
                phone: detail.phone || 'Sem telefone',
                email: detail.email || '',
                status: detail.status || 'Desconhecido',
                message: detail.message || 'Sem mensagem',
                instance: detail.instance || 'Desconhecido',
                instanceId: detail.instanceId || null
            }))
        };

        // Usar a mesma lógica do ReportManager
        const encodedData = encodeURIComponent(JSON.stringify(reportData));
        const reportUrl = `relatorio.html?data=${encodedData}`;

        if (reportUrl.length > 2000) {
            sessionStorage.setItem('current_report_data', JSON.stringify(reportData));
            window.open('relatorio.html', '_blank');
        } else {
            window.open(reportUrl, '_blank');
        }

        UI.showSuccess('Relatório do histórico aberto em nova aba!');
    },


    clear() {
        UI.confirm(
            'Limpar Histórico',
            'Tem certeza que deseja limpar todo o histórico de envios?',
            () => {
                AppState.sendingHistory = [];
                this.updateTable();
                UI.showSuccess('Histórico limpo com sucesso');
            }
        );
    }
};

// ========================================
// 15. GERENCIAMENTO DE AGENDAMENTO
// ========================================
const ScheduleManager = {
    initialize() {
        const today = new Date();
        const localDate = new Date(today.getTime() - (today.getTimezoneOffset() * 60000));
        const minDate = localDate.toISOString().split('T')[0];

        const scheduleDateInput = document.getElementById('scheduleDate');
        const scheduleTimeInput = document.getElementById('scheduleTime');

        if (scheduleDateInput) {
            scheduleDateInput.min = minDate;
            scheduleDateInput.value = minDate;
        }

        if (scheduleTimeInput) {
            const nextHour = new Date(today.getTime() + 60 * 60 * 1000);
            const timeString = nextHour.toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            });
            scheduleTimeInput.value = timeString;
        }

        this.loadScheduledDispatches();
        AppIntervals.scheduledCheck = setInterval(() => this.checkScheduledDispatches(), APP_CONFIG.scheduledCheckInterval);
    },

    scheduleDispatch(dispatchData) {
        const validation = Validators.schedule();
        if (!validation.valid) {
            UI.showError(validation.error);
            return false;
        }

        const scheduledDispatch = {
            id: Date.now(),
            scheduledDateTime: validation.scheduledDateTime,
            dispatchData: dispatchData,
            status: 'agendado',
            createdAt: new Date()
        };

        AppState.scheduledDispatches.push(scheduledDispatch);
        this.saveScheduledDispatches();
        this.updateScheduledTable();

        UI.showSuccess(`Disparo agendado para ${validation.scheduledDateTime.toLocaleString('pt-BR')}`);

        const enableSchedulingCheckbox = document.getElementById('enableScheduling');
        if (enableSchedulingCheckbox) {
            enableSchedulingCheckbox.checked = false;
            this.toggleSchedulingOptions();
        }

        return true;
    },

    checkScheduledDispatches() {
        const now = new Date();

        AppState.scheduledDispatches.forEach(dispatch => {
            if (dispatch.status === 'agendado') {
                const timeUntil = dispatch.scheduledDateTime - now;

                if (timeUntil <= 5 * 60 * 1000 && timeUntil > 4 * 60 * 1000 && !dispatch.warned) {
                    UI.showInfo('Disparo será executado em 5 minutos');
                    dispatch.warned = true;
                    this.saveScheduledDispatches();
                }

                if (timeUntil <= 0) {
                    this.executeScheduledDispatch(dispatch);
                }
            }
        });

        this.updateScheduledTable();
    },

    async executeScheduledDispatch(scheduledDispatch) {
        if (AppState.sendingInProgress) {
            UI.showWarning('Outro disparo está em andamento. Reagendando...');
            scheduledDispatch.scheduledDateTime = new Date(Date.now() + 5 * 60 * 1000);
            this.saveScheduledDispatches();
            return;
        }

        scheduledDispatch.status = 'executando';
        this.updateScheduledTable();

        const data = scheduledDispatch.dispatchData;

        // Aplicar configurações
        const instanceNameInput = document.getElementById('instanceName');
        const instanceAPIKEYInput = document.getElementById('instanceAPIKEY');
        const messageInput = document.getElementById('message');
        const iaInput = document.getElementById('ia');
        const minIntervalInput = document.getElementById('minInterval');
        const maxIntervalInput = document.getElementById('maxInterval');

        if (instanceNameInput) instanceNameInput.value = data.instanceName;
        if (instanceAPIKEYInput) instanceAPIKEYInput.value = data.instanceAPIKEY;
        if (messageInput && !data.multipleMessages) messageInput.value = data.message;
        if (iaInput) iaInput.value = data.ia;
        if (minIntervalInput) minIntervalInput.value = data.minInterval;
        if (maxIntervalInput) maxIntervalInput.value = data.maxInterval;

        if (data.contacts) {
            AppState.contacts = data.contacts;
            ContactManager.updateContactsList();
        }

        UI.showInfo('Executando disparo agendado...');

        try {
            await SendingManager.start();
            scheduledDispatch.status = 'concluído';
        } catch (error) {
            scheduledDispatch.status = 'erro';
            UI.showError('Erro ao executar disparo agendado: ' + error.message);
        }

        this.saveScheduledDispatches();
        this.updateScheduledTable();
    },

    cancelScheduledDispatch(id) {
        UI.confirm(
            'Cancelar Agendamento',
            'Tem certeza que deseja cancelar este agendamento?',
            () => {
                AppState.scheduledDispatches = AppState.scheduledDispatches.filter(d => d.id !== id);
                this.saveScheduledDispatches();
                this.updateScheduledTable();
                UI.showSuccess('Agendamento cancelado');
            }
        );
    },

    updateScheduledTable() {
        const tbody = document.getElementById('scheduledTableBody');
        const section = document.getElementById('scheduledSection');
        const count = document.getElementById('scheduledCount');

        if (!tbody) return;

        const activeSchedules = AppState.scheduledDispatches.filter(d => d.status !== 'concluído');

        if (activeSchedules.length === 0) {
            if (section) section.style.display = 'none';
            return;
        }

        if (section) section.style.display = 'block';
        if (count) count.textContent = activeSchedules.length;

        tbody.innerHTML = activeSchedules.map(dispatch => {
            const now = new Date();
            const timeUntil = dispatch.scheduledDateTime - now;
            const timeRemaining = timeUntil > 0 ? Utils.formatTimeRemaining(timeUntil) : 'Executando...';

            let statusBadge = '';
            switch (dispatch.status) {
                case 'agendado':
                    statusBadge = '<span class="badge bg-primary">Agendado</span>';
                    break;
                case 'executando':
                    statusBadge = '<span class="badge bg-warning">Executando</span>';
                    break;
                case 'erro':
                    statusBadge = '<span class="badge bg-danger">Erro</span>';
                    break;
            }

            return `
                <tr>
                    <td>${dispatch.scheduledDateTime.toLocaleString('pt-BR')}</td>
                    <td><span class="badge bg-info">${dispatch.dispatchData.instanceName}</span></td>
                    <td>${dispatch.dispatchData.contacts ? dispatch.dispatchData.contacts.length : 'N/A'}</td>
                    <td>${timeRemaining}</td>
                    <td>${statusBadge}</td>
                    <td>
                        ${dispatch.status === 'agendado' ?
                    `<button class="btn btn-outline-danger btn-sm" onclick="ScheduleManager.cancelScheduledDispatch(${dispatch.id})" title="Cancelar">
                                <i class="bi bi-trash"></i>
                            </button>` :
                    '<span class="text-muted">-</span>'
                }
                    </td>
                </tr>
            `;
        }).join('');
    },

    toggleSchedulingOptions() {
        const checkbox = document.getElementById('enableScheduling');
        const options = document.getElementById('schedulingOptions');

        if (checkbox && options) {
            options.style.display = checkbox.checked ? 'block' : 'none';
        }
    },

    saveScheduledDispatches() {
        const dataToSave = AppState.scheduledDispatches.map(dispatch => ({
            ...dispatch,
            scheduledDateTime: dispatch.scheduledDateTime.toISOString(),
            createdAt: dispatch.createdAt.toISOString()
        }));

        localStorage.setItem('scheduledDispatches', JSON.stringify(dataToSave));
    },

    loadScheduledDispatches() {
        const saved = localStorage.getItem('scheduledDispatches');
        if (saved) {
            const parsed = JSON.parse(saved);
            AppState.scheduledDispatches = parsed.map(dispatch => ({
                ...dispatch,
                scheduledDateTime: new Date(dispatch.scheduledDateTime),
                createdAt: new Date(dispatch.createdAt)
            }));

            const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            AppState.scheduledDispatches = AppState.scheduledDispatches.filter(d => d.createdAt > weekAgo);

            this.updateScheduledTable();
        }
    },
};

// ========================================
// GERENCIAMENTO DE LOTE
// ========================================

const BatchManager = {
    initialize() {
        console.log('🔧 Inicializando BatchManager...');
        this.setupEventListeners();
    },

    setupEventListeners() {
        const enableBatchPause = document.getElementById('enableBatchPause');
        if (enableBatchPause) {
            enableBatchPause.addEventListener('change', () => {
                console.log('🔄 Checkbox de pausa em lotes alterado:', enableBatchPause.checked);
                this.toggleBatchOptions();
            });
            console.log('✅ Event listener do BatchManager configurado');
        } else {
            console.error('❌ Elemento enableBatchPause não encontrado');
        }

        // Event listeners para os campos de configuração
        const batchSize = document.getElementById('batchSize');
        const batchPauseDuration = document.getElementById('batchPauseDuration');

        if (batchSize) {
            batchSize.addEventListener('input', () => {
                AppState.batchSize = parseInt(batchSize.value || 10);
                this.updateBatchInfo();
                TimeEstimator.update();
            });
        }

        if (batchPauseDuration) {
            batchPauseDuration.addEventListener('input', () => {
                AppState.batchPauseDuration = parseInt(batchPauseDuration.value || 10);
                this.updateBatchInfo();
                TimeEstimator.update();
            });
        }
    },

    toggleBatchOptions() {
        const checkbox = document.getElementById('enableBatchPause');
        const options = document.getElementById('batchPauseOptions');

        console.log('🔄 Alternando opções de lote...', {
            checkbox: !!checkbox,
            options: !!options,
            checked: checkbox?.checked
        });

        if (checkbox && options) {
            AppState.batchPauseEnabled = checkbox.checked;
            options.style.display = checkbox.checked ? 'block' : 'none';

            if (checkbox.checked) {
                console.log('✅ Pausa em lotes ativada');
                this.updateBatchInfo();
                UI.showSuccess('Pausa em lotes ativada!');
            } else {
                console.log('❌ Pausa em lotes desativada');
                UI.showInfo('Pausa em lotes desativada');
            }

            TimeEstimator.update();
        } else {
            console.error('❌ Elementos não encontrados:', {
                checkbox: !!checkbox,
                options: !!options
            });
        }
    },

    updateBatchInfo() {
        const batchSize = parseInt(document.getElementById('batchSize')?.value || 10);
        const batchPause = parseInt(document.getElementById('batchPauseDuration')?.value || 10);
        const totalContacts = AppState.contacts.length;

        AppState.batchSize = batchSize;
        AppState.batchPauseDuration = batchPause;

        if (totalContacts > 0) {
            AppState.totalBatches = Math.ceil(totalContacts / batchSize);
            console.log(`📦 Configuração atualizada: ${AppState.totalBatches} lotes de ${batchSize} mensagens, pausa de ${batchPause}min`);
        }
    },

    shouldPauseBatch(currentIndex) {
        if (!AppState.batchPauseEnabled) return false;

        const batchSize = AppState.batchSize;
        const isEndOfBatch = (currentIndex + 1) % batchSize === 0;
        const notLastMessage = currentIndex < AppState.contacts.length - 1;

        console.log(`🔍 Verificando pausa: índice ${currentIndex}, lote ${batchSize}, fim do lote: ${isEndOfBatch}, não é última: ${notLastMessage}`);

        return isEndOfBatch && notLastMessage;
    },

    async startBatchPause() {
        const pauseDuration = AppState.batchPauseDuration;
        const pauseMs = pauseDuration * 60 * 1000;

        AppState.batchPauseActive = true;
        AppState.currentBatchNumber++;

        console.log(`⏸️ Iniciando pausa entre lotes: ${pauseDuration} minutos`);

        this.showBatchStatus(pauseMs);
        UI.showWarning(`Pausa entre lotes ativa: ${pauseDuration} minutos`);

        return new Promise((resolve) => {
            AppState.batchTimer = setTimeout(() => {
                AppState.batchPauseActive = false;
                this.hideBatchStatus();
                UI.showInfo('Pausa entre lotes finalizada - continuando envio...');
                console.log('▶️ Pausa entre lotes finalizada');
                resolve();
            }, pauseMs);
        });
    },

    showBatchStatus(pauseMs) {
        const statusDiv = document.getElementById('batchStatus');
        const currentBatch = document.getElementById('currentBatch');
        const countdown = document.getElementById('batchCountdown');
        const progressBar = document.getElementById('batchProgressBar');
        const timeRemaining = document.getElementById('batchTimeRemaining');

        if (statusDiv) statusDiv.style.display = 'block';
        if (currentBatch) currentBatch.textContent = AppState.currentBatchNumber - 1;

        // Countdown timer
        let remainingTime = pauseMs;
        const updateInterval = setInterval(() => {
            if (!AppState.batchPauseActive) {
                clearInterval(updateInterval);
                return;
            }

            const minutes = Math.floor(remainingTime / 60000);
            const seconds = Math.floor((remainingTime % 60000) / 1000);
            const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;

            if (countdown) countdown.textContent = timeString;
            if (timeRemaining) timeRemaining.textContent = timeString;

            const progress = ((pauseMs - remainingTime) / pauseMs) * 100;
            if (progressBar) progressBar.style.width = `${progress}%`;

            remainingTime -= 1000;

            if (remainingTime < 0) {
                clearInterval(updateInterval);
            }
        }, 1000);
    },

    hideBatchStatus() {
        const statusDiv = document.getElementById('batchStatus');
        if (statusDiv) statusDiv.style.display = 'none';

        if (AppState.batchTimer) {
            clearTimeout(AppState.batchTimer);
            AppState.batchTimer = null;
        }
    },

    reset() {
        AppState.currentBatchCount = 0;
        AppState.currentBatchNumber = 1;
        AppState.batchPauseActive = false;
        this.hideBatchStatus();
        console.log('🔄 BatchManager resetado');
    }
};


// ========================================
// 16. GERENCIAMENTO DE CONEXÃO WHATSAPP
// ========================================
const ConnectionManager = {
    async checkConnection() {
        const validation = Validators.instanceData();
        if (!validation.valid) {
            UI.showError('Preencha o nome da instância e a APIKEY primeiro');
            return;
        }

        let modal = bootstrap.Modal.getInstance(document.getElementById('connectionModal'));
        if (!modal) {
            modal = new bootstrap.Modal(document.getElementById('connectionModal'));
        }

        this.resetConnectionModal();
        modal.show();

        await this.performConnectionCheck(validation.instanceName, validation.instanceAPIKEY);
    },

    resetConnectionModal() {
        const statusDiv = document.getElementById('connectionStatus');
        const recheckBtn = document.getElementById('recheckConnection');

        if (statusDiv) {
            statusDiv.innerHTML = `
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Verificando...</span>
                </div>
                <p class="mt-2">Verificando status da conexão...</p>
            `;
        }

        if (recheckBtn) {
            recheckBtn.style.display = 'none';
        }
    },

    async performConnectionCheck(instanceName, instanceAPIKEY) {
        try {
            const response = await fetch(APP_CONFIG.webhookConexao, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ instanceName, instanceAPIKEY })
            });

            const data = await response.json();
            this.displayConnectionStatus(data, instanceName, instanceAPIKEY);

        } catch (error) {
            this.displayConnectionError(error.message);
        }
    },

    displayConnectionStatus(data, instanceName, instanceAPIKEY) {
        const statusDiv = document.getElementById('connectionStatus');
        const recheckBtn = document.getElementById('recheckConnection');

        AppIntervals.clear('qrRefresh');

        if (!statusDiv) return;

        if (data.result === 'error') {
            statusDiv.innerHTML = `
                <div class="alert alert-danger">
                    <i class="bi bi-x-circle-fill fs-1 text-danger d-block mb-3"></i>
                    <h4>⚠️ Instância não encontrada!</h4>
                    <p class="mb-0">Verifique se as informações estão corretas.</p>
                </div>
            `;
            if (recheckBtn) recheckBtn.style.display = 'none';
            return;
        }

        if (data.result === 'open') {
            statusDiv.innerHTML = `
                <div class="alert alert-success">
                    <i class="bi bi-check-circle-fill fs-1 text-success d-block mb-3"></i>
                    <h4>✅ WhatsApp Conectado!</h4>
                    <p class="mb-0">Sua instância está conectada e pronta para enviar mensagens.</p>
                </div>
            `;
            if (recheckBtn) recheckBtn.style.display = 'none';
        } else {
            this.displayQRCode(data.result, instanceName, instanceAPIKEY);
            if (recheckBtn) recheckBtn.style.display = 'inline-block';
        }
    },

    displayQRCode(qrCodeBase64, instanceName, instanceAPIKEY) {
        const statusDiv = document.getElementById('connectionStatus');
        if (!statusDiv) return;

        let countdown = 30;

        const updateQRDisplay = () => {
            statusDiv.innerHTML = `
                <div class="alert alert-warning">
                    <i class="bi bi-exclamation-triangle-fill fs-1 text-warning d-block mb-3"></i>
                    <h4>📱 WhatsApp Desconectado</h4>
                    <p>Escaneie o QR Code abaixo com seu WhatsApp:</p>
                </div>
                
                <div class="qr-code-container mb-3 position-relative">
                    <img src="${qrCodeBase64}" 
                         alt="QR Code WhatsApp" 
                         class="img-fluid border rounded" 
                         style="max-width: 300px;">
                    <div class="position-absolute top-0 end-0 badge bg-secondary">
                        ${countdown}s
                    </div>
                </div>
                
                <div class="alert alert-info text-start">
                    <h6><i class="bi bi-info-circle me-2"></i>Como conectar:</h6>
                    <ol class="mb-0">
                        <li>Abra o <strong>WhatsApp</strong> no seu celular</li>
                        <li>Toque em <strong>Mais opções</strong> (⋮) ou <strong>Configurações</strong></li>
                        <li>Selecione <strong>Aparelhos conectados</strong></li>
                        <li>Toque em <strong>Conectar um aparelho</strong></li>
                        <li>Escaneie o <strong>QR Code</strong> acima</li>
                        <li>Aguarde a confirmação da conexão</li>
                    </ol>
                </div>
            `;
        };

        updateQRDisplay();

        AppIntervals.qrRefresh = setInterval(async () => {
            countdown--;

            if (countdown <= 0) {
                UI.showLoading('Atualizando QR Code...');
                try {
                    const response = await fetch(APP_CONFIG.webhookConexao, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ instanceName, instanceAPIKEY })
                    });
                    const data = await response.json();
                    UI.hideLoading();

                    if (data.result === 'open') {
                        this.displayConnectionStatus(data, instanceName, instanceAPIKEY);
                    } else {
                        qrCodeBase64 = data.result;
                        countdown = 30;
                        updateQRDisplay();
                    }
                } catch (error) {
                    UI.hideLoading();
                    countdown = 30;
                    updateQRDisplay();
                }
            } else {
                const badge = statusDiv.querySelector('.badge');
                if (badge) badge.textContent = `${countdown}s`;
            }
        }, 1000);
    },

    displayConnectionError(errorMessage) {
        const statusDiv = document.getElementById('connectionStatus');
        if (statusDiv) {
            statusDiv.innerHTML = `
                <div class="alert alert-danger">
                    <i class="bi bi-exclamation-triangle-fill fs-1 text-danger d-block mb-3"></i>
                    <h4>❌ Erro de Conexão</h4>
                    <p class="mb-0">Erro: ${errorMessage}</p>
                </div>
            `;
        }
    }
};

// ========================================
// 17. GERENCIAMENTO DE RELATÓRIOS
// ========================================
const ReportManager = {
    generatePDFReport() {
        if (AppState.sendingDetails.length === 0) {
            UI.showWarning('Não há dados para gerar relatório');
            return;
        }

        // ✅ CORREÇÃO: Usar duração real do disparo
        let reportDuration = 0;

        // Primeiro tentar pegar a duração salva no histórico mais recente
        if (AppState.sendingHistory.length > 0) {
            const latestHistory = AppState.sendingHistory[0]; // O mais recente está no início
            reportDuration = latestHistory.duration || 0;
            console.log('📊 Usando duração do histórico:', Utils.formatTime(reportDuration));
        }

        // Se não tiver no histórico, calcular baseado nos timestamps reais
        if (reportDuration === 0 && AppState.sendingDetails.length > 1) {
            const startTime = AppState.sendingDetails[0]?.datetime;
            const endTime = AppState.sendingDetails[AppState.sendingDetails.length - 1]?.datetime;

            if (startTime && endTime) {
                reportDuration = new Date(endTime) - new Date(startTime);
                console.log('📊 Duração calculada pelos timestamps:', Utils.formatTime(reportDuration));
            }
        }

        // Se ainda for 0, usar um valor mínimo
        if (reportDuration === 0) {
            reportDuration = AppState.sendingDetails.length * 2000; // 2s por mensagem (estimativa)
            console.log('📊 Usando duração estimada:', Utils.formatTime(reportDuration));
        }

        console.log('📊 Gerando relatório:', {
            totalEnvios: AppState.sendingDetails.length,
            duracaoFinal: Utils.formatTime(reportDuration),
            sucessos: AppState.results.success,
            erros: AppState.results.error
        });

        // resto do código permanece igual...
        const instancesUsed = [...new Set(AppState.sendingDetails.map(detail => detail.instance))];
        const instanceStats = {};

        AppState.sendingDetails.forEach(detail => {
            const instanceName = detail.instance || 'Desconhecido';
            if (!instanceStats[instanceName]) {
                instanceStats[instanceName] = { total: 0, success: 0, error: 0 };
            }
            instanceStats[instanceName].total++;
            if (detail.status === 'Sucesso') {
                instanceStats[instanceName].success++;
            } else {
                instanceStats[instanceName].error++;
            }
        });

        const reportData = {
            datetime: new Date().toISOString(),
            instanceName: instancesUsed.length > 1 ? 'Múltiplas Instâncias' : (instancesUsed[0] || 'Desconhecido'),
            instancesUsed: instancesUsed,
            instanceStats: instanceStats,
            totalContacts: AppState.sendingDetails.length,
            successCount: AppState.results.success,
            errorCount: AppState.results.error,
            duration: reportDuration, // ✅ Usar duração corrigida
            details: AppState.sendingDetails.map(detail => ({
                datetime: detail.datetime ? detail.datetime.toISOString() : new Date().toISOString(),
                name: detail.name || 'Sem nome',
                phone: detail.phone || 'Sem telefone',
                email: detail.email || '',
                status: detail.status || 'Desconhecido',
                message: detail.message || 'Sem mensagem',
                instance: detail.instance || 'Desconhecido',
                instanceId: detail.instanceId || null,
                mediaType: detail.mediaType || null,
                sentEmail: detail.sentEmail || false
            }))
        };

        if (reportData.details.length === 0) {
            UI.showError('Erro: Nenhum detalhe de envio encontrado');
            return;
        }

        const encodedData = encodeURIComponent(JSON.stringify(reportData));
        const reportUrl = `relatorio.html?data=${encodedData}`;

        if (reportUrl.length > 2000) {
            sessionStorage.setItem('current_report_data', JSON.stringify(reportData));
            window.open('relatorio.html', '_blank');
        } else {
            window.open(reportUrl, '_blank');
        }

        UI.showSuccess('Relatório aberto em nova aba!');
    }
};

// ========================================
// 18. GERENCIAMENTO DE EXPORT/IMPORT
// ========================================
const DataManager = {
    exportHistoryToExcel() {
        if (AppState.sendingHistory.length === 0) {
            UI.showWarning('Não há histórico para exportar');
            return;
        }

        // ✅ ATUALIZADO: Incluir coluna Instância
        const exportData = [['Data/Hora', 'Instância Geral', 'Total Contatos', 'Sucessos', 'Erros', 'Taxa Sucesso (%)', 'Detalhes dos Envios']];

        AppState.sendingHistory.forEach(entry => {
            exportData.push([
                entry.datetime.toLocaleString('pt-BR'),
                entry.instanceName,
                entry.totalContacts,
                entry.successCount,
                entry.errorCount,
                entry.successRate,
                ''
            ]);

            if (entry.details && entry.details.length > 0) {
                exportData.push(['', '', '', '', '', '', 'DETALHES:']);
                // ✅ ATUALIZADO: Incluir coluna Instância nos detalhes
                exportData.push(['', 'Hora', 'Nome', 'Telefone', 'Instância', 'Status', 'Mensagem']);

                entry.details.forEach(detail => {
                    exportData.push([
                        '',
                        detail.datetime.toLocaleTimeString('pt-BR'),
                        detail.name,
                        detail.phone,
                        detail.instance || 'N/A', // ✅ NOVO: Coluna da instância
                        detail.status,
                        detail.message.length > 50 ? detail.message.substring(0, 50) + '...' : detail.message
                    ]);
                });

                exportData.push(['', '', '', '', '', '', '']);
            }
        });

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(exportData);

        // ✅ ATUALIZADO: Ajustar largura das colunas (incluindo nova coluna)
        ws['!cols'] = [
            { wch: 18 }, { wch: 15 }, { wch: 12 }, { wch: 10 },
            { wch: 8 }, { wch: 12 }, { wch: 15 }, { wch: 40 }
        ];

        XLSX.utils.book_append_sheet(wb, ws, 'Histórico de Envios');

        const now = new Date();
        const fileName = `historico-disparador-${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}.xlsx`;

        XLSX.writeFile(wb, fileName);
        UI.showSuccess('Histórico exportado com sucesso!');
    },

    exportContactsToExcel() {
        if (AppState.contacts.length === 0) {
            UI.showWarning('Não há contatos para exportar');
            return;
        }

        // ✅ ATUALIZADO: Incluir coluna de e-mail
        const exportData = [['Nome', 'Telefone', 'E-mail', 'Telefone Formatado', 'Status']];

        AppState.contacts.forEach(contact => {
            exportData.push([
                contact.name,
                contact.phone,
                contact.email || '', // ✅ NOVO: Coluna de e-mail
                PhoneUtils.displayFormattedPhone(contact.phone),
                contact.isValid ? 'Válido' : 'Verificar'
            ]);
        });

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(exportData);

        // ✅ ATUALIZADO: Ajustar largura das colunas
        ws['!cols'] = [{ wch: 30 }, { wch: 15 }, { wch: 25 }, { wch: 18 }, { wch: 10 }];

        XLSX.utils.book_append_sheet(wb, ws, 'Lista de Contatos');

        const fileName = `contatos-disparador-${new Date().toISOString().split('T')[0]}.xlsx`;

        XLSX.writeFile(wb, fileName);
        UI.showSuccess('Lista de contatos exportada!');
    },

    exportBackupData() {
        const backupData = {
            version: APP_CONFIG.version,
            exportDate: new Date().toISOString(),
            history: AppState.sendingHistory,
            contacts: AppState.contacts,
            instances: AppState.instances.map(instance => ({
                ...instance,
                lastCheck: instance.lastCheck.toISOString(),
            })),
            settings: {
                instanceName: document.getElementById('instanceName')?.value || '',
                instanceAPIKEY: document.getElementById('instanceAPIKEY')?.value || '',
                ia: document.getElementById('ia')?.value || '',
                minInterval: document.getElementById('minInterval')?.value || '',
                maxInterval: document.getElementById('maxInterval')?.value || ''
                // ✅ REMOVIDO: message (modo simples)
            },
            // ✅ SEMPRE INCLUIR configurações de múltiplas mensagens
            multipleMessages: {
                enabled: true, // ✅ SEMPRE true
                config: {
                    msg1: {
                        enabled: AppState.messagesConfig.msg1.enabled,
                        text: AppState.messagesConfig.msg1.text,
                        media: AppState.messagesConfig.msg1.media
                    },
                    msg2: {
                        enabled: AppState.messagesConfig.msg2.enabled,
                        text: AppState.messagesConfig.msg2.text,
                        media: AppState.messagesConfig.msg2.media
                    },
                    msg3: {
                        enabled: AppState.messagesConfig.msg3.enabled,
                        text: AppState.messagesConfig.msg3.text,
                        media: AppState.messagesConfig.msg3.media
                    }
                }
            },
            scheduledDispatches: AppState.scheduledDispatches.map(dispatch => ({
                ...dispatch,
                scheduledDateTime: dispatch.scheduledDateTime.toISOString(),
                createdAt: dispatch.createdAt.toISOString()
            }))
            // ✅ REMOVIDO: media (modo simples)
        };

        // ✅ REMOVIDO: Toda lógica de backup de mídia do modo simples
        this.downloadBackup(backupData);
    },


    downloadBackup(backupData) {
        const dataStr = JSON.stringify(backupData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });

        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `backup-disparador-${new Date().toISOString().split('T')[0]}.json`;

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        UI.showSuccess('Backup completo criado com sucesso!');
    },

    importBackupData() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';

        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const backupData = JSON.parse(e.target.result);

                    if (!backupData.version || !backupData.exportDate) {
                        throw new Error('Arquivo de backup inválido');
                    }

                    UI.confirm(
                        'Importar Backup',
                        `Deseja importar o backup de ${new Date(backupData.exportDate).toLocaleString('pt-BR')}?<br><br>
                        <strong>Isso substituirá:</strong><br>
                        • Histórico de envios<br>
                        • Lista de contatos<br>
                        • Configurações da instância<br>
                        • Mensagem e mídia salvas`,
                        () => this.restoreBackupData(backupData)
                    );

                } catch (error) {
                    UI.showError('Erro ao ler backup: ' + error.message);
                }
            };

            reader.readAsText(file);
        };

        input.click();
    },

    async restoreBackupData(backupData) {
        try {
            // Importar histórico
            if (backupData.history && Array.isArray(backupData.history)) {
                AppState.sendingHistory = backupData.history.map(entry => ({
                    ...entry,
                    datetime: new Date(entry.datetime),
                    details: entry.details?.map(detail => ({
                        ...detail,
                        datetime: new Date(detail.datetime),
                        instance: detail.instance || 'Desconhecido',
                        instanceId: detail.instanceId || null
                    })) || []
                }));
                HistoryManager.updateTable();
            }

            // Importar contatos
            if (backupData.contacts && Array.isArray(backupData.contacts)) {
                AppState.contacts = backupData.contacts;
                ContactManager.updateContactsList();
                TimeEstimator.update();
            }

            // ✅ CORREÇÃO: Importar instâncias
            if (backupData.instances && Array.isArray(backupData.instances)) {
                AppState.instances = backupData.instances.map(instance => ({
                    ...instance,
                    lastCheck: new Date(instance.lastCheck || Date.now()),
                    status: 'disconnected',
                    totalSent: instance.totalSent || 0,
                    successCount: instance.successCount || 0,
                    errorCount: instance.errorCount || 0
                }));

                InstanceManager.saveInstances();
                InstanceManager.updateInstancesList();

                setTimeout(() => {
                    if (AppState.instances.length > 0) {
                        UI.confirm(
                            'Verificar Conexões',
                            `${AppState.instances.length} instância(s) foram restauradas.<br><br>Deseja verificar o status de conexão de todas agora?`,
                            () => InstanceManager.recheckAllInstancesAfterRestore(),
                            () => UI.showInfo('Você pode verificar as conexões manualmente mais tarde')
                        );
                    }
                }, 1500);
            }

            // Importar agendamentos
            if (backupData.scheduledDispatches && Array.isArray(backupData.scheduledDispatches)) {
                AppState.scheduledDispatches = backupData.scheduledDispatches.map(dispatch => ({
                    ...dispatch,
                    scheduledDateTime: new Date(dispatch.scheduledDateTime),
                    createdAt: new Date(dispatch.createdAt)
                }));
                ScheduleManager.updateScheduledTable();
            }

            // // ✅ CORREÇÃO: Restaurar configurações básicas com verificação do editor
            // if (backupData.settings) {
            //     // Tentar inicializar o editor rico primeiro
            //     const editorReady = await this.initializeRichEditorSafely();

            //     // Aguardar um pouco para garantir que está pronto
            //     if (editorReady) {
            //         await new Promise(resolve => setTimeout(resolve, 500));
            //     }

            //     this.restoreSettings(backupData.settings);
            // }

            // // Importar configuração de múltiplas mensagens
            // if (backupData.multipleMessages) {
            //     AppState.multipleMessagesEnabled = backupData.multipleMessages.enabled || false;
            //     AppState.messagesConfig = backupData.multipleMessages.config || AppState.messagesConfig;

            //     const toggleSwitch = document.getElementById('enableMultipleMessages');
            //     if (toggleSwitch) {
            //         toggleSwitch.checked = AppState.multipleMessagesEnabled;

            //         // ✅ VERIFICAR SE O GERENCIADOR EXISTE ANTES DE USAR
            //         if (typeof MultipleMessagesManager !== 'undefined' &&
            //             MultipleMessagesManager.toggleMessageModes) {
            //             MultipleMessagesManager.toggleMessageModes();
            //             MultipleMessagesManager.updateActiveMessagesInfo();
            //         }
            //     }

            //     // Restaurar textos e mídias das mensagens
            //     ['msg1', 'msg2', 'msg3'].forEach(msgId => {
            //         const config = AppState.messagesConfig[msgId];
            //         if (config) {
            //             const enabledCheckbox = document.getElementById(`${msgId}-enabled`);
            //             const textInput = document.getElementById(`${msgId}-text`);

            //             if (enabledCheckbox) enabledCheckbox.checked = config.enabled;
            //             if (textInput) textInput.value = config.text || '';

            //             // Restaurar mídia de cada mensagem
            //             if (config.media && config.media.data) {
            //                 this.restoreMultipleMessageMedia(msgId, config.media);
            //             }
            //         }
            //     });
            // }

            // // Importar mídia do modo simples
            // if (backupData.media && backupData.media.data && !backupData.multipleMessages?.enabled) {
            //     this.restoreMediaFile(backupData.media);
            // }

            // Importar configurações básicas (SEM mensagem simples)
            if (backupData.settings) {
                const editorReady = await this.initializeRichEditorSafely();
                if (editorReady) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                }

                // ✅ ATUALIZADO: Sem campo 'message'
                const fields = [
                    'instanceName', 'instanceAPIKEY', 'ia', 'minInterval', 'maxInterval'
                ];

                fields.forEach(fieldId => {
                    const element = document.getElementById(fieldId);
                    if (element && backupData.settings[fieldId]) {
                        element.value = backupData.settings[fieldId];
                    }
                });

                TimeEstimator.update();
            }

            // ✅ SEMPRE importar configuração de múltiplas mensagens
            if (backupData.multipleMessages) {
                // Sempre ativar múltiplas mensagens
                AppState.multipleMessagesEnabled = true;
                AppState.messagesConfig = backupData.multipleMessages.config || AppState.messagesConfig;

                // ✅ REMOVER: Código do toggle switch (não existe mais)

                // Verificar se o gerenciador existe antes de usar
                if (typeof MultipleMessagesManager !== 'undefined' &&
                    MultipleMessagesManager.toggleMessageModes) {
                    MultipleMessagesManager.toggleMessageModes();
                    MultipleMessagesManager.updateActiveMessagesInfo();
                }

                // Restaurar textos e mídias das mensagens
                ['msg1', 'msg2', 'msg3'].forEach(msgId => {
                    const config = AppState.messagesConfig[msgId];
                    if (config) {
                        const enabledCheckbox = document.getElementById(`${msgId}-enabled`);
                        const textInput = document.getElementById(`${msgId}-text`);

                        if (enabledCheckbox) enabledCheckbox.checked = config.enabled;
                        if (textInput) textInput.value = config.text || '';

                        // Restaurar mídia de cada mensagem
                        if (config.media && config.media.data) {
                            this.restoreMultipleMessageMedia(msgId, config.media);
                        }
                    }
                });
            } else {
                // ✅ FALLBACK: Se backup antigo, garantir modo múltiplas ativo
                console.log('📦 Backup antigo detectado - ativando modo múltiplas mensagens');
                AppState.multipleMessagesEnabled = true;
                AppState.messagesConfig.msg1.enabled = true;

                if (typeof MultipleMessagesManager !== 'undefined') {
                    MultipleMessagesManager.toggleMessageModes();
                    MultipleMessagesManager.updateActiveMessagesInfo();
                }
            }

            UI.showSuccess('Backup restaurado com sucesso!');

        } catch (error) {
            console.error('❌ Erro ao restaurar backup:', error);
            UI.showError('Erro ao restaurar backup: ' + error.message);
        }
    },

    restoreMultipleMessageMedia(msgId, mediaData) {
        try {
            console.log(`📎 Restaurando mídia para ${msgId}:`, {
                filename: mediaData.filename,
                mimetype: mediaData.mimetype,
                hasData: !!mediaData.data
            });

            // ✅ CONVERTER BASE64 PARA BLOB E DEPOIS PARA FILE
            const base64Data = mediaData.data;
            const byteCharacters = atob(base64Data);
            const byteNumbers = new Array(byteCharacters.length);

            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }

            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: mediaData.mimetype });
            const file = new File([blob], mediaData.filename, { type: mediaData.mimetype });

            // ✅ DEFINIR NO INPUT DE ARQUIVO
            const mediaInput = document.getElementById(`${msgId}-media`);
            if (mediaInput) {
                const fileList = {
                    0: file,
                    length: 1,
                    item: function (index) { return this[index]; }
                };

                Object.defineProperty(mediaInput, 'files', {
                    value: fileList,
                    configurable: true
                });

                // ✅ DISPARAR EVENTO CHANGE PARA ATUALIZAR O INPUT VISUAL
                const changeEvent = new Event('change', { bubbles: true });
                mediaInput.dispatchEvent(changeEvent);

                // ✅ SALVAR NO ESTADO
                AppState.messagesConfig[msgId].media = {
                    filename: mediaData.filename,
                    data: mediaData.data, // Manter base64
                    mimetype: mediaData.mimetype,
                    size: mediaData.size
                };

                // ✅ MOSTRAR PREVIEW APÓS UM DELAY
                setTimeout(() => {
                    MultipleMessagesManager.showMediaPreview(msgId, file);
                    MultipleMessagesManager.updateMainPreview(msgId);
                }, 200);

                console.log(`✅ Mídia de ${msgId} restaurada: ${mediaData.filename}`);
            }

        } catch (error) {
            console.error(`❌ Erro ao restaurar mídia de ${msgId}:`, error);
            UI.showWarning(`Erro ao restaurar mídia da ${msgId}: ${mediaData.filename}`);
        }
    },

    restoreSettings(settings) {
        // ✅ ATUALIZADO: Sem campo 'message'
        const fields = [
            'instanceName', 'instanceAPIKEY', 'ia', 'minInterval', 'maxInterval'
        ];

        fields.forEach(fieldId => {
            const element = document.getElementById(fieldId);
            if (element && settings[fieldId]) {
                element.value = settings[fieldId];
            }
        });

        // ✅ REMOVIDO: Toda lógica do editor rico para mensagem simples

        TimeEstimator.update();
    },

    // ✅ NOVO: Método auxiliar para fallback
    // fallbackToTextarea(message) {
    //     const messageElement = document.getElementById('message');
    //     if (messageElement) {
    //         messageElement.value = message;
    //         console.log('✅ Mensagem restaurada no textarea');

    //         // Atualizar preview se disponível
    //         if (typeof PreviewManager !== 'undefined' && PreviewManager.update) {
    //             PreviewManager.update();
    //         }
    //     } else {
    //         console.warn('⚠️ Campo de mensagem não encontrado');
    //     }
    // },

    // restoreMediaFile(mediaData) {
    //     try {
    //         console.log('📎 Restaurando mídia:', mediaData.name, mediaData.type);

    //         // ✅ CONVERTER BASE64 PARA BLOB
    //         fetch(mediaData.data)
    //             .then(res => res.blob())
    //             .then(blob => {
    //                 // ✅ CRIAR FILE OBJECT
    //                 const file = new File([blob], mediaData.name, { type: mediaData.type });

    //                 // ✅ DEFINIR NO INPUT DE ARQUIVO
    //                 const mediaInput = document.getElementById('mediaFile');
    //                 if (mediaInput) {
    //                     const fileList = {
    //                         0: file,
    //                         length: 1,
    //                         item: function (index) { return this[index]; }
    //                     };

    //                     Object.defineProperty(mediaInput, 'files', {
    //                         value: fileList,
    //                         configurable: true
    //                     });

    //                     // ✅ DISPARAR EVENTO CHANGE PARA ATUALIZAR O INPUT VISUAL
    //                     const changeEvent = new Event('change', { bubbles: true });
    //                     mediaInput.dispatchEvent(changeEvent);

    //                     // ✅ MOSTRAR PREVIEW APÓS UM DELAY
    //                     setTimeout(() => {
    //                         showMediaPreview(file);
    //                         PreviewManager.update();
    //                     }, 200);

    //                     UI.showInfo(`Mídia restaurada: ${mediaData.name}`);
    //                     console.log('✅ Mídia restaurada e input atualizado');
    //                 }
    //             })
    //             .catch(error => {
    //                 console.warn('Erro ao restaurar mídia:', error);
    //                 UI.showWarning('Backup restaurado, mas houve problema com a mídia');
    //             });
    //     } catch (error) {
    //         console.warn('Erro ao processar mídia do backup:', error);
    //         UI.showWarning('Erro ao restaurar mídia do backup');
    //     }
    // },

    // ✅ CORREÇÃO: Método separado e seguro para editor rico

    // restoreRichTextMessage(message) {
    //     if (!message) return;

    //     // Verificar se o editor existe e está funcional
    //     if (window.richTextEditor &&
    //         typeof window.richTextEditor.setValue === 'function') {
    //         try {
    //             window.richTextEditor.setValue(message);
    //             console.log('✅ Mensagem rica restaurada do backup');
    //             return true;
    //         } catch (error) {
    //             console.warn('⚠️ Erro ao restaurar no editor rico:', error);
    //         }
    //     }

    //     // Fallback para textarea comum
    //     console.log('📝 Usando fallback para textarea');
    //     this.fallbackToTextarea(message);
    //     return false;
    // },

    // ✅ NOVO: Método para inicializar editor rico com segurança

    initializeRichEditorSafely() {
        return new Promise((resolve) => {
            // Verificar se o elemento existe
            const editorElement = document.getElementById('richTextEditor');
            if (!editorElement) {
                console.warn('⚠️ Elemento richTextEditor não encontrado');
                resolve(false);
                return;
            }

            // Verificar se já existe uma instância
            if (window.richTextEditor && typeof window.richTextEditor.setValue === 'function') {
                console.log('✅ Editor rico já inicializado');
                resolve(true);
                return;
            }

            // Tentar inicializar
            try {
                if (typeof RichTextEditor !== 'undefined') {
                    window.richTextEditor = new RichTextEditor('richTextEditor');
                    console.log('✅ Editor rico inicializado com sucesso');
                    resolve(true);
                } else {
                    console.warn('⚠️ Classe RichTextEditor não disponível');
                    resolve(false);
                }
            } catch (error) {
                console.error('❌ Erro ao inicializar editor rico:', error);
                resolve(false);
            }
        });
    },

};

// ========================================
// 19. GERENCIAMENTO DE CONFIGURAÇÕES
// ========================================

const SettingsManager = {
    // Manter apenas loadSaved() sem auto-save
    loadSaved() {
        console.log('📄 Carregando configurações salvas...');

        const saved = localStorage.getItem('disparador_settings');
        if (saved) {
            console.log('📄 Configurações antigas encontradas no localStorage');
        }
    },

    // Manter métodos de limpeza para compatibilidade
    clearSavedSettings() {
        UI.confirm(
            'Limpar Dados do Navegador',
            'Deseja limpar todos os dados salvos no navegador?<br><br>' +
            '<strong>Isso irá limpar:</strong><br>' +
            '• Cache do navegador<br>' +
            '• Configurações temporárias<br>' +
            '• Arquivos em cache',
            () => {
                // Limpar localStorage
                localStorage.clear();

                // Limpar sessionStorage
                sessionStorage.clear();

                UI.showSuccess('Dados do navegador limpos com sucesso!');

                // Sugerir recarregar a página
                setTimeout(() => {
                    UI.confirm(
                        'Recarregar Página',
                        'Deseja recarregar a página para aplicar as mudanças?',
                        () => window.location.reload()
                    );
                }, 1000);
            }
        );
    }
};

function validateMediaFile() {
    const mediaFile = document.getElementById('mediaFile');
    const preview = document.getElementById('mediaPreview');

    if (!mediaFile || !mediaFile.files || mediaFile.files.length === 0) {
        // Não há arquivo - esconder preview de mídia
        if (preview) {
            preview.style.display = 'none';
        }
        return false;
    }

    const file = mediaFile.files[0];
    if (!file || file.size === 0) {
        // Arquivo inválido - esconder preview
        if (preview) {
            preview.style.display = 'none';
        }
        return false;
    }

    return true;
}


// ========================================
// 26. GERENCIAMENTO DE MÚLTIPLAS INSTÂNCIAS
// ========================================
const InstanceManager = {
    initialize() {
        console.log('🔧 Inicializando InstanceManager...');

        this.loadInstances();
        this.updateInstancesList();

        // Verificação automática periódica
        setInterval(() => {
            if (AppState.instances.length > 0 && !AppState.sendingInProgress) {
                this.autoCheckConnections();
            }
        }, 5 * 60 * 1000); // A cada 5 minutos

        // Aguardar o DOM estar pronto e configurar eventos
        setTimeout(() => {
            const addInstanceBtn = document.getElementById('addInstanceBtn');
            if (addInstanceBtn) {
                addInstanceBtn.addEventListener('click', () => this.addInstance());
            }

            // Event delegation para os botões dos cards de instância
            document.addEventListener('click', (e) => {
                const instanceButton = e.target.closest('.check-connection-btn, .show-qr-btn, .edit-instance-btn, .remove-instance-btn');

                if (instanceButton) {
                    e.preventDefault();
                    e.stopPropagation();

                    const instanceId = parseInt(instanceButton.dataset.instanceId);
                    if (!instanceId) return;

                    if (instanceButton.classList.contains('check-connection-btn')) {
                        this.checkConnection(instanceId);
                    } else if (instanceButton.classList.contains('show-qr-btn')) {
                        this.showConnectionModal(instanceId);
                    } else if (instanceButton.classList.contains('edit-instance-btn')) {
                        this.editInstance(instanceId);
                    } else if (instanceButton.classList.contains('remove-instance-btn')) {
                        this.removeInstance(instanceId);
                    }
                }
            });
        }, 100);
    },

    loadInstances() {
        const saved = localStorage.getItem('disparador_instances');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                AppState.instances = parsed.map(instance => ({
                    ...instance,
                    lastCheck: new Date(instance.lastCheck)
                }));
                console.log(`✅ ${AppState.instances.length} instâncias carregadas`);
            } catch (error) {
                console.warn('Erro ao carregar instâncias salvas:', error);
                AppState.instances = [];
            }
        } else {
            AppState.instances = [];
            console.log('📱 Nenhuma instância salva encontrada');
        }
    },

    updateInstancesList() {
        const instancesList = document.getElementById('instancesList');
        if (!instancesList) {
            console.warn('⚠️ Elemento instancesList não encontrado');
            return;
        }

        if (AppState.instances.length === 0) {
            instancesList.innerHTML = `
                <div class="text-center text-muted py-4">
                    <i class="bi bi-server fs-3 d-block mb-2"></i>
                    Nenhuma instância cadastrada
                </div>
            `;
            return;
        }

        instancesList.innerHTML = AppState.instances.map(instance => `
            <div class="col-md-6 col-lg-4 mb-3">
                <div class="card instance-card ${instance.status}" style="position: relative;">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-start mb-2">
                            <h6 class="card-title mb-0">${instance.name}</h6>
                            <span class="badge status-badge ${this.getStatusBadgeClass(instance.status)}">
                                ${this.getStatusText(instance.status)}
                            </span>
                        </div>
                        
                        <p class="card-text small text-muted mb-2">
                            <i class="bi bi-key me-1"></i>
                            APIKEY: ••••${instance.apikey.slice(-4)}
                        </p>
                        
                        <div class="row text-center mb-3">
                            <div class="col-4">
                                <small class="text-muted">Total</small>
                                <div class="fw-bold">${instance.totalSent || 0}</div>
                            </div>
                            <div class="col-4">
                                <small class="text-muted">Sucesso</small>
                                <div class="fw-bold text-success">${instance.successCount || 0}</div>
                            </div>
                            <div class="col-4">
                                <small class="text-muted">Erro</small>
                                <div class="fw-bold text-danger">${instance.errorCount || 0}</div>
                            </div>
                        </div>
                        
                        <div class="instance-actions">
                            <button class="btn btn-outline-primary btn-sm check-connection-btn" 
                                    data-instance-id="${instance.id}"
                                    title="Verificar conexão">
                                <i class="bi bi-arrow-clockwise"></i>
                            </button>
                            
                            ${instance.status === 'disconnected' ? `
                                <button class="btn btn-outline-warning btn-sm show-qr-btn" 
                                        data-instance-id="${instance.id}"
                                        title="Conectar">
                                    <i class="bi bi-qr-code"></i>
                                </button>
                            ` : ''}
                            
                            <button class="btn btn-outline-danger btn-sm remove-instance-btn" 
                                    data-instance-id="${instance.id}"
                                    title="Remover">
                                <i class="bi bi-trash"></i>
                            </button>
                        </div>
                        
                        <small class="text-muted">
                            Última verificação: ${Utils.safeFormatTime(instance.lastCheck)}
                        </small>
                    </div>
                </div>
            </div>
        `).join('');

        // Organizar em grid
        instancesList.innerHTML = `<div class="row">${instancesList.innerHTML}</div>`;

        this.updateActiveInstances();
    },

    updateActiveInstances() {
        AppState.activeInstances = AppState.instances.filter(inst => inst.status === 'connected');

        const activeCount = document.getElementById('activeInstancesCount');
        if (activeCount) {
            activeCount.textContent = AppState.activeInstances.length;
        }
    },

    getRandomActiveInstance() {
        this.updateActiveInstances();

        if (AppState.activeInstances.length === 0) {
            console.warn('⚠️ Nenhuma instância ativa disponível');
            return null;
        }

        const randomIndex = Math.floor(Math.random() * AppState.activeInstances.length);
        const selectedInstance = AppState.activeInstances[randomIndex];

        console.log(`🔄 Instância selecionada: ${selectedInstance.name} (${randomIndex + 1}/${AppState.activeInstances.length})`);

        return selectedInstance;
    },

    updateInstanceStats(instanceId, success = true) {
        const instance = AppState.instances.find(inst => inst.id === instanceId);
        if (!instance) return;

        instance.totalSent = (instance.totalSent || 0) + 1;

        if (success) {
            instance.successCount = (instance.successCount || 0) + 1;
        } else {
            instance.errorCount = (instance.errorCount || 0) + 1;
        }

        this.saveInstances();
        this.updateInstancesList();
    },

    saveInstances() {
        const dataToSave = AppState.instances.map(instance => ({
            ...instance,
            lastCheck: instance.lastCheck.toISOString()
        }));

        localStorage.setItem('disparador_instances', JSON.stringify(dataToSave));
    },

    getStatusBadgeClass(status) {
        switch (status) {
            case 'connected': return 'bg-success';
            case 'disconnected': return 'bg-warning';
            case 'connecting': return 'bg-info';
            case 'error': return 'bg-danger';
            default: return 'bg-secondary';
        }
    },

    getStatusText(status) {
        switch (status) {
            case 'connected': return 'Conectado';
            case 'disconnected': return 'Desconectado';
            case 'connecting': return 'Conectando...';
            case 'error': return 'Erro';
            default: return 'Desconhecido';
        }
    },

    async addInstance() {
        const nameInput = document.getElementById('newInstanceName');
        const apikeyInput = document.getElementById('newInstanceAPIKEY');

        const name = nameInput?.value?.trim();
        const apikey = apikeyInput?.value?.trim();

        if (!name || !apikey) {
            UI.showError('Preencha nome e APIKEY da instância');
            return;
        }

        if (AppState.instances.find(inst => inst.name === name)) {
            UI.showError('Já existe uma instância com este nome');
            return;
        }

        UI.showLoading('Verificando conexão da instância...');

        try {
            const connectionStatus = await this.checkInstanceConnection(name, apikey);

            const newInstance = {
                id: Date.now(),
                name: name,
                apikey: apikey,
                status: connectionStatus.status,
                qrCode: connectionStatus.qrCode || null,
                lastCheck: new Date(),
                totalSent: 0,
                successCount: 0,
                errorCount: 0
            };

            AppState.instances.push(newInstance);
            this.saveInstances();
            this.updateInstancesList();

            nameInput.value = '';
            apikeyInput.value = '';

            const collapse = bootstrap.Collapse.getInstance(document.getElementById('instanceForm'));
            if (collapse) collapse.hide();

            UI.hideLoading();

            if (connectionStatus.status === 'connected') {
                UI.showSuccess(`Instância "${name}" conectada com sucesso!`);
                this.updateActiveInstances();
            } else {
                UI.showWarning(`Instância "${name}" adicionada, mas está desconectada`);
                this.showConnectionModal(newInstance);
            }

        } catch (error) {
            UI.hideLoading();
            UI.showError('Erro ao verificar instância: ' + error.message);
        }
    },

    async checkInstanceConnection(instanceName, instanceAPIKEY) {
        try {
            const response = await fetch(APP_CONFIG.webhookConexao, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ instanceName, instanceAPIKEY })
            });

            const data = await response.json();

            if (data.result === 'error') {
                return { status: 'error', message: 'Instância não encontrada' };
            } else if (data.result === 'open') {
                return { status: 'connected' };
            } else {
                return { status: 'disconnected', qrCode: data.result };
            }
        } catch (error) {
            return { status: 'error', message: error.message };
        }
    },

    async checkConnection(instanceId) {
        const instance = AppState.instances.find(inst => inst.id === instanceId);
        if (!instance) return;

        UI.showLoading('Verificando conexão...');

        try {
            const connectionStatus = await this.checkInstanceConnection(instance.name, instance.apikey);
            instance.status = connectionStatus.status;
            instance.qrCode = connectionStatus.qrCode || null;
            instance.lastCheck = new Date();

            this.saveInstances();
            this.updateInstancesList();

            UI.hideLoading();

            if (connectionStatus.status === 'connected') {
                UI.showSuccess(`Instância "${instance.name}" está conectada!`);
            } else {
                UI.showWarning(`Instância "${instance.name}" está desconectada`);
                if (connectionStatus.status === 'disconnected') {
                    this.showConnectionModal(instance);
                }
            }
        } catch (error) {
            UI.hideLoading();
            UI.showError('Erro ao verificar conexão: ' + error.message);
        }
    },

    showConnectionModal(instanceData) {
        const instance = typeof instanceData === 'number' ?
            AppState.instances.find(inst => inst.id === instanceData) : instanceData;

        if (!instance) return;

        const modal = bootstrap.Modal.getInstance(document.getElementById('connectionModal')) ||
            new bootstrap.Modal(document.getElementById('connectionModal'));

        const modalTitle = document.querySelector('#connectionModal .modal-title');
        if (modalTitle) {
            modalTitle.innerHTML = `<i class="bi bi-whatsapp me-2"></i>Conectar - ${instance.name}`;
        }

        modal.show();
        ConnectionManager.performConnectionCheck(instance.name, instance.apikey);
    },

    removeInstance(instanceId) {
        const instance = AppState.instances.find(inst => inst.id === instanceId);
        if (!instance) return;

        UI.confirm(
            'Remover Instância',
            `Tem certeza que deseja remover a instância "${instance.name}"?`,
            () => {
                AppState.instances = AppState.instances.filter(inst => inst.id !== instanceId);
                this.saveInstances();
                this.updateInstancesList();
                UI.showSuccess(`Instância "${instance.name}" removida`);
            }
        );
    },

    editInstance(instanceId) {
        const instance = AppState.instances.find(inst => inst.id === instanceId);
        if (!instance) return;

        const newName = prompt('Novo nome da instância:', instance.name);
        if (newName && newName.trim() && newName !== instance.name) {
            instance.name = newName.trim();
            this.saveInstances();
            this.updateInstancesList();
            UI.showSuccess('Nome da instância atualizado');
        }
    },

    async autoCheckConnections() {
        console.log('🔄 Verificação automática de instâncias...');

        for (const instance of AppState.instances) {
            try {
                const connectionStatus = await this.checkInstanceConnection(instance.name, instance.apikey);

                if (instance.status !== connectionStatus.status) {
                    console.log(`📡 Status da instância ${instance.name}: ${instance.status} → ${connectionStatus.status}`);
                    instance.status = connectionStatus.status;
                    instance.lastCheck = new Date();
                }
            } catch (error) {
                console.warn(`⚠️ Erro ao verificar ${instance.name}:`, error);
                instance.status = 'error';
            }
        }

        this.saveInstances();
        this.updateInstancesList();
    },

    async recheckAllInstancesAfterRestore() {
        if (AppState.instances.length === 0) return;

        UI.showLoading('Verificando conexão das instâncias restauradas...');

        for (const instance of AppState.instances) {
            try {
                const connectionStatus = await this.checkInstanceConnection(instance.name, instance.apikey);
                instance.status = connectionStatus.status;
                instance.qrCode = connectionStatus.qrCode || null;
                instance.lastCheck = new Date();
            } catch (error) {
                instance.status = 'error';
            }

            await Utils.sleep(1000);
        }

        this.saveInstances();
        this.updateInstancesList();
        UI.hideLoading();

        const connectedCount = AppState.instances.filter(i => i.status === 'connected').length;

        if (connectedCount > 0) {
            UI.showSuccess(`${connectedCount} instância(s) conectada(s) e pronta(s) para uso!`);
        } else {
            UI.showWarning('Nenhuma instância está conectada. Verifique as conexões manualmente.');
        }
    }
};

// ========================================
// 19B. GERENCIAMENTO DE MÚLTIPLAS MENSAGENS
// ========================================
const MultipleMessagesManager = {
    initialize() {
        console.log('🔧 Inicializando MultipleMessagesManager...');

        // Sempre ativar modo múltiplas mensagens
        AppState.multipleMessagesEnabled = true;

        // Garantir que msg1 sempre está ativada
        AppState.messagesConfig.msg1.enabled = true;

        // ✅ DEBUG: Verificar se elementos existem
        const multipleMode = document.getElementById('multipleMessagesMode');
        const previewContainer = document.getElementById('previewContainer');
        const previewContent = document.getElementById('previewContent');

        console.log('🔍 Elementos encontrados:', {
            multipleMode: !!multipleMode,
            previewContainer: !!previewContainer,
            previewContent: !!previewContent
        });

        // Event listeners para as abas
        this.setupTabListeners();

        // Event listeners para os campos de mensagem
        this.setupMessageListeners();

        // Mostrar modo múltiplas
        this.toggleMessageModes();

        // Inicializar estado
        this.updateActiveMessagesInfo();
    },

    // ✅ SUBSTITUIR função toggleMessageModes completa
    toggleMessageModes() {
        // Sempre ativar modo múltiplas mensagens
        const multipleMode = document.getElementById('multipleMessagesMode');
        const previewContainer = document.getElementById('previewContainer');

        if (multipleMode) {
            multipleMode.style.display = 'block';
            console.log('✅ Modo múltiplas mensagens ativado');
        }

        if (previewContainer) {
            previewContainer.style.display = 'block';
            console.log('✅ Preview container ativado');
        }

        // Atualizar preview da primeira mensagem
        setTimeout(() => {
            console.log('🔄 Atualizando preview inicial...');
            this.updateMainPreview('msg1');
        }, 100);

        this.updateActiveMessagesInfo();
    },

    setupTabListeners() {
        ['msg1', 'msg2', 'msg3'].forEach(msgId => {
            const tab = document.getElementById(`${msgId}-tab`);
            if (tab) {
                tab.addEventListener('click', () => {
                    setTimeout(() => this.updateMainPreview(msgId), 100);
                });
            }
        });
    },

    setupMessageListeners() {
        ['msg1', 'msg2', 'msg3'].forEach(msgId => {
            // Checkbox de ativação
            const enabledCheckbox = document.getElementById(`${msgId}-enabled`);
            if (enabledCheckbox) {
                enabledCheckbox.addEventListener('change', (e) => {
                    AppState.messagesConfig[msgId].enabled = e.target.checked;
                    // ✅ ATUALIZAR CONTADOR IMEDIATAMENTE
                    this.updateActiveMessagesInfo();
                    this.updateMessageStatus(msgId);
                    this.updateMainPreview(msgId);
                });
            }

            // Campo de texto com editor rico
            const textInput = document.getElementById(`${msgId}-text`);
            if (textInput) {
                textInput.addEventListener('input', (e) => {
                    AppState.messagesConfig[msgId].text = e.target.value;
                    // ✅ ATUALIZAR CONTADOR QUANDO TEXTO MUDA
                    this.updateActiveMessagesInfo();
                    this.updateMainPreview(msgId);
                    this.updateMessageStatus(msgId);
                    this.updateCharCounter(msgId);
                });
            }

            // Campo de mídia
            const mediaInput = document.getElementById(`${msgId}-media`);
            if (mediaInput) {
                mediaInput.addEventListener('change', (e) => {
                    this.handleMediaChange(msgId, e.target.files[0]);
                });
            }

            // Inicializar editor rico para cada mensagem
            this.initializeRichTextEditor(msgId);
        });
    },

    // async handleMediaChange(msgId, file) {
    //     if (file) {
    //         console.log('📎 Processando arquivo para:', msgId, file.name, file.type);

    //         // ✅ VALIDAÇÃO DE TAMANHO ANTES DE PROCESSAR
    //         const maxSize = 16 * 1024 * 1024; // 16MB
    //         if (file.size > maxSize) {
    //             UI.showError(`Arquivo muito grande: ${(file.size / 1024 / 1024).toFixed(1)}MB. Máximo permitido: 16MB`);

    //             // Limpar o input
    //             const mediaInput = document.getElementById(`${msgId}-media`);
    //             if (mediaInput) {
    //                 mediaInput.value = '';
    //             }
    //             return;
    //         }

    //         // ✅ VALIDAÇÃO ESPECÍFICA PARA VÍDEO
    //         if (file.type.startsWith('video/') && file.size > maxSize) {
    //             UI.showError(`Vídeo muito grande: ${(file.size / 1024 / 1024).toFixed(1)}MB. Máximo para vídeos: 16MB`);

    //             const mediaInput = document.getElementById(`${msgId}-media`);
    //             if (mediaInput) {
    //                 mediaInput.value = '';
    //             }
    //             return;
    //         }

    //         try {
    //             // ✅ PROCESSAR ARQUIVO APÓS VALIDAÇÃO
    //             const mediaData = await Utils.fileToBase64(file);

    //             // ✅ SALVAR NO ESTADO COM DADOS COMPLETOS
    //             AppState.messagesConfig[msgId].media = {
    //                 filename: file.name,
    //                 data: mediaData,
    //                 mimetype: file.type,
    //                 size: file.size
    //             };

    //             console.log('✅ Mídia salva no estado:', {
    //                 msgId,
    //                 filename: file.name,
    //                 type: file.type,
    //                 dataLength: mediaData.length
    //             });

    //             // ✅ MOSTRAR PREVIEW LATERAL
    //             this.showMediaPreview(msgId, file);

    //             // ✅ DELAY PARA GARANTIR QUE A CONVERSÃO TERMINOU
    //             setTimeout(() => {
    //                 this.updateMainPreview(msgId);
    //             }, 200);

    //         } catch (error) {
    //             console.error('❌ Erro ao processar arquivo:', error);
    //             UI.showError('Erro ao processar arquivo: ' + error.message);
    //         }
    //     } else {
    //         console.log('🗑️ Removendo mídia de:', msgId);
    //         AppState.messagesConfig[msgId].media = null;
    //         this.hideMediaPreview(msgId);
    //         this.updateMainPreview(msgId);
    //     }

    //     // ✅ ATUALIZAR CONTADOR QUANDO MÍDIA MUDA
    //     this.updateActiveMessagesInfo();
    //     this.updateMessageStatus(msgId);
    // },

    async handleMediaChange(msgId, file) {
        if (file) {
            console.log('📎 Processando arquivo para:', msgId, file.name, file.type);

            // ✅ VALIDAÇÃO ESPECÍFICA PARA VÍDEOS
            if (file.type.startsWith('video/')) {
                const maxVideoSize = 10 * 1024 * 1024; // 10MB para vídeos (mais restritivo)

                if (file.size > maxVideoSize) {
                    UI.showError(`Vídeo muito grande: ${(file.size / 1024 / 1024).toFixed(1)}MB. Máximo para vídeos: 10MB`);

                    const mediaInput = document.getElementById(`${msgId}-media`);
                    if (mediaInput) {
                        mediaInput.value = '';
                    }
                    return;
                }

                // Verificar duração do vídeo (opcional)
                const videoDuration = await this.getVideoDuration(file);
                if (videoDuration > 300) { // 5 minutos máximo
                    UI.showError(`Vídeo muito longo: ${Math.round(videoDuration)}s. Máximo: 5 minutos`);

                    const mediaInput = document.getElementById(`${msgId}-media`);
                    if (mediaInput) {
                        mediaInput.value = '';
                    }
                    return;
                }

                console.log(`✅ Vídeo validado: ${file.name} (${(file.size / 1024 / 1024).toFixed(1)}MB, ${Math.round(videoDuration)}s)`);
            }

            // ✅ VALIDAÇÃO GERAL DE TAMANHO
            const maxSize = 16 * 1024 * 1024; // 16MB geral
            if (file.size > maxSize && !file.type.startsWith('video/')) {
                UI.showError(`Arquivo muito grande: ${(file.size / 1024 / 1024).toFixed(1)}MB. Máximo permitido: 16MB`);

                const mediaInput = document.getElementById(`${msgId}-media`);
                if (mediaInput) {
                    mediaInput.value = '';
                }
                return;
            }

            try {
                // ✅ PROCESSAR ARQUIVO APÓS VALIDAÇÃO
                const mediaData = await Utils.fileToBase64(file);

                // ✅ SALVAR NO ESTADO COM DADOS COMPLETOS
                AppState.messagesConfig[msgId].media = {
                    filename: file.name,
                    data: mediaData,
                    mimetype: file.type,
                    size: file.size
                };

                console.log('✅ Mídia salva no estado:', {
                    msgId,
                    filename: file.name,
                    type: file.type,
                    dataLength: mediaData.length
                });

                // ✅ MOSTRAR PREVIEW LATERAL
                this.showMediaPreview(msgId, file);

                // ✅ DELAY PARA GARANTIR QUE A CONVERSÃO TERMINOU
                setTimeout(() => {
                    this.updateMainPreview(msgId);
                }, 200);

            } catch (error) {
                console.error('❌ Erro ao processar arquivo:', error);
                UI.showError('Erro ao processar arquivo: ' + error.message);
            }
        } else {
            console.log('🗑️ Removendo mídia de:', msgId);
            AppState.messagesConfig[msgId].media = null;
            this.hideMediaPreview(msgId);
            this.updateMainPreview(msgId);
        }

        // ✅ ATUALIZAR CONTADOR QUANDO MÍDIA MUDA
        this.updateActiveMessagesInfo();
        this.updateMessageStatus(msgId);
    },

    // ✅ NOVA FUNÇÃO PARA VERIFICAR DURAÇÃO DO VÍDEO
    getVideoDuration(file) {
        return new Promise((resolve) => {
            const video = document.createElement('video');
            video.preload = 'metadata';

            video.onloadedmetadata = () => {
                URL.revokeObjectURL(video.src);
                resolve(video.duration);
            };

            video.onerror = () => {
                resolve(0); // Se der erro, assumir que é válido
            };

            video.src = URL.createObjectURL(file);
        });
    },

    showMediaPreview(msgId, file) {
        const preview = document.getElementById(`${msgId}-media-preview`);
        if (!preview) return;

        console.log('📎 Criando preview lateral para:', file.name, file.type);

        let previewHTML = '';

        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                preview.innerHTML = `
                <div class="d-flex align-items-center">
                    <img src="${e.target.result}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 5px;" alt="Preview">
                    <div class="ms-2">
                        <div class="fw-bold">${file.name}</div>
                        <small class="text-muted">${(file.size / 1024).toFixed(1)} KB</small>
                    </div>
                    <button type="button" class="btn btn-outline-danger btn-sm ms-auto" onclick="MultipleMessagesManager.clearMedia('${msgId}')">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            `;
                preview.style.display = 'block';

                // ✅ ATUALIZAR PREVIEW PRINCIPAL APÓS CARREGAR IMAGEM
                setTimeout(() => this.updateMainPreview(msgId), 100);
            };
            reader.readAsDataURL(file);
            return; // ✅ IMPORTANTE: Sair aqui para não executar o resto

        } else if (file.type.startsWith('video/')) {
            previewHTML = `
            <div class="d-flex align-items-center">
                <div class="media-preview-icon"><i class="bi bi-play-circle fs-2 text-primary"></i></div>
                <div class="ms-2">
                    <div class="fw-bold">${file.name}</div>
                    <small class="text-muted">${(file.size / 1024).toFixed(1)} KB</small>
                </div>
                <button type="button" class="btn btn-outline-danger btn-sm ms-auto" onclick="MultipleMessagesManager.clearMedia('${msgId}')">
                    <i class="bi bi-trash"></i>
                </button>
            </div>
        `;
        } else if (file.type === 'application/pdf') {
            previewHTML = `
            <div class="d-flex align-items-center">
                <div class="media-preview-icon"><i class="bi bi-file-pdf fs-2 text-danger"></i></div>
                <div class="ms-2">
                    <div class="fw-bold">${file.name}</div>
                    <small class="text-muted">${(file.size / 1024).toFixed(1)} KB</small>
                </div>
                <button type="button" class="btn btn-outline-danger btn-sm ms-auto" onclick="MultipleMessagesManager.clearMedia('${msgId}')">
                    <i class="bi bi-trash"></i>
                </button>
            </div>
        `;
        } else if (file.type.startsWith('audio/')) {
            previewHTML = `
            <div class="d-flex align-items-center">
                <div class="media-preview-icon"><i class="bi bi-music-note fs-2 text-success"></i></div>
                <div class="ms-2">
                    <div class="fw-bold">${file.name}</div>
                    <small class="text-muted">${(file.size / 1024).toFixed(1)} KB</small>
                </div>
                <button type="button" class="btn btn-outline-danger btn-sm ms-auto" onclick="MultipleMessagesManager.clearMedia('${msgId}')">
                    <i class="bi bi-trash"></i>
                </button>
            </div>
        `;
        } else {
            previewHTML = `
            <div class="d-flex align-items-center">
                <div class="media-preview-icon"><i class="bi bi-file-earmark fs-2 text-secondary"></i></div>
                <div class="ms-2">
                    <div class="fw-bold">${file.name}</div>
                    <small class="text-muted">${(file.size / 1024).toFixed(1)} KB</small>
                </div>
                <button type="button" class="btn btn-outline-danger btn-sm ms-auto" onclick="MultipleMessagesManager.clearMedia('${msgId}')">
                    <i class="bi bi-trash"></i>
                </button>
            </div>
        `;
        }

        if (previewHTML) {
            preview.innerHTML = previewHTML;
            preview.style.display = 'block';
        }
    },

    hideMediaPreview(msgId) {
        const preview = document.getElementById(`${msgId}-media-preview`);
        if (preview) {
            preview.style.display = 'none';
            preview.innerHTML = '';
        }
    },

    clearMedia(msgId) {
        AppState.messagesConfig[msgId].media = null;

        const mediaInput = document.getElementById(`${msgId}-media`);
        if (mediaInput) {
            mediaInput.value = '';
        }

        this.hideMediaPreview(msgId);
        this.updateMainPreview(msgId);
        this.updateMessageStatus(msgId);

        UI.showInfo('Mídia removida');
    },

    // ✅ SUBSTITUIR função updateMainPreview completa
    updateMainPreview(currentMsgId) {
        const config = AppState.messagesConfig[currentMsgId];
        // ✅ CORREÇÃO: Mudou de multiplePreviewContent para previewContent
        const previewBody = document.getElementById('previewContent');
        const currentPreviewMessage = document.getElementById('currentPreviewMessage');
        // ✅ CORREÇÃO: Mudou de multiplePreviewAvatar para previewAvatar
        const previewAvatar = document.getElementById('previewAvatar');
        // ✅ CORREÇÃO: Mudou de multiplePreviewContactName para previewContactName
        const previewContactName = document.getElementById('previewContactName');

        if (!previewBody || !currentPreviewMessage) return;

        // Definir nome do contato para o preview
        let exampleName = 'João Silva';
        if (AppState.contacts.length > 0) {
            exampleName = AppState.contacts[0].name;
        }

        // Atualizar avatar e nome
        if (previewAvatar) previewAvatar.textContent = exampleName.charAt(0).toUpperCase();
        if (previewContactName) previewContactName.textContent = exampleName;

        // Atualizar badge da mensagem atual
        const msgNumber = currentMsgId.replace('msg', '');
        const isEnabled = config.enabled;
        const hasContent = config.text.trim() || config.media;

        currentPreviewMessage.textContent = `Mensagem ${msgNumber}`;
        currentPreviewMessage.className = `badge ${isEnabled && hasContent ? 'bg-success' : isEnabled ? 'bg-warning' : 'bg-secondary'}`;

        if (!isEnabled) {
            previewBody.innerHTML = `
            <div class="preview-placeholder">
                <i class="bi bi-x-circle fs-3 mb-2 d-block"></i>
                Mensagem ${msgNumber} está desativada
            </div>
        `;
            return;
        }

        if (!hasContent) {
            previewBody.innerHTML = `
            <div class="preview-placeholder">
                <i class="bi bi-chat-text fs-3 mb-2 d-block"></i>
                Configure a mensagem ${msgNumber} para visualizar
            </div>
        `;
            return;
        }

        // Mostrar preview da mensagem ativa no estilo WhatsApp
        let previewHTML = '<div class="whatsapp-message text-white">';

        // Adicionar mídia se existir
        if (config.media) {
            //console.log('📎 Processando mídia para preview:', config.media);

            if (config.media.mimetype.startsWith('image/')) {
                const imageData = `data:${config.media.mimetype};base64,${config.media.data}`;
                previewHTML += `<img src="${imageData}" class="whatsapp-media" alt="Preview da imagem">`;

            } else if (config.media.mimetype.startsWith('video/')) {
                const videoData = `data:${config.media.mimetype};base64,${config.media.data}`;
                previewHTML += `<video controls class="whatsapp-media" style="max-width: 100%; width: 100%; height: auto; border-radius: 10px;"><source src="${videoData}" type="${config.media.mimetype}"></video>`;

            } else if (config.media.mimetype === 'application/pdf') {
                previewHTML += `<div class="whatsapp-media d-flex align-items-center justify-content-center bg-light" style="height: 200px;">
                <div class="text-center">
                    <i class="bi bi-file-pdf fs-1 text-danger"></i>
                    <div class="mt-2 small text-muted">${config.media.filename}</div>
                </div>
            </div>`;

            } else if (config.media.mimetype.startsWith('audio/')) {
                const audioData = `data:${config.media.mimetype};base64,${config.media.data}`;
                previewHTML += `<audio controls class="whatsapp-media" style="width: 100%; border-radius: 10px;"><source src="${audioData}" type="${config.media.mimetype}"></audio>`;
            } else {
                previewHTML += `<div class="d-flex align-items-center mb-2">
                <i class="bi bi-file-earmark me-2"></i>
                <span>${config.media.filename}</span>
            </div>`;
            }
        }

        // Adicionar texto se existir
        if (config.text.trim()) {
            let personalizedMessage = config.text
                .replace(/{nome}/g, exampleName)
                .replace(/{saudacao}/g, Utils.getSaudacao())
                .replace(/\*([^*]+)\*/g, '<strong>$1</strong>')
                .replace(/_([^_]+)_/g, '<em>$1</em>')
                .replace(/\n/g, '<br>');

            previewHTML += `<div>${personalizedMessage}</div>`;
        }

        previewHTML += `
        <div class="whatsapp-time text-white">
            ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            <i class="bi bi-check2-all"></i>
        </div>
    </div>`;

        previewBody.innerHTML = previewHTML;
    },

    updateMessageStatus(msgId) {
        const config = AppState.messagesConfig[msgId];
        const statusBadge = document.getElementById(`${msgId}-status`);

        if (!statusBadge) return;

        const hasContent = config.text.trim() || config.media;
        const isComplete = config.enabled && hasContent;

        if (config.enabled && !hasContent) {
            statusBadge.style.display = 'inline';
            statusBadge.className = 'badge bg-warning ms-2';
            statusBadge.textContent = '!';
            statusBadge.title = 'Mensagem ativa mas sem conteúdo';
        } else {
            statusBadge.style.display = 'none';
        }
    },

    updateActiveMessagesInfo() {
        console.log('🔢 Atualizando contador de mensagens ativas...');

        // ✅ VERIFICAR ESTADO ATUAL DAS MENSAGENS
        const messages = AppState.messagesConfig;
        console.log('📊 Estado atual das mensagens:', {
            msg1: { enabled: messages.msg1.enabled, hasText: !!messages.msg1.text.trim(), hasMedia: !!messages.msg1.media },
            msg2: { enabled: messages.msg2.enabled, hasText: !!messages.msg2.text.trim(), hasMedia: !!messages.msg2.media },
            msg3: { enabled: messages.msg3.enabled, hasText: !!messages.msg3.text.trim(), hasMedia: !!messages.msg3.media }
        });

        // Contar mensagens que estão ativas E têm conteúdo
        const activeMessages = Object.values(AppState.messagesConfig)
            .filter(config => {
                const isEnabled = config.enabled;
                const hasContent = config.text.trim() || config.media;
                console.log('🔍 Verificando mensagem:', { isEnabled, hasContent, text: config.text.trim(), hasMedia: !!config.media });
                return isEnabled && hasContent;
            });

        const activeCount = activeMessages.length;
        console.log('📈 Total de mensagens ativas com conteúdo:', activeCount);

        const infoElement = document.getElementById('activeMessagesCount');
        if (infoElement) {
            const text = `${activeCount} mensagem${activeCount !== 1 ? 's' : ''} ativa${activeCount !== 1 ? 's' : ''}`;
            infoElement.textContent = text;
            console.log('✅ Contador atualizado:', text);
        } else {
            console.warn('⚠️ Elemento activeMessagesCount não encontrado');
        }

        // Atualizar cor do badge baseado no status
        const badgeElement = document.getElementById('activeMessagesInfo');
        if (badgeElement) {
            if (activeCount === 0) {
                badgeElement.className = 'alert alert-warning mt-3';
            } else {
                badgeElement.className = 'alert alert-success mt-3';
            }
        }

        // Atualizar status de cada mensagem individual
        ['msg1', 'msg2', 'msg3'].forEach(msgId => {
            this.updateMessageStatus(msgId);
        });

        // ✅ DISPARO PERSONALIZADO PARA DEBUG
        console.log('🎯 Contador de mensagens ativas atualizado:', activeCount);
    },

    getRandomActiveMessage() {
        const activeMessages = Object.entries(AppState.messagesConfig)
            .filter(([id, config]) => config.enabled && (config.text.trim() || config.media));

        console.log('🔍 Mensagens ativas disponíveis:', activeMessages.map(([id]) => id));

        if (activeMessages.length === 0) {
            throw new Error('Nenhuma mensagem ativa configurada');
        }

        if (activeMessages.length === 1) {
            console.log(`📝 Apenas 1 mensagem ativa: ${activeMessages[0][0]}`);
            const [messageId, messageConfig] = activeMessages[0];
            return {
                id: messageId,
                text: messageConfig.text || '',
                media: messageConfig.media
            };
        }

        // ✅ SISTEMA DE ROTAÇÃO EQUILIBRADA
        // Inicializar ou recuperar histórico de uso
        if (!window.messageUsageHistory) {
            window.messageUsageHistory = {};
        }

        // Contar quantas vezes cada mensagem foi usada
        const usageCounts = {};
        activeMessages.forEach(([id]) => {
            usageCounts[id] = window.messageUsageHistory[id] || 0;
        });

        console.log('📊 Histórico de uso atual:', usageCounts);

        // Encontrar a(s) mensagem(ns) menos usada(s)
        const minUsage = Math.min(...Object.values(usageCounts));
        const leastUsedMessages = activeMessages.filter(([id]) => usageCounts[id] === minUsage);

        console.log(`📈 Mensagens menos usadas (${minUsage} usos):`, leastUsedMessages.map(([id]) => id));

        // Se há várias mensagens com o mesmo uso mínimo, escolher aleatoriamente entre elas
        const randomIndex = Math.floor(Math.random() * leastUsedMessages.length);
        const [selectedId, selectedConfig] = leastUsedMessages[randomIndex];

        // ✅ INCREMENTAR CONTADOR E MANTER HISTÓRICO COMPLETO
        window.messageUsageHistory[selectedId] = (window.messageUsageHistory[selectedId] || 0) + 1;

        // Garantir que todas as mensagens ativas estejam no histórico
        activeMessages.forEach(([id]) => {
            if (!(id in window.messageUsageHistory)) {
                window.messageUsageHistory[id] = 0;
            }
        });

        console.log(`🎯 Mensagem "${selectedId}" selecionada (${randomIndex + 1}/${leastUsedMessages.length} candidatas)`);
        console.log('📊 Novo histórico completo:', window.messageUsageHistory);

        return {
            id: selectedId,
            text: selectedConfig.text || '',
            media: selectedConfig.media
        };
    },

    validateMessages() {
        const activeMessages = Object.values(AppState.messagesConfig)
            .filter(config => config.enabled);

        if (activeMessages.length === 0) {
            return { valid: false, error: 'Ative pelo menos uma mensagem' };
        }

        const validMessages = activeMessages.filter(config =>
            config.text.trim() || config.media
        );

        if (validMessages.length === 0) {
            return { valid: false, error: 'Configure conteúdo para pelo menos uma mensagem ativa' };
        }

        return { valid: true };
    },

    initializeRichTextEditor(msgId) {
        const boldBtn = document.getElementById(`${msgId}BoldBtn`);
        const italicBtn = document.getElementById(`${msgId}ItalicBtn`);
        const clearBtn = document.getElementById(`${msgId}ClearFormatBtn`);

        // NOVOS BOTÕES DE TAGS
        const nameBtn = document.getElementById(`${msgId}NameBtn`);
        const greetingBtn = document.getElementById(`${msgId}GreetingBtn`);

        const textarea = document.getElementById(`${msgId}-text`);

        if (!textarea) return;

        // Event listeners para os botões de formatação
        if (boldBtn) boldBtn.addEventListener('click', () => this.toggleFormat(msgId, 'bold'));
        if (italicBtn) italicBtn.addEventListener('click', () => this.toggleFormat(msgId, 'italic'));
        if (clearBtn) clearBtn.addEventListener('click', () => this.clearFormatting(msgId));

        // NOVOS EVENT LISTENERS PARA TAGS
        if (nameBtn) nameBtn.addEventListener('click', () => this.insertTag(msgId, 'nome'));
        if (greetingBtn) greetingBtn.addEventListener('click', () => this.insertTag(msgId, 'saudacao'));

        // Event listeners para o textarea
        textarea.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(msgId, e));
        textarea.addEventListener('select', () => this.updateToolbarState(msgId));
        textarea.addEventListener('click', () => this.updateToolbarState(msgId));

        // Inicializar contador
        this.updateCharCounter(msgId);
    },

    insertTag(msgId, tagType) {
        const tags = {
            'nome': '{nome}',
            'saudacao': '{saudacao}'
        };

        const tag = tags[tagType];
        if (!tag) return;

        const textarea = document.getElementById(`${msgId}-text`);
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const value = textarea.value;

        // Inserir a tag
        const newValue = value.slice(0, start) + tag + value.slice(end);
        textarea.value = newValue;
        AppState.messagesConfig[msgId].text = newValue;

        // Posicionar cursor após a tag
        const newPosition = start + tag.length;
        textarea.setSelectionRange(newPosition, newPosition);
        textarea.focus();

        // Animação especial para tags
        this.animateTagButton(msgId, tagType);
        this.updateCharCounter(msgId);
        this.updateMainPreview(msgId);
        this.updateMessageStatus(msgId);

        console.log(`✅ Tag {${tagType}} inserida em ${msgId} na posição ${start}`);
    },

    // NOVO MÉTODO PARA ANIMAÇÃO DE TAGS
    animateTagButton(msgId, tagType) {
        let button;
        switch (tagType) {
            case 'nome':
                button = document.getElementById(`${msgId}NameBtn`);
                break;
            case 'saudacao':
                button = document.getElementById(`${msgId}GreetingBtn`);
                break;
        }

        if (button) {
            button.classList.add('clicked');
            setTimeout(() => button.classList.remove('clicked'), 300);
        }
    },

    toggleFormat(msgId, type) {
        const textarea = document.getElementById(`${msgId}-text`);
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = textarea.value.substring(start, end);

        if (selectedText.length === 0) {
            this.insertFormatMarkers(msgId, type);
        } else {
            this.wrapSelectedText(msgId, type, selectedText, start, end);
        }

        this.animateButton(msgId, type);
        this.updateCharCounter(msgId);
        this.updateMainPreview(msgId);
    },

    insertFormatMarkers(msgId, type) {
        const markers = { 'bold': '*', 'italic': '_' };
        const marker = markers[type];
        const textarea = document.getElementById(`${msgId}-text`);

        const start = textarea.selectionStart;
        const value = textarea.value;

        const newValue = value.slice(0, start) + marker + marker + value.slice(start);
        textarea.value = newValue;

        const newPosition = start + marker.length;
        textarea.setSelectionRange(newPosition, newPosition);
        textarea.focus();

        // Atualizar estado
        AppState.messagesConfig[msgId].text = newValue;
    },

    wrapSelectedText(msgId, type, selectedText, start, end) {
        const markers = { 'bold': '*', 'italic': '_' };
        const marker = markers[type];
        const textarea = document.getElementById(`${msgId}-text`);

        const beforeText = textarea.value.substring(Math.max(0, start - marker.length), start);
        const afterText = textarea.value.substring(end, Math.min(textarea.value.length, end + marker.length));

        let newValue;
        if (beforeText === marker && afterText === marker) {
            // Remover formatação existente
            newValue = textarea.value.slice(0, start - marker.length) +
                selectedText +
                textarea.value.slice(end + marker.length);
            textarea.setSelectionRange(start - marker.length, end - marker.length);
        } else {
            // Adicionar formatação
            newValue = textarea.value.slice(0, start) +
                marker + selectedText + marker +
                textarea.value.slice(end);
            textarea.setSelectionRange(start, end + (marker.length * 2));
        }

        textarea.value = newValue;
        textarea.focus();

        // Atualizar estado
        AppState.messagesConfig[msgId].text = newValue;
    },

    clearFormatting(msgId) {
        const textarea = document.getElementById(`${msgId}-text`);
        if (!textarea) return;

        let text = textarea.value;
        text = text.replace(/\*([^*]+)\*/g, '$1'); // Remove *bold*
        text = text.replace(/_([^_]+)_/g, '$1');   // Remove _italic_

        textarea.value = text;
        AppState.messagesConfig[msgId].text = text;

        this.updateCharCounter(msgId);
        this.updateMainPreview(msgId);
        this.animateButton(msgId, 'clear');
    },

    updateCharCounter(msgId) {
        const textarea = document.getElementById(`${msgId}-text`);
        const counter = document.getElementById(`${msgId}CharCounter`);

        if (!textarea || !counter) return;

        const currentLength = textarea.value.length;
        const maxLength = textarea.maxLength || 4096;

        counter.textContent = `${currentLength}/${maxLength}`;

        if (currentLength > maxLength * 0.9) {
            counter.style.color = '#dc3545';
        } else if (currentLength > maxLength * 0.8) {
            counter.style.color = '#ffc107';
        } else {
            counter.style.color = '#6c757d';
        }
    },

    updateToolbarState(msgId) {
        const textarea = document.getElementById(`${msgId}-text`);
        const boldBtn = document.getElementById(`${msgId}BoldBtn`);
        const italicBtn = document.getElementById(`${msgId}ItalicBtn`);

        if (!textarea || !boldBtn || !italicBtn) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;

        if (start === end) {
            const text = textarea.value;
            const beforeCursor = text.substring(0, start);

            const boldMatches = beforeCursor.split('*').length - 1;
            const inBold = boldMatches % 2 === 1;

            const italicMatches = beforeCursor.split('_').length - 1;
            const inItalic = italicMatches % 2 === 1;

            boldBtn.classList.toggle('active', inBold);
            italicBtn.classList.toggle('active', inItalic);
        } else {
            const beforeText = textarea.value.substring(Math.max(0, start - 1), start);
            const afterText = textarea.value.substring(end, Math.min(textarea.value.length, end + 1));

            boldBtn.classList.toggle('active', beforeText === '*' && afterText === '*');
            italicBtn.classList.toggle('active', beforeText === '_' && afterText === '_');
        }
    },

    handleKeyboardShortcuts(msgId, e) {
        if (e.ctrlKey || e.metaKey) {
            switch (e.key.toLowerCase()) {
                case 'b':
                    e.preventDefault();
                    this.toggleFormat(msgId, 'bold');
                    break;
                case 'i':
                    e.preventDefault();
                    this.toggleFormat(msgId, 'italic');
                    break;
                // NOVOS ATALHOS PARA TAGS
                case 'n':
                    if (e.shiftKey) { // Ctrl+Shift+N para {nome}
                        e.preventDefault();
                        this.insertTag(msgId, 'nome');
                    }
                    break;
                case 'g':
                    if (e.shiftKey) { // Ctrl+Shift+G para {saudacao}
                        e.preventDefault();
                        this.insertTag(msgId, 'saudacao');
                    }
                    break;
            }
        }
    },

    animateButton(msgId, type) {
        let button;
        switch (type) {
            case 'bold':
                button = document.getElementById(`${msgId}BoldBtn`);
                break;
            case 'italic':
                button = document.getElementById(`${msgId}ItalicBtn`);
                break;
            case 'clear':
                button = document.getElementById(`${msgId}ClearFormatBtn`);
                break;
        }

        if (button) {
            button.classList.add('clicked');
            setTimeout(() => button.classList.remove('clicked'), 300);
        }
    },

    getRandomActiveMessage() {
        const activeMessages = Object.entries(AppState.messagesConfig)
            .filter(([id, config]) => config.enabled && (config.text.trim() || config.media));

        console.log('🔍 Mensagens ativas disponíveis:', activeMessages.map(([id]) => id));

        if (activeMessages.length === 0) {
            throw new Error('Nenhuma mensagem ativa configurada');
        }

        if (activeMessages.length === 1) {
            console.log(`📝 Apenas 1 mensagem ativa: ${activeMessages[0][0]}`);
            const [messageId, messageConfig] = activeMessages[0];
            return {
                id: messageId,
                text: messageConfig.text || '',
                media: messageConfig.media
            };
        }

        // ✅ SISTEMA DE ROTAÇÃO EQUILIBRADA
        // Inicializar ou recuperar histórico de uso
        if (!window.messageUsageHistory) {
            window.messageUsageHistory = {};
        }

        // Contar quantas vezes cada mensagem foi usada
        const usageCounts = {};
        activeMessages.forEach(([id]) => {
            usageCounts[id] = window.messageUsageHistory[id] || 0;
        });

        console.log('📊 Histórico de uso atual:', usageCounts);

        // Encontrar a(s) mensagem(ns) menos usada(s)
        const minUsage = Math.min(...Object.values(usageCounts));
        const leastUsedMessages = activeMessages.filter(([id]) => usageCounts[id] === minUsage);

        console.log(`📈 Mensagens menos usadas (${minUsage} usos):`, leastUsedMessages.map(([id]) => id));

        // Se há várias mensagens com o mesmo uso mínimo, escolher aleatoriamente entre elas
        const randomIndex = Math.floor(Math.random() * leastUsedMessages.length);
        const [selectedId, selectedConfig] = leastUsedMessages[randomIndex];

        // Incrementar contador de uso
        window.messageUsageHistory[selectedId] = (window.messageUsageHistory[selectedId] || 0) + 1;

        console.log(`🎯 Mensagem "${selectedId}" selecionada (${randomIndex + 1}/${leastUsedMessages.length} candidatas)`);
        console.log('📊 Novo histórico de uso:', window.messageUsageHistory);

        return {
            id: selectedId,
            text: selectedConfig.text || '',
            media: selectedConfig.media
        };
    },

    resetMessageRotation() {
        window.messageUsageHistory = {};
        console.log('🔄 Histórico de rotação de mensagens resetado');
    },
};

// Expor globalmente
window.MultipleMessagesManager = MultipleMessagesManager;


// ========================================
// 20. GERENCIAMENTO PWA
// ========================================
const PWAManager = {
    initialize() {
        // Verificar se está rodando em HTTPS ou localhost
        if (this.canRegisterServiceWorker()) {
            this.registerServiceWorker();
        } else {
            console.log('⚠️ Service Worker não disponível (requer HTTPS ou localhost)');
        }

        this.setupInstallPrompt();
    },

    canRegisterServiceWorker() {
        // Verificar se está em HTTPS, localhost ou file://
        const isHTTPS = location.protocol === 'https:';
        const isLocalhost = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
        const isFile = location.protocol === 'file:';

        return 'serviceWorker' in navigator && (isHTTPS || isLocalhost) && !isFile;
    },

    async registerServiceWorker() {
        try {
            // Para protocolo file://, não tentar registrar SW
            if (location.protocol === 'file:') {
                console.log('📁 Protocolo file:// detectado - Service Worker desabilitado');
                return;
            }

            const registration = await navigator.serviceWorker.register('./service-worker.js');
            console.log('✅ Service Worker registrado com sucesso');

            AppState.registration = registration;

            // ✅ APENAS registrar - SEM notificações de atualização
            this.setupBasicCaching(registration);

        } catch (error) {
            console.log('⚠️ SW registration failed:', error.message);
        }
    },

    setupBasicCaching(registration) {
        // Apenas setup básico para cache offline - sem notificações
        registration.addEventListener('updatefound', () => {
            console.log('🔄 Nova versão encontrada (silencioso)');
            const newWorker = registration.installing;

            if (newWorker) {
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed') {
                        if (navigator.serviceWorker.controller) {
                            console.log('🆕 Nova versão instalada (background)');
                            // ✅ NÃO mostrar banner - deixar atualizar naturalmente
                        } else {
                            console.log('✅ App instalado e pronto para usar offline');
                            this.showOfflineReady();
                        }
                    }
                });
            }
        });
    },

    setupInstallPrompt() {
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            AppState.deferredPrompt = e;
            this.showInstallButton();
        });

        // Detectar quando o app foi instalado
        window.addEventListener('appinstalled', () => {
            console.log('✅ PWA foi instalado');
            AppState.deferredPrompt = null;
            UI.showSuccess('App instalado com sucesso!');
        });
    },

    showInstallButton() {
        // Evitar múltiplos botões
        if (document.getElementById('pwa-install-btn')) return;

        const installButton = document.createElement('button');
        installButton.id = 'pwa-install-btn';
        installButton.className = 'btn btn-success btn-sm position-fixed';
        installButton.style.cssText = 'bottom: 20px; left: 20px; z-index: 1050; box-shadow: 0 4px 12px rgba(0,0,0,0.3);';
        installButton.innerHTML = '<i class="bi bi-download me-2"></i>Instalar App';

        installButton.addEventListener('click', async () => {
            if (AppState.deferredPrompt) {
                try {
                    AppState.deferredPrompt.prompt();
                    const { outcome } = await AppState.deferredPrompt.userChoice;

                    if (outcome === 'accepted') {
                        console.log('✅ Usuário aceitou instalação');
                    } else {
                        console.log('❌ Usuário rejeitou instalação');
                    }

                    AppState.deferredPrompt = null;
                    installButton.remove();
                } catch (error) {
                    console.error('Erro na instalação:', error);
                    installButton.remove();
                }
            }
        });

        document.body.appendChild(installButton);

        // Auto-remover após 15 segundos
        setTimeout(() => {
            if (installButton.parentNode) {
                installButton.remove();
            }
        }, 15000);
    },

    showOfflineReady() {
        UI.showSuccess('App pronto para usar offline!');
    },

    cleanup() {
        try {
            // Limpar botão de instalação se existir
            const installBtn = document.getElementById('pwa-install-btn');
            if (installBtn) {
                installBtn.remove();
            }

            console.log('🧹 PWA cleanup concluído');
        } catch (error) {
            console.warn('⚠️ Erro durante PWA cleanup:', error);
        }
    },

    // ✅ MÉTODO SIMPLES para verificação manual (sem banner)
    checkForUpdates() {
        if (AppState.registration) {
            UI.showLoading('Verificando atualizações...');

            AppState.registration.update().then(() => {
                setTimeout(() => {
                    UI.hideLoading();
                    UI.showInfo('Verificação concluída. Se houver atualizações, serão aplicadas automaticamente.');
                }, 2000);
            }).catch((error) => {
                UI.hideLoading();
                console.warn('Erro ao verificar atualizações:', error);
                UI.showWarning('Não foi possível verificar atualizações');
            });
        } else {
            UI.showInfo('Service Worker não disponível');
        }
    }
};

// ========================================
// 21. GERENCIAMENTO DE EVENTOS
// ========================================
const EventManager = {
    setupFileUpload() {
        console.log('🔧 Configurando upload de arquivos...');

        const fileUploadArea = document.getElementById('fileUploadArea');
        const fileInput = document.getElementById('excelFile');

        if (!fileUploadArea || !fileInput) {
            console.error('❌ Elementos não encontrados:', {
                fileUploadArea: !!fileUploadArea,
                fileInput: !!fileInput
            });
            return;
        }

        console.log('✅ Elementos encontrados, configurando eventos...');

        // Prevenir comportamento padrão
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            document.addEventListener(eventName, this.preventDefaults, false);
            fileUploadArea.addEventListener(eventName, this.preventDefaults, false);
        });

        // Highlight da área de drop
        ['dragenter', 'dragover'].forEach(eventName => {
            fileUploadArea.addEventListener(eventName, this.highlight, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            fileUploadArea.addEventListener(eventName, this.unhighlight, false);
        });

        // Handle dropped files
        fileUploadArea.addEventListener('drop', this.handleDrop, false);
        fileUploadArea.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', this.handleFileSelect);

        fileInput.addEventListener('change', this.handleFileSelect);
        console.log('✅ Event listener change configurado');
    },

    setupFormEvents() {
        console.log('🔧 Configurando eventos do formulário...');

        const bulkForm = document.getElementById('bulkForm');
        //console.log('📝 Formulário encontrado:', bulkForm);

        if (bulkForm) {
            bulkForm.addEventListener('submit', (e) => {
                console.log('🚀 Evento submit capturado!', e);
                this.handleFormSubmit(e);
            });
        }

        // Event listener direto no botão de submit
        const submitButton = document.querySelector('#mainApp button[type="submit"]');
        console.log('🔘 Botão submit do painel principal encontrado:', !!submitButton);

        if (submitButton) {
            submitButton.addEventListener('click', (e) => {
                console.log('🔘 Clique direto no botão do painel principal capturado!');

                // Executar a lógica de envio diretamente
                e.preventDefault();

                // ✅ VERIFICAR AUTENTICAÇÃO 
                if (!AuthManager.requireAuth()) {
                    console.log('❌ Usuário não autenticado');
                    return;
                }

                console.log('🔍 Verificando se envio está em andamento...');
                if (AppState.sendingInProgress) {
                    console.log('⚠️ Envio já em andamento');
                    UI.showWarning('Envio já está em andamento');
                    return;
                }

                console.log('🔍 Validando antes do envio...');
                const validation = SendingManager.validateBeforeSending();
                console.log('📊 Resultado da validação:', validation);

                if (!validation.valid) {
                    console.log('❌ Validação falhou:', validation.error);
                    UI.showError(validation.error);
                    return;
                }

                const isScheduled = document.getElementById('enableScheduling')?.checked;
                console.log('📅 Agendado?', isScheduled);

                if (isScheduled) {
                    console.log('📅 Executando agendamento...');
                    const dispatchData = FormManager.collectDispatchData();
                    ScheduleManager.scheduleDispatch(dispatchData);
                } else {
                    console.log('🚀 Mostrando diálogo de confirmação...');
                    FormManager.showConfirmationDialog();
                }
            });
        }

        // Botões principais
        const stopButton = document.getElementById('stopButton');
        const pauseButton = document.getElementById('pauseButton');
        const reportButton = document.getElementById('reportButton');

        if (stopButton) stopButton.addEventListener('click', () => SendingManager.stop());
        if (pauseButton) pauseButton.addEventListener('click', this.handlePauseToggle);
        if (reportButton) reportButton.addEventListener('click', () => ReportManager.generatePDFReport());

        // Conexão WhatsApp - BOTÃO PRINCIPAL (não dos cards)
        const checkConnectionBtn = document.getElementById('checkConnectionBtn');
        const recheckConnection = document.getElementById('recheckConnection');

        if (checkConnectionBtn) {
            checkConnectionBtn.addEventListener('click', (e) => {
                e.preventDefault();
                ConnectionManager.checkConnection();
            });
        }

        if (recheckConnection) {
            recheckConnection.addEventListener('click', (e) => {
                e.preventDefault();
                ConnectionManager.checkConnection();
            });
        }

        // Agendamento
        const enableScheduling = document.getElementById('enableScheduling');
        if (enableScheduling) {
            enableScheduling.addEventListener('change', () => ScheduleManager.toggleSchedulingOptions());
        }

        // Limpeza e gerenciamento
        const clearHistoryButton = document.getElementById('clearHistoryButton');
        const clearContactsBtn = document.getElementById('clearContactsBtn');

        if (clearHistoryButton) clearHistoryButton.addEventListener('click', () => HistoryManager.clear());
        if (clearContactsBtn) clearContactsBtn.addEventListener('click', () => ContactManager.clear());

        // Export/Import
        this.setupExportImportEvents();

        // ✅ NOVO: Configuração de validação
        const enableBrazilianValidation = document.getElementById('enableBrazilianValidation');
        if (enableBrazilianValidation) {
            enableBrazilianValidation.addEventListener('change', (e) => {
                const isEnabled = e.target.checked;
                const mode = isEnabled ? 'Validação Brasileira' : 'Validação Internacional';

                console.log('🔧 Modo de validação alterado:', mode);

                // Mostrar notificação sobre a mudança
                if (isEnabled) {
                    UI.showInfo('✅ Validação brasileira ativada - Números serão validados com DDD brasileiro');
                } else {
                    UI.showSuccess('🌍 Validação internacional ativada - Aceita números de qualquer país');
                }

                // Se já existem contatos, perguntar se quer revalidar
                if (AppState.contacts.length > 0) {
                    setTimeout(() => {
                        UI.confirm(
                            'Revalidar Contatos',
                            `Modo de validação alterado para: ${mode}<br><br>Deseja revalidar os ${AppState.contacts.length} contatos existentes com o novo modo?`,
                            () => {
                                ContactManager.revalidateContacts();
                            }
                        );
                    }, 1000);
                }
            });
        }
    },

    setupExportImportEvents() {
        const events = [
            { id: 'exportHistoryBtn', handler: () => DataManager.exportHistoryToExcel() },
            { id: 'exportContactsBtn', handler: () => DataManager.exportContactsToExcel() },
            { id: 'exportBackupBtn', handler: () => DataManager.exportBackupData() },
            { id: 'importBackupBtn', handler: () => DataManager.importBackupData() },
            { id: 'clearSettingsBtn', handler: () => SettingsManager.clearSavedSettings() },
            { id: 'downloadModelBtn', handler: () => ModeloManager.downloadModel() }
        ];

        events.forEach(({ id, handler }) => {
            const element = document.getElementById(id);
            if (element) element.addEventListener('click', handler);
        });
    },

    setupAutoSave() {
        // Remover completamente o auto-save
        console.log('🚫 Auto-save desabilitado - usando apenas backup/restore');
    },

    setupPreviewEvents() {
        const messageField = document.getElementById('message');
        const mediaFileField = document.getElementById('mediaFile');

        if (messageField) {
            messageField.addEventListener('input', () => {
                PreviewManager.update();
            });
        }

        if (mediaFileField) {
            mediaFileField.addEventListener('change', (e) => {
                console.log('📎 Evento change no campo de mídia');

                const file = e.target.files[0];

                if (file && file.size > 0) {
                    console.log('📎 Arquivo selecionado:', file.name, file.type);

                    // ✅ PROCESSAR SEQUENCIALMENTE
                    showMediaPreview(file);

                    // ✅ DELAY SIMPLES
                    setTimeout(() => {
                        PreviewManager.update();
                    }, 200);

                } else {
                    console.log('📎 Nenhum arquivo válido');

                    // ✅ LIMPEZA SIMPLES
                    const preview = document.getElementById('mediaPreview');
                    if (preview) preview.style.display = 'none';

                    PreviewManager.update();
                }
            });
        }

        // Event listener para o botão de limpar mídia
        const clearMediaBtn = document.getElementById('clearMediaBtn');
        if (clearMediaBtn) {
            clearMediaBtn.addEventListener('click', clearMedia);
        }

        // Atualizar estimativas quando intervalos mudarem
        const minInterval = document.getElementById('minInterval');
        const maxInterval = document.getElementById('maxInterval');

        if (minInterval) minInterval.addEventListener('input', TimeEstimator.update);
        if (maxInterval) maxInterval.addEventListener('input', TimeEstimator.update);
    },

    forceCleanAndUpdate() {
        console.log('🧹 Limpeza forçada do preview...');

        const previewContent = document.getElementById('previewContent');
        if (previewContent) {
            // Limpar tudo
            const allMedia = previewContent.querySelectorAll('img, video, source');
            allMedia.forEach(element => {
                const src = element.src || element.getAttribute('src');
                if (src && src.startsWith('blob:')) {
                    URL.revokeObjectURL(src);
                }
            });

            // Forçar atualização
            this.update();
        }
    },

    setupDelegatedEvents() {
        // Event delegation apenas para botões do histórico
        document.addEventListener('click', (e) => {
            // Histórico
            if (e.target.closest('.view-details-btn')) {
                const entryId = parseInt(e.target.closest('.view-details-btn').dataset.entryId);
                HistoryManager.viewDetails(entryId);
            }

            if (e.target.closest('.generate-report-btn')) {
                const entryId = parseInt(e.target.closest('.generate-report-btn').dataset.entryId);
                HistoryManager.generateReport(entryId);
            }

            if (e.target.closest('.delete-entry-btn')) {
                const entryId = parseInt(e.target.closest('.delete-entry-btn').dataset.entryId);
                HistoryManager.deleteEntry(entryId);
            }
        });
    },

    setupModalCleanup() {
        const connectionModal = document.getElementById('connectionModal');
        if (connectionModal) {
            connectionModal.addEventListener('hidden.bs.modal', () => {
                AppIntervals.clear('qrRefresh');
            });
        }
    },

    // Event handlers
    preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    },

    highlight(e) {
        e.currentTarget.classList.add('dragover');
    },

    unhighlight(e) {
        e.currentTarget.classList.remove('dragover');
    },

    handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;

        if (files.length > 0) {
            const file = files[0];

            if (file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
                file.type === 'application/vnd.ms-excel' ||
                file.name.toLowerCase().endsWith('.xlsx') ||
                file.name.toLowerCase().endsWith('.xls')) {
                ContactManager.processExcelFile(file);
            } else {
                UI.showError('Por favor, selecione um arquivo Excel (.xlsx ou .xls)');
            }
        }
    },

    handleFileSelect(e) {
        console.log('📁 Evento change capturado');

        const file = e.target.files[0];

        if (!file) {
            console.log('❌ Nenhum arquivo selecionado');
            return;
        }

        console.log('📊 Processando arquivo selecionado:', {
            name: file.name,
            type: file.type,
            size: `${(file.size / 1024).toFixed(2)} KB`
        });

        // ✅ VALIDAÇÃO ROBUSTA
        const isExcelFile =
            file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
            file.type === 'application/vnd.ms-excel' ||
            file.name.toLowerCase().endsWith('.xlsx') ||
            file.name.toLowerCase().endsWith('.xls');

        if (isExcelFile) {
            console.log('✅ Arquivo Excel válido - processando...');
            ContactManager.processExcelFile(file);
        } else {
            console.log('❌ Arquivo inválido:', file.type);
            UI.showError('Por favor, selecione um arquivo Excel (.xlsx ou .xls)');
            e.target.value = ''; // Limpar seleção para permitir nova tentativa
        }
    },

    handleFormSubmit(e) {
        console.log('📋 handleFormSubmit chamado', e);

        // Verificar se o clique veio de um botão de instância
        if (e.target && e.target.closest('.instance-card')) {
            console.log('❌ Clique veio de card de instância, ignorando');
            return;
        }

        e.preventDefault();
        console.log('✅ preventDefault executado no handleFormSubmit');

        // ✅ VERIFICAR AUTENTICAÇÃO APENAS se não estivermos na tela de login
        const loginScreen = document.getElementById('loginScreen');
        const isLoginVisible = loginScreen && !loginScreen.classList.contains('hidden');

        if (!isLoginVisible && !AuthManager.requireAuth()) {
            console.log('❌ Usuário não autenticado no form submit');
            return;
        }

        // Se estamos na tela de login, não processar como envio de mensagem
        if (isLoginVisible) {
            console.log('🔐 Tela de login ativa, ignorando form submit');
            return;
        }

        if (AppState.sendingInProgress) {
            console.log('⚠️ Envio já em andamento');
            UI.showWarning('Envio já está em andamento');
            return;
        }

        console.log('🔍 Validando antes do envio...');
        const validation = SendingManager.validateBeforeSending();
        console.log('📊 Resultado da validação:', validation);

        if (!validation.valid) {
            console.log('❌ Validação falhou:', validation.error);
            UI.showError(validation.error);
            return;
        }

        const isScheduled = document.getElementById('enableScheduling')?.checked;
        console.log('📅 Agendado?', isScheduled);

        if (isScheduled) {
            console.log('📅 Executando agendamento...');
            const dispatchData = FormManager.collectDispatchData();
            ScheduleManager.scheduleDispatch(dispatchData);
        } else {
            console.log('🚀 Mostrando diálogo de confirmação...');
            FormManager.showConfirmationDialog();
        }
    },

    handlePauseToggle() {
        if (AppState.isPaused) {
            SendingManager.resume();
        } else {
            SendingManager.pause();
        }
    },

    clearMediaCache() {
        console.log('🧹 Limpeza completa de cache de mídia...');

        // Limpar URLs de blob antigas
        if (window.currentMediaURL) {
            URL.revokeObjectURL(window.currentMediaURL);
            window.currentMediaURL = null;
        }

        // ✅ LIMPAR TODAS AS URLS DE BLOB EXISTENTES (FORÇADO)
        if (typeof URL !== 'undefined' && URL.revokeObjectURL) {
            // Tentar limpar URLs órfãs (método experimental)
            for (let i = 0; i < 100; i++) {
                try {
                    URL.revokeObjectURL(`blob:${window.location.origin}/${i}`);
                } catch (e) {
                    // Ignorar erros
                }
            }
        }

        // Limpar campos de mídia
        const mediaFile = document.getElementById('mediaFile');
        if (mediaFile) {
            mediaFile.value = '';
            // ✅ RESETAR TIPO DO INPUT
            mediaFile.type = '';
            mediaFile.type = 'file';
        }

        // Limpar preview de mídia
        const mediaPreview = document.getElementById('mediaPreview');
        if (mediaPreview) {
            mediaPreview.style.display = 'none';
        }

        const mediaContent = document.getElementById('mediaPreviewContent');
        if (mediaContent) {
            mediaContent.innerHTML = '';
        }

        console.log('🗑️ Cache de mídia completamente limpo na inicialização');
    }
};

// ========================================
// 22. GERENCIAMENTO DE FORMULÁRIO
// ========================================
const FormManager = {
    collectDispatchData() {
        const validation = Validators.instanceData();

        return {
            instanceName: validation.instanceName || 'Múltiplas Instâncias',
            instanceAPIKEY: validation.instanceAPIKEY || '',
            activeInstancesCount: AppState.activeInstances.length,
            instancesUsed: AppState.activeInstances.map(inst => ({
                id: inst.id,
                name: inst.name
            })),
            multipleMessages: {
                enabled: true,
                config: AppState.messagesConfig
            },
            ia: document.getElementById('ia')?.value || '',
            minInterval: parseInt(document.getElementById('minInterval')?.value || 0),
            maxInterval: parseInt(document.getElementById('maxInterval')?.value || 0),
            contacts: [...AppState.contacts],
        };
    },

    // ✅ SUBSTITUIR função showConfirmationDialog completa
    showConfirmationDialog() {
        console.log('🔍 Coletando dados do disparo...');

        const instanceName = document.getElementById('instanceName')?.value || 'Instâncias Múltiplas';

        // ✅ ATUALIZADO: Contar mensagens ativas
        const activeMessages = Object.values(AppState.messagesConfig)
            .filter(config => config.enabled && (config.text.trim() || config.media));

        const messageCount = activeMessages.length;
        const messagePreview = activeMessages.length > 0 ?
            activeMessages[0].text.substring(0, 50) + (activeMessages[0].text.length > 50 ? '...' : '') :
            'Sem mensagem configurada';

        const confirmText = `
        <div class="text-start">
            <h6>Confirme os dados do disparo</h6>
            <p><strong>Instância:</strong> ${instanceName}</p>
            <p><strong>Contatos:</strong> ${AppState.contacts.length}</p>
            <p><strong>Mensagens ativas:</strong> ${messageCount}</p>
            <p><strong>Preview:</strong> ${messagePreview}</p>
        </div>
    `;

        console.log('🔍 Mostrando diálogo de confirmação...');
        UI.confirm(
            'Confirmar Disparo',
            confirmText,
            () => {
                console.log('✅ Usuário confirmou o disparo');
                SendingManager.start();
            }
        );
    }
};

// ========================================
// 23. INICIALIZAÇÃO DA APLICAÇÃO
// ========================================
const App = {
    async initialize() {
        try {
            console.log('🚀 Iniciando Disparador PRO...');

            // ✅ LIMPAR QUALQUER GRÁFICO EXISTENTE GLOBALMENTE
            if (typeof Chart !== 'undefined') {
                Chart.getChart('resultsChart')?.destroy();
            }

            AuthManager.initialize();
        } catch (error) {
            console.error('❌ Erro na inicialização:', error);
            alert('Erro ao inicializar aplicação: ' + error.message);
        }
    },

    async initializeApp() {
        try {
            console.log('🔧 Inicializando aplicação principal...');

            // ✅ LIMPAR COMPONENTES EXISTENTES ANTES DE REINICIALIZAR
            if (typeof ChartManager !== 'undefined') {
                ChartManager.destroy();
            }

            await this.unregisterServiceWorkers();
            this.clearMediaCache();

            Notiflix.Notify.init({
                position: 'right-top',
                distance: '20px',
                timeout: 4000,
            });

            ChartManager.initialize();
            EventManager.setupFileUpload();
            EventManager.setupFormEvents();
            EventManager.setupAutoSave();
            EventManager.setupPreviewEvents();
            EventManager.setupDelegatedEvents();
            EventManager.setupModalCleanup();

            ScheduleManager.initialize();
            SettingsManager.loadSaved();
            PWAManager.initialize();
            InstanceManager.initialize();
            BatchManager.initialize();

            setTimeout(() => {
                if (document.getElementById('richTextEditor') && !window.richTextEditor) {
                    window.richTextEditor = new RichTextEditor('richTextEditor');
                    console.log('✅ Editor de texto rico inicializado');
                }

                if (!window.multipleMessagesInitialized) {
                    MultipleMessagesManager.initialize();
                    window.multipleMessagesInitialized = true;
                    console.log('✅ MultipleMessagesManager inicializado');
                }
            }, 1000);

            console.log('✅ Disparador PRO inicializado com sucesso!');

        } catch (error) {
            console.error('❌ Erro na inicialização da aplicação:', error);
            AuthManager.showError('Erro ao inicializar aplicação: ' + error.message);
        }
    },

    async unregisterServiceWorkers() {
        try {
            if ('serviceWorker' in navigator) {
                const registrations = await navigator.serviceWorker.getRegistrations();

                for (const registration of registrations) {
                    console.log('🗑️ Desregistrando Service Worker...');
                    await registration.unregister();
                }

                if (registrations.length > 0) {
                    console.log('✅ Service Workers removidos');
                }
            }
        } catch (error) {
            console.warn('⚠️ Erro ao remover Service Workers:', error);
        }
    },

    clearMediaCache() {
        // Limpar URLs de blob antigas
        if (window.currentMediaURL) {
            URL.revokeObjectURL(window.currentMediaURL);
            window.currentMediaURL = null;
        }

        // Limpar campos de mídia
        const mediaFile = document.getElementById('mediaFile');
        if (mediaFile) {
            mediaFile.value = '';
        }

        // Limpar preview de mídia
        const mediaPreview = document.getElementById('mediaPreview');
        if (mediaPreview) {
            mediaPreview.style.display = 'none';
        }

        console.log('🗑️ Cache de mídia limpo na inicialização');
    }
};



// ========================================
// 24. FUNÇÕES GLOBAIS (para compatibilidade)
// ========================================

// Funções expostas globalmente para uso em onclick dos elementos HTML
window.alternarTema = UI.alternarTema;
window.ScheduleManager = ScheduleManager;
window.PWAManager = PWAManager;
window.checkForUpdates = PWAManager.checkForUpdates;
window.SettingsManager = SettingsManager;
window.showMediaPreview = showMediaPreview;
window.clearMedia = clearMedia;
window.AuthManager = AuthManager;


// ========================================
// 25. INICIALIZAÇÃO
// ========================================
document.addEventListener('DOMContentLoaded', () => {
    App.initialize();
});

// Cleanup ao fechar a página
window.addEventListener('beforeunload', () => {
    // Revogar URLs antes de fechar
    if (window.currentMediaURL) {
        URL.revokeObjectURL(window.currentMediaURL);
        window.currentMediaURL = null;
        console.log('🗑️ URLs limpas ao fechar página');
    }

    AppIntervals.clearAll();
});

// Expor estado para debugging (apenas em desenvolvimento)
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    window.AppState = AppState;
    window.APP_CONFIG = APP_CONFIG;
}

const MultipleMessagesManagerFixed = {
    initialize() {
        console.log('🔧 Inicializando MultipleMessagesManager...');

        const toggleSwitch = document.getElementById('enableMultipleMessages');
        const singleMode = document.getElementById('singleMessageMode');
        const multipleMode = document.getElementById('multipleMessagesMode');

        if (!toggleSwitch) {
            console.warn('⚠️ Elemento enableMultipleMessages não encontrado. Recurso de múltiplas mensagens não disponível.');
            // Criar elemento placeholder se necessário
            return;
        }

        if (!singleMode) {
            console.warn('⚠️ Elemento singleMessageMode não encontrado.');
            return;
        }

        if (!multipleMode) {
            console.warn('⚠️ Elemento multipleMessagesMode não encontrado.');
            return;
        }

        console.log('✅ Elementos de múltiplas mensagens encontrados');

        toggleSwitch.addEventListener('change', (e) => {
            AppState.multipleMessagesEnabled = e.target.checked;

            if (AppState.multipleMessagesEnabled) {
                singleMode.style.display = 'none';
                multipleMode.style.display = 'block';
                setTimeout(() => this.updateMainPreview('msg1'), 100);
            } else {
                singleMode.style.display = 'block';
                multipleMode.style.display = 'none';
                if (typeof PreviewManager !== 'undefined') {
                    PreviewManager.update();
                }
            }
        });

        this.setupMessageListeners();
        this.setupTabListeners();
        this.updateActiveMessagesInfo();
    }
};

// ========================================
// EDITOR DE TEXTO RICO ATUALIZADO COM TAGS
// ========================================
class RichTextEditor {
    constructor(editorId) {
        this.editor = document.getElementById(editorId);
        this.textarea = this.editor.querySelector('.rich-text-area');
        this.charCounter = this.editor.querySelector('.char-counter');
        this.boldBtn = document.getElementById('boldBtn');
        this.italicBtn = document.getElementById('italicBtn');
        this.clearFormatBtn = document.getElementById('clearFormatBtn');

        // NOVOS BOTÕES DE TAGS
        this.nameBtn = document.getElementById('nameBtn');
        this.greetingBtn = document.getElementById('greetingBtn');

        this.init();
    }

    init() {
        // Event listeners para os botões de formatação - COM VERIFICAÇÃO DE EXISTÊNCIA
        if (this.boldBtn) {
            this.boldBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.toggleFormat('bold');
            });
        }

        if (this.italicBtn) {
            this.italicBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.toggleFormat('italic');
            });
        }

        if (this.clearFormatBtn) {
            this.clearFormatBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.clearFormatting();
            });
        }

        // Event listeners para os botões de tags - COM VERIFICAÇÃO DE EXISTÊNCIA
        if (this.nameBtn) {
            this.nameBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.insertTag('nome');
            });
        }

        if (this.greetingBtn) {
            this.greetingBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.insertTag('saudacao');
            });
        }

        // Event listeners para o textarea
        if (this.textarea) {
            this.textarea.addEventListener('input', () => {
                this.updateCharCounter();
                PreviewManager.update();
            });
            this.textarea.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));
            this.textarea.addEventListener('select', () => this.updateToolbarState());
            this.textarea.addEventListener('click', () => this.updateToolbarState());
        }

        // Inicializar contador
        this.updateCharCounter();
    }

    toggleFormat(type) {
        console.log('🔍 ANTES da formatação:', this.textarea.value);

        const start = this.textarea.selectionStart;
        const end = this.textarea.selectionEnd;
        const selectedText = this.textarea.value.substring(start, end);

        if (selectedText.length === 0) {
            this.insertFormatMarkers(type);
        } else {
            this.wrapSelectedText(type, selectedText, start, end);
        }

        console.log('🔍 DEPOIS da formatação:', this.textarea.value);

        this.animateButton(type);
        this.updateCharCounter();
        PreviewManager.update(); // Atualizar preview do WhatsApp
    }

    // NOVO MÉTODO PARA INSERIR TAGS
    insertTag(tagType) {
        const tags = {
            'nome': '{nome}',
            'saudacao': '{saudacao}'
        };

        const tag = tags[tagType];
        if (!tag) return;

        const start = this.textarea.selectionStart;
        const end = this.textarea.selectionEnd;
        const value = this.textarea.value;

        // Inserir a tag
        const newValue = value.slice(0, start) + tag + value.slice(end);
        this.textarea.value = newValue;

        // Posicionar cursor após a tag
        const newPosition = start + tag.length;
        this.textarea.setSelectionRange(newPosition, newPosition);
        this.textarea.focus();

        // Animação especial para tags
        this.animateTagButton(tagType);
        this.updateCharCounter();
        PreviewManager.update();

        console.log(`✅ Tag {${tagType}} inserida na posição ${start}`);
    }

    insertFormatMarkers(type) {
        const markers = {
            'bold': '*',
            'italic': '_'
        };

        const marker = markers[type];
        const start = this.textarea.selectionStart;
        const value = this.textarea.value;

        // ✅ INSERIR APENAS UM MARCADOR DE CADA LADO
        const newValue = value.slice(0, start) + marker + marker + value.slice(start);
        this.textarea.value = newValue;

        // Posicionar cursor entre os marcadores
        const newPosition = start + marker.length;
        this.textarea.setSelectionRange(newPosition, newPosition);
        this.textarea.focus();
    }

    wrapSelectedText(type, selectedText, start, end) {
        const markers = {
            'bold': '*',
            'italic': '_'
        };

        const marker = markers[type];

        // Verificar se o texto já está formatado
        const beforeText = this.textarea.value.substring(Math.max(0, start - marker.length), start);
        const afterText = this.textarea.value.substring(end, Math.min(this.textarea.value.length, end + marker.length));

        if (beforeText === marker && afterText === marker) {
            // Remover formatação existente
            const newValue =
                this.textarea.value.slice(0, start - marker.length) +
                selectedText +
                this.textarea.value.slice(end + marker.length);

            this.textarea.value = newValue;
            this.textarea.setSelectionRange(start - marker.length, end - marker.length);
        } else {
            // Adicionar formatação
            const newValue =
                this.textarea.value.slice(0, start) +
                marker + selectedText + marker +
                this.textarea.value.slice(end);

            this.textarea.value = newValue;
            this.textarea.setSelectionRange(start, end + (marker.length * 2));
        }

        this.textarea.focus();
    }

    clearFormatting() {
        let text = this.textarea.value;

        // Remover marcadores de formatação (mas manter tags)
        text = text.replace(/\*([^*]+)\*/g, '$1'); // Remove *bold*
        text = text.replace(/_([^_]+)_/g, '$1');   // Remove _italic_

        this.textarea.value = text;
        this.updateCharCounter();
        PreviewManager.update();
        this.animateButton('clear');
    }

    updateCharCounter() {
        const currentLength = this.textarea.value.length;
        const maxLength = this.textarea.maxLength || 4096;

        this.charCounter.textContent = `${currentLength}/${maxLength}`;

        // Mudar cor quando próximo do limite
        if (currentLength > maxLength * 0.9) {
            this.charCounter.style.color = '#dc3545';
        } else if (currentLength > maxLength * 0.8) {
            this.charCounter.style.color = '#ffc107';
        } else {
            this.charCounter.style.color = '#6c757d';
        }
    }

    updateToolbarState() {
        const start = this.textarea.selectionStart;
        const end = this.textarea.selectionEnd;

        if (start === end) {
            // Cursor em posição específica - verificar se está dentro de formatação
            const text = this.textarea.value;
            const beforeCursor = text.substring(0, start);

            // Contar asteriscos antes do cursor
            const boldMatches = beforeCursor.split('*').length - 1;
            const inBold = boldMatches % 2 === 1;

            // Contar underscores antes do cursor
            const italicMatches = beforeCursor.split('_').length - 1;
            const inItalic = italicMatches % 2 === 1;

            if (this.boldBtn) this.boldBtn.classList.toggle('active', inBold);
            if (this.italicBtn) this.italicBtn.classList.toggle('active', inItalic);
        } else {
            // Texto selecionado - verificar se já está formatado
            const beforeText = this.textarea.value.substring(Math.max(0, start - 1), start);
            const afterText = this.textarea.value.substring(end, Math.min(this.textarea.value.length, end + 1));

            if (this.boldBtn) this.boldBtn.classList.toggle('active', beforeText === '*' && afterText === '*');
            if (this.italicBtn) this.italicBtn.classList.toggle('active', beforeText === '_' && afterText === '_');
        }
    }

    handleKeyboardShortcuts(e) {
        if (e.ctrlKey || e.metaKey) {
            switch (e.key.toLowerCase()) {
                case 'b':
                    e.preventDefault();
                    this.toggleFormat('bold');
                    break;
                case 'i':
                    e.preventDefault();
                    this.toggleFormat('italic');
                    break;
                // NOVOS ATALHOS PARA TAGS
                case 'n':
                    if (e.shiftKey) { // Ctrl+Shift+N para {nome}
                        e.preventDefault();
                        this.insertTag('nome');
                    }
                    break;
                case 'g':
                    if (e.shiftKey) { // Ctrl+Shift+G para {saudacao}
                        e.preventDefault();
                        this.insertTag('saudacao');
                    }
                    break;
            }
        }
    }

    animateButton(type) {
        let button;
        switch (type) {
            case 'bold':
                button = this.boldBtn;
                break;
            case 'italic':
                button = this.italicBtn;
                break;
            case 'clear':
                button = this.clearFormatBtn;
                break;
        }

        if (button) {
            button.classList.add('clicked');
            setTimeout(() => button.classList.remove('clicked'), 300);
        }
    }

    // NOVA ANIMAÇÃO ESPECIAL PARA BOTÕES DE TAG
    animateTagButton(tagType) {
        let button;
        switch (tagType) {
            case 'nome':
                button = this.nameBtn;
                break;
            case 'saudacao':
                button = this.greetingBtn;
                break;
        }

        if (button) {
            button.classList.add('tag-inserted');
            setTimeout(() => button.classList.remove('tag-inserted'), 600);
        }
    }

    // Métodos públicos para integração
    getValue() {
        return this.textarea.value;
        // ✅ GARANTIR que retorna formatação WhatsApp pura
        return cleanMessageForWhatsApp(value);
    }

    setValue(value) {
        this.textarea.value = value;
        this.updateCharCounter();
        PreviewManager.update();
    }

    focus() {
        this.textarea.focus();
    }

    insertText(text) {
        const start = this.textarea.selectionStart;
        const end = this.textarea.selectionEnd;
        const value = this.textarea.value;

        const newValue = value.slice(0, start) + text + value.slice(end);
        this.textarea.value = newValue;

        const newPosition = start + text.length;
        this.textarea.setSelectionRange(newPosition, newPosition);
        this.textarea.focus();

        this.updateCharCounter();
        PreviewManager.update();
    }

    validateWhatsAppFormatting(text) {
        // Remove espaços desnecessários ao redor dos marcadores
        text = text.replace(/\*\s+/g, '*');      // Remove espaço após *
        text = text.replace(/\s+\*/g, '*');      // Remove espaço antes de *
        text = text.replace(/_\s+/g, '_');       // Remove espaço após _
        text = text.replace(/\s+_/g, '_');       // Remove espaço antes de _

        // Validar pares de marcadores
        const asteriskCount = (text.match(/\*/g) || []).length;
        const underscoreCount = (text.match(/_/g) || []).length;

        // Se não há pares, remover marcadores órfãos
        if (asteriskCount % 2 !== 0) {
            console.warn('⚠️ Marcadores de negrito ímpares detectados');
        }
        if (underscoreCount % 2 !== 0) {
            console.warn('⚠️ Marcadores de itálico ímpares detectados');
        }

        return text;
    }
}

// ========================================
// FUNÇÃO DE LIMPEZA DE FORMATAÇÃO PARA WHATSAPP
// ========================================
function cleanMessageForWhatsApp(message) {
    if (!message) return '';

    console.log('🧹 Limpando mensagem para WhatsApp:', message);

    // Remove qualquer HTML que possa ter vazado
    let cleanMessage = message
        .replace(/<strong>(.*?)<\/strong>/g, '*$1*')   // <strong> → *texto*
        .replace(/<em>(.*?)<\/em>/g, '_$1_')           // <em> → _texto_
        .replace(/<i>(.*?)<\/i>/g, '_$1_')             // <i> → _texto_
        .replace(/<b>(.*?)<\/b>/g, '*$1*')             // <b> → *texto*
        .replace(/<br>/g, '\n')                        // <br> → quebra
        .replace(/<[^>]*>/g, '');                      // Remove outras tags HTML

    // Garantir que a formatação WhatsApp está correta
    cleanMessage = cleanMessage
        .replace(/\*\*([^*]+)\*\*/g, '*$1*')  // **texto** → *texto*
        .replace(/__([^_]+)__/g, '_$1_');     // __texto__ → _texto_

    console.log('✅ Mensagem limpa:', cleanMessage);

    return cleanMessage;
}

// ========================================
// GERENCIAMENTO DE PLANILHA MODELO
// ========================================
const ModeloManager = {
    // Gerar planilha modelo usando SheetJS
    generateModelExcel() {
        console.log('📊 Gerando planilha modelo...');

        try {
            // Dados de exemplo para a planilha
            const dadosExemplo = [
                ['Nome', 'Telefone', 'E-mail'],
                ['João Silva', '11987654321', 'joao@email.com'],
                ['Maria Santos', '11976543210', 'maria@email.com'],
                ['Pedro Oliveira', '11965432109', 'pedro@email.com'],
                ['Ana Costa', '11954321098', 'ana@email.com'],
                ['Carlos Ferreira', '11943210987', 'carlos@email.com']
            ];

            // Criar workbook
            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.aoa_to_sheet(dadosExemplo);

            // Configurar largura das colunas
            ws['!cols'] = [
                { wch: 20 }, // Nome
                { wch: 15 }, // Telefone  
                { wch: 25 }  // E-mail
            ];

            // Estilizar cabeçalho (se suportado)
            const headerRange = XLSX.utils.decode_range('A1:C1');
            for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
                const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
                if (!ws[cellAddress]) continue;

                // Adicionar estilo básico ao cabeçalho
                ws[cellAddress].s = {
                    font: { bold: true },
                    fill: { fgColor: { rgb: "CCCCCC" } }
                };
            }

            // Adicionar planilha ao workbook
            XLSX.utils.book_append_sheet(wb, ws, 'Contatos');

            // Fazer download
            XLSX.writeFile(wb, 'modelo-planilha.xlsx');

            UI.showSuccess('Planilha modelo baixada com sucesso!');

        } catch (error) {
            console.error('❌ Erro ao gerar planilha modelo:', error);
            UI.showError('Erro ao gerar planilha modelo: ' + error.message);
        }
    },

    // Método alternativo - download de arquivo estático
    downloadStaticModel() {
        console.log('📊 Baixando planilha modelo estática...');

        try {
            // Criar link para download
            const link = document.createElement('a');
            link.href = './modelo-planilha.xlsx';
            link.download = 'modelo-planilha.xlsx';
            link.style.display = 'none';

            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            UI.showSuccess('Download da planilha modelo iniciado!');

        } catch (error) {
            console.error('❌ Erro ao baixar planilha modelo:', error);
            // Se falhar, usar método de geração
            this.generateModelExcel();
        }
    },

    // Verificar se arquivo modelo existe e escolher método
    async downloadModel() {
        try {
            // Tentar verificar se arquivo estático existe
            const response = await fetch('./modelo-planilha.xlsx', { method: 'HEAD' });

            if (response.ok) {
                // Arquivo existe, fazer download estático
                this.downloadStaticModel();
            } else {
                // Arquivo não existe, gerar dinamicamente
                this.generateModelExcel();
            }
        } catch (error) {
            // Se der erro na verificação, gerar dinamicamente
            console.log('📊 Arquivo modelo não encontrado, gerando dinamicamente...');
            this.generateModelExcel();
        }
    }
};

// Função para configurar intervalos seguros automaticamente
function startSafeConfiguration() {
    // Configurar intervalos seguros
    const minIntervalInput = document.getElementById('minInterval');
    const maxIntervalInput = document.getElementById('maxInterval');

    if (minIntervalInput && maxIntervalInput) {
        minIntervalInput.value = '60';  // 60 segundos mínimo
        maxIntervalInput.value = '120'; // 120 segundos máximo

        // Atualizar estimativas
        TimeEstimator.update();

        // Configurar pausa em lotes se existir
        const batchCheckbox = document.getElementById('enableBatchPause');
        const batchSize = document.getElementById('batchSize');
        const batchPause = document.getElementById('batchPauseDuration');

        if (batchCheckbox && batchSize && batchPause) {
            batchCheckbox.checked = true;
            batchSize.value = '10';  // 10 mensagens por lote
            batchPause.value = '10'; // 10 minutos de pausa

            // Ativar configuração de lotes
            if (BatchManager && BatchManager.toggleBatchOptions) {
                BatchManager.toggleBatchOptions();
            }
        }

        // Fechar modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('safetyTipsModal'));
        if (modal) {
            modal.hide();
        }

        UI.showSuccess('✅ Configurações seguras aplicadas! Intervalos: 60-120s, Lotes: 10 msgs com pausa de 10min');
    } else {
        UI.showError('❌ Não foi possível aplicar as configurações automáticas');
    }
}

// Função para mostrar dicas contextuais
function showSafetyTip(tip) {
    const tips = {
        intervals: 'Configure intervalos entre 60-120 segundos para evitar bloqueios. Intervalos muito baixos podem resultar em ban.',
        batch: 'Use pausas automáticas a cada 10 envios para simular comportamento humano e evitar detecção.',
        schedule: 'Agende envios para horários comerciais (9h-18h) e evite finais de semana para melhor engajamento.',
        contacts: 'Sempre valide números antes do envio. Números inválidos podem prejudicar sua reputação.',
        message: 'Personalize mensagens com {nome} e use IA para variações. Mensagens genéricas têm menor engajamento.'
    };

    if (tips[tip]) {
        UI.showInfo(tips[tip]);
    }
}

// Adicionar tooltips de segurança aos campos
function addSafetyTooltips() {
    // Tooltip para intervalos
    const minInterval = document.getElementById('minInterval');
    const maxInterval = document.getElementById('maxInterval');

    if (minInterval && maxInterval) {
        minInterval.setAttribute('title', 'Recomendado: mínimo 60 segundos para evitar bloqueios');
        maxInterval.setAttribute('title', 'Recomendado: máximo 120 segundos para simular comportamento natural');

        // Validação em tempo real
        minInterval.addEventListener('input', function () {
            const value = parseInt(this.value);
            if (value < 60) {
                this.style.borderColor = '#ffc107';
                showSafetyTip('intervals');
            } else {
                this.style.borderColor = '';
            }
        });

        maxInterval.addEventListener('input', function () {
            const value = parseInt(this.value);
            if (value < 60) {
                this.style.borderColor = '#dc3545';
                showSafetyTip('intervals');
            } else {
                this.style.borderColor = '';
            }
        });
    }
}

// Inicializar tooltips ao carregar
document.addEventListener('DOMContentLoaded', function () {
    // Aguardar um pouco para garantir que outros scripts carregaram
    setTimeout(() => {
        addSafetyTooltips();
    }, 1000);
});

// ========================================
// GERENCIAMENTO DE TEMPORIZADOR SEMPRE VISÍVEL
// ========================================
const TimerManager = {
    timerInterval: null,
    startTime: null,
    duration: 0,
    isPaused: false,
    currentState: 'idle', // idle, countdown, paused, batch-pause, sending, completed

    initialize() {
        console.log('⏱️ Inicializando TimerManager...');

        const timerElement = document.getElementById('nextSendTimer');
        if (timerElement) {
            timerElement.style.display = 'block';
        }

        this.showIdle();
    },

    // Estado: Aguardando/Inativo
    showIdle() {
        this.currentState = 'idle';
        this.updateDisplay('Aguardando...', 'info', 'secondary');
        this.updateLabel('Status do envio:');
        this.updateDetails('Configure uma lista de contatos e inicie o disparo');
        this.updateProgress(0, 'secondary');
        this.clear();
    },

    // Estado: Preparando envio
    showPreparing() {
        this.currentState = 'preparing';
        this.updateDisplay('Preparando...', 'info', 'primary');
        this.updateLabel('Preparando envio:');
        this.updateDetails('Validando dados e iniciando disparo em massa');
        this.updateProgress(0, 'primary');
    },

    // Estado: Enviando mensagem
    showSending(contactName, currentIndex, total) {
        this.currentState = 'sending';
        this.updateDisplay('Enviando...', 'warning', 'warning');
        this.updateLabel('Enviando para:');
        this.updateDetails(`${contactName} (${currentIndex + 1}/${total})`);
        this.updateProgress(100, 'warning');
    },

    // Estado: Contagem regressiva para próximo envio
    startCountdown(durationMs, currentIndex, total) {
        this.currentState = 'countdown';
        this.duration = durationMs;
        this.startTime = Date.now();
        this.isPaused = false;

        this.updateLabel('Próximo envio em:');
        this.updateDetails(`Aguardando intervalo de segurança (${currentIndex + 1}/${total})`);
        this.updateTimerClass('info');

        this.clear();
        this.timerInterval = setInterval(() => {
            this.updateCountdown();
        }, 100);

        this.updateCountdown();
    },

    // Estado: Pausa de lote
    startBatchPause(durationMs, batchNumber, totalBatches) {
        this.currentState = 'batch-pause';
        this.duration = durationMs;
        this.startTime = Date.now();
        this.isPaused = false;

        this.updateLabel('Pausa entre lotes:');
        this.updateDetails(`Lote ${batchNumber}/${totalBatches} - Pausa para evitar bloqueios`);
        this.updateTimerClass('warning');

        this.clear();
        this.timerInterval = setInterval(() => {
            this.updateCountdown();
        }, 100);

        this.updateCountdown();
    },

    // Estado: Pausado pelo usuário
    showPaused() {
        this.currentState = 'paused';
        this.isPaused = true;
        this.updateDisplay('PAUSADO', 'secondary', 'secondary');
        this.updateLabel('Envio pausado:');
        this.updateDetails('Clique em "Retomar Envio" para continuar');
        this.updateProgress(50, 'secondary');
    },

    // Estado: Finalizado
    showCompleted(successCount, errorCount, totalTime) {
        this.currentState = 'completed';
        this.clear();

        const successRate = totalTime ? ((successCount / (successCount + errorCount)) * 100).toFixed(1) : 0;

        this.updateDisplay('Concluído!', 'success', 'success');
        this.updateLabel('Disparo finalizado:');
        this.updateDetails(`${successCount} sucessos, ${errorCount} erros (${successRate}% sucesso) em ${Utils.formatTime(totalTime)}`);
        this.updateProgress(100, 'success');

        // Voltar ao idle após 10 segundos
        setTimeout(() => {
            if (this.currentState === 'completed') {
                this.showIdle();
            }
        }, 10000);
    },

    // Estado: Erro/Interrompido
    showStopped() {
        this.currentState = 'stopped';
        this.clear();
        this.updateDisplay('Interrompido', 'danger', 'danger');
        this.updateLabel('Envio interrompido:');
        this.updateDetails('O disparo foi interrompido pelo usuário');
        this.updateProgress(0, 'danger');

        // Voltar ao idle após 5 segundos
        setTimeout(() => {
            if (this.currentState === 'stopped') {
                this.showIdle();
            }
        }, 5000);
    },

    // Atualizar contagem regressiva
    updateCountdown() {
        if (this.isPaused) return;

        const now = Date.now();
        const elapsed = now - this.startTime;
        const remaining = Math.max(0, this.duration - elapsed);

        if (remaining <= 0) {
            this.finish();
            return;
        }

        // Atualizar display do tempo
        const seconds = Math.ceil(remaining / 1000);
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        const display = `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;

        const countdownElement = document.getElementById('timerCountdown');
        if (countdownElement) {
            countdownElement.textContent = display;

            // Mudar cor conforme tempo restante
            if (seconds <= 5) {
                countdownElement.className = 'badge bg-danger fs-6';
            } else if (seconds <= 10) {
                countdownElement.className = 'badge bg-warning fs-6';
            } else {
                const bgClass = this.currentState === 'batch-pause' ? 'bg-warning' : 'bg-primary';
                countdownElement.className = `badge ${bgClass} fs-6`;
            }
        }

        // Atualizar barra de progresso
        const percentage = ((this.duration - remaining) / this.duration) * 100;
        this.updateProgress(percentage, this.currentState === 'batch-pause' ? 'warning' : 'primary');
    },

    // Métodos auxiliares para atualizar elementos
    updateDisplay(text, alertClass, badgeClass) {
        const countdownElement = document.getElementById('timerCountdown');
        const timerElement = document.getElementById('nextSendTimer');

        if (countdownElement) {
            countdownElement.textContent = text;
            countdownElement.className = `badge bg-${badgeClass} fs-6`;
        }

        if (timerElement) {
            timerElement.className = `alert alert-${alertClass}`;
        }
    },

    updateLabel(text) {
        const labelElement = document.getElementById('timerLabel');
        if (labelElement) {
            labelElement.textContent = text;
        }
    },

    updateDetails(text) {
        const detailsElement = document.getElementById('timerDetails');
        if (detailsElement) {
            detailsElement.textContent = text;
        }
    },

    updateProgress(percentage, colorClass) {
        const progressElement = document.getElementById('timerProgress');
        if (progressElement) {
            progressElement.style.width = `${Math.min(100, Math.max(0, percentage))}%`;
            progressElement.className = `progress-bar bg-${colorClass}`;
        }
    },

    updateTimerClass(alertClass) {
        const timerElement = document.getElementById('nextSendTimer');
        if (timerElement) {
            timerElement.className = `alert alert-${alertClass}`;
        }
    },

    // Pausar contagem regressiva
    pause() {
        if (this.currentState === 'countdown' || this.currentState === 'batch-pause') {
            this.isPaused = true;
            this.showPaused();
        }
    },

    // Retomar contagem regressiva
    resume() {
        if (this.currentState === 'paused') {
            this.isPaused = false;

            // Recalcular tempo restante
            const now = Date.now();
            const elapsed = now - this.startTime;
            const remaining = Math.max(0, this.duration - elapsed);

            if (remaining > 0) {
                this.startTime = now;
                this.duration = remaining;
                this.currentState = 'countdown';
                this.updateLabel('Próximo envio em:');
                this.updateDetails('Envio retomado - aguardando intervalo');
                this.updateTimerClass('info');
            } else {
                this.finish();
            }
        }
    },

    finish() {
        this.clear();
    },

    clear() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    },

    hide() {
        if (this.currentState !== 'countdown' && this.currentState !== 'batch-pause' && this.currentState !== 'sending') {
            this.showIdle();
        }
    },

    startSendTimer(durationMs) {
        this.startCountdown(durationMs, 0, AppState.contacts.length);
    },

    cleanup() {
        console.log('🧹 Limpando TimerManager...');

        this.clear();
        this.currentState = 'idle';
        this.isPaused = false;
        this.duration = 0;
        this.startTime = null;

        const timerElement = document.getElementById('nextSendTimer');
        if (timerElement) {
            timerElement.style.display = 'none';
        }

        this.updateDisplay('', 'secondary', 'secondary');
        this.updateProgress(0, 'secondary');

        console.log('✅ TimerManager limpo');
    },
};

