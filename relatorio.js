// CONFIGURADO AUTOMATICAMENTE - 26/07/2025, 23:35:08
// Webhook Email: https://n8n-2025n8n.wjemh8.easypanel.host/webhook/b7242245-9aa9-458a-8f7b-ad1e6f5d5ba1
// Padrões aplicados: Sim

// Debug expandido
console.log('=== RELATÓRIO DEBUG COMPLETO ===');
console.log('🌐 URL atual:', window.location.href);
console.log('📋 URL params:', window.location.search);
console.log('💾 localStorage:', localStorage.getItem('current_report_data'));
console.log('🗃️ sessionStorage:', sessionStorage.getItem('current_report_data'));

// Testar se consegue acessar os storages
try {
    localStorage.setItem('test', 'ok');
    console.log('✅ localStorage funcional');
    localStorage.removeItem('test');
} catch (e) {
    console.error('❌ localStorage com problema:', e);
}

try {
    sessionStorage.setItem('test', 'ok');
    console.log('✅ sessionStorage funcional');
    sessionStorage.removeItem('test');
} catch (e) {
    console.error('❌ sessionStorage com problema:', e);
}

console.log('=================================');

// Dados do relatório (carregados via URL params ou localStorage)
let reportData = {};
let timelineChart = null;
let successChart = null;

// Variáveis globais para paginação e busca
let currentPage = 1;
let itemsPerPage = 20;
let filteredDetails = [];
let allDetails = [];

let currentTimelineType = 'hour';

// Inicialização
document.addEventListener('DOMContentLoaded', function () {
    loadReportData();
    initializeCharts();
    generateInsights();
    populateTimeline();
    populateDetailsTable();
});

function formatPhone(phone) {
    if (!phone) return '';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11) {
        return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
    } else if (cleaned.length === 10) {
        return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
}

// Carregar dados do relatório
function loadReportData() {
    console.log('🔄 Iniciando carregamento dos dados...');

    console.group('🔍 DEBUG: Verificação dos dados recebidos');
    console.log('🌐 URL atual:', window.location.href);
    console.log('📋 URL search:', window.location.search);

    // Método 1: Tentar carregar dos parâmetros da URL
    const urlParams = new URLSearchParams(window.location.search);
    const dataParam = urlParams.get('data');

    if (dataParam) {
        console.log('📦 Dados brutos da URL (primeiros 200 chars):', dataParam.substring(0, 200) + '...');
        try {
            const parsedData = JSON.parse(decodeURIComponent(dataParam));
            console.log('📊 Dados parseados da URL:', parsedData);
            console.log('⏱️ Duration na URL:', parsedData.duration, typeof parsedData.duration);
        } catch (e) {
            console.error('❌ Erro ao parsear dados da URL:', e);
        }
    }

    if (dataParam) {
        try {
            reportData = JSON.parse(decodeURIComponent(dataParam));
            console.log('✅ Dados carregados da URL:', reportData);

            // Converter strings de data
            if (typeof reportData.datetime === 'string') {
                reportData.datetime = new Date(reportData.datetime);
            }

            if (reportData.details && Array.isArray(reportData.details)) {
                reportData.details = reportData.details.map(detail => ({
                    ...detail,
                    datetime: typeof detail.datetime === 'string' ? new Date(detail.datetime) : detail.datetime
                }));
            }

            updateBasicInfo();
            updateMetrics();

            setTimeout(() => {
                debugDurationIssue();
            }, 1000);

            return; // Sair aqui se conseguiu carregar da URL

        } catch (error) {
            console.warn('⚠️ Erro ao parsear dados da URL:', error);
        }
    }

    // Método 2: Tentar sessionStorage
    const sessionData = sessionStorage.getItem('current_report_data');
    console.log('📦 SessionStorage:', sessionData);

    if (sessionData && sessionData !== 'null') {
        try {
            reportData = JSON.parse(sessionData);
            console.log('✅ Dados carregados do sessionStorage:', reportData);

            // Converter strings de data
            if (typeof reportData.datetime === 'string') {
                reportData.datetime = new Date(reportData.datetime);
            }

            if (reportData.details && Array.isArray(reportData.details)) {
                reportData.details = reportData.details.map(detail => ({
                    ...detail,
                    datetime: typeof detail.datetime === 'string' ? new Date(detail.datetime) : detail.datetime
                }));
            }

            updateBasicInfo();
            updateMetrics();
            return; // Sair aqui se conseguiu carregar do sessionStorage

        } catch (error) {
            console.warn('⚠️ Erro ao parsear sessionStorage:', error);
        }
    }

    // Método 3: Tentar localStorage
    const localData = localStorage.getItem('current_report_data');
    console.log('📦 LocalStorage:', localData);

    if (localData && localData !== 'null') {
        try {
            reportData = JSON.parse(localData);
            console.log('✅ Dados carregados do localStorage:', reportData);

            // Converter strings de data
            if (typeof reportData.datetime === 'string') {
                reportData.datetime = new Date(reportData.datetime);
            }

            if (reportData.details && Array.isArray(reportData.details)) {
                reportData.details = reportData.details.map(detail => ({
                    ...detail,
                    datetime: typeof detail.datetime === 'string' ? new Date(detail.datetime) : detail.datetime
                }));
            }

            updateBasicInfo();
            updateMetrics();
            return; // Sair aqui se conseguiu carregar do localStorage

        } catch (error) {
            console.warn('⚠️ Erro ao parsear localStorage:', error);
        }
    }

    // Se chegou até aqui, usar dados de exemplo
    console.warn('⚠️ Nenhum dado real encontrado - usando dados de exemplo');
    reportData = getExampleData();
    updateBasicInfo();
    updateMetrics();
}

function getExampleData() {
    console.warn('⚠️ Usando dados de exemplo - dados reais não encontrados!');
    return {
        datetime: new Date(),
        instanceName: "⚠️ DADOS DE EXEMPLO",
        totalContacts: 5,
        successCount: 4,
        errorCount: 1,
        duration: 300000, // 5 minutos em ms
        details: [
            {
                datetime: new Date(),
                name: "⚠️ João Silva (Exemplo)",
                phone: "11999999999",
                status: "Sucesso",
                message: "Olá João, bom dia! Como vai?"
            },
            {
                datetime: new Date(),
                name: "⚠️ Maria Santos (Exemplo)",
                phone: "11888888888",
                status: "Erro",
                message: "Olá Maria, boa tarde!"
            }
        ]
    };
}

function updateBasicInfo() {
    console.log('📝 Atualizando informações básicas...');

    const reportDate = new Date().toLocaleString('pt-BR');
    const reportPeriod = reportData.datetime ?
        new Date(reportData.datetime).toLocaleString('pt-BR') : 'Agora';
    const subtitle = `Instância: ${reportData.instanceName || 'Sem nome'}`;

    console.log('📅 Data do relatório:', reportDate);
    console.log('📅 Período:', reportPeriod);
    console.log('🏷️ Subtítulo:', subtitle);

    // Atualizar elementos DOM
    const reportDateEl = document.getElementById('reportDate');
    const reportPeriodEl = document.getElementById('reportPeriod');
    const reportSubtitleEl = document.getElementById('reportSubtitle');

    if (reportDateEl) {
        reportDateEl.textContent = reportDate;
        console.log('✅ reportDate atualizado');
    } else {
        console.error('❌ Elemento reportDate não encontrado');
    }

    if (reportPeriodEl) {
        reportPeriodEl.textContent = reportPeriod;
        console.log('✅ reportPeriod atualizado');
    } else {
        console.error('❌ Elemento reportPeriod não encontrado');
    }

    if (reportSubtitleEl) {
        reportSubtitleEl.textContent = subtitle;
        console.log('✅ reportSubtitle atualizado');
    } else {
        console.error('❌ Elemento reportSubtitle não encontrado');
    }
}

function updateMetrics() {
    console.log('📊 Atualizando métricas...');

    const total = reportData.totalContacts || 0;
    const success = reportData.successCount || 0;
    const errors = reportData.errorCount || 0;
    const successRate = total > 0 ? ((success / total) * 100).toFixed(1) : 0;
    const errorRate = total > 0 ? ((errors / total) * 100).toFixed(1) : 0;
    const duration = reportData.duration || 0;

    // ✅ DEBUG DETALHADO DA DURAÇÃO
    console.group('🔍 DEBUG: Análise da Duração');
    console.log('📊 reportData completo:', reportData);
    console.log('⏱️ duration raw:', duration, typeof duration);
    console.log('🔢 duration em número:', Number(duration));

    // ✅ FALLBACK: Calcular duração pelos detalhes se duration for 0
    let finalDuration = duration;
    if ((!duration || duration === 0) && reportData.details && reportData.details.length > 1) {
        const firstDetail = new Date(reportData.details[0].datetime);
        const lastDetail = new Date(reportData.details[reportData.details.length - 1].datetime);
        const calculatedDuration = lastDetail - firstDetail;

        console.log('🔄 Duration era 0, calculando pelos detalhes:');
        console.log('📅 Primeiro envio:', firstDetail);
        console.log('📅 Último envio:', lastDetail);
        console.log('⏱️ Duration calculada:', calculatedDuration, 'ms');

        finalDuration = calculatedDuration;
    }

    console.log('⏱️ Duration final para formatação:', finalDuration);
    console.groupEnd();

    console.log('📈 Métricas calculadas:', {
        total, success, errors, successRate, errorRate, finalDuration
    });

    // Atualizar elementos DOM
    const elements = {
        'totalSentMetric': total.toLocaleString(),
        'successMetric': success.toLocaleString(),
        'errorMetric': errors.toLocaleString(),
        'successRate': `${successRate}%`,
        'errorRate': `${errorRate}%`,
        'durationMetric': formatDuration(finalDuration) // ✅ Usar finalDuration
    };

    Object.entries(elements).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
            console.log(`✅ ${id} atualizado para: ${value}`);
        } else {
            console.error(`❌ Elemento ${id} não encontrado`);
        }
    });

    // Indicadores de mudança
    const totalChangeEl = document.getElementById('totalChange');
    const efficiencyRateEl = document.getElementById('efficiencyRate');

    if (totalChangeEl) totalChangeEl.textContent = '+100%'; // Primeira vez
    if (efficiencyRateEl) {
        const efficiency = successRate > 80 ? 'Excelente' :
            successRate > 60 ? 'Bom' : 'Pode melhorar';
        efficiencyRateEl.textContent = efficiency;
    }
}

function formatDuration(milliseconds) {
    console.log('🔍 formatDuration recebeu:', milliseconds, typeof milliseconds);

    // ✅ VALIDAÇÃO: Garantir que é um número válido
    if (!milliseconds || isNaN(milliseconds) || milliseconds <= 0) {
        console.warn('⚠️ Duration inválida ou zero:', milliseconds);
        return 'Instantâneo';
    }

    // ✅ CONVERSÃO: Garantir que está em milliseconds
    let ms = Number(milliseconds);

    // Se o número é muito pequeno (menor que 1 hora em segundos), pode estar em segundos
    if (ms > 0 && ms < 3600) {
        console.log('🔄 Valor muito pequeno, convertendo de segundos para milliseconds');
        ms = ms * 1000;
    }

    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    console.log('🕐 Calculado - Hours:', hours, 'Minutes:', minutes % 60, 'Seconds:', seconds % 60);

    if (hours > 0) {
        return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
        return `${minutes}m ${seconds % 60}s`;
    } else if (seconds > 0) {
        return `${seconds}s`;
    } else {
        return 'Excelente';
    }
}

