<script>
  import { onMount } from 'svelte';
  import { storage } from '$lib/services/storage.svelte.js';

  let { onLoginSuccess } = $props();

  let username = $state('');
  let password = $state('');
  let saveSession = $state(false);
  let errorMessage = $state('');

  onMount(async () => {
    await storage.init();
    
    // Auto-login if session was saved
    if (storage.settings.saveLogin && storage.settings.rememberedUser) {
      username = storage.settings.rememberedUser;
      password = storage.settings.rememberedPassword;
      saveSession = true;
      
      const success = await storage.validateLogin(username, password);
      if (success) {
        onLoginSuccess();
      }
    }
  });

  async function handleSubmit() {
    errorMessage = '';
    if (!username.trim() || !password) {
      errorMessage = 'Por favor, preencha todos os campos.';
      return;
    }

    const user = await storage.validateLogin(username, password);
    if (user) {
      // Save session if checked
      if (saveSession) {
        await storage.saveSettings({
          saveLogin: true,
          rememberedUser: username,
          rememberedPassword: password
        });
      } else {
        await storage.saveSettings({
          saveLogin: false,
          rememberedUser: '',
          rememberedPassword: ''
        });
      }
      onLoginSuccess();
    } else {
      errorMessage = 'Usuário ou senha incorretos.';
    }
  }
</script>

<div class="login-view-container">
  <div class="login-card glass-effect glow-panel-red">
    <div class="login-logo-container">
      <div class="cyber-logo">IA</div>
    </div>
    <h2 class="login-title">Portal de Suporte</h2>
    <p class="login-subtitle">Identifique-se para acessar a base de erros do Sistema Inovar</p>

    {#if errorMessage}
      <div class="error-banner">{errorMessage}</div>
    {/if}

    <div class="form-group">
      <label for="login-username" class="form-label">Nome de Usuário</label>
      <input 
        type="text" 
        id="login-username" 
        class="form-input" 
        placeholder="Digite seu usuário..." 
        bind:value={username}
        autocomplete="off"
        required
      />

      <label for="login-password" class="form-label" style="margin-top: 1rem;">Senha de Acesso</label>
      <input 
        type="password" 
        id="login-password" 
        class="form-input" 
        placeholder="••••" 
        bind:value={password}
        autocomplete="off"
        required
        onkeydown={(e) => e.key === 'Enter' && handleSubmit()}
      />
      
      <div class="checkbox-container">
        <input type="checkbox" id="login-save-session" bind:checked={saveSession} />
        <label for="login-save-session" class="checkbox-label">Lembrar usuário e senha neste dispositivo</label>
      </div>
    </div>

    <button onclick={handleSubmit} class="btn-primary">
      Iniciar Atendimento
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="5" y1="12" x2="19" y2="12"></line>
        <polyline points="12 5 19 12 12 19"></polyline>
      </svg>
    </button>
  </div>
</div>

<style>
  .login-view-container {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100vh;
    background-color: var(--bg-primary);
    background-image: radial-gradient(circle at 50% 50%, rgba(148, 0, 9, 0.05) 0%, transparent 70%);
  }

  .login-card {
    width: 100%;
    max-width: 420px;
    padding: 2.5rem;
    border-radius: var(--radius-lg);
    text-align: center;
    background: var(--bg-glass);
    border: 1px solid var(--border-color);
  }

  .login-logo-container {
    display: flex;
    justify-content: center;
    margin-bottom: 1.5rem;
  }

  .cyber-logo {
    width: 64px;
    height: 64px;
    border-radius: 50%;
    background: rgba(148, 0, 9, 0.15);
    border: 2px solid var(--inovar-red);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #ff3e4e;
    font-size: 1.5rem;
    font-weight: 800;
    font-family: 'Outfit', sans-serif;
    box-shadow: 0 0 20px rgba(148, 0, 9, 0.25);
  }

  .login-title {
    font-family: 'Outfit', sans-serif;
    font-size: 1.4rem;
    font-weight: 700;
    margin-bottom: 0.5rem;
    color: var(--text-primary);
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }

  .login-subtitle {
    font-size: 0.8rem;
    color: var(--text-secondary);
    margin-bottom: 2rem;
  }

  .error-banner {
    background: rgba(255, 51, 51, 0.1);
    border: 1px solid rgba(255, 51, 51, 0.3);
    color: #ff5252;
    padding: 0.75rem;
    border-radius: var(--radius-md);
    font-size: 0.8rem;
    margin-bottom: 1.5rem;
    text-align: left;
  }

  .form-group {
    text-align: left;
    margin-bottom: 2rem;
  }

  .form-label {
    display: block;
    font-size: 0.7rem;
    font-weight: 600;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 0.5rem;
  }

  .form-input {
    width: 100%;
    padding: 0.75rem 1rem;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm);
    color: var(--text-primary);
    font-size: 0.85rem;
    transition: var(--transition-fast);
    outline: none;
  }

  .form-input:focus {
    border-color: var(--inovar-red-hover);
    box-shadow: 0 0 10px rgba(148, 0, 9, 0.2);
    background: rgba(255, 255, 255, 0.04);
  }

  .checkbox-container {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-top: 1rem;
  }

  #login-save-session {
    cursor: pointer;
  }

  .checkbox-label {
    font-size: 0.75rem;
    color: var(--text-secondary);
    cursor: pointer;
    user-select: none;
  }

  .btn-primary {
    width: 100%;
    padding: 0.8rem 1.5rem;
    background: var(--inovar-red);
    border: 1px solid var(--inovar-red-hover);
    color: #fff;
    border-radius: var(--radius-md);
    cursor: pointer;
    font-weight: 600;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    transition: var(--transition-fast);
    font-size: 0.85rem;
  }

  .btn-primary:hover {
    background: var(--inovar-red-hover);
    box-shadow: 0 0 15px rgba(148, 0, 9, 0.35);
  }
</style>
