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
    }
  },

  // ===== Refresh All Data =====
  refreshAll() {
    const balance = Storage.calculateBalance();
    const transactions = Storage.getTransactions();
    const goal = Storage.getGoals();
    const categories = Storage.getCategories();
    const months = Storage.getAvailableMonths();

    // Dashboard
    UI.updateBalance(balance);
    UI.updateRecentTransactions(transactions);
    UI.updateGoalPreview(goal, this.getCurrentMonthBalance());

    // Transações
    UI.updateTransactionsList(transactions);
    UI.updateMonthFilters(months);
    UI.updateCategorySelect(categories, this.currentTransactionType);

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
    const value = parseFloat(document.getElementById('goal-value').value) || 0;
    Storage.setMonthlyGoal(value);

    if (value > 0) {
      UI.showToast('Meta salva!', 'success');
    } else {
      UI.showToast('Meta removida', 'info');
    }

    this.updateGoals();
    this.refreshAll();
  },

  updateGoals() {
    const goal = Storage.getGoals();
    const monthlyBalance = this.getCurrentMonthBalance();

    UI.updateGoalStatus(goal, monthlyBalance);
    UI.updateGoalHistory(goal.history);

    // Atualiza histórico se estiver em um novo mês
    this.checkAndUpdateGoalHistory();
  },

  checkAndUpdateGoalHistory() {
    const goal = Storage.getGoals();
    if (!goal.monthly || goal.monthly <= 0) return;

    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth()).padStart(2, '0')}`;

    // Verifica se já existe registro do mês atual
    const hasCurrentMonth = goal.history.some(h => h.month === currentMonth);

    if (!hasCurrentMonth && now.getDate() > 1) {
      // Adiciona registro do mês anterior se existir
      const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const prevMonthKey = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth()).padStart(2, '0')}`;

      const hasPrevMonth = goal.history.some(h => h.month === prevMonthKey);

      if (!hasPrevMonth) {
        const prevBalance = Storage.calculateMonthlyBalance(prevMonth.getFullYear(), prevMonth.getMonth());
        Storage.addGoalHistory({
          month: prevMonthKey,
          target: goal.monthly,
          saved: prevBalance.balance
        });
      }
    }
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
  }
};

// ===== Inicializa o app quando o DOM estiver pronto =====
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