function debugDurationIssue() {
    console.group('🔍 DEBUG COMPLETO: Investigação da Duração');

    console.log('📊 reportData completo:', reportData);
    console.log('⏱️ reportData.duration:', reportData.duration, typeof reportData.duration);

    if (reportData.details && reportData.details.length > 0) {
        console.log('📋 Total de detalhes:', reportData.details.length);
        console.log('📋 Primeiro envio:', reportData.details[0]);
        console.log('📋 Último envio:', reportData.details[reportData.details.length - 1]);

        if (reportData.details.length > 1) {
            const start = new Date(reportData.details[0].datetime);
            const end = new Date(reportData.details[reportData.details.length - 1].datetime);
            const calculated = end - start;

            console.log('🕐 Data início:', start);
            console.log('🕐 Data fim:', end);
            console.log('🕐 Duração calculada:', calculated, 'ms');
            console.log('🕐 Duração formatada:', formatDuration(calculated));
        }
    }

    // Testar diferentes valores na formatDuration
    console.log('🧪 Testes da formatDuration:');
    console.log('0:', formatDuration(0));
    console.log('30000 (30s):', formatDuration(30000));
    console.log('120000 (2min):', formatDuration(120000));
    console.log('3600000 (1h):', formatDuration(3600000));

    console.groupEnd();
}


// Inicializar gráficos
function initializeCharts() {
    console.log('🎨 Inicializando gráficos...');

    createTimelineChart();
    createSuccessChart();

    // ✅ NOVO: Carregar preferência da linha total
    const savedShowTotal = localStorage.getItem('showTotalLine') === 'true';
    const showTotalCheckbox = document.getElementById('showTotalLine');
    if (showTotalCheckbox) {
        showTotalCheckbox.checked = savedShowTotal;
        if (savedShowTotal) {
            // Pequeno delay para garantir que o gráfico foi criado
            setTimeout(() => toggleTotalLine(), 100);
        }
    }

    // Configurar botão ativo inicial
    const activeButton = document.querySelector('#timelineButtons .btn.active');
    if (activeButton) {
        console.log('✅ Botão ativo inicial configurado:', activeButton.textContent);
    }
}

// function createTimelineChart() {
//     const ctx = document.getElementById('timelineChart')?.getContext('2d');

//     if (!ctx) {
//         console.error('❌ Canvas timelineChart não encontrado');
//         return;
//     }

//     console.log('📊 Criando gráfico de timeline...');

//     // Dados iniciais (por hora)
//     const timelineData = generateTimelineData('hour');

//     timelineChart = new Chart(ctx, {
//         type: 'line',
//         data: {
//             labels: timelineData.labels,
//             datasets: [{
//                 label: 'Envios por Hora',
//                 data: timelineData.data,
//                 borderColor: '#00D95F',
//                 backgroundColor: 'rgba(0, 217, 95, 0.1)',
//                 borderWidth: 3,
//                 fill: true,
//                 tension: 0.4,
//                 pointBackgroundColor: '#00D95F',
//                 pointBorderColor: '#ffffff',
//                 pointBorderWidth: 2,
//                 pointRadius: 4,
//                 pointHoverRadius: 6
//             }]
//         },
//         options: {
//             responsive: true,
//             maintainAspectRatio: false,
//             plugins: {
//                 legend: {
//                     display: true,
//                     position: 'top',
//                     labels: {
//                         color: '#666',
//                         font: {
//                             size: 12
//                         }
//                     }
//                 },
//                 tooltip: {
//                     mode: 'index',
//                     intersect: false,
//                     backgroundColor: 'rgba(0, 0, 0, 0.8)',
//                     titleColor: '#fff',
//                     bodyColor: '#fff',
//                     borderColor: '#00D95F',
//                     borderWidth: 1
//                 }
//             },
//             scales: {
//                 y: {
//                     beginAtZero: true,
//                     grid: {
//                         color: 'rgba(0, 0, 0, 0.1)'
//                     },
//                     ticks: {
//                         color: '#666',
//                         stepSize: 1
//                     }
//                 },
//                 x: {
//                     grid: {
//                         color: 'rgba(0, 0, 0, 0.1)'
//                     },
//                     ticks: {
//                         color: '#666',
//                         maxTicksLimit: 15 // Limitar labels no eixo X
//                     }
//                 }
//             },
//             interaction: {
//                 mode: 'nearest',
//                 axis: 'x',
//                 intersect: false
//             }
//         }
//     });

//     console.log('✅ Gráfico de timeline criado com sucesso');
// }

function createTimelineChart() {
    const ctx = document.getElementById('timelineChart')?.getContext('2d');

    if (!ctx) {
        console.error('❌ Canvas timelineChart não encontrado');
        return;
    }

    console.log('📊 Criando gráfico de timeline com sucessos e erros...');

    // Dados iniciais (por hora)
    const timelineData = generateTimelineData('hour');

    timelineChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: timelineData.labels,
            datasets: [
                {
                    label: 'Envios com Sucesso',
                    data: timelineData.successData,
                    borderColor: '#28a745',
                    backgroundColor: 'rgba(40, 167, 69, 0.1)',
                    borderWidth: 3,
                    fill: false,
                    tension: 0.4,
                    pointBackgroundColor: '#28a745',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6
                },
                {
                    label: 'Envios com Erro',
                    data: timelineData.errorData,
                    borderColor: '#dc3545',
                    backgroundColor: 'rgba(220, 53, 69, 0.1)',
                    borderWidth: 3,
                    fill: false,
                    tension: 0.4,
                    pointBackgroundColor: '#dc3545',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        color: '#666',
                        font: {
                            size: 12
                        },
                        usePointStyle: true,
                        padding: 20
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    borderColor: '#00D95F',
                    borderWidth: 1,
                    callbacks: {
                        afterBody: function (context) {
                            const dataIndex = context[0].dataIndex;
                            const successCount = timelineData.successData[dataIndex];
                            const errorCount = timelineData.errorData[dataIndex];
                            const total = successCount + errorCount;
                            const successRate = total > 0 ? ((successCount / total) * 100).toFixed(1) : 0;

                            return [
                                `Total: ${total} envios`,
                                `Taxa de sucesso: ${successRate}%`
                            ];
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.1)'
                    },
                    ticks: {
                        color: '#666',
                        stepSize: 1
                    }
                },
                x: {
                    grid: {
                        color: 'rgba(0, 0, 0, 0.1)'
                    },
                    ticks: {
                        color: '#666',
                        maxTicksLimit: 15 // Limitar labels no eixo X
                    }
                }
            },
            interaction: {
                mode: 'nearest',
                axis: 'x',
                intersect: false
            }
        }
    });

    console.log('✅ Gráfico de timeline com sucessos/erros criado com sucesso');
}

