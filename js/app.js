// ===== App Module =====
// Lógica principal do aplicativo

const App = {
  currentTransactionType: 'income',
  currentDashboardMonth: null, // Formato: 'YYYY-MM'

  // ===== Inicialização =====
  async init() {
    this.registerServiceWorker();
    this.initTheme();
    this.initDashboardMonth();
    this.bindEvents();

    // Sincroniza ao carregar (busca dados da nuvem)
    if (Sync.isConfigured()) {
      const result = await Sync.syncOnLoad();
      if (result.success) {
        console.log('Dados sincronizados da nuvem');
      }
    }

    // Gera transações das despesas fixas do mês
    Storage.generateFixedExpensesTransactions();

    this.refreshAll();
    this.setDefaultDate();
    UI.initMoneyMasks();
    UI.initValuesVisibility();
  },

  initDashboardMonth() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    this.currentDashboardMonth = `${year}-${month}`;
    this.updateDashboardMonthLabel();
  },

  changeDashboardMonth(direction) {
    const [year, month] = this.currentDashboardMonth.split('-').map(Number);
    let newMonth = month + direction;
    let newYear = year;

    if (newMonth < 1) {
      newMonth = 12;
      newYear--;
    } else if (newMonth > 12) {
      newMonth = 1;
      newYear++;
    }

    this.currentDashboardMonth = `${newYear}-${String(newMonth).padStart(2, '0')}`;
    this.updateDashboardMonthLabel();
    this.refreshAll();
  },

  updateDashboardMonthLabel() {
    const [year, month] = this.currentDashboardMonth.split('-').map(Number);
    const date = new Date(year, month - 1, 1);
    const label = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    document.getElementById('dashboard-month-label').textContent = label;
  },

  updateRecentTransactionsForMonth(transactions) {
    const [year, month] = this.currentDashboardMonth.split('-').map(Number);
    const filtered = transactions.filter(t => {
      const date = new Date(t.date);
      return date.getFullYear() === year && date.getMonth() === month - 1;
    });
    UI.updateRecentTransactions(filtered);
  },

  registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js')
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

    // Navegação de mês no dashboard
    document.getElementById('prev-month-btn').addEventListener('click', () => {
      this.changeDashboardMonth(-1);
    });

    document.getElementById('next-month-btn').addEventListener('click', () => {
      this.changeDashboardMonth(1);
    });

    // Toggle tema
    document.getElementById('theme-toggle').addEventListener('click', () => {
      UI.toggleTheme();
      Charts.updateTheme();
    });

    // Toggle ocultar valores
    document.getElementById('toggle-values').addEventListener('click', () => {
      UI.toggleValuesVisibility();
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

    // Formulário de despesa fixa
    document.getElementById('fixed-expense-form').addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveFixedExpense();
    });

    // Botões de saldo guardado
    document.getElementById('savings-deposit-btn').addEventListener('click', () => {
      this.depositSavings();
    });

    document.getElementById('savings-withdraw-btn').addEventListener('click', () => {
      this.withdrawSavings();
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

    // Modal de adicionar do saldo guardado
    document.getElementById('savings-modal-confirm').addEventListener('click', () => {
      this.confirmAddFromSavings();
    });

    document.getElementById('savings-modal-cancel').addEventListener('click', () => {
      this.closeSavingsModal();
    });

    // Replicar transações
    document.getElementById('replicate-btn').addEventListener('click', () => {
      this.showReplicateModal();
    });

    document.getElementById('replicate-confirm').addEventListener('click', () => {
      this.confirmReplicate();
    });

    document.getElementById('replicate-cancel').addEventListener('click', () => {
      UI.hideReplicateModal();
    });

    document.getElementById('select-all-btn').addEventListener('click', () => {
      UI.selectAllReplicate(true);
    });

    document.getElementById('select-none-btn').addEventListener('click', () => {
      UI.selectAllReplicate(false);
    });
  },

  onScreenChange(screen) {
    if (screen === 'transactions') {
      UI.resetTransactionForm();
      UI.updateCategorySelect(Storage.getCategories(), 'income');
    } else if (screen === 'reports') {
      this.updateReports();
    } else if (screen === 'goals') {
      UI.resetGoalForm();
      this.updateGoals();
    } else if (screen === 'settings') {
      UI.updateCategoriesList(Storage.getCategories());
      UI.updateFixedExpensesList(Storage.getFixedExpenses());
      UI.updateFixedExpenseCategorySelect(Storage.getCategories());
      UI.resetFixedExpenseForm();
      this.updateSavingsDisplay();
      this.updateSyncStatus();
    }
  },

  // ===== Refresh All Data =====
  refreshAll() {
    const balance = Storage.calculateBalance(this.currentDashboardMonth);
    const transactions = Storage.getTransactions();
    const goals = Storage.getGoals();
    const categories = Storage.getCategories();
    const months = Storage.getAvailableMonths();

    // Dashboard
    UI.updateBalance(balance);
    this.updateRecentTransactionsForMonth(transactions);

    // Alerta de despesas próximas do vencimento (3 dias)
    const upcomingDue = Storage.getUpcomingDueExpenses(3);
    UI.updateDueExpensesAlert(upcomingDue);

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
    const value = UI.parseMoneyValue(document.getElementById('transaction-value').value);
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
    Sync.autoSync();
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
        Sync.autoSync();
      }
    );
  },

  togglePaid(id) {
    const transactions = Storage.getTransactions();
    const transaction = transactions.find(t => t.id === id);

    if (transaction) {
      transaction.paid = !transaction.paid;
      Storage.updateTransaction(id, { paid: transaction.paid });
      UI.showToast(transaction.paid ? 'Marcado como pago!' : 'Marcado como pendente', 'success');
      this.refreshAll();
      Sync.autoSync();
    }
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
    const targetAmount = UI.parseMoneyValue(document.getElementById('goal-value').value);
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
    Sync.autoSync();
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
        Sync.autoSync();
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
    Sync.autoSync();
  },

  showAddFromSavings(goalId, remaining) {
    const goal = Storage.getGoalById(goalId);
    const availableSavings = this.getAvailableSavings();

    if (!goal) return;

    const modal = document.getElementById('savings-modal');
    document.getElementById('savings-modal-goal-id').value = goalId;
    document.getElementById('savings-modal-info').innerHTML = `
      <strong>Disponível para alocar:</strong> ${UI.formatCurrency(availableSavings)}<br>
      <strong>Meta:</strong> ${goal.name}<br>
      <strong>Faltam:</strong> ${UI.formatCurrency(remaining)}
    `;
    document.getElementById('savings-modal-value').value = '';
    modal.classList.add('active');
  },

  confirmAddFromSavings() {
    const goalId = document.getElementById('savings-modal-goal-id').value;
    const value = UI.parseMoneyValue(document.getElementById('savings-modal-value').value);
    const availableSavings = this.getAvailableSavings();
    const goal = Storage.getGoalById(goalId);

    if (!value || value <= 0) {
      UI.showToast('Digite um valor válido', 'error');
      return;
    }

    if (value > availableSavings) {
      UI.showToast('Valor maior que o saldo disponível', 'error');
      return;
    }

    const remaining = goal.targetAmount - goal.currentAmount;
    const toAdd = Math.min(value, remaining);

    // Adiciona à meta (não subtrai do saldo guardado, apenas aloca)
    Storage.addAmountToGoal(goalId, toAdd);

    document.getElementById('savings-modal').classList.remove('active');
    UI.showToast(`${UI.formatCurrency(toAdd)} alocado na meta!`, 'success');
    this.refreshAll();
    Sync.autoSync();
  },

  // Calcula saldo guardado disponível (total - já alocado nas metas)
  getAvailableSavings() {
    const savings = Storage.getSavings();
    const goals = Storage.getGoals();
    const allocated = goals.reduce((sum, goal) => sum + (goal.currentAmount || 0), 0);
    return Math.max(0, savings - allocated);
  },

  closeSavingsModal() {
    document.getElementById('savings-modal').classList.remove('active');
  },

  // ===== Replicar Transações =====
  showReplicateModal() {
    const transactions = Storage.getTransactions();
    const currentFilter = document.getElementById('filter-month').value;
    UI.showReplicateModal(transactions, currentFilter);
  },

  confirmReplicate() {
    const selectedIds = UI.getSelectedReplicateIds();

    if (selectedIds.length === 0) {
      UI.showToast('Selecione pelo menos uma transação', 'error');
      return;
    }

    // Determina o mês de origem baseado no filtro
    const currentFilter = document.getElementById('filter-month').value;
    const targetMonth = Storage.getNextMonth(currentFilter || Storage.getCurrentMonth());

    // Replica as transações
    const replicated = Storage.replicateTransactions(selectedIds, targetMonth);

    UI.hideReplicateModal();

    const monthName = new Date(targetMonth + '-01').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    UI.showToast(`${replicated.length} transação(ões) replicada(s) para ${monthName}!`, 'success');

    this.refreshAll();
    Sync.autoSync();
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
    Sync.autoSync();
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
          Sync.autoSync();
        }
      }
    );
  },

  // ===== Despesas Fixas =====
  saveFixedExpense() {
    const description = document.getElementById('fixed-expense-description').value.trim();
    const value = UI.parseMoneyValue(document.getElementById('fixed-expense-value').value);
    const category = document.getElementById('fixed-expense-category').value;
    const dueDay = parseInt(document.getElementById('fixed-expense-day').value);
    const startMonth = document.getElementById('fixed-expense-start').value;

    if (!description || !value || !category || !dueDay || !startMonth) {
      UI.showToast('Preencha todos os campos', 'error');
      return;
    }

    if (dueDay < 1 || dueDay > 31) {
      UI.showToast('Dia deve ser entre 1 e 31', 'error');
      return;
    }

    Storage.addFixedExpense({ description, value, category, dueDay, startMonth });

    // Gera a transação para o mês atual (se aplicável)
    Storage.generateFixedExpensesTransactions();

    UI.showToast('Despesa fixa adicionada!', 'success');
    UI.resetFixedExpenseForm();
    UI.updateFixedExpensesList(Storage.getFixedExpenses());
    this.refreshAll();
    Sync.autoSync();
  },

  confirmDeleteFixedExpense(id) {
    UI.showModal(
      'Excluir Despesa Fixa',
      'Tem certeza que deseja excluir esta despesa fixa?',
      () => {
        Storage.deleteFixedExpense(id);
        UI.showToast('Despesa fixa excluída!', 'success');
        UI.updateFixedExpensesList(Storage.getFixedExpenses());
        Sync.autoSync();
      }
    );
  },

  // ===== Saldo Guardado =====
  depositSavings() {
    const value = UI.parseMoneyValue(document.getElementById('savings-value').value);
    const reason = document.getElementById('savings-reason').value.trim() || 'Depósito';

    if (!value || value <= 0) {
      UI.showToast('Informe um valor válido', 'error');
      return;
    }

    Storage.addToSavings(value, reason);
    UI.showToast(`Depósito de ${UI.formatCurrency(value)} realizado!`, 'success');
    this.clearSavingsForm();
    this.updateSavingsDisplay();
    this.refreshAll();
    Sync.autoSync();
  },

  withdrawSavings() {
    const value = UI.parseMoneyValue(document.getElementById('savings-value').value);
    const reason = document.getElementById('savings-reason').value.trim();

    if (!value || value <= 0) {
      UI.showToast('Informe um valor válido', 'error');
      return;
    }

    if (!reason) {
      UI.showToast('Informe o motivo da retirada', 'error');
      return;
    }

    const result = Storage.withdrawFromSavings(value, reason);
    if (result === null) {
      UI.showToast('Saldo insuficiente para retirada', 'error');
      return;
    }

    UI.showToast(`Retirada de ${UI.formatCurrency(value)} realizada!`, 'success');
    this.clearSavingsForm();
    this.updateSavingsDisplay();
    this.refreshAll();
    Sync.autoSync();
  },

  clearSavingsForm() {
    document.getElementById('savings-value').value = '';
    document.getElementById('savings-reason').value = '';
  },

  updateSavingsDisplay() {
    const savings = Storage.getSavings();
    document.getElementById('current-savings-display').innerHTML =
      `Saldo guardado atual: <strong>${UI.formatCurrency(savings)}</strong>`;
    UI.updateSavingsHistory(Storage.getSavingsHistory());
  },

  // ===== Dados =====
  exportData() {
    const transactions = Storage.getTransactions();
    const categories = Storage.getCategories();
    const savings = Storage.getSavings();
    const savingsHistory = Storage.getSavingsHistory();
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

    // Prepara dados do histórico de saldo guardado
    const savingsHistoryData = savingsHistory.map(h => {
      const date = new Date(h.date);
      return {
        'Data': date.toLocaleDateString('pt-BR'),
        'Hora': date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        'Tipo': h.type === 'deposit' ? 'Depósito' : 'Retirada',
        'Motivo': h.reason,
        'Valor': parseFloat(h.value),
        'Saldo Após': parseFloat(h.balanceAfter)
      };
    });

    // Ordena por data (mais antigas primeiro)
    savingsHistoryData.sort((a, b) => {
      const dateA = a['Data'].split('/').reverse().join('-');
      const dateB = b['Data'].split('/').reverse().join('-');
      return new Date(dateA) - new Date(dateB);
    });

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

    // Aba de Histórico do Saldo Guardado
    if (savingsHistoryData.length > 0) {
      const wsSavingsHistory = XLSX.utils.json_to_sheet(savingsHistoryData);
      XLSX.utils.book_append_sheet(wb, wsSavingsHistory, 'Histórico Saldo');
    }

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
