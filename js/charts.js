// ===== Charts Module =====
// Gerencia todos os gráficos usando Chart.js

const Charts = {
  instances: {},

  // Cores do tema
  getThemeColors() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    return {
      text: isDark ? '#FFFFFF' : '#212121',
      grid: isDark ? '#333333' : '#E0E0E0',
      income: isDark ? '#4CAF50' : '#2E7D32',
      expense: isDark ? '#EF5350' : '#C62828'
    };
  },

  // Destrói um gráfico existente
  destroy(chartId) {
    if (this.instances[chartId]) {
      this.instances[chartId].destroy();
      delete this.instances[chartId];
    }
  },

  // ===== Gráfico de Pizza - Gastos por Categoria =====
  createCategoryPieChart(canvasId, data, showEmpty = true) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    this.destroy(canvasId);

    const categories = Storage.getCategories();
    const colors = this.getThemeColors();

    // Prepara os dados
    const labels = [];
    const values = [];
    const backgroundColors = [];

    Object.entries(data).forEach(([categoryId, amount]) => {
      const category = categories.find(c => c.id === categoryId) || { name: 'Outros', color: '#607D8B' };
      labels.push(category.name);
      values.push(amount);
      backgroundColors.push(category.color);
    });

    // Mostra mensagem se não houver dados
    const emptyMsg = document.getElementById(canvasId === 'dashboard-chart' ? 'no-expenses-msg' : 'no-category-data');
    if (values.length === 0) {
      canvas.style.display = 'none';
      if (emptyMsg) emptyMsg.style.display = 'block';
      return;
    }

    canvas.style.display = 'block';
    if (emptyMsg) emptyMsg.style.display = 'none';

    this.instances[canvasId] = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: values,
          backgroundColor: backgroundColors,
          borderWidth: 2,
          borderColor: document.documentElement.getAttribute('data-theme') === 'dark' ? '#1E1E1E' : '#FFFFFF'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: colors.text,
              padding: 15,
              usePointStyle: true,
              font: {
                size: 11
              }
            }
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                const value = context.raw;
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percentage = ((value / total) * 100).toFixed(1);
                return `${context.label}: ${UI.formatCurrency(value)} (${percentage}%)`;
              }
            }
          }
        },
        cutout: '60%'
      }
    });
  },

  // ===== Gráfico de Barras - Receitas vs Despesas =====
  createComparisonBarChart(canvasId, data) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    this.destroy(canvasId);

    const colors = this.getThemeColors();

    const labels = data.map(d => d.month);
    const incomeData = data.map(d => d.income);
    const expenseData = data.map(d => d.expense);

    this.instances[canvasId] = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Receitas',
            data: incomeData,
            backgroundColor: colors.income,
            borderRadius: 4,
            barPercentage: 0.8,
            categoryPercentage: 0.7
          },
          {
            label: 'Despesas',
            data: expenseData,
            backgroundColor: colors.expense,
            borderRadius: 4,
            barPercentage: 0.8,
            categoryPercentage: 0.7
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: colors.text,
              padding: 15,
              usePointStyle: true,
              font: {
                size: 11
              }
            }
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                return `${context.dataset.label}: ${UI.formatCurrency(context.raw)}`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: {
              display: false
            },
            ticks: {
              color: colors.text,
              font: {
                size: 10
              }
            }
          },
          y: {
            beginAtZero: true,
            grid: {
              color: colors.grid
            },
            ticks: {
              color: colors.text,
              callback: function(value) {
                if (value >= 1000) {
                  return 'R$ ' + (value / 1000).toFixed(0) + 'k';
                }
                return 'R$ ' + value;
              },
              font: {
                size: 10
              }
            }
          }
        }
      }
    });
  },

  // ===== Atualiza todos os gráficos =====
  updateAllCharts() {
    // Gráfico do Dashboard
    const expensesByCategory = Storage.getExpensesByCategory();
    this.createCategoryPieChart('dashboard-chart', expensesByCategory);

    // Gráficos de Relatórios
    this.createCategoryPieChart('category-chart', expensesByCategory);

    const monthlyData = Storage.getMonthlyData(6);
    this.createComparisonBarChart('comparison-chart', monthlyData);
  },

  // ===== Atualiza gráficos com filtro de mês =====
  updateChartsWithFilter(year, month) {
    if (year !== null && month !== null) {
      const expensesByCategory = Storage.getExpensesByCategory(year, month);
      this.createCategoryPieChart('category-chart', expensesByCategory);
    } else {
      const expensesByCategory = Storage.getExpensesByCategory();
      this.createCategoryPieChart('category-chart', expensesByCategory);
    }
  },

  // ===== Atualiza cores quando tema muda =====
  updateTheme() {
    // Recria todos os gráficos para aplicar novas cores
    this.updateAllCharts();
  }
};
