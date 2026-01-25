// ===== Storage Module =====
// Gerencia todas as operações com localStorage

const Storage = {
  KEYS: {
    TRANSACTIONS: 'financas_transactions',
    CATEGORIES: 'financas_categories',
    GOALS: 'financas_goals',
    SETTINGS: 'financas_settings',
    SAVINGS: 'financas_savings',
    SAVINGS_HISTORY: 'financas_savings_history',
    FIXED_EXPENSES: 'financas_fixed_expenses'
  },

  // Categorias padrão
  DEFAULT_CATEGORIES: [
    { id: 'alimentacao', name: 'Alimentação', color: '#FF9800', icon: '🍔', default: true },
    { id: 'transporte', name: 'Transporte', color: '#2196F3', icon: '🚗', default: true },
    { id: 'moradia', name: 'Moradia', color: '#9C27B0', icon: '🏠', default: true },
    { id: 'lazer', name: 'Lazer', color: '#E91E63', icon: '🎮', default: true },
    { id: 'saude', name: 'Saúde', color: '#4CAF50', icon: '💊', default: true },
    { id: 'educacao', name: 'Educação', color: '#00BCD4', icon: '📚', default: true },
    { id: 'salario', name: 'Salário', color: '#8BC34A', icon: '💰', default: true },
    { id: 'investimentos', name: 'Investimentos', color: '#3F51B5', icon: '📈', default: true },
    { id: 'outros', name: 'Outros', color: '#607D8B', icon: '📦', default: true }
  ],

  // ===== Transações =====
  getTransactions() {
    const data = localStorage.getItem(this.KEYS.TRANSACTIONS);
    return data ? JSON.parse(data) : [];
  },

  saveTransactions(transactions) {
    localStorage.setItem(this.KEYS.TRANSACTIONS, JSON.stringify(transactions));
  },

  addTransaction(transaction) {
    const transactions = this.getTransactions();
    transaction.id = this.generateId();
    transaction.createdAt = new Date().toISOString();
    transactions.push(transaction);
    this.saveTransactions(transactions);
    return transaction;
  },

  updateTransaction(id, updates) {
    const transactions = this.getTransactions();
    const index = transactions.findIndex(t => t.id === id);
    if (index !== -1) {
      transactions[index] = { ...transactions[index], ...updates };
      this.saveTransactions(transactions);
      return transactions[index];
    }
    return null;
  },

  deleteTransaction(id) {
    const transactions = this.getTransactions();
    const filtered = transactions.filter(t => t.id !== id);
    this.saveTransactions(filtered);
    return filtered;
  },

  getTransactionsByMonth(year, month) {
    const transactions = this.getTransactions();
    return transactions.filter(t => {
      // Extrai ano e mês diretamente da string para evitar problemas de fuso horário
      const [tYear, tMonth] = t.date.split('-').map(Number);
      return tYear === year && tMonth === month;
    });
  },

  getTransactionsByType(type) {
    const transactions = this.getTransactions();
    return transactions.filter(t => t.type === type);
  },

  // ===== Categorias =====
  getCategories() {
    const data = localStorage.getItem(this.KEYS.CATEGORIES);
    if (data) {
      return JSON.parse(data);
    }
    // Inicializa com categorias padrão
    this.saveCategories(this.DEFAULT_CATEGORIES);
    return this.DEFAULT_CATEGORIES;
  },

  saveCategories(categories) {
    localStorage.setItem(this.KEYS.CATEGORIES, JSON.stringify(categories));
  },

  addCategory(category) {
    const categories = this.getCategories();
    category.id = this.generateId();
    category.default = false;
    categories.push(category);
    this.saveCategories(categories);
    return category;
  },

  deleteCategory(id) {
    const categories = this.getCategories();
    const category = categories.find(c => c.id === id);
    if (category && category.default) {
      return null; // Não permite excluir categorias padrão
    }
    const filtered = categories.filter(c => c.id !== id);
    this.saveCategories(filtered);
    return filtered;
  },

  getCategoryById(id) {
    const categories = this.getCategories();
    return categories.find(c => c.id === id);
  },

  // ===== Metas =====
  getGoals() {
    const data = localStorage.getItem(this.KEYS.GOALS);
    return data ? JSON.parse(data) : [];
  },

  saveGoals(goals) {
    localStorage.setItem(this.KEYS.GOALS, JSON.stringify(goals));
  },

  addGoal(goal) {
    const goals = this.getGoals();
    goal.id = this.generateId();
    goal.createdAt = new Date().toISOString();
    goal.currentAmount = 0;
    goals.push(goal);
    this.saveGoals(goals);
    return goal;
  },

  updateGoal(id, updates) {
    const goals = this.getGoals();
    const index = goals.findIndex(g => g.id === id);
    if (index !== -1) {
      goals[index] = { ...goals[index], ...updates };
      this.saveGoals(goals);
      return goals[index];
    }
    return null;
  },

  deleteGoal(id) {
    const goals = this.getGoals();
    const filtered = goals.filter(g => g.id !== id);
    this.saveGoals(filtered);
    return filtered;
  },

  getGoalById(id) {
    const goals = this.getGoals();
    return goals.find(g => g.id === id);
  },

  addAmountToGoal(id, amount) {
    const goal = this.getGoalById(id);
    if (goal) {
      goal.currentAmount = (goal.currentAmount || 0) + amount;
      return this.updateGoal(id, { currentAmount: goal.currentAmount });
    }
    return null;
  },

  // ===== Configurações =====
  getSettings() {
    const data = localStorage.getItem(this.KEYS.SETTINGS);
    return data ? JSON.parse(data) : { theme: 'light' };
  },

  saveSettings(settings) {
    localStorage.setItem(this.KEYS.SETTINGS, JSON.stringify(settings));
  },

  setTheme(theme) {
    const settings = this.getSettings();
    settings.theme = theme;
    this.saveSettings(settings);
    return settings;
  },

  // ===== Saldo Guardado (Poupança) =====
  getSavings() {
    const data = localStorage.getItem(this.KEYS.SAVINGS);
    return data ? parseFloat(JSON.parse(data)) : 0;
  },

  setSavings(value) {
    localStorage.setItem(this.KEYS.SAVINGS, JSON.stringify(value));
    return value;
  },

  // ===== Histórico de Saldo Guardado =====
  getSavingsHistory() {
    const data = localStorage.getItem(this.KEYS.SAVINGS_HISTORY);
    return data ? JSON.parse(data) : [];
  },

  saveSavingsHistory(history) {
    localStorage.setItem(this.KEYS.SAVINGS_HISTORY, JSON.stringify(history));
  },

  addToSavings(value, reason = 'Depósito') {
    const currentSavings = this.getSavings();
    const newSavings = currentSavings + value;
    this.setSavings(newSavings);

    // Adiciona ao histórico
    const history = this.getSavingsHistory();
    history.push({
      id: this.generateId(),
      type: 'deposit',
      value: value,
      reason: reason,
      balanceAfter: newSavings,
      date: new Date().toISOString()
    });
    this.saveSavingsHistory(history);

    return newSavings;
  },

  withdrawFromSavings(value, reason) {
    const currentSavings = this.getSavings();
    if (value > currentSavings) {
      return null; // Saldo insuficiente
    }

    const newSavings = currentSavings - value;
    this.setSavings(newSavings);

    // Adiciona ao histórico
    const history = this.getSavingsHistory();
    history.push({
      id: this.generateId(),
      type: 'withdraw',
      value: value,
      reason: reason,
      balanceAfter: newSavings,
      date: new Date().toISOString()
    });
    this.saveSavingsHistory(history);

    return newSavings;
  },

  deleteSavingsHistoryItem(id) {
    const history = this.getSavingsHistory();
    const filtered = history.filter(h => h.id !== id);
    this.saveSavingsHistory(filtered);
  },

  // ===== Despesas Fixas =====
  getFixedExpenses() {
    const data = localStorage.getItem(this.KEYS.FIXED_EXPENSES);
    return data ? JSON.parse(data) : [];
  },

  saveFixedExpenses(expenses) {
    localStorage.setItem(this.KEYS.FIXED_EXPENSES, JSON.stringify(expenses));
  },

  addFixedExpense(expense) {
    const expenses = this.getFixedExpenses();
    expense.id = this.generateId();
    expense.createdAt = new Date().toISOString();
    expenses.push(expense);
    this.saveFixedExpenses(expenses);
    return expense;
  },

  updateFixedExpense(id, updates) {
    const expenses = this.getFixedExpenses();
    const index = expenses.findIndex(e => e.id === id);
    if (index !== -1) {
      expenses[index] = { ...expenses[index], ...updates };
      this.saveFixedExpenses(expenses);
      return expenses[index];
    }
    return null;
  },

  deleteFixedExpense(id) {
    const expenses = this.getFixedExpenses();
    const filtered = expenses.filter(e => e.id !== id);
    this.saveFixedExpenses(filtered);
    return filtered;
  },

  getFixedExpenseById(id) {
    const expenses = this.getFixedExpenses();
    return expenses.find(e => e.id === id);
  },

  // Gera transações das despesas fixas desde o mês de início até o mês atual
  generateFixedExpensesTransactions() {
    const fixedExpenses = this.getFixedExpenses();
    if (fixedExpenses.length === 0) return;

    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    let transactions = this.getTransactions();

    fixedExpenses.forEach(expense => {
      const startMonth = expense.startMonth || currentMonth;

      // Gera transações para cada mês desde o início até o mês atual
      const [startYear, startMon] = startMonth.split('-').map(Number);
      let year = startYear;
      let month = startMon;

      while (true) {
        const monthKey = `${year}-${String(month).padStart(2, '0')}`;

        // Para se passou do mês atual
        if (monthKey > currentMonth) break;

        // Verifica se já existe transação dessa despesa fixa neste mês
        const alreadyExists = transactions.some(t =>
          t.fixedExpenseId === expense.id &&
          t.date.startsWith(monthKey)
        );

        if (!alreadyExists) {
          // Cria a transação
          const lastDayOfMonth = new Date(year, month, 0).getDate();
          const day = Math.min(expense.dueDay, lastDayOfMonth);
          const date = `${monthKey}-${String(day).padStart(2, '0')}`;

          const newTransaction = this.addTransaction({
            type: 'expense',
            value: expense.value,
            description: `${expense.description} (Fixa)`,
            category: expense.category,
            date: date,
            fixedExpenseId: expense.id
          });

          // Atualiza a lista de transações para verificação
          transactions = this.getTransactions();
        }

        // Próximo mês
        month++;
        if (month > 12) {
          month = 1;
          year++;
        }
      }
    });
  },

  // ===== Cálculos =====
  calculateBalance(monthFilter = null) {
    const transactions = this.getTransactions();
    const savings = this.getSavings();
    let income = 0;
    let expense = 0;

    // Se não passar filtro, usa o mês atual
    let filterYear, filterMonth;
    if (monthFilter) {
      [filterYear, filterMonth] = monthFilter.split('-').map(Number);
    } else {
      const now = new Date();
      filterYear = now.getFullYear();
      filterMonth = now.getMonth() + 1;
    }

    transactions.forEach(t => {
      const date = new Date(t.date);
      const transYear = date.getFullYear();
      const transMonth = date.getMonth() + 1;

      // Filtra pelo mês
      if (transYear === filterYear && transMonth === filterMonth) {
        if (t.type === 'income') {
          income += parseFloat(t.value);
        } else {
          expense += parseFloat(t.value);
        }
      }
    });

    return {
      income,
      expense,
      savings,
      balance: savings + income - expense
    };
  },

  calculateMonthlyBalance(year, month) {
    const transactions = this.getTransactionsByMonth(year, month);
    let income = 0;
    let expense = 0;

    transactions.forEach(t => {
      if (t.type === 'income') {
        income += parseFloat(t.value);
      } else {
        expense += parseFloat(t.value);
      }
    });

    return {
      income,
      expense,
      balance: income - expense
    };
  },

  // Busca despesas não pagas que vencem nos próximos X dias
  getUpcomingDueExpenses(daysAhead = 3) {
    const transactions = this.getTransactions();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const futureDate = new Date(today);
    futureDate.setDate(futureDate.getDate() + daysAhead);

    return transactions.filter(t => {
      // Só despesas não pagas
      if (t.type !== 'expense' || t.paid) return false;

      const dueDate = new Date(t.date + 'T00:00:00');

      // Vence entre hoje e os próximos X dias (inclusive atrasadas)
      return dueDate <= futureDate;
    }).map(t => {
      const dueDate = new Date(t.date + 'T00:00:00');
      const diffTime = dueDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      return {
        ...t,
        daysUntilDue: diffDays,
        isOverdue: diffDays < 0,
        isDueToday: diffDays === 0
      };
    }).sort((a, b) => a.daysUntilDue - b.daysUntilDue);
  },

  getExpensesByCategory(year = null, month = null) {
    let transactions = this.getTransactions();

    if (year !== null && month !== null) {
      transactions = this.getTransactionsByMonth(year, month);
    }

    const expenses = transactions.filter(t => t.type === 'expense');
    const byCategory = {};

    expenses.forEach(t => {
      if (!byCategory[t.category]) {
        byCategory[t.category] = 0;
      }
      byCategory[t.category] += parseFloat(t.value);
    });

    return byCategory;
  },

  getMonthlyData(months = 6) {
    const data = [];
    const now = new Date();

    for (let i = months - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const balance = this.calculateMonthlyBalance(date.getFullYear(), date.getMonth() + 1);

      data.push({
        month: date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
        year: date.getFullYear(),
        monthIndex: date.getMonth() + 1,
        income: balance.income,
        expense: balance.expense
      });
    }

    return data;
  },

  getAvailableMonths() {
    const transactions = this.getTransactions();
    const months = new Set();

    transactions.forEach(t => {
      const date = new Date(t.date);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      months.add(key);
    });

    return Array.from(months).sort().reverse();
  },

  // ===== Replicar Transações =====
  replicateTransactions(transactionIds, targetMonth) {
    let transactions = this.getTransactions();
    const replicated = [];

    transactionIds.forEach(id => {
      const original = transactions.find(t => t.id === id);
      if (original) {
        // Se for despesa de cartão com parcelas, verifica se é a última
        if (original.isCard && original.installments && original.installments <= 1) {
          // Última parcela - não replica
          return;
        }

        // Verifica se já foi replicada para o mês alvo
        const alreadyReplicated = transactions.some(t =>
          t.replicatedFrom === id && t.date.startsWith(targetMonth)
        );
        if (alreadyReplicated) {
          return;
        }

        // Calcula a nova data mantendo o dia
        // Extrai o dia diretamente da string para evitar problemas de fuso horário
        const [origYear, origMonth, origDay] = original.date.split('-').map(Number);
        const [year, month] = targetMonth.split('-').map(Number);

        // Ajusta o dia se for maior que o último dia do mês alvo
        const lastDayOfMonth = new Date(year, month, 0).getDate();
        const adjustedDay = Math.min(origDay, lastDayOfMonth);

        const newDate = `${targetMonth}-${String(adjustedDay).padStart(2, '0')}`;

        // Prepara dados da nova transação
        const newTransactionData = {
          type: original.type,
          value: original.value,
          description: original.description,
          category: original.category,
          date: newDate,
          paid: false,
          replicatedFrom: id
        };

        // Se for cartão com parcelas, decrementa
        if (original.isCard) {
          newTransactionData.isCard = true;
          if (original.installments && original.installments > 1) {
            newTransactionData.installments = original.installments - 1;
          }
        }

        const newTransaction = this.addTransaction(newTransactionData);
        replicated.push(newTransaction);

        // Atualiza lista de transações para próximas verificações
        transactions = this.getTransactions();
      }
    });

    return replicated;
  },

  // Verifica se transação já foi replicada para o mês alvo
  isAlreadyReplicated(transactionId, targetMonth) {
    const transactions = this.getTransactions();
    return transactions.some(t =>
      t.replicatedFrom === transactionId && t.date.startsWith(targetMonth)
    );
  },

  getNextMonth(currentMonth = null) {
    let year, month;

    if (currentMonth) {
      [year, month] = currentMonth.split('-').map(Number);
    } else {
      const now = new Date();
      year = now.getFullYear();
      month = now.getMonth() + 1;
    }

    month++;
    if (month > 12) {
      month = 1;
      year++;
    }

    return `${year}-${String(month).padStart(2, '0')}`;
  },

  getCurrentMonth() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  },

  // ===== Utilitários =====
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  },

  // ===== Export/Import =====
  exportData() {
    return {
      transactions: this.getTransactions(),
      categories: this.getCategories(),
      goals: this.getGoals(),
      settings: this.getSettings(),
      savings: this.getSavings(),
      savingsHistory: this.getSavingsHistory(),
      fixedExpenses: this.getFixedExpenses(),
      exportedAt: new Date().toISOString()
    };
  },

  importData(data) {
    if (data.transactions) {
      this.saveTransactions(data.transactions);
    }
    if (data.categories) {
      this.saveCategories(data.categories);
    }
    if (data.goals) {
      this.saveGoals(data.goals);
    }
    if (data.settings) {
      this.saveSettings(data.settings);
    }
    if (data.savings !== undefined) {
      this.setSavings(data.savings);
    }
    if (data.savingsHistory) {
      this.saveSavingsHistory(data.savingsHistory);
    }
    if (data.fixedExpenses) {
      this.saveFixedExpenses(data.fixedExpenses);
    }
  },

  clearAllData() {
    localStorage.removeItem(this.KEYS.TRANSACTIONS);
    localStorage.removeItem(this.KEYS.CATEGORIES);
    localStorage.removeItem(this.KEYS.GOALS);
    localStorage.removeItem(this.KEYS.SETTINGS);
    localStorage.removeItem(this.KEYS.SAVINGS);
    localStorage.removeItem(this.KEYS.SAVINGS_HISTORY);
    localStorage.removeItem(this.KEYS.FIXED_EXPENSES);
  }
};