function createSuccessChart() {
    const ctx = document.getElementById('successChart').getContext('2d');

    const success = reportData.successCount || 0;
    const errors = reportData.errorCount || 0;

    successChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Sucesso', 'Erro'],
            datasets: [{
                data: [success, errors],
                backgroundColor: ['#28a745', '#dc3545'],
                borderWidth: 0
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

function generateTimelineData(type = 'hour') {
    const details = reportData.details || [];
    console.log(`📊 Gerando dados do timeline - Tipo: ${type}, Detalhes: ${details.length}`);

    if (details.length === 0) {
        console.warn('⚠️ Nenhum detalhe encontrado para gerar timeline');
        return {
            labels: ['Sem dados'],
            successData: [0],
            errorData: [0],
            totalData: [0] // ✅ ADICIONAR totalData mesmo quando vazio
        };
    }

    if (type === 'minute') {
        return generateMinuteTimeline(details);
    } else {
        return generateHourTimeline(details);
    }
}

function generateHourTimeline(details) {
    console.log('🕐 Gerando timeline por hora com sucessos e erros...');

    const hourlySuccessData = {};
    const hourlyErrorData = {};

    // Agrupar por hora E status
    details.forEach(detail => {
        const date = new Date(detail.datetime);
        const hour = date.getHours();

        if (detail.status === 'Sucesso') {
            hourlySuccessData[hour] = (hourlySuccessData[hour] || 0) + 1;
        } else {
            hourlyErrorData[hour] = (hourlyErrorData[hour] || 0) + 1;
        }
    });

    // Criar arrays para o gráfico (24 horas)
    const labels = [];
    const successData = [];
    const errorData = [];
    const totalData = []; // ✅ dados totais

    for (let i = 0; i < 24; i++) {
        const success = hourlySuccessData[i] || 0;
        const error = hourlyErrorData[i] || 0;

        labels.push(`${i.toString().padStart(2, '0')}:00`);
        successData.push(success);
        errorData.push(error);
        totalData.push(success + error); // ✅ somar sucesso + erro
    }

    console.log('✅ Timeline por hora gerada:', {
        totalHours: labels.length,
        totalSucessos: successData.reduce((a, b) => a + b, 0),
        totalErros: errorData.reduce((a, b) => a + b, 0),
        horasComEnvios: successData.filter((v, i) => v > 0 || errorData[i] > 0).length
    });

    return { labels, successData, errorData, totalData }; // ✅ incluir totalData
}

function generateMinuteTimeline(details) {
    console.log('⏱️ Gerando timeline por minuto com sucessos e erros...');

    // Encontrar intervalo de tempo dos envios
    const dates = details.map(d => new Date(d.datetime)).sort((a, b) => a - b);
    const startTime = dates[0];
    const endTime = dates[dates.length - 1];

    console.log('📅 Período:', startTime.toLocaleTimeString(), 'até', endTime.toLocaleTimeString());

    // Se o período for muito longo (mais de 2 horas), agrupar por intervalos de 5 minutos
    const totalMinutes = Math.ceil((endTime - startTime) / 60000);
    const useInterval = totalMinutes > 120;
    const interval = useInterval ? 5 : 1; // 5 minutos ou 1 minuto

    console.log(`📊 Total de minutos: ${totalMinutes}, Usando intervalo de: ${interval} min`);

    const minuteSuccessData = {};
    const minuteErrorData = {};

    // Agrupar por minuto ou intervalo E status
    details.forEach(detail => {
        const date = new Date(detail.datetime);
        const minutes = date.getHours() * 60 + date.getMinutes();

        // Arredondar para o intervalo mais próximo
        const roundedMinutes = Math.floor(minutes / interval) * interval;

        if (detail.status === 'Sucesso') {
            minuteSuccessData[roundedMinutes] = (minuteSuccessData[roundedMinutes] || 0) + 1;
        } else {
            minuteErrorData[roundedMinutes] = (minuteErrorData[roundedMinutes] || 0) + 1;
        }
    });

    // Criar labels e dados
    const labels = [];
    const successData = [];
    const errorData = [];
    const totalData = []; // ✅ NOVO: dados totais

    // Encontrar intervalo dos dados
    const allMinuteKeys = [
        ...Object.keys(minuteSuccessData).map(Number),
        ...Object.keys(minuteErrorData).map(Number)
    ].sort((a, b) => a - b);

    const startMinute = allMinuteKeys[0] || 0;
    const endMinute = allMinuteKeys[allMinuteKeys.length - 1] || 0;

    // ✅ CORREÇÃO: Definir expandedStart e expandedEnd corretamente
    const expandedStart = Math.max(0, startMinute - (interval * 2));
    const expandedEnd = Math.min(1440, endMinute + (interval * 2)); // 1440 = 24h em minutos

    // ✅ CORREÇÃO: Loop completo para gerar os dados
    for (let i = expandedStart; i <= expandedEnd; i += interval) {
        const hours = Math.floor(i / 60);
        const mins = i % 60;
        const success = minuteSuccessData[i] || 0;
        const error = minuteErrorData[i] || 0;

        if (interval === 1) {
            labels.push(`${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`);
        } else {
            labels.push(`${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`);
        }

        successData.push(success);
        errorData.push(error);
        totalData.push(success + error); // ✅ NOVO: somar sucesso + erro
    }

    console.log('✅ Timeline por minuto gerada:', {
        intervalo: `${interval} min`,
        totalPontos: labels.length,
        totalSucessos: successData.reduce((a, b) => a + b, 0),
        totalErros: errorData.reduce((a, b) => a + b, 0),
        periodo: `${labels[0]} - ${labels[labels.length - 1]}`
    });

    return { labels, successData, errorData, totalData }; // ✅ NOVO: incluir totalData
}

function toggleTotalLine() {
    const showTotal = document.getElementById('showTotalLine').checked;

    if (!timelineChart) {
        console.warn('⚠️ Gráfico de timeline não encontrado');
        return;
    }

    console.log('🔄 Toggle linha total:', showTotal ? 'mostrar' : 'esconder');

    if (showTotal && timelineChart.data.datasets.length === 2) {
        // ✅ ADICIONAR linha total
        const newData = generateTimelineData(currentTimelineType);

        timelineChart.data.datasets.push({
            label: `Total de Envios (${currentTimelineType === 'hour' ? 'por Hora' : 'por Minuto'})`,
            data: newData.totalData,
            borderColor: '#6c757d',
            backgroundColor: 'rgba(108, 117, 125, 0.05)',
            borderWidth: 2,
            borderDash: [8, 4], // Linha tracejada mais visível
            fill: false,
            tension: 0.4,
            pointBackgroundColor: '#6c757d',
            pointBorderColor: '#ffffff',
            pointBorderWidth: 1,
            pointRadius: 3,
            pointHoverRadius: 5,
            // Estilo diferenciado para linha total
            pointStyle: 'rect' // Quadrado em vez de círculo
        });

        console.log('✅ Linha total adicionada ao gráfico');

    } else if (!showTotal && timelineChart.data.datasets.length === 3) {
        // ✅ REMOVER linha total
        timelineChart.data.datasets.pop();
        console.log('✅ Linha total removida do gráfico');
    }

    // Atualizar gráfico com animação suave
    timelineChart.update('active');

    // Salvar preferência no localStorage (opcional)
    localStorage.setItem('showTotalLine', showTotal);
}

function generateInsights() {
    const insights = [];
    const total = reportData.totalContacts || 0;
    const success = reportData.successCount || 0;
    const successRate = total > 0 ? (success / total) * 100 : 0;

    if (successRate > 90) {
        insights.push({
            icon: '🎉',
            text: 'Excelente performance! Taxa de sucesso acima de 90%.'
        });
    } else if (successRate > 80) {
        insights.push({
            icon: '👍',
            text: 'Boa performance! Considere otimizar para alcançar 90%.'
        });
    } else {
        insights.push({
            icon: '⚠️',
            text: 'Performance pode melhorar. Verifique a qualidade dos números.'
        });
    }

    if (total > 1000) {
        insights.push({
            icon: '🚀',
            text: 'Campanha de grande escala! Considere dividir em lotes menores para melhor controle.'
        });
    }

    // Analisar horário de pico
    const details = reportData.details || [];
    const hourlyData = {};
    details.forEach(detail => {
        const hour = new Date(detail.datetime).getHours();
        hourlyData[hour] = (hourlyData[hour] || 0) + 1;
    });

    const peakHour = Object.keys(hourlyData).reduce((a, b) =>
        hourlyData[a] > hourlyData[b] ? a : b, 0);

    if (peakHour >= 9 && peakHour <= 18) {
        insights.push({
            icon: '⏰',
            text: `Horário de pico às ${peakHour}h está dentro do horário comercial - ideal!`
        });
    } else {
        insights.push({
            icon: '🌙',
            text: `Pico de envios às ${peakHour}h. Considere ajustar para horário comercial.`
        });
    }

    // Renderizar insights
    const container = document.getElementById('insightsList');
    container.innerHTML = insights.map(insight => `
       <div class="insight-item">
           <span class="insight-icon">${insight.icon}</span>
           <span>${insight.text}</span>
       </div>
   `).join('');
}

function populateTimeline() {
    console.log('⏰ Populando timeline melhorada...');

    const container = document.getElementById('timelineEvents');
    if (!container) return;

    const details = reportData.details || [];
    if (details.length === 0) return;

    // Calcular estatísticas para eventos inteligentes
    const totalContacts = reportData.totalContacts || 0;
    const successCount = reportData.successCount || 0;
    const errorCount = reportData.errorCount || 0;
    const startTime = new Date(details[0].datetime);
    const endTime = new Date(details[details.length - 1].datetime);
    const duration = endTime - startTime;

    // Encontrar marcos importantes
    const errors = details.filter(d => d.status === 'Erro');
    const successes = details.filter(d => d.status === 'Sucesso');

    // Encontrar pico de atividade
    const hourlyData = {};
    details.forEach(detail => {
        const hour = new Date(detail.datetime).getHours();
        hourlyData[hour] = (hourlyData[hour] || 0) + 1;
    });
    const peakHour = Object.keys(hourlyData).reduce((a, b) =>
        hourlyData[a] > hourlyData[b] ? a : b, 0);
    const peakCount = hourlyData[peakHour];

    // Eventos importantes
    const events = [
        {
            time: startTime,
            title: '🚀 Início da Campanha',
            description: `Primeiro envio para ${details[0].name}`,
            type: 'start',
            icon: 'play-circle',
            color: 'primary'
        }
    ];

    // Primeiro erro (se houver)
    if (errors.length > 0) {
        events.push({
            time: new Date(errors[0].datetime),
            title: '⚠️ Primeiro Erro Detectado',
            description: `Falha no envio para ${errors[0].name}`,
            type: 'error',
            icon: 'exclamation-triangle',
            color: 'danger'
        });
    }

    // Marco de meio da campanha
    if (details.length > 10) {
        const midIndex = Math.floor(details.length / 2);
        const midDetail = details[midIndex];
        events.push({
            time: new Date(midDetail.datetime),
            title: '📊 Meio da Campanha',
            description: `${midIndex + 1}º envio de ${totalContacts} total`,
            type: 'milestone',
            icon: 'flag',
            color: 'info'
        });
    }

    // Pico de atividade
    const peakDetails = details.filter(d => new Date(d.datetime).getHours() == peakHour);
    if (peakDetails.length > 0) {
        events.push({
            time: new Date(peakDetails[0].datetime),
            title: `🔥 Pico de Atividade (${peakCount} envios)`,
            description: `Maior volume às ${peakHour}h`,
            type: 'peak',
            icon: 'graph-up-arrow',
            color: 'warning'
        });
    }

    // Final da campanha
    events.push({
        time: endTime,
        title: '✅ Campanha Finalizada',
        description: `Último envio para ${details[details.length - 1].name}`,
        type: 'end',
        icon: 'check-circle',
        color: 'success'
    });

    // Ordenar eventos por tempo
    events.sort((a, b) => a.time - b.time);

    // HTML melhorado da timeline
    container.innerHTML = `
        <div class="timeline-header mb-3">
            <div class="d-flex justify-content-between align-items-center">
                <h5 class="mb-0">📈 Principais Marcos</h5>
                <small class="text-muted">Duração: ${formatDuration(duration)}</small>
            </div>
        </div>
        
        <div class="timeline-stats mb-3">
            <div class="row g-2">
                <div class="col-4">
                    <div class="stat-mini">
                        <div class="stat-value text-success">${successCount}</div>
                        <div class="stat-label">Sucessos</div>
                    </div>
                </div>
                <div class="col-4">
                    <div class="stat-mini">
                        <div class="stat-value text-danger">${errorCount}</div>
                        <div class="stat-label">Erros</div>
                    </div>
                </div>
                <div class="col-4">
                    <div class="stat-mini">
                        <div class="stat-value text-primary">${peakCount}</div>
                        <div class="stat-label">Pico/Hora</div>
                    </div>
                </div>
            </div>
        </div>
        
        ${events.map(event => `
            <div class="timeline-item enhanced">
                <div class="timeline-marker bg-${event.color}">
                    <i class="bi bi-${event.icon}"></i>
                </div>
                <div class="timeline-content">
                    <div class="timeline-time">
                        <i class="bi bi-clock me-1"></i>
                        ${event.time.toLocaleTimeString('pt-BR')}
                    </div>
                    <h6 class="timeline-title">${event.title}</h6>
                    <p class="timeline-desc">${event.description}</p>
                </div>
            </div>
        `).join('')}
        
        <div class="timeline-footer mt-3">
            <div class="text-center">
                <small class="text-muted">
                    <i class="bi bi-info-circle me-1"></i>
                    Timeline baseada nos principais eventos da campanha
                </small>
            </div>
        </div>
    `;
}


// Preencher tabela de detalhes
function populateDetailsTable() {
    console.log('📊 Populando tabela de detalhes melhorada...');

    allDetails = reportData.details || [];
    filteredDetails = [...allDetails];

    // Criar controles de busca e paginação
    createTableControls();

    // Renderizar tabela inicial
    renderTable();

    // Renderizar paginação
    renderPagination();
}

function createTableControls() {
    console.log('🔧 Criando controles da tabela...');

    // Encontrar a seção da tabela pelo ID específico
    const tableContainer = document.querySelector('.details-table');
    if (!tableContainer) {
        console.error('❌ Container da tabela não encontrado');
        return;
    }

    // Remover controles existentes se houver
    const existingControls = document.getElementById('tableControls');
    if (existingControls) {
        existingControls.remove();
    }

    const controlsHTML = `
        <div id="tableControls" class="mb-3">
            <div class="row align-items-center">
                <div class="col-md-6">
                    <div class="input-group">
                        <span class="input-group-text">
                            <i class="bi bi-search"></i>
                        </span>
                        <input type="text" 
                               class="form-control" 
                               id="searchInput" 
                               placeholder="Buscar por nome, telefone ou status..."
                               onkeyup="handleSearch()">
                        <button class="btn btn-outline-secondary" onclick="clearSearch()">
                            <i class="bi bi-x"></i>
                        </button>
                    </div>
                </div>
                <div class="col-md-3">
                    <select class="form-select" id="statusFilter" onchange="handleFilter()">
                        <option value="">Todos os Status</option>
                        <option value="Sucesso">Apenas Sucessos</option>
                        <option value="Erro">Apenas Erros</option>
                    </select>
                </div>
                <div class="col-md-3">
                    <select class="form-select" id="itemsPerPageSelect" onchange="changeItemsPerPage()">
                        <option value="10">10 por página</option>
                        <option value="20" selected>20 por página</option>
                        <option value="50">50 por página</option>
                        <option value="100">100 por página</option>
                    </select>
                </div>
            </div>
            
            <div class="row mt-2">
                <div class="col-12">
                    <small class="text-muted" id="tableInfo">
                        Mostrando <span id="showingCount">0</span> de <span id="totalCount">0</span> registros
                    </small>
                </div>
            </div>
        </div>
    `;

    // Inserir antes da tabela
    tableContainer.insertAdjacentHTML('beforebegin', controlsHTML);
    console.log('✅ Controles da tabela criados');
}

function handleSearch() {
    const searchInput = document.getElementById('searchInput');
    const statusFilter = document.getElementById('statusFilter');

    if (!searchInput || !statusFilter) {
        console.error('❌ Elementos de busca não encontrados');
        return;
    }

    const searchTerm = searchInput.value.toLowerCase();
    const statusFilterValue = statusFilter.value;

    console.log('🔍 Buscando:', searchTerm, 'Status:', statusFilterValue);

    filteredDetails = allDetails.filter(detail => {
        const matchesSearch = !searchTerm ||
            detail.name.toLowerCase().includes(searchTerm) ||
            detail.phone.includes(searchTerm) ||
            detail.status.toLowerCase().includes(searchTerm);

        const matchesStatus = !statusFilterValue || detail.status === statusFilterValue;

        return matchesSearch && matchesStatus;
    });

    currentPage = 1;
    renderTable();
    renderPagination();

    console.log(`✅ Busca concluída: ${filteredDetails.length} resultados`);
}

function handleFilter() {
    handleSearch(); // Usa a mesma lógica
}

function clearSearch() {
    const searchInput = document.getElementById('searchInput');
    const statusFilter = document.getElementById('statusFilter');

    if (searchInput) searchInput.value = '';
    if (statusFilter) statusFilter.value = '';

    handleSearch();
}

function changeItemsPerPage() {
    const select = document.getElementById('itemsPerPageSelect');
    if (!select) return;

    itemsPerPage = parseInt(select.value);
    currentPage = 1;
    renderTable();
    renderPagination();
}

function renderTable() {
    console.log('🎨 Renderizando tabela...');

    const tbody = document.getElementById('detailsTableBody');
    if (!tbody) {
        console.error('❌ tbody da tabela não encontrado');
        return;
    }

    // Calcular itens da página atual
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageItems = filteredDetails.slice(startIndex, endIndex);

    console.log(`📄 Página ${currentPage}: ${startIndex}-${endIndex} de ${filteredDetails.length}`);

    // Atualizar cabeçalho da tabela
    const thead = tbody.closest('table')?.querySelector('thead tr');
    if (thead) {
        thead.innerHTML = `
            <th style="width: 15%">Horário</th>
            <th style="width: 30%">Nome</th>
            <th style="width: 20%">Telefone</th>
            <th style="width: 20%">Instância</th>
            <th style="width: 15%">Status</th>
        `;
    }

    // Renderizar linhas
    if (pageItems.length > 0) {
        tbody.innerHTML = pageItems.map(detail => `
            <tr>
                <td class="text-center">
                    <small>${new Date(detail.datetime).toLocaleTimeString('pt-BR')}</small>
                </td>
                <td>
                    <strong>${detail.name}</strong>
                </td>
                <td class="text-center">
                    <code>${formatPhone(detail.phone)}</code>
                </td>
                <td class="text-center">
                    <span class="badge bg-primary">${reportData.instanceName || 'N/A'}</span>
                </td>
                <td class="text-center">
                    <span class="status-badge ${detail.status === 'Sucesso' ? 'status-success' : 'status-error'}">
                        <i class="bi bi-${detail.status === 'Sucesso' ? 'check-circle' : 'x-circle'} me-1"></i>
                        ${detail.status}
                    </span>
                </td>
            </tr>
        `).join('');
    } else {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center text-muted py-4">
                    <i class="bi bi-search display-4 d-block mb-2"></i>
                    <h5>Nenhum registro encontrado</h5>
                    <p>Tente ajustar os filtros de busca</p>
                </td>
            </tr>
        `;
    }

    // Atualizar informações
    updateTableInfo();

    console.log('✅ Tabela renderizada com sucesso');
}

function updateTableInfo() {
    const showingCount = Math.min(
        itemsPerPage,
        Math.max(0, filteredDetails.length - (currentPage - 1) * itemsPerPage)
    );
    const totalCount = filteredDetails.length;

    const showingEl = document.getElementById('showingCount');
    const totalEl = document.getElementById('totalCount');

    if (showingEl) showingEl.textContent = showingCount;
    if (totalEl) totalEl.textContent = totalCount;
}

function renderPagination() {
    const totalPages = Math.ceil(filteredDetails.length / itemsPerPage);

    // Remover paginação existente
    const existingPagination = document.getElementById('tablePagination');
    if (existingPagination) {
        existingPagination.remove();
    }

    if (totalPages <= 1) return;

    let paginationHTML = `
        <div id="tablePagination" class="d-flex justify-content-center mt-3">
            <nav aria-label="Paginação da tabela">
                <ul class="pagination pagination-sm">
    `;

    // Botão anterior
    paginationHTML += `
        <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="changePage(${currentPage - 1}); return false;">
                <i class="bi bi-chevron-left"></i>
            </a>
        </li>
    `;

    // Páginas
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);

    if (startPage > 1) {
        paginationHTML += `<li class="page-item"><a class="page-link" href="#" onclick="changePage(1); return false;">1</a></li>`;
        if (startPage > 2) {
            paginationHTML += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
        }
    }

    for (let i = startPage; i <= endPage; i++) {
        paginationHTML += `
            <li class="page-item ${i === currentPage ? 'active' : ''}">
                <a class="page-link" href="#" onclick="changePage(${i}); return false;">${i}</a>
            </li>
        `;
    }

    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            paginationHTML += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
        }
        paginationHTML += `<li class="page-item"><a class="page-link" href="#" onclick="changePage(${totalPages}); return false;">${totalPages}</a></li>`;
    }

    // Botão próximo
    paginationHTML += `
        <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="changePage(${currentPage + 1}); return false;">
                <i class="bi bi-chevron-right"></i>
            </a>
        </li>
    `;

    paginationHTML += `
                </ul>
            </nav>
        </div>
    `;

    // Inserir após a tabela
    const tableContainer = document.querySelector('.details-table');
    if (tableContainer) {
        tableContainer.insertAdjacentHTML('afterend', paginationHTML);
    }

    console.log(`✅ Paginação criada: ${totalPages} páginas`);
}

function changePage(newPage) {
    const totalPages = Math.ceil(filteredDetails.length / itemsPerPage);
    if (newPage >= 1 && newPage <= totalPages) {
        currentPage = newPage;
        renderTable();
        renderPagination();

        // Scroll suave para a tabela
        const tableContainer = document.querySelector('.details-table');
        if (tableContainer) {
            tableContainer.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }

        console.log(`📄 Mudou para página ${newPage}`);
    }
}

function handleSearch() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const statusFilter = document.getElementById('statusFilter').value;

    filteredDetails = allDetails.filter(detail => {
        const matchesSearch = !searchTerm ||
            detail.name.toLowerCase().includes(searchTerm) ||
            detail.phone.includes(searchTerm) ||
            detail.status.toLowerCase().includes(searchTerm);

        const matchesStatus = !statusFilter || detail.status === statusFilter;

        return matchesSearch && matchesStatus;
    });

    currentPage = 1;
    renderTable();
    renderPagination();
}

function handleFilter() {
    handleSearch(); // Usa a mesma lógica
}

function clearSearch() {
    document.getElementById('searchInput').value = '';
    document.getElementById('statusFilter').value = '';
    handleSearch();
}

function changeItemsPerPage() {
    itemsPerPage = parseInt(document.getElementById('itemsPerPageSelect').value);
    currentPage = 1;
    renderTable();
    renderPagination();
}

function renderTable() {
    const tbody = document.getElementById('detailsTableBody');
    if (!tbody) return;

    // Calcular itens da página atual
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageItems = filteredDetails.slice(startIndex, endIndex);

    // Atualizar cabeçalho da tabela
    const thead = tbody.closest('table')?.querySelector('thead tr');
    if (thead) {
        thead.innerHTML = `
            <th style="width: 15%">Horário</th>
            <th style="width: 30%">Nome</th>
            <th style="width: 20%">Telefone</th>
            <th style="width: 20%">Instância</th>
            <th style="width: 15%">Status</th>
        `;
    }

    // Renderizar linhas
    tbody.innerHTML = pageItems.map(detail => `
        <tr>
            <td class="text-center">
                <small>${new Date(detail.datetime).toLocaleTimeString('pt-BR')}</small>
            </td>
            <td>
                <strong>${detail.name}</strong>
            </td>
            <td class="text-center">
                <code>${formatPhone(detail.phone)}</code>
            </td>
            <td class="text-center">
                <span class="badge bg-primary">${reportData.instanceName || 'N/A'}</span>
            </td>
            <td class="text-center">
                <span class="status-badge ${detail.status === 'Sucesso' ? 'status-success' : 'status-error'}">
                    <i class="bi bi-${detail.status === 'Sucesso' ? 'check-circle' : 'x-circle'} me-1"></i>
                    ${detail.status}
                </span>
            </td>
        </tr>
    `).join('');

    // Se não há dados
    if (pageItems.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center text-muted py-4">
                    <i class="bi bi-search display-4 d-block mb-2"></i>
                    <h5>Nenhum registro encontrado</h5>
                    <p>Tente ajustar os filtros de busca</p>
                </td>
            </tr>
        `;
    }

    // Atualizar informações
    updateTableInfo();
}

function updateTableInfo() {
    const showingCount = Math.min(itemsPerPage, filteredDetails.length - (currentPage - 1) * itemsPerPage);
    const totalCount = filteredDetails.length;

    const showingEl = document.getElementById('showingCount');
    const totalEl = document.getElementById('totalCount');

    if (showingEl) showingEl.textContent = showingCount;
    if (totalEl) totalEl.textContent = totalCount;
}

function renderPagination() {
    const totalPages = Math.ceil(filteredDetails.length / itemsPerPage);

    // Remover paginação existente
    const existingPagination = document.getElementById('tablePagination');
    if (existingPagination) {
        existingPagination.remove();
    }

    if (totalPages <= 1) return;

    // Calcular informações da página atual
    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, filteredDetails.length);
    const totalItems = filteredDetails.length;

    let paginationHTML = `
        <div id="tablePagination" class="d-flex justify-content-center align-items-center flex-wrap gap-3 mt-4">
            <!-- Informações da Página -->
            <div class="pagination-info">
                <i class="bi bi-info-circle"></i>
                Página ${currentPage} de ${totalPages}
                <span class="mx-2">•</span>
                ${startItem}-${endItem} de ${totalItems} registros
            </div>
            
            <!-- Navegação Principal -->
            <nav aria-label="Paginação da tabela">
                <ul class="pagination pagination-modern">
    `;

    // Botão "Primeira Página"
    if (currentPage > 3) {
        paginationHTML += `
            <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="changePage(1); return false;" 
                   title="Primeira página" data-page="1">
                    <i class="bi bi-chevron-double-left"></i>
                </a>
            </li>
        `;
    }

    // Botão "Anterior"
    paginationHTML += `
        <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="changePage(${currentPage - 1}); return false;" 
               title="Página anterior">
                <i class="bi bi-chevron-left"></i>
                <span class="d-none d-md-inline ms-1">Anterior</span>
            </a>
        </li>
    `;

    // Páginas numéricas - lógica inteligente
    const delta = 2;
    const startPage = Math.max(1, currentPage - delta);
    const endPage = Math.min(totalPages, currentPage + delta);

    // Mostrar primeira página se não estiver no range
    if (startPage > 1) {
        paginationHTML += `
            <li class="page-item">
                <a class="page-link" href="#" onclick="changePage(1); return false;" data-page="1">1</a>
            </li>
        `;

        if (startPage > 2) {
            paginationHTML += `
                <li class="page-item disabled">
                    <span class="page-link">⋯</span>
                </li>
            `;
        }
    }

    // Páginas no range atual
    for (let i = startPage; i <= endPage; i++) {
        const isActive = i === currentPage;
        paginationHTML += `
            <li class="page-item ${isActive ? 'active' : ''}">
                <a class="page-link ${isActive ? 'current-page' : ''}" 
                   href="#" 
                   onclick="changePage(${i}); return false;" 
                   data-page="${i}"
                   ${isActive ? 'aria-current="page"' : ''}>
                    ${i}
                    ${isActive ? '<div class="pagination-progress" style="width: 100%"></div>' : ''}
                </a>
            </li>
        `;
    }

    // Mostrar última página se não estiver no range
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            paginationHTML += `
                <li class="page-item disabled">
                    <span class="page-link">⋯</span>
                </li>
            `;
        }

        paginationHTML += `
            <li class="page-item">
                <a class="page-link" href="#" onclick="changePage(${totalPages}); return false;" 
                   data-page="${totalPages}">${totalPages}</a>
            </li>
        `;
    }

    // Botão "Próximo"
    paginationHTML += `
        <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="changePage(${currentPage + 1}); return false;" 
               title="Próxima página">
                <span class="d-none d-md-inline me-1">Próximo</span>
                <i class="bi bi-chevron-right"></i>
            </a>
        </li>
    `;

    // Botão "Última Página"
    if (currentPage < totalPages - 2) {
        paginationHTML += `
            <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="changePage(${totalPages}); return false;" 
                   title="Última página" data-page="${totalPages}">
                    <i class="bi bi-chevron-double-right"></i>
                </a>
            </li>
        `;
    }

    paginationHTML += `
                </ul>
            </nav>
            
            <!-- Navegação Rápida -->
            <div class="quick-navigation">
                <div class="input-group input-group-sm" style="width: 120px;">
                    <span class="input-group-text">
                        <i class="bi bi-skip-end"></i>
                    </span>
                    <input type="number" 
                           class="form-control" 
                           id="quickPageInput" 
                           placeholder="Ir para..."
                           min="1" 
                           max="${totalPages}"
                           onkeypress="handleQuickNavigation(event, ${totalPages})"
                           title="Digite o número da página">
                </div>
            </div>
        </div>
    `;

    // Inserir após a tabela
    const tableContainer = document.querySelector('.details-table');
    if (tableContainer) {
        tableContainer.insertAdjacentHTML('afterend', paginationHTML);

        // Adicionar efeito de loading (opcional)
        setTimeout(() => {
            const pagination = document.getElementById('tablePagination');
            if (pagination) {
                pagination.classList.remove('loading');
            }
        }, 100);
    }

    console.log(`✅ Paginação moderna criada: ${totalPages} páginas, mostrando ${startItem}-${endItem} de ${totalItems}`);
}

