// ===== Sync Module =====
// Sincronização com GitHub Gist

const Sync = {
  STORAGE_KEY: 'financas_github_config',
  DEVICE_ID_KEY: 'financas_device_id',
  GIST_FILENAME: 'controle-financas-data.json',

  // Gera ou obtém ID único do dispositivo
  getDeviceId() {
    let deviceId = localStorage.getItem(this.DEVICE_ID_KEY);
    if (!deviceId) {
      deviceId = 'dev_' + Date.now().toString(36) + Math.random().toString(36).substr(2);
      localStorage.setItem(this.DEVICE_ID_KEY, deviceId);
    }
    return deviceId;
  },

  // Obtém nome personalizado do dispositivo
  getCustomDeviceName() {
    return localStorage.getItem('financas_device_name') || null;
  },

  // Salva nome personalizado do dispositivo
  setCustomDeviceName(name) {
    if (name) {
      localStorage.setItem('financas_device_name', name);
    } else {
      localStorage.removeItem('financas_device_name');
    }
  },

  // Detecta informações do dispositivo
  getDeviceInfo() {
    const ua = navigator.userAgent;
    let deviceName = 'Desconhecido';
    let deviceType = 'desktop';

    // Detecta sistema operacional
    if (/Android/i.test(ua)) {
      deviceType = 'mobile';
      deviceName = 'Android';
      const match = ua.match(/Android\s([0-9.]+)/);
      if (match) deviceName += ' ' + match[1];
    } else if (/iPhone|iPad|iPod/i.test(ua)) {
      deviceType = 'mobile';
      deviceName = /iPad/i.test(ua) ? 'iPad' : 'iPhone';
    } else if (/Windows/i.test(ua)) {
      deviceName = 'Windows';
    } else if (/Mac/i.test(ua)) {
      deviceName = 'Mac';
    } else if (/Linux/i.test(ua)) {
      deviceName = 'Linux';
    }

    // Detecta navegador
    let browser = '';
    if (/Chrome/i.test(ua) && !/Edg/i.test(ua)) {
      browser = 'Chrome';
    } else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) {
      browser = 'Safari';
    } else if (/Firefox/i.test(ua)) {
      browser = 'Firefox';
    } else if (/Edg/i.test(ua)) {
      browser = 'Edge';
    }

    if (browser) {
      deviceName += ' - ' + browser;
    }

    // Usa nome personalizado se existir
    const customName = this.getCustomDeviceName();

    return {
      id: this.getDeviceId(),
      name: customName || deviceName,
      autoName: deviceName,
      type: deviceType,
      userAgent: ua.substring(0, 150)
    };
  },

  // Remove um dispositivo da lista
  async removeDevice(deviceId) {
    const config = this.getConfig();
    if (!config) return { success: false };

    try {
      const devices = await this.getDevices();
      const filtered = devices.filter(d => d.id !== deviceId);

      // Atualiza o Gist com a lista filtrada
      const response = await fetch(`https://api.github.com/gists/${config.gistId}`, {
        headers: {
          'Authorization': `token ${config.token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      if (!response.ok) return { success: false };

      const gist = await response.json();
      const file = gist.files[this.GIST_FILENAME];
      if (!file) return { success: false };

      const data = JSON.parse(file.content);
      data.devices = filtered;

      await fetch(`https://api.github.com/gists/${config.gistId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `token ${config.token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          files: {
            [this.GIST_FILENAME]: {
              content: JSON.stringify(data, null, 2)
            }
          }
        })
      });

      return { success: true };
    } catch (error) {
      console.error('Erro ao remover dispositivo:', error);
      return { success: false };
    }
  },

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
  getAllData(existingDevices = []) {
    const deviceInfo = this.getDeviceInfo();
    const now = new Date().toISOString();

    // Atualiza lista de dispositivos
    const devices = existingDevices.filter(d => d.id !== deviceInfo.id);
    devices.push({
      ...deviceInfo,
      lastSync: now
    });

    return {
      transactions: Storage.getTransactions(),
      categories: Storage.getCategories(),
      goals: Storage.getGoals(),
      savings: Storage.getSavings(),
      savingsHistory: Storage.getSavingsHistory(),
      settings: Storage.getSettings(),
      fixedExpenses: Storage.getFixedExpenses(),
      devices: devices,
      syncedAt: now
    };
  },

  // Obtém lista de dispositivos do Gist
  async getDevices() {
    const config = this.getConfig();
    if (!config) return [];

    try {
      const response = await fetch(`https://api.github.com/gists/${config.gistId}`, {
        headers: {
          'Authorization': `token ${config.token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      if (!response.ok) return [];

      const gist = await response.json();
      const file = gist.files[this.GIST_FILENAME];
      if (!file) return [];

      const data = JSON.parse(file.content);
      return data.devices || [];
    } catch (error) {
      console.error('Erro ao obter dispositivos:', error);
      return [];
    }
  },

  // Envia dados para o Gist
  async push() {
    const config = this.getConfig();
    if (!config) {
      return { success: false, error: 'Não configurado' };
    }

    try {
      // Verifica se dispositivo está bloqueado
      const isBlocked = await this.isDeviceBlocked();
      if (isBlocked) {
        return { success: false, error: 'Dispositivo bloqueado', blocked: true };
      }

      // Primeiro obtém dispositivos existentes
      const existingDevices = await this.getDevices();

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
              content: JSON.stringify(this.getAllData(existingDevices), null, 2)
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

  // Verifica se o dispositivo está bloqueado
  async isDeviceBlocked() {
    try {
      const devices = await this.getDevices();
      const deviceId = this.getDeviceId();
      const device = devices.find(d => d.id === deviceId);
      return device && device.blocked === true;
    } catch (error) {
      return false;
    }
  },

  // Baixa dados do Gist
  async pull() {
    const config = this.getConfig();
    if (!config) {
      return { success: false, error: 'Não configurado' };
    }

    try {
      // Verifica se dispositivo está bloqueado
      const isBlocked = await this.isDeviceBlocked();
      if (isBlocked) {
        return { success: false, error: 'Dispositivo bloqueado', blocked: true };
      }

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
      if (data.savingsHistory) Storage.saveSavingsHistory(data.savingsHistory);
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
