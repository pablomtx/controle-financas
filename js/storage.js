// ===== Storage Module =====
// Gerencia todas as operações com localStorage

const Storage = {
  KEYS: {
    TRANSACTIONS: 'financas_transactions',
    CATEGORIES: 'financas_categories',
    GOALS: 'financas_goals',
    SETTINGS: 'financas_settings',
    SAVINGS: 'financas_savings',
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
      const date = new Date(t.date);
      return date.getFullYear() === year && date.getMonth() === month;
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

  // ===== Cálculos =====
  calculateBalance() {
    const transactions = this.getTransactions();
    const savings = this.getSavings();
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
      const balance = this.calculateMonthlyBalance(date.getFullYear(), date.getMonth());

      data.push({
        month: date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
        year: date.getFullYear(),
        monthIndex: date.getMonth(),
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
      const key = `${date.getFullYear()}-${String(date.getMonth()).padStart(2, '0')}`;
      months.add(key);
    });

    return Array.from(months).sort().reverse();
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
    localStorage.removeItem(this.KEYS.FIXED_EXPENSES);
  }
};