function handleQuickNavigation(event, totalPages) {
    if (event.key === 'Enter') {
        const input = event.target;
        const pageNumber = parseInt(input.value);

        if (pageNumber >= 1 && pageNumber <= totalPages) {
            changePage(pageNumber);
            input.value = ''; // Limpar o campo
            input.blur(); // Remover foco
        } else {
            // Efeito visual de erro
            input.style.borderColor = '#dc3545';
            input.style.boxShadow = '0 0 0 0.2rem rgba(220, 53, 69, 0.25)';

            setTimeout(() => {
                input.style.borderColor = '';
                input.style.boxShadow = '';
            }, 1500);
        }
    }
}

function changePage(newPage) {
    const totalPages = Math.ceil(filteredDetails.length / itemsPerPage);

    if (newPage >= 1 && newPage <= totalPages && newPage !== currentPage) {
        // Adicionar efeito de loading
        const pagination = document.getElementById('tablePagination');
        if (pagination) {
            pagination.classList.add('loading');
        }

        currentPage = newPage;

        // Pequeno delay para efeito visual
        setTimeout(() => {
            renderTable();
            renderPagination();

            // Scroll suave para a tabela
            const tableContainer = document.querySelector('.details-table');
            if (tableContainer) {
                tableContainer.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }

            console.log(`📄 Mudou para página ${newPage} de ${totalPages}`);
        }, 150);
    }
}

