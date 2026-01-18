// ===== App Module =====
// Lógica principal do aplicativo

const App = {
  currentTransactionType: 'income',

  // ===== Inicialização =====
  init() {
    this.registerServiceWorker();
    this.initTheme();
    this.bindEvents();
    this.refreshAll();
    this.setDefaultDate();
  },

  registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(reg => console.log('Service Worker registrado'))
        .catch(err => console.log('Erro ao registrar SW:', err));
    }
  },

  initTheme() {
    UI.initTheme();
  },

  setDefaultDate() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('transaction-date').value = today;
  },

  // ===== Event Bindings =====
  bindEvents() {
    // Navegação
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        UI.switchScreen(btn.dataset.screen);
        this.onScreenChange(btn.dataset.screen);
      });
    });

    // Toggle tema
    document.getElementById('theme-toggle').addEventListener('click', () => {
      UI.toggleTheme();
      Charts.updateTheme();
    });

    // Formulário de transação
    document.getElementById('transaction-form').addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveTransaction();
    });

    // Botões de tipo (receita/despesa)
    document.querySelectorAll('.type-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentTransactionType = btn.dataset.type;
        UI.updateCategorySelect(Storage.getCategories(), this.currentTransactionType);
      });
    });

    // Cancelar edição
    document.getElementById('cancel-edit').addEventListener('click', () => {
      UI.resetTransactionForm();
      this.currentTransactionType = 'income';
    });

    // Filtro de mês nas transações
    document.getElementById('filter-month').addEventListener('change', (e) => {
      const transactions = Storage.getTransactions();
      UI.updateTransactionsList(transactions, e.target.value);
    });

    // Filtro de mês nos relatórios
    document.getElementById('report-month').addEventListener('change', (e) => {
      this.updateReports(e.target.value);
    });

    // Formulário de meta
    document.getElementById('goal-form').addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveGoal();
    });

    // Cancelar edição de meta
    document.getElementById('cancel-goal').addEventListener('click', () => {
      UI.resetGoalForm();
    });

    // Formulário de categoria
    document.getElementById('category-form').addEventListener('submit', (e) => {
      e.preventDefault();
      this.addCategory();
    });

    // Formulário de saldo guardado
    document.getElementById('savings-form').addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveSavings();
    });

    // Exportar dados
    document.getElementById('export-data').addEventListener('click', () => {
      this.exportData();
    });

    // Importar dados
    document.getElementById('import-data').addEventListener('click', () => {
      document.getElementById('import-file').click();
    });

    document.getElementById('import-file').addEventListener('change', (e) => {
      this.importData(e.target.files[0]);
    });

    // Limpar dados
    document.getElementById('clear-data').addEventListener('click', () => {
      this.confirmClearData();
    });

    // Sincronização
    document.getElementById('save-token').addEventListener('click', () => {
      this.setupSync();
    });

    document.getElementById('sync-now').addEventListener('click', () => {
      this.syncNow();
    });

    document.getElementById('remove-sync').addEventListener('click', () => {
      this.removeSync();
    });
  },

  onScreenChange(screen) {
    if (screen === 'transactions') {
      UI.resetTransactionForm();
      UI.updateCategorySelect(Storage.getCategories(), 'income');
    } else if (screen === 'reports') {
      this.updateReports();
    } else if (screen === 'goals') {
      this.updateGoals();
    } else if (screen === 'settings') {
      UI.updateCategoriesList(Storage.getCategories());
      this.updateSavingsDisplay();
      this.updateSyncStatus();
    }
  },

  // ===== Refresh All Data =====
  refreshAll() {
    const balance = Storage.calculateBalance();
    const transactions = Storage.getTransactions();
    const goals = Storage.getGoals();
    const categories = Storage.getCategories();
    const months = Storage.getAvailableMonths();

    // Dashboard
    UI.updateBalance(balance);
    UI.updateRecentTransactions(transactions);

    // Transações
    UI.updateTransactionsList(transactions);
    UI.updateMonthFilters(months);
    UI.updateCategorySelect(categories, this.currentTransactionType);

    // Metas
    UI.updateGoalsList(goals);

    // Gráficos
    Charts.updateAllCharts();

    // Categorias
    UI.updateCategoriesList(categories);
  },

  getCurrentMonthBalance() {
    const now = new Date();
    return Storage.calculateMonthlyBalance(now.getFullYear(), now.getMonth());
  },

  // ===== Transações =====
  saveTransaction() {
    const id = document.getElementById('transaction-id').value;
    const value = parseFloat(document.getElementById('transaction-value').value);
    const description = document.getElementById('transaction-description').value.trim();
    const category = document.getElementById('transaction-category').value;
    const date = document.getElementById('transaction-date').value;

    if (!value || !description || !category || !date) {
      UI.showToast('Preencha todos os campos', 'error');
      return;
    }

    const transaction = {
      type: this.currentTransactionType,
      value,
      description,
      category,
      date
    };

    if (id) {
      // Editando
      Storage.updateTransaction(id, transaction);
      UI.showToast('Transação atualizada!', 'success');
    } else {
      // Nova
      Storage.addTransaction(transaction);
      UI.showToast('Transação salva!', 'success');
    }

    UI.resetTransactionForm();
    this.currentTransactionType = 'income';
    this.refreshAll();
  },

  editTransaction(id) {
    const transactions = Storage.getTransactions();
    const transaction = transactions.find(t => t.id === id);

    if (transaction) {
      this.currentTransactionType = transaction.type;
      UI.fillTransactionForm(transaction);

      // Scroll para o formulário
      document.getElementById('transaction-form').scrollIntoView({ behavior: 'smooth' });
    }
  },

  confirmDeleteTransaction(id) {
    UI.showModal(
      'Excluir Transação',
      'Tem certeza que deseja excluir esta transação?',
      () => {
        Storage.deleteTransaction(id);
        UI.showToast('Transação excluída!', 'success');
        this.refreshAll();
      }
    );
  },

  // ===== Relatórios =====
  updateReports(monthFilter = '') {
    let balance;
    let expensesByCategory;

    if (monthFilter) {
      const [year, month] = monthFilter.split('-');
      balance = Storage.calculateMonthlyBalance(parseInt(year), parseInt(month));
      expensesByCategory = Storage.getExpensesByCategory(parseInt(year), parseInt(month));
    } else {
      balance = Storage.calculateBalance();
      expensesByCategory = Storage.getExpensesByCategory();
    }

    UI.updateReportSummary(balance);
    UI.updateCategoryBreakdown(expensesByCategory, balance.expense);

    // Atualiza gráficos
    if (monthFilter) {
      const [year, month] = monthFilter.split('-');
      Charts.updateChartsWithFilter(parseInt(year), parseInt(month));
    } else {
      Charts.updateChartsWithFilter(null, null);
    }
  },

  // ===== Metas =====
  saveGoal() {
    const id = document.getElementById('goal-id').value;
    const name = document.getElementById('goal-name').value.trim();
    const targetAmount = parseFloat(document.getElementById('goal-value').value);
    const months = parseInt(document.getElementById('goal-months').value);

    if (!name || !targetAmount || !months) {
      UI.showToast('Preencha todos os campos', 'error');
      return;
    }

    if (id) {
      // Editando meta existente
      const existingGoal = Storage.getGoalById(id);
      Storage.updateGoal(id, { name, targetAmount, months });
      UI.showToast('Meta atualizada!', 'success');
    } else {
      // Nova meta
      Storage.addGoal({ name, targetAmount, months });
      UI.showToast('Meta criada!', 'success');
    }

    UI.resetGoalForm();
    this.refreshAll();
  },

  editGoal(id) {
    const goal = Storage.getGoalById(id);
    if (goal) {
      UI.fillGoalForm(goal);
      document.getElementById('goal-form').scrollIntoView({ behavior: 'smooth' });
    }
  },

  confirmDeleteGoal(id) {
    UI.showModal(
      'Excluir Meta',
      'Tem certeza que deseja excluir esta meta?',
      () => {
        Storage.deleteGoal(id);
        UI.showToast('Meta excluída!', 'success');
        this.refreshAll();
      }
    );
  },

  updateGoals() {
    const goals = Storage.getGoals();
    UI.updateGoalsList(goals);
  },

  addToGoal(goalId, amount) {
    Storage.addAmountToGoal(goalId, amount);
    this.refreshAll();
  },

  // ===== Categorias =====
  addCategory() {
    const name = document.getElementById('new-category-name').value.trim();
    const color = document.getElementById('new-category-color').value;

    if (!name) {
      UI.showToast('Digite um nome para a categoria', 'error');
      return;
    }

    Storage.addCategory({ name, color, icon: '📁' });
    UI.showToast('Categoria criada!', 'success');

    document.getElementById('new-category-name').value = '';
    UI.updateCategoriesList(Storage.getCategories());
    UI.updateCategorySelect(Storage.getCategories(), this.currentTransactionType);
  },

  confirmDeleteCategory(id) {
    UI.showModal(
      'Excluir Categoria',
      'Tem certeza que deseja excluir esta categoria? As transações associadas não serão excluídas.',
      () => {
        const result = Storage.deleteCategory(id);
        if (result === null) {
          UI.showToast('Não é possível excluir categorias padrão', 'error');
        } else {
          UI.showToast('Categoria excluída!', 'success');
          UI.updateCategoriesList(Storage.getCategories());
          UI.updateCategorySelect(Storage.getCategories(), this.currentTransactionType);
        }
      }
    );
  },

  // ===== Saldo Guardado =====
  saveSavings() {
    const value = parseFloat(document.getElementById('savings-value').value) || 0;
    Storage.setSavings(value);
    UI.showToast('Saldo guardado atualizado!', 'success');
    this.updateSavingsDisplay();
    this.refreshAll();
  },

  updateSavingsDisplay() {
    const savings = Storage.getSavings();
    document.getElementById('savings-value').value = savings > 0 ? savings : '';
    document.getElementById('current-savings-display').innerHTML =
      `Saldo guardado atual: <strong>${UI.formatCurrency(savings)}</strong>`;
  },

  // ===== Dados =====
  exportData() {
    const transactions = Storage.getTransactions();
    const categories = Storage.getCategories();
    const savings = Storage.getSavings();
    const balance = Storage.calculateBalance();

    // Prepara dados das transações para Excel
    const transactionsData = transactions.map(t => {
      const category = categories.find(c => c.id === t.category) || { name: 'Outros' };
      return {
        'Data': t.date,
        'Tipo': t.type === 'income' ? 'Receita' : 'Despesa',
        'Descrição': t.description,
        'Categoria': category.name,
        'Valor': parseFloat(t.value)
      };
    });

    // Ordena por data
    transactionsData.sort((a, b) => new Date(a['Data']) - new Date(b['Data']));

    // Resumo
    const resumoData = [
      { 'Item': 'Saldo Guardado', 'Valor': savings },
      { 'Item': 'Total Receitas', 'Valor': balance.income },
      { 'Item': 'Total Despesas', 'Valor': balance.expense },
      { 'Item': 'Saldo Atual', 'Valor': balance.balance }
    ];

    // Cria workbook com múltiplas abas
    const wb = XLSX.utils.book_new();

    // Aba de Transações
    const wsTransacoes = XLSX.utils.json_to_sheet(transactionsData);
    XLSX.utils.book_append_sheet(wb, wsTransacoes, 'Transações');

    // Aba de Resumo
    const wsResumo = XLSX.utils.json_to_sheet(resumoData);
    XLSX.utils.book_append_sheet(wb, wsResumo, 'Resumo');

    // Baixa o arquivo
    const fileName = `financas-${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);

    UI.showToast('Dados exportados para Excel!', 'success');
  },

  importData(file) {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        Storage.importData(data);
        UI.showToast('Dados importados!', 'success');
        this.refreshAll();
      } catch (error) {
        UI.showToast('Erro ao importar dados', 'error');
        console.error('Import error:', error);
      }
    };
    reader.readAsText(file);
  },

  confirmClearData() {
    UI.showModal(
      'Limpar Todos os Dados',
      'ATENÇÃO: Esta ação irá excluir permanentemente todas as suas transações, categorias e metas. Deseja continuar?',
      () => {
        Storage.clearAllData();
        UI.showToast('Todos os dados foram excluídos', 'success');
        this.refreshAll();
        UI.switchScreen('dashboard');
      }
    );
  },

  // ===== Sincronização =====
  updateSyncStatus() {
    const notConfigured = document.getElementById('sync-not-configured');
    const configured = document.getElementById('sync-configured');
    const lastSyncEl = document.getElementById('last-sync');

    if (Sync.isConfigured()) {
      notConfigured.style.display = 'none';
      configured.style.display = 'block';

      const lastSync = Sync.getLastSyncFormatted();
      if (lastSync) {
        lastSyncEl.textContent = `Última sincronização: ${lastSync}`;
      }
    } else {
      notConfigured.style.display = 'block';
      configured.style.display = 'none';
    }
  },

  async setupSync() {
    const token = document.getElementById('github-token').value.trim();

    if (!token) {
      UI.showToast('Digite o token do GitHub', 'error');
      return;
    }

    UI.showToast('Configurando...', 'info');

    const result = await Sync.setup(token);

    if (result.success) {
      UI.showToast(`Conectado como ${result.username}!`, 'success');
      document.getElementById('github-token').value = '';
      this.updateSyncStatus();

      // Sincroniza automaticamente
      await this.syncNow();
    } else {
      UI.showToast(result.error || 'Erro ao configurar', 'error');
    }
  },

  async syncNow() {
    UI.showToast('Sincronizando...', 'info');

    const result = await Sync.sync();

    if (result.success) {
      UI.showToast('Sincronizado!', 'success');
      this.refreshAll();
      this.updateSyncStatus();
    } else {
      UI.showToast(result.error || 'Erro ao sincronizar', 'error');
    }
  },

  removeSync() {
    UI.showModal(
      'Desconectar Sincronização',
      'Seus dados locais serão mantidos, mas não serão mais sincronizados. Deseja continuar?',
      () => {
        Sync.removeConfig();
        UI.showToast('Sincronização desconectada', 'success');
        this.updateSyncStatus();
      }
    );
  }
};

// ===== Inicializa o app quando o DOM estiver pronto =====
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
