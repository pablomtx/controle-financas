// ===== Sync Module =====
// Sincronização com GitHub Gist

const Sync = {
  STORAGE_KEY: 'financas_github_config',
  GIST_FILENAME: 'controle-financas-data.json',

  // Obtém configuração salva
  getConfig() {
    const data = localStorage.getItem(this.STORAGE_KEY);
    return data ? JSON.parse(data) : null;
  },

  // Salva configuração
  saveConfig(config) {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(config));
  },

  // Remove configuração
  removeConfig() {
    localStorage.removeItem(this.STORAGE_KEY);
  },

  // Verifica se está configurado
  isConfigured() {
    const config = this.getConfig();
    return config && config.token && config.gistId;
  },

  // Configura sincronização (cria Gist se necessário)
  async setup(token) {
    try {
      // Verifica se o token é válido
      const userResponse = await fetch('https://api.github.com/user', {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      if (!userResponse.ok) {
        throw new Error('Token inválido');
      }

      const user = await userResponse.json();

      // Procura por um Gist existente
      const gistsResponse = await fetch('https://api.github.com/gists', {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      const gists = await gistsResponse.json();
      let gistId = null;

      // Procura Gist com nosso arquivo
      for (const gist of gists) {
        if (gist.files && gist.files[this.GIST_FILENAME]) {
          gistId = gist.id;
          break;
        }
      }

      // Se não encontrou, cria novo Gist
      if (!gistId) {
        const createResponse = await fetch('https://api.github.com/gists', {
          method: 'POST',
          headers: {
            'Authorization': `token ${token}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            description: 'Controle de Finanças - Dados sincronizados',
            public: false,
            files: {
              [this.GIST_FILENAME]: {
                content: JSON.stringify(this.getAllData(), null, 2)
              }
            }
          })
        });

        if (!createResponse.ok) {
          throw new Error('Erro ao criar Gist');
        }

        const newGist = await createResponse.json();
        gistId = newGist.id;
      }

      // Salva configuração
      this.saveConfig({
        token,
        gistId,
        username: user.login,
        lastSync: new Date().toISOString()
      });

      return { success: true, username: user.login };

    } catch (error) {
      console.error('Erro ao configurar sync:', error);
      return { success: false, error: error.message };
    }
  },

  // Obtém todos os dados para sincronizar
  getAllData() {
    return {
      transactions: Storage.getTransactions(),
      categories: Storage.getCategories(),
      goals: Storage.getGoals(),
      savings: Storage.getSavings(),
      settings: Storage.getSettings(),
      fixedExpenses: Storage.getFixedExpenses(),
      syncedAt: new Date().toISOString()
    };
  },

  // Envia dados para o Gist
  async push() {
    const config = this.getConfig();
    if (!config) {
      return { success: false, error: 'Não configurado' };
    }

    try {
      const response = await fetch(`https://api.github.com/gists/${config.gistId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `token ${config.token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          files: {
            [this.GIST_FILENAME]: {
              content: JSON.stringify(this.getAllData(), null, 2)
            }
          }
        })
      });

      if (!response.ok) {
        throw new Error('Erro ao enviar dados');
      }

      // Atualiza última sincronização
      config.lastSync = new Date().toISOString();
      this.saveConfig(config);

      return { success: true };

    } catch (error) {
      console.error('Erro ao enviar dados:', error);
      return { success: false, error: error.message };
    }
  },

  // Baixa dados do Gist
  async pull() {
    const config = this.getConfig();
    if (!config) {
      return { success: false, error: 'Não configurado' };
    }

    try {
      const response = await fetch(`https://api.github.com/gists/${config.gistId}`, {
        headers: {
          'Authorization': `token ${config.token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      if (!response.ok) {
        throw new Error('Erro ao baixar dados');
      }

      const gist = await response.json();
      const file = gist.files[this.GIST_FILENAME];

      if (!file) {
        throw new Error('Arquivo não encontrado');
      }

      const data = JSON.parse(file.content);

      // Importa os dados
      if (data.transactions) Storage.saveTransactions(data.transactions);
      if (data.categories) Storage.saveCategories(data.categories);
      if (data.goals) Storage.saveGoals(data.goals);
      if (data.savings !== undefined) Storage.setSavings(data.savings);
      if (data.settings) Storage.saveSettings(data.settings);
      if (data.fixedExpenses) Storage.saveFixedExpenses(data.fixedExpenses);

      // Atualiza última sincronização
      config.lastSync = new Date().toISOString();
      this.saveConfig(config);

      return { success: true };

    } catch (error) {
      console.error('Erro ao baixar dados:', error);
      return { success: false, error: error.message };
    }
  },

  // Sincroniza (baixa e depois envia)
  async sync() {
    // Primeiro baixa para pegar alterações de outros dispositivos
    const pullResult = await this.pull();
    if (!pullResult.success) {
      return pullResult;
    }

    // Depois envia dados locais
    const pushResult = await this.push();
    return pushResult;
  },

  // Formata data da última sincronização
  getLastSyncFormatted() {
    const config = this.getConfig();
    if (!config || !config.lastSync) {
      return null;
    }

    const date = new Date(config.lastSync);
    return date.toLocaleString('pt-BR');
  },

  // Sincronização automática em background (só push)
  async autoSync() {
    if (!this.isConfigured()) return;

    try {
      await this.push();
      console.log('Auto-sync: dados enviados');
    } catch (error) {
      console.error('Auto-sync erro:', error);
    }
  },

  // Sincronização ao iniciar o app (pull para pegar dados novos)
  async syncOnLoad() {
    if (!this.isConfigured()) return { success: false };

    try {
      const result = await this.pull();
      if (result.success) {
        console.log('Sync on load: dados atualizados');
      }
      return result;
    } catch (error) {
      console.error('Sync on load erro:', error);
      return { success: false, error: error.message };
    }
  }
};