function goToFirstPage() {
    changePage(1);
}

function goToLastPage() {
    const totalPages = Math.ceil(filteredDetails.length / itemsPerPage);
    changePage(totalPages);
}

function updateTimelineChart(type, clickedButton) {
    console.log('🔄 Atualizando timeline para:', type);

    // ✅ NOVO: Atualizar tipo atual
    currentTimelineType = type;

    // Atualizar botões ativos
    document.querySelectorAll('#timelineButtons .btn').forEach(btn => {
        btn.classList.remove('active');
    });

    if (clickedButton) {
        clickedButton.classList.add('active');
    }

    // Verificar se o gráfico existe
    if (!timelineChart) {
        console.warn('⚠️ Gráfico de timeline não encontrado');
        return;
    }

    // Gerar novos dados baseados no tipo
    const newData = generateTimelineData(type);

    // Atualizar dados do gráfico
    timelineChart.data.labels = newData.labels;

    // Atualizar dataset de sucessos
    timelineChart.data.datasets[0].data = newData.successData;
    timelineChart.data.datasets[0].label = type === 'hour' ? 'Envios com Sucesso (por Hora)' : 'Envios com Sucesso (por Minuto)';

    // Atualizar dataset de erros
    timelineChart.data.datasets[1].data = newData.errorData;
    timelineChart.data.datasets[1].label = type === 'hour' ? 'Envios com Erro (por Hora)' : 'Envios com Erro (por Minuto)';

    // ✅ NOVO: Atualizar linha total se estiver visível
    const showTotal = document.getElementById('showTotalLine')?.checked;
    if (showTotal && timelineChart.data.datasets.length === 3) {
        timelineChart.data.datasets[2].data = newData.totalData;
        timelineChart.data.datasets[2].label = `Total de Envios (${type === 'hour' ? 'por Hora' : 'por Minuto'})`;
    }

    // Atualizar gráfico
    timelineChart.update('active');

    console.log('✅ Timeline atualizada:', {
        type,
        labels: newData.labels.length,
        totalSucessos: newData.successData.reduce((a, b) => a + b, 0),
        totalErros: newData.errorData.reduce((a, b) => a + b, 0),
        showingTotal: showTotal
    });
}

// Tema escuro/claro
function toggleTheme() {
    const html = document.documentElement;
    const currentTheme = html.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', newTheme);

    const icon = document.getElementById('themeIcon');
    icon.className = newTheme === 'dark' ? 'bi bi-sun-fill' : 'bi bi-moon-fill';
}

function generatePDF() {
    // Opção 1: CSS otimizado para impressão
    optimizePrintCSS();

    // Definir nome do arquivo
    const fileName = `Relatório ${reportData.instanceName} - ${new Date().toLocaleDateString('pt-BR')}`;
    document.title = fileName;

    // Configurar página para impressão
    setupPrintLayout();

    // Imprimir
    window.print();

    // Restaurar layout após impressão
    setTimeout(() => {
        restoreNormalLayout();
        document.title = 'Relatório de Disparo - Disparador PRO V2';
    }, 1000);
}

function optimizePrintCSS() {
    // Adicionar CSS específico para impressão
    const printStyles = `
        <style id="printOptimization">
            @media print {
                @page {
                    size: A4;
                    margin: 1cm !important;
                }
                
                body {
                    font-size: 11px !important;
                    line-height: 1.3 !important;
                    -webkit-print-color-adjust: exact !important;
                    color-adjust: exact !important;
                }
                
                .container {
                    max-width: none !important;
                    padding: 0 !important;
                    margin: 0 !important;
                }
                
                .report-header {
                    background: #00D95F !important;
                    -webkit-print-color-adjust: exact !important;
                    color-adjust: exact !important;
                    padding: 15px !important;
                    margin-bottom: 15px !important;
                    page-break-inside: avoid !important;
                }
                
                .report-title {
                    font-size: 24px !important;
                    margin-bottom: 5px !important;
                }
                
                .report-subtitle {
                    font-size: 14px !important;
                }
                
                .report-date {
                    position: static !important;
                    text-align: left !important;
                    margin-top: 10px !important;
                    font-size: 12px !important;
                }
                
                .metric-card {
                    break-inside: avoid !important;
                    margin-bottom: 10px !important;
                    padding: 10px !important;
                    border: 1px solid #ddd !important;
                    border-radius: 5px !important;
                }
                
                .metric-value {
                    font-size: 20px !important;
                }
                
                .metric-label {
                    font-size: 11px !important;
                }
                
                .chart-container {
                    break-inside: avoid !important;
                    margin-bottom: 15px !important;
                    padding: 10px !important;
                }
                
                .chart-canvas {
                    height: 200px !important;
                }
                
                .insights-card {
                    background: #f8f9fa !important;
                    border: 1px solid #ddd !important;
                    padding: 15px !important;
                    break-inside: avoid !important;
                }
                
                .table {
                    font-size: 10px !important;
                }
                
                .table th {
                    background: #00D95F !important;
                    color: white !important;
                    -webkit-print-color-adjust: exact !important;
                    padding: 8px 4px !important;
                }
                
                .table td {
                    padding: 6px 4px !important;
                    border: 1px solid #ddd !important;
                }
                
                .timeline-item {
                    margin-bottom: 10px !important;
                    padding: 8px !important;
                    border: 1px solid #ddd !important;
                    break-inside: avoid !important;
                }
                
                .row {
                    margin: 0 !important;
                }
                
                .col-lg-3, .col-lg-4, .col-lg-8, .col-md-6 {
                    padding: 5px !important;
                }
                
                h2, h3 {
                    page-break-after: avoid !important;
                    margin-top: 20px !important;
                    margin-bottom: 10px !important;
                }
                
                .action-buttons,
                .no-print,
                button,
                .btn {
                    display: none !important;
                }
                
                /* Forçar quebra de página em seções específicas */
                .chart-container:nth-of-type(2) {
                    page-break-before: always !important;
                }
                
                .details-table {
                    page-break-before: always !important;
                }
            }
        </style>
    `;

    // Remover estilo anterior se existir
    const existingStyle = document.getElementById('printOptimization');
    if (existingStyle) {
        existingStyle.remove();
    }

    // Adicionar novo estilo
    document.head.insertAdjacentHTML('beforeend', printStyles);
}

