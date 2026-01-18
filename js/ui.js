// ===== UI Module =====
// Gerencia toda a manipulação da interface

const UI = {
  // Títulos das telas
  screenTitles: {
    'dashboard': 'Dashboard',
    'transactions': 'Transações',
    'reports': 'Relatórios',
    'goals': 'Metas',
    'settings': 'Configurações'
  },

  // ===== Navegação =====
  switchScreen(screenId) {
    // Remove active de todas as telas
    document.querySelectorAll('.screen').forEach(screen => {
      screen.classList.remove('active');
    });

    // Remove active de todos os botões de navegação
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.classList.remove('active');
    });

    // Ativa a tela selecionada
    const targetScreen = document.getElementById(`screen-${screenId}`);
    if (targetScreen) {
      targetScreen.classList.add('active');
    }

    // Ativa o botão de navegação correspondente
    const navBtn = document.querySelector(`.nav-btn[data-screen="${screenId}"]`);
    if (navBtn) {
      navBtn.classList.add('active');
    }

    // Atualiza o título
    document.getElementById('page-title').textContent = this.screenTitles[screenId] || 'Finanças';
  },

  // ===== Formatação =====
  formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  },

  formatDate(dateString) {
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('pt-BR');
  },

  formatMonthYear(dateString) {
    const [year, month] = dateString.split('-');
    const date = new Date(year, parseInt(month), 1);
    return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  },

  // ===== Dashboard =====
  updateBalance(balance) {
    document.getElementById('current-balance').textContent = this.formatCurrency(balance.balance);
    document.getElementById('total-savings').textContent = this.formatCurrency(balance.savings || 0);
    document.getElementById('total-income').textContent = this.formatCurrency(balance.income);
    document.getElementById('total-expense').textContent = this.formatCurrency(balance.expense);

    // Atualiza cor do saldo
    const balanceEl = document.getElementById('current-balance');
    if (balance.balance < 0) {
      balanceEl.style.color = '#FFCDD2';
    } else {
      balanceEl.style.color = 'white';
    }
  },

  updateRecentTransactions(transactions) {
    const list = document.getElementById('recent-list');
    const emptyMsg = document.getElementById('no-transactions-msg');

    if (transactions.length === 0) {
      list.innerHTML = '';
      emptyMsg.style.display = 'block';
      return;
    }

    emptyMsg.style.display = 'none';

    // Ordena por data (mais recentes primeiro) e pega os 5 primeiros
    const sorted = [...transactions]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 5);

    list.innerHTML = sorted.map(t => this.createTransactionItem(t, false)).join('');
  },

  updateGoalPreview(goal, balance) {
    const preview = document.getElementById('goal-preview');

    if (!goal.monthly || goal.monthly <= 0) {
      preview.style.display = 'none';
      return;
    }

    preview.style.display = 'block';

    const saved = balance.balance;
    const target = goal.monthly;
    const percent = Math.min((saved / target) * 100, 100);

    document.getElementById('goal-current').textContent = this.formatCurrency(Math.max(0, saved));
    document.getElementById('goal-target').textContent = `de ${this.formatCurrency(target)}`;
    document.getElementById('goal-percentage').textContent = `${Math.round(percent)}%`;
    document.getElementById('goal-progress-bar').style.width = `${Math.max(0, percent)}%`;
  },

  // ===== Transações =====
  createTransactionItem(transaction, showActions = true) {
    const category = Storage.getCategoryById(transaction.category) || { name: 'Outros', color: '#607D8B', icon: '📦' };

    const actionsHtml = showActions ? `
      <div class="transaction-actions">
        <button onclick="App.editTransaction('${transaction.id}')" title="Editar">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
          </svg>
        </button>
        <button class="delete" onclick="App.confirmDeleteTransaction('${transaction.id}')" title="Excluir">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        </button>
      </div>
    ` : '';

    return `
      <li class="transaction-item">
        <div class="transaction-icon ${transaction.type}">
          ${category.icon || (transaction.type === 'income' ? '💰' : '💸')}
        </div>
        <div class="transaction-details">
          <span class="transaction-description">${transaction.description}</span>
          <span class="transaction-meta">${category.name} • ${this.formatDate(transaction.date)}</span>
        </div>
        <span class="transaction-value ${transaction.type}">
          ${transaction.type === 'income' ? '+' : '-'} ${this.formatCurrency(transaction.value)}
        </span>
        ${actionsHtml}
      </li>
    `;
  },

  updateTransactionsList(transactions, filter = '') {
    const list = document.getElementById('transactions-list');
    const emptyMsg = document.getElementById('no-filtered-transactions');

    let filtered = [...transactions];

    // Aplica filtro de mês
    if (filter) {
      const [year, month] = filter.split('-');
      filtered = transactions.filter(t => {
        const date = new Date(t.date);
        return date.getFullYear() === parseInt(year) && date.getMonth() === parseInt(month);
      });
    }

    if (filtered.length === 0) {
      list.innerHTML = '';
      emptyMsg.style.display = 'block';
      return;
    }

    emptyMsg.style.display = 'none';

    // Ordena por data (mais recentes primeiro)
    const sorted = filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

    list.innerHTML = sorted.map(t => this.createTransactionItem(t, true)).join('');
  },

  updateMonthFilters(months) {
    const filters = [
      document.getElementById('filter-month'),
      document.getElementById('report-month')
    ];

    const options = months.map(m => {
      const [year, month] = m.split('-');
      const date = new Date(year, parseInt(month), 1);
      const label = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      return `<option value="${m}">${label}</option>`;
    }).join('');

    filters.forEach(filter => {
      if (filter) {
        filter.innerHTML = `<option value="">Todos os meses</option>${options}`;
      }
    });
  },

  // ===== Categorias =====
  updateCategorySelect(categories, type = 'expense') {
    const select = document.getElementById('transaction-category');

    // Filtra categorias relevantes para o tipo
    const incomeCategories = ['salario', 'investimentos', 'outros'];

    const filtered = type === 'income'
      ? categories.filter(c => incomeCategories.includes(c.id) || !c.default)
      : categories.filter(c => !incomeCategories.includes(c.id) || c.id === 'outros' || !c.default);

    select.innerHTML = `<option value="">Selecione...</option>` +
      filtered.map(c => `<option value="${c.id}">${c.icon || ''} ${c.name}</option>`).join('');
  },

  updateCategoriesList(categories) {
    const list = document.getElementById('categories-list');

    list.innerHTML = categories.map(c => `
      <li>
        <span class="category-color" style="background: ${c.color}"></span>
        <span class="category-name">${c.icon || ''} ${c.name}</span>
        ${c.default ? '<span class="default-badge">Padrão</span>' : `
          <button class="delete-category" onclick="App.confirmDeleteCategory('${c.id}')" title="Excluir">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        `}
      </li>
    `).join('');
  },

  // ===== Relatórios =====
  updateReportSummary(balance) {
    document.getElementById('report-income').textContent = this.formatCurrency(balance.income);
    document.getElementById('report-expense').textContent = this.formatCurrency(balance.expense);

    const balanceEl = document.getElementById('report-balance');
    balanceEl.textContent = this.formatCurrency(balance.balance);
    balanceEl.className = 'report-value ' + (balance.balance >= 0 ? 'income' : 'expense');
  },

  updateCategoryBreakdown(expensesByCategory, total) {
    const list = document.getElementById('category-list');
    const categories = Storage.getCategories();

    const items = Object.entries(expensesByCategory)
      .map(([categoryId, amount]) => {
        const category = categories.find(c => c.id === categoryId) || { name: 'Outros', color: '#607D8B' };
        const percent = total > 0 ? (amount / total * 100) : 0;
        return { category, amount, percent };
      })
      .sort((a, b) => b.amount - a.amount);

    if (items.length === 0) {
      list.innerHTML = '<li class="empty-message">Nenhuma despesa registrada</li>';
      return;
    }

    list.innerHTML = items.map(item => `
      <li class="category-item">
        <span class="category-color" style="background: ${item.category.color}"></span>
        <span class="category-name">${item.category.name}</span>
        <span class="category-amount">${this.formatCurrency(item.amount)}</span>
        <span class="category-percent">${item.percent.toFixed(1)}%</span>
      </li>
    `).join('');
  },

  // ===== Metas =====
  updateGoalStatus(goal, monthlyBalance) {
    const saved = monthlyBalance.balance;
    const target = goal.monthly;

    if (!target || target <= 0) {
      document.getElementById('goal-status').style.display = 'none';
      return;
    }

    document.getElementById('goal-status').style.display = 'block';

    const now = new Date();
    const monthLabel = now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

    document.getElementById('goal-month-label').textContent = monthLabel;
    document.getElementById('goal-target-value').textContent = `Meta: ${this.formatCurrency(target)}`;

    const percent = Math.min((saved / target) * 100, 100);
    document.getElementById('goal-progress-large').style.width = `${Math.max(0, percent)}%`;
    document.getElementById('goal-saved').textContent = `Economizado: ${this.formatCurrency(Math.max(0, saved))}`;
    document.getElementById('goal-percent').textContent = `${Math.round(percent)}%`;

    // Preenche o input com o valor atual da meta
    document.getElementById('goal-value').value = target;

    // Mensagem de status
    const messageEl = document.getElementById('goal-message');
    if (percent >= 100) {
      messageEl.textContent = 'Parabéns! Você atingiu sua meta!';
      messageEl.className = 'goal-message success';
    } else if (percent >= 75) {
      messageEl.textContent = 'Quase lá! Continue economizando!';
      messageEl.className = 'goal-message warning';
    } else if (percent > 0) {
      messageEl.textContent = `Faltam ${this.formatCurrency(target - saved)} para sua meta`;
      messageEl.className = 'goal-message info';
    } else {
      messageEl.textContent = 'Suas despesas superaram suas receitas este mês';
      messageEl.className = 'goal-message warning';
    }
  },

  updateGoalHistory(history) {
    const list = document.getElementById('goal-history-list');
    const emptyMsg = document.getElementById('no-goal-history');

    if (history.length === 0) {
      list.innerHTML = '';
      emptyMsg.style.display = 'block';
      return;
    }

    emptyMsg.style.display = 'none';

    list.innerHTML = history.map(h => {
      const achieved = h.saved >= h.target;
      return `
        <li class="goal-history-item">
          <span class="goal-history-month">${this.formatMonthYear(h.month)}</span>
          <span class="goal-history-status ${achieved ? 'achieved' : 'not-achieved'}">
            ${achieved ? 'Meta atingida' : 'Não atingida'} - ${this.formatCurrency(h.saved)} / ${this.formatCurrency(h.target)}
          </span>
        </li>
      `;
    }).join('');
  },

  // ===== Formulário de Transação =====
  resetTransactionForm() {
    document.getElementById('transaction-form').reset();
    document.getElementById('transaction-id').value = '';
    document.getElementById('form-title').textContent = 'Nova Transação';
    document.getElementById('cancel-edit').style.display = 'none';
    document.getElementById('transaction-date').value = new Date().toISOString().split('T')[0];

    // Reset tipo para receita
    document.querySelectorAll('.type-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    document.querySelector('.type-btn[data-type="income"]').classList.add('active');

    // Atualiza categorias para receita
    this.updateCategorySelect(Storage.getCategories(), 'income');
  },

  fillTransactionForm(transaction) {
    document.getElementById('transaction-id').value = transaction.id;
    document.getElementById('transaction-value').value = transaction.value;
    document.getElementById('transaction-description').value = transaction.description;
    document.getElementById('transaction-date').value = transaction.date;
    document.getElementById('form-title').textContent = 'Editar Transação';
    document.getElementById('cancel-edit').style.display = 'block';

    // Set tipo
    document.querySelectorAll('.type-btn').forEach(btn => {
      btn.classList.remove('active');
      if (btn.dataset.type === transaction.type) {
        btn.classList.add('active');
      }
    });

    // Atualiza categorias e seleciona a atual
    this.updateCategorySelect(Storage.getCategories(), transaction.type);
    document.getElementById('transaction-category').value = transaction.category;
  },

  // ===== Modal =====
  showModal(title, message, onConfirm) {
    const modal = document.getElementById('confirm-modal');
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-message').textContent = message;
    modal.classList.add('active');

    // Remove listeners antigos
    const confirmBtn = document.getElementById('modal-confirm');
    const cancelBtn = document.getElementById('modal-cancel');
    const newConfirmBtn = confirmBtn.cloneNode(true);
    const newCancelBtn = cancelBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
    cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);

    // Adiciona novos listeners
    newConfirmBtn.addEventListener('click', () => {
      modal.classList.remove('active');
      if (onConfirm) onConfirm();
    });

    newCancelBtn.addEventListener('click', () => {
      modal.classList.remove('active');
    });
  },

  hideModal() {
    document.getElementById('confirm-modal').classList.remove('active');
  },

  // ===== Toast =====
  showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type} show`;

    setTimeout(() => {
      toast.classList.remove('show');
    }, 3000);
  },

  // ===== Tema =====
  setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    Storage.setTheme(theme);
  },

  toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const newTheme = current === 'dark' ? 'light' : 'dark';
    this.setTheme(newTheme);
  },

  initTheme() {
    const settings = Storage.getSettings();
    if (settings.theme) {
      document.documentElement.setAttribute('data-theme', settings.theme);
    }
  }
};