function setupPrintLayout() {
    // Minimizar gráficos para impressão
    if (timelineChart) {
        timelineChart.resize(400, 200);
    }
    if (successChart) {
        successChart.resize(200, 200);
    }

    // Esconder elementos desnecessários
    document.querySelectorAll('.no-print, .action-buttons, button, .btn').forEach(el => {
        el.style.display = 'none';
    });
}

function restoreNormalLayout() {
    // Restaurar gráficos
    if (timelineChart) {
        timelineChart.resize();
    }
    if (successChart) {
        successChart.resize();
    }

    // Mostrar elementos novamente
    document.querySelectorAll('.no-print, .action-buttons').forEach(el => {
        el.style.display = '';
    });

    // Remover CSS de impressão
    const printStyle = document.getElementById('printOptimization');
    if (printStyle) {
        printStyle.remove();
    }
}

function sendByEmail() {
    // Criar modal de envio por email
    const emailModal = `
        <div class="modal fade" id="emailModal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">
                            <i class="bi bi-envelope me-2"></i>Enviar Relatório por Email
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <form id="emailForm">
                            <div class="row">
                                <div class="col-md-6">
                                    <div class="mb-3">
                                        <label for="emailTo" class="form-label">
                                            <i class="bi bi-person me-1"></i>Para (Email):
                                        </label>
                                        <input type="email" class="form-control" id="emailTo" 
                                               placeholder="destinatario@email.com" required>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="mb-3">
                                        <label for="emailName" class="form-label">
                                            <i class="bi bi-tag me-1"></i>Nome do Destinatário:
                                        </label>
                                        <input type="text" class="form-control" id="emailName" 
                                               placeholder="Nome da pessoa">
                                    </div>
                                </div>
                            </div>
                            
                            <div class="mb-3">
                                <label for="emailSubject" class="form-label">
                                    <i class="bi bi-chat-text me-1"></i>Assunto:
                                </label>
                                <input type="text" class="form-control" id="emailSubject" 
                                       value="Relatório de Disparo WhatsApp - ${reportData.instanceName}">
                            </div>
                            
                            <div class="mb-3">
                                <label for="emailMessage" class="form-label">
                                    <i class="bi bi-file-text me-1"></i>Mensagem:
                                </label>
                                <textarea class="form-control" id="emailMessage" rows="8"></textarea>
                            </div>
                            
                            <div class="alert alert-info">
                                <i class="bi bi-info-circle me-2"></i>
                                <strong>O que será enviado:</strong>
                                <ul class="mb-0 mt-2">
                                    <li>Relatório em PDF anexado</li>
                                    <li>Resumo das métricas no corpo do email</li>
                                </ul>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                            <i class="bi bi-x me-2"></i>Cancelar
                        </button>
                        <button type="button" class="btn btn-primary" onclick="processEmailSend()" id="sendEmailBtn">
                            <i class="bi bi-send me-2"></i>Enviar Email
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Remover modal anterior se existir
    const existingModal = document.getElementById('emailModal');
    if (existingModal) {
        existingModal.remove();
    }

    // Adicionar modal ao body
    document.body.insertAdjacentHTML('beforeend', emailModal);

    // Preencher mensagem padrão
    const defaultMessage = generateEmailContent();
    document.getElementById('emailMessage').value = defaultMessage;

    // Mostrar modal
    const modal = new bootstrap.Modal(document.getElementById('emailModal'));
    modal.show();
}

function generateEmailContent() {
    const total = reportData.totalContacts || 0;
    const success = reportData.successCount || 0;
    const errors = reportData.errorCount || 0;
    const successRate = total > 0 ? ((success / total) * 100).toFixed(1) : 0;
    const instanceName = reportData.instanceName || 'Sem nome';
    const reportDate = new Date(reportData.datetime).toLocaleDateString('pt-BR');

    return `Olá!

Segue em anexo o relatório detalhado do disparo WhatsApp realizado.

📊 RESUMO DA CAMPANHA:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏷️ Instância: ${instanceName}
📅 Data: ${reportDate}
📱 Total de Contatos: ${total.toLocaleString()}
✅ Mensagens Enviadas: ${success.toLocaleString()}
❌ Erros: ${errors.toLocaleString()}
📈 Taxa de Sucesso: ${successRate}%

${successRate >= 90 ? '🎉 EXCELENTE PERFORMANCE!' :
            successRate >= 80 ? '👍 BOA PERFORMANCE!' :
                '⚠️ Performance pode ser melhorada'}

O relatório completo em PDF está anexado com todos os detalhes, gráficos e timeline dos envios.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Atenciosamente,
Disparador PRO V2
🚀 Sistema de Disparo WhatsApp Inteligente`;
}

async function processEmailSend() {
    const emailTo = document.getElementById('emailTo').value.trim();
    const emailName = document.getElementById('emailName').value.trim();
    const emailSubject = document.getElementById('emailSubject').value.trim();
    const emailMessage = document.getElementById('emailMessage').value.trim();

    // Validações
    if (!emailTo) {
        alert('Por favor, informe o email do destinatário');
        document.getElementById('emailTo').focus();
        return;
    }

    if (!emailTo.includes('@') || !emailTo.includes('.')) {
        alert('Por favor, informe um email válido');
        document.getElementById('emailTo').focus();
        return;
    }

    if (!emailSubject) {
        alert('Por favor, informe o assunto do email');
        document.getElementById('emailSubject').focus();
        return;
    }

    // Desabilitar botão durante envio
    const sendBtn = document.getElementById('sendEmailBtn');
    const originalText = sendBtn.innerHTML;
    sendBtn.disabled = true;
    sendBtn.innerHTML = '<i class="bi bi-hourglass-split me-2"></i>Enviando...';

    try {
        // Gerar PDF como base64 para anexar
        const pdfBase64 = await generatePDFBase64();

        // Preparar dados para o webhook
        const emailData = {
            to: emailTo,
            toName: emailName || emailTo.split('@')[0],
            subject: emailSubject,
            message: emailMessage,
            reportData: {
                instanceName: reportData.instanceName,
                totalContacts: reportData.totalContacts,
                successCount: reportData.successCount,
                errorCount: reportData.errorCount,
                successRate: reportData.totalContacts > 0 ?
                    ((reportData.successCount / reportData.totalContacts) * 100).toFixed(1) : 0,
                reportDate: new Date(reportData.datetime).toLocaleDateString('pt-BR'),
                duration: formatDuration(reportData.duration)
            },
            attachment: {
                filename: `relatorio-${reportData.instanceName}-${new Date().toISOString().split('T')[0]}.pdf`,
                content: pdfBase64,
                contentType: 'application/pdf'
            }
        };

        console.log('📤 Enviando email via webhook...', emailData);

        // Fazer requisição para o webhook
        const response = await fetch('https://n8n-2025n8n.wjemh8.easypanel.host/webhook/b7242245-9aa9-458a-8f7b-ad1e6f5d5ba1', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(emailData)
        });

        const result = await response.json();
        console.log('📧 Resposta do webhook:', result);

        if (response.ok && result.success) {
            // Sucesso
            showEmailResult(emailTo, emailName, true, result.message);
        } else {
            // Erro do servidor
            throw new Error(result.message || 'Erro desconhecido do servidor');
        }

    } catch (error) {
        console.error('❌ Erro ao enviar email:', error);
        showEmailResult(emailTo, emailName, false, error.message);
    } finally {
        // Resetar botão
        sendBtn.disabled = false;
        sendBtn.innerHTML = originalText;
    }
}

function showEmailResult(emailTo, emailName, success = true, message = '') {
    const isSuccess = success;
    const statusClass = isSuccess ? 'success' : 'danger';
    const statusIcon = isSuccess ? 'check-circle' : 'x-circle';
    const statusTitle = isSuccess ? 'Email Enviado com Sucesso!' : 'Erro ao Enviar Email';

    const resultModal = `
        <div class="modal fade" id="emailResultModal" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header bg-${statusClass} text-white">
                        <h5 class="modal-title">
                            <i class="bi bi-${statusIcon} me-2"></i>${statusTitle}
                        </h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body text-center">
                        <i class="bi bi-${isSuccess ? 'envelope-check' : 'envelope-x'} display-1 text-${statusClass} mb-3"></i>
                        <h4>${isSuccess ? 'Relatório Enviado!' : 'Falha no Envio'}</h4>
                        
                        ${isSuccess ? `
                            <p class="mb-3">
                                O relatório foi enviado com sucesso para:<br>
                                <strong>${emailName ? `${emailName} (${emailTo})` : emailTo}</strong>
                            </p>
                            
                            <div class="alert alert-info">
                                <i class="bi bi-info-circle me-2"></i>
                                <strong>O que foi enviado:</strong><br>
                                • Relatório em PDF anexado<br>
                                • Resumo das métricas<br>
                                • Gráficos e análises
                            </div>
                        ` : `
                            <p class="mb-3">
                                Não foi possível enviar o email para:<br>
                                <strong>${emailTo}</strong>
                            </p>
                            
                            <div class="alert alert-danger">
                                <i class="bi bi-exclamation-triangle me-2"></i>
                                <strong>Erro:</strong><br>
                                ${message || 'Erro desconhecido. Tente novamente.'}
                            </div>
                            
                            <div class="alert alert-info">
                                <i class="bi bi-lightbulb me-2"></i>
                                <strong>Sugestões:</strong><br>
                                • Verifique se o email está correto<br>
                                • Tente novamente em alguns minutos<br>
                                • Use o botão "Gerar PDF" como alternativa
                            </div>
                        `}
                    </div>
                    <div class="modal-footer">
                        ${isSuccess ? `
                            <button type="button" class="btn btn-success" data-bs-dismiss="modal">
                                <i class="bi bi-check me-2"></i>Perfeito!
                            </button>
                        ` : `
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                                <i class="bi bi-x me-2"></i>Fechar
                            </button>
                            <button type="button" class="btn btn-primary" onclick="sendByEmail()" data-bs-dismiss="modal">
                                <i class="bi bi-arrow-repeat me-2"></i>Tentar Novamente
                            </button>
                        `}
                    </div>
                </div>
            </div>
        </div>
    `;

    // Fechar modal de envio primeiro
    const emailModal = bootstrap.Modal.getInstance(document.getElementById('emailModal'));
    if (emailModal) {
        emailModal.hide();
    }

    // Remover modal anterior se existir
    const existingResult = document.getElementById('emailResultModal');
    if (existingResult) {
        existingResult.remove();
    }

    // Adicionar e mostrar modal de resultado
    document.body.insertAdjacentHTML('beforeend', resultModal);
    const resultModalInstance = new bootstrap.Modal(document.getElementById('emailResultModal'));
    resultModalInstance.show();
}

function sendEmail() {
    // Implementar envio real aqui
    alert('Funcionalidade de email será implementada em breve!');
    bootstrap.Modal.getInstance(document.getElementById('emailModal')).hide();
}

function shareReport() {
    if (navigator.share) {
        navigator.share({
            title: 'Relatório de Disparo - Disparador PRO V2',
            text: `Relatório da campanha ${reportData.instanceName}`,
            url: window.location.href
        });
    } else {
        // Fallback - copiar URL
        navigator.clipboard.writeText(window.location.href).then(() => {
            alert('Link copiado para a área de transferência!');
        });
    }
}

function exportExcel() {
    // Usar a mesma lógica do sistema principal
    if (!reportData.details || reportData.details.length === 0) {
        alert('Não há dados para exportar');
        return;
    }

    // Implementar exportação Excel aqui
    alert('Exportação para Excel será implementada em breve!');
}

// Teste final - verificar se página carregou
window.addEventListener('load', function () {
    console.log('🚀 Página totalmente carregada!');
    console.log('📋 Dados atuais do reportData:', reportData);

    // Verificar se elementos existem
    const elementos = [
        'reportDate', 'reportPeriod', 'reportSubtitle',
        'totalSentMetric', 'successMetric', 'errorMetric'
    ];

    elementos.forEach(id => {
        const el = document.getElementById(id);
        console.log(`🔍 Elemento ${id}:`, el ? '✅ Encontrado' : '❌ Não encontrado', el?.textContent);
    });
});

function forceReload() {
    console.log('🔄 Forçando recarga dos dados...');
    loadReportData();
    console.log('✅ Recarga concluída!');
}

async function generatePDFBase64() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Configurações
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 15;
    const contentWidth = pageWidth - (margin * 2);
    let currentY = margin;

    // Função para adicionar nova página se necessário
    function checkPageBreak(neededSpace) {
        if (currentY + neededSpace > pageHeight - margin) {
            doc.addPage();
            currentY = margin;
        }
    }

    // Função para formatar telefone
    function formatPhone(phone) {
        if (!phone) return '';
        const cleaned = phone.replace(/\D/g, '');
        if (cleaned.length === 11) {
            return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
        } else if (cleaned.length === 10) {
            return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
        }
        return phone;
    }

    // Header com logo (simulado)
    doc.setFillColor(0, 217, 95);
    doc.rect(0, 0, pageWidth, 50, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.text('Disparador PRO', margin, 25);

    doc.setFontSize(18);
    doc.text('Relatório de Disparo', margin, 35);

    doc.setFontSize(12);
    doc.text(`Instância: ${reportData.instanceName}`, margin, 45);

    // Informações básicas
    currentY = 60;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.text(`Data do Relatório: ${new Date().toLocaleString('pt-BR')}`, margin, currentY);
    currentY += 7;
    doc.text(`Período Analisado: ${new Date(reportData.datetime).toLocaleDateString('pt-BR')}`, margin, currentY);
    currentY += 10;

    // Linha separadora
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, currentY, pageWidth - margin, currentY);
    currentY += 10;

    // Resumo Executivo
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.text('RESUMO EXECUTIVO', margin, currentY);
    currentY += 10;

    // Métricas em caixas coloridas COM BORDER-RADIUS (simulado)
    const metrics = [
        { label: 'Total Enviado', value: reportData.totalContacts || 0, color: [0, 123, 255] },
        { label: 'Sucessos', value: reportData.successCount || 0, color: [40, 167, 69] },
        { label: 'Erros', value: reportData.errorCount || 0, color: [220, 53, 69] }
    ];

    const boxWidth = (contentWidth - 20) / 3;
    let boxX = margin;

    metrics.forEach((metric, index) => {
        // Simular border-radius com múltiplos retângulos sobrepostos
        doc.setFillColor(...metric.color);

        // Retângulo principal
        doc.rect(boxX + 1, currentY + 1, boxWidth - 2, 23, 'F');

        // Cantos arredondados (simulação)
        doc.rect(boxX, currentY + 2, boxWidth, 21, 'F');
        doc.rect(boxX + 2, currentY, boxWidth - 4, 25, 'F');

        // Texto branco
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(20);
        doc.text(metric.value.toString(), boxX + 5, currentY + 12);

        doc.setFontSize(10);
        doc.text(metric.label, boxX + 5, currentY + 20);

        boxX += boxWidth + 10;
    });

    currentY += 40;

    // Taxa de sucesso e duração
    const successRate = reportData.totalContacts > 0 ?
        ((reportData.successCount / reportData.totalContacts) * 100).toFixed(1) : 0;

    const duration = reportData.duration || 0;
    const formattedDuration = formatDuration(duration);

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.text(`Taxa de Sucesso: ${successRate}%`, margin, currentY);
    currentY += 10;
    doc.text(`Duração Total: ${formattedDuration}`, margin, currentY);
    currentY += 15;

    // Insights Automáticos COM BORDER-RADIUS
    checkPageBreak(50);
    doc.setFontSize(16);
    doc.text('INSIGHTS AUTOMATICOS', margin, currentY);
    currentY += 10;

    // Caixa de insights com fundo colorido E BORDER-RADIUS (simulado)
    doc.setFillColor(230, 240, 255);

    // Simular border-radius
    doc.rect(margin + 1, currentY + 1, contentWidth - 2, 28, 'F'); // Interno
    doc.rect(margin, currentY + 2, contentWidth, 26, 'F'); // Meio
    doc.rect(margin + 2, currentY, contentWidth - 4, 30, 'F'); // Externo

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    currentY += 8;

    // Insights baseados na performance
    if (successRate > 90) {
        doc.text('Excelente performance! Taxa de sucesso acima de 90%.', margin + 5, currentY);
    } else if (successRate > 80) {
        doc.text('Boa performance! Considere otimizar para alcançar 90%.', margin + 5, currentY);
    } else {
        doc.text('Performance pode melhorar. Verifique a qualidade dos números.', margin + 5, currentY);
    }
    currentY += 8;

    // Insight sobre escala
    const total = reportData.totalContacts || 0;
    if (total > 1000) {
        doc.text('Campanha de grande escala! Considere dividir em lotes menores.', margin + 5, currentY);
    } else if (total > 100) {
        doc.text('Campanha de médio porte com bom volume de contatos.', margin + 5, currentY);
    } else {
        doc.text('Campanha focada - ideal para testes e validações.', margin + 5, currentY);
    }

    currentY += 8;

    // Análise de horário de pico
    const details = reportData.details || [];
    if (details.length > 0) {
        const hourlyData = {};
        details.forEach(detail => {
            const hour = new Date(detail.datetime).getHours();
            hourlyData[hour] = (hourlyData[hour] || 0) + 1;
        });

        const peakHour = Object.keys(hourlyData).reduce((a, b) =>
            hourlyData[a] > hourlyData[b] ? a : b, 0);

        if (peakHour >= 9 && peakHour <= 18) {
            doc.text(`Horário de pico às ${peakHour}h está dentro do horário comercial - ideal!`, margin + 5, currentY);
        } else {
            doc.text(`Pico de envios às ${peakHour}h. Considere ajustar para horário comercial.`, margin + 5, currentY);
        }
        currentY += 20;
    }

    // Timeline de Eventos
    if (details.length > 0) {
        checkPageBreak(40);
        doc.setFontSize(16);
        doc.text('TIMELINE DE EVENTOS', margin, currentY);
        currentY += 10;

        // Eventos importantes
        const events = [];

        if (details.length > 0) {
            events.push({
                time: new Date(details[0].datetime),
                title: 'INICIO DO DISPARO',
                description: `Primeiro envio para ${details[0].name}`
            });

            const errors = details.filter(d => d.status === 'Erro');
            if (errors.length > 0) {
                events.push({
                    time: new Date(errors[0].datetime),
                    title: 'PRIMEIRO ERRO',
                    description: `Erro no envio para ${errors[0].name}`
                });
            }

            events.push({
                time: new Date(details[details.length - 1].datetime),
                title: 'FIM DO DISPARO',
                description: `Último envio para ${details[details.length - 1].name}`
            });
        }

        // Renderizar eventos
        events.forEach(event => {
            doc.setFontSize(12);
            doc.setTextColor(0, 0, 0);
            doc.text(`${event.time.toLocaleTimeString('pt-BR')} - ${event.title}`, margin, currentY);
            currentY += 7;

            doc.setFontSize(10);
            doc.setTextColor(100, 100, 100);
            doc.text(event.description, margin + 10, currentY);
            currentY += 12;
        });

        currentY += 10;
    }

    // Detalhes dos envios (tabela REORGANIZADA)
    if (details.length > 0) {
        checkPageBreak(60);
        doc.setFontSize(16);
        doc.text('DETALHES DOS ENVIOS', margin, currentY);
        currentY += 15;

        // Preparar dados da tabela NOVA ESTRUTURA: Horário - Nome - Telefone - Instância - Status
        const tableData = details.slice(0, 40).map(detail => [
            new Date(detail.datetime).toLocaleTimeString('pt-BR'),
            detail.name.length > 30 ? detail.name.substring(0, 30) + '...' : detail.name,
            formatPhone(detail.phone),
            reportData.instanceName || 'N/A',
            detail.status
        ]);

        doc.autoTable({
            head: [['Horário', 'Nome', 'Telefone', 'Instância', 'Status']],
            body: tableData,
            startY: currentY,
            margin: { left: margin, right: margin },
            styles: {
                fontSize: 8,
                cellPadding: 3,
                lineWidth: 0.1,
                lineColor: [200, 200, 200]
            },
            headStyles: {
                fillColor: [0, 217, 95],
                textColor: [255, 255, 255],
                fontStyle: 'bold',
                fontSize: 9
            },
            columnStyles: {
                0: { cellWidth: 25, halign: 'center' }, // Horário
                1: { cellWidth: 50 }, // Nome
                2: { cellWidth: 35, halign: 'center' }, // Telefone formatado
                3: { cellWidth: 40, halign: 'center' }, // Instância
                4: {
                    cellWidth: 25,
                    halign: 'center',
                    // Aplicar cores condicionais no Status
                    didParseCell: function (data) {
                        if (data.column.index === 4) { // Coluna Status
                            if (data.cell.text[0] === 'Sucesso') {
                                data.cell.styles.fillColor = [40, 167, 69]; // Verde
                                data.cell.styles.textColor = [255, 255, 255]; // Branco
                            } else if (data.cell.text[0] === 'Erro') {
                                data.cell.styles.fillColor = [220, 53, 69]; // Vermelho
                                data.cell.styles.textColor = [255, 255, 255]; // Branco
                            }
                        }
                    }
                }
            },
            alternateRowStyles: {
                fillColor: [248, 249, 250]
            }
        });

        // Nota sobre dados limitados
        if (details.length > 40) {
            const finalY = doc.lastAutoTable.finalY + 10;
            doc.setFontSize(10);
            doc.setTextColor(128, 128, 128);
            doc.text(`Mostrando primeiros 40 de ${details.length} registros totais`, margin, finalY);
            doc.text(`Para ver todos os dados, acesse o relatório completo na plataforma.`, margin, finalY + 8);
        }
    }

    // Footer em todas as páginas
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);

        // Linha no footer
        doc.setDrawColor(200, 200, 200);
        doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);

        // Textos do footer
        doc.setFontSize(8);
        doc.setTextColor(128, 128, 128);
        doc.text(`Página ${i} de ${pageCount}`, pageWidth - 40, pageHeight - 10);
        doc.text(`Gerado em ${new Date().toLocaleString('pt-BR')}`, margin, pageHeight - 10);
        doc.text(`Disparador PRO V2 - Sistema de Disparo WhatsApp Inteligente`, margin, pageHeight - 5);
    }

    // Converter para base64 e retornar
    const pdfBase64 = doc.output('datauristring').split(',')[1];
    return pdfBase64;
}

async function generateOptimizedPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Configurações
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 15;
    const contentWidth = pageWidth - (margin * 2);
    let currentY = margin;

    // Função para adicionar nova página se necessário
    function checkPageBreak(neededSpace) {
        if (currentY + neededSpace > pageHeight - margin) {
            doc.addPage();
            currentY = margin;
        }
    }

    // Função para formatar telefone
    function formatPhone(phone) {
        if (!phone) return '';
        const cleaned = phone.replace(/\D/g, '');
        if (cleaned.length === 11) {
            return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
        } else if (cleaned.length === 10) {
            return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
        }
        return phone;
    }

    // Header com logo (simulado)
    doc.setFillColor(0, 217, 95);
    doc.rect(0, 0, pageWidth, 50, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.text('Disparador PRO', margin, 25);

    doc.setFontSize(18);
    doc.text('Relatório de Disparo', margin, 35);

    doc.setFontSize(12);
    doc.text(`Instância: ${reportData.instanceName}`, margin, 45);

    // Informações básicas
    currentY = 60;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.text(`Data do Relatório: ${new Date().toLocaleString('pt-BR')}`, margin, currentY);
    currentY += 7;
    doc.text(`Período Analisado: ${new Date(reportData.datetime).toLocaleDateString('pt-BR')}`, margin, currentY);
    currentY += 10;

    // Linha separadora
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, currentY, pageWidth - margin, currentY);
    currentY += 10;

    // Resumo Executivo
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.text('RESUMO EXECUTIVO', margin, currentY);
    currentY += 10;

    // Métricas em caixas coloridas COM BORDER-RADIUS (simulado)
    const metrics = [
        { label: 'Total Enviado', value: reportData.totalContacts || 0, color: [0, 123, 255] },
        { label: 'Sucessos', value: reportData.successCount || 0, color: [40, 167, 69] },
        { label: 'Erros', value: reportData.errorCount || 0, color: [220, 53, 69] }
    ];

    const boxWidth = (contentWidth - 20) / 3;
    let boxX = margin;

    metrics.forEach((metric, index) => {
        // Simular border-radius com múltiplos retângulos sobrepostos
        doc.setFillColor(...metric.color);

        // Retângulo principal
        doc.rect(boxX + 1, currentY + 1, boxWidth - 2, 23, 'F');

        // Cantos arredondados (simulação)
        doc.rect(boxX, currentY + 2, boxWidth, 21, 'F');
        doc.rect(boxX + 2, currentY, boxWidth - 4, 25, 'F');

        // Texto branco
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(20);
        doc.text(metric.value.toString(), boxX + 5, currentY + 12);

        doc.setFontSize(10);
        doc.text(metric.label, boxX + 5, currentY + 20);

        boxX += boxWidth + 10;
    });

    currentY += 40;

    // Taxa de sucesso e duração
    const successRate = reportData.totalContacts > 0 ?
        ((reportData.successCount / reportData.totalContacts) * 100).toFixed(1) : 0;

    const duration = reportData.duration || 0;
    const formattedDuration = formatDuration(duration);

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.text(`Taxa de Sucesso: ${successRate}%`, margin, currentY);
    currentY += 10;
    doc.text(`Duração Total: ${formattedDuration}`, margin, currentY);
    currentY += 15;

    // Insights Automáticos COM BORDER-RADIUS
    checkPageBreak(50);
    doc.setFontSize(16);
    doc.text('INSIGHTS AUTOMATICOS', margin, currentY);
    currentY += 10;

    // Caixa de insights com fundo colorido E BORDER-RADIUS (simulado)
    doc.setFillColor(230, 240, 255);

    // Simular border-radius
    doc.rect(margin + 1, currentY + 1, contentWidth - 2, 28, 'F'); // Interno
    doc.rect(margin, currentY + 2, contentWidth, 26, 'F'); // Meio
    doc.rect(margin + 2, currentY, contentWidth - 4, 30, 'F'); // Externo

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    currentY += 8;

    // Insights baseados na performance
    if (successRate > 90) {
        doc.text('Excelente performance! Taxa de sucesso acima de 90%.', margin + 5, currentY);
    } else if (successRate > 80) {
        doc.text('Boa performance! Considere otimizar para alcançar 90%.', margin + 5, currentY);
    } else {
        doc.text('Performance pode melhorar. Verifique a qualidade dos números.', margin + 5, currentY);
    }
    currentY += 8;

    // Insight sobre escala
    const total = reportData.totalContacts || 0;
    if (total > 1000) {
        doc.text('Campanha de grande escala! Considere dividir em lotes menores.', margin + 5, currentY);
    } else if (total > 100) {
        doc.text('Campanha de médio porte com bom volume de contatos.', margin + 5, currentY);
    } else {
        doc.text('Campanha focada - ideal para testes e validações.', margin + 5, currentY);
    }

    currentY += 8;

    // Análise de horário de pico
    const details = reportData.details || [];
    if (details.length > 0) {
        const hourlyData = {};
        details.forEach(detail => {
            const hour = new Date(detail.datetime).getHours();
            hourlyData[hour] = (hourlyData[hour] || 0) + 1;
        });

        const peakHour = Object.keys(hourlyData).reduce((a, b) =>
            hourlyData[a] > hourlyData[b] ? a : b, 0);

        if (peakHour >= 9 && peakHour <= 18) {
            doc.text(`Horário de pico às ${peakHour}h está dentro do horário comercial - ideal!`, margin + 5, currentY);
        } else {
            doc.text(`Pico de envios às ${peakHour}h. Considere ajustar para horário comercial.`, margin + 5, currentY);
        }
        currentY += 20;
    }

    // Timeline de Eventos
    if (details.length > 0) {
        checkPageBreak(40);
        doc.setFontSize(16);
        doc.text('TIMELINE DE EVENTOS', margin, currentY);
        currentY += 10;

        // Eventos importantes
        const events = [];

        if (details.length > 0) {
            events.push({
                time: new Date(details[0].datetime),
                title: 'INICIO DO DISPARO',
                description: `Primeiro envio para ${details[0].name}`
            });

            const errors = details.filter(d => d.status === 'Erro');
            if (errors.length > 0) {
                events.push({
                    time: new Date(errors[0].datetime),
                    title: 'PRIMEIRO ERRO',
                    description: `Erro no envio para ${errors[0].name}`
                });
            }

            events.push({
                time: new Date(details[details.length - 1].datetime),
                title: 'FIM DO DISPARO',
                description: `Último envio para ${details[details.length - 1].name}`
            });
        }

        // Renderizar eventos
        events.forEach(event => {
            doc.setFontSize(12);
            doc.setTextColor(0, 0, 0);
            doc.text(`${event.time.toLocaleTimeString('pt-BR')} - ${event.title}`, margin, currentY);
            currentY += 7;

            doc.setFontSize(10);
            doc.setTextColor(100, 100, 100);
            doc.text(event.description, margin + 10, currentY);
            currentY += 12;
        });

        currentY += 10;
    }

    // Detalhes dos envios (tabela REORGANIZADA)
    if (details.length > 0) {
        checkPageBreak(60);
        doc.setFontSize(16);
        doc.text('DETALHES DOS ENVIOS', margin, currentY);
        currentY += 15;

        // Preparar dados da tabela NOVA ESTRUTURA: Horário - Nome - Telefone - Instância - Status
        const tableData = details.slice(0, 40).map(detail => [
            new Date(detail.datetime).toLocaleTimeString('pt-BR'),
            detail.name.length > 30 ? detail.name.substring(0, 30) + '...' : detail.name,
            formatPhone(detail.phone),
            reportData.instanceName || 'N/A',
            detail.status
        ]);

        doc.autoTable({
            head: [['Horário', 'Nome', 'Telefone', 'Instância', 'Status']],
            body: tableData,
            startY: currentY,
            margin: { left: margin, right: margin },
            styles: {
                fontSize: 8,
                cellPadding: 3,
                lineWidth: 0.1,
                lineColor: [200, 200, 200]
            },
            headStyles: {
                fillColor: [0, 217, 95],
                textColor: [255, 255, 255],
                fontStyle: 'bold',
                fontSize: 9
            },
            columnStyles: {
                0: { cellWidth: 25, halign: 'center' }, // Horário
                1: { cellWidth: 50 }, // Nome
                2: { cellWidth: 35, halign: 'center' }, // Telefone formatado
                3: { cellWidth: 40, halign: 'center' }, // Instância
                4: {
                    cellWidth: 25,
                    halign: 'center',
                    // Aplicar cores condicionais no Status
                    didParseCell: function (data) {
                        if (data.column.index === 4) { // Coluna Status
                            if (data.cell.text[0] === 'Sucesso') {
                                data.cell.styles.fillColor = [40, 167, 69]; // Verde
                                data.cell.styles.textColor = [255, 255, 255]; // Branco
                            } else if (data.cell.text[0] === 'Erro') {
                                data.cell.styles.fillColor = [220, 53, 69]; // Vermelho
                                data.cell.styles.textColor = [255, 255, 255]; // Branco
                            }
                        }
                    }
                }
            },
            alternateRowStyles: {
                fillColor: [248, 249, 250]
            }
        });

        // Nota sobre dados limitados
        if (details.length > 40) {
            const finalY = doc.lastAutoTable.finalY + 10;
            doc.setFontSize(10);
            doc.setTextColor(128, 128, 128);
            doc.text(`Mostrando primeiros 40 de ${details.length} registros totais`, margin, finalY);
            doc.text(`Para ver todos os dados, acesse o relatório completo na plataforma.`, margin, finalY + 8);
        }
    }

    // Footer em todas as páginas
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);

        // Linha no footer
        doc.setDrawColor(200, 200, 200);
        doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);

        // Textos do footer
        doc.setFontSize(8);
        doc.setTextColor(128, 128, 128);
        doc.text(`Página ${i} de ${pageCount}`, pageWidth - 40, pageHeight - 10);
        doc.text(`Gerado em ${new Date().toLocaleString('pt-BR')}`, margin, pageHeight - 10);
        doc.text(`Disparador PRO V2 - Sistema de Disparo WhatsApp Inteligente`, margin, pageHeight - 5);
    }

    // Salvar
    const fileName = `relatorio-${reportData.instanceName}-${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
}