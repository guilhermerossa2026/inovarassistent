<script>
  // @ts-nocheck
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
  <!-- Decorative background mesh -->
  <div class="bg-glow-effect"></div>
  
  <div class="login-card glass-effect glow-panel-red">
    <div class="login-logo-container">
      <div class="cyber-logo">
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" class="logo-svg">
          <path d="M12 2L2 22h20L12 2zm0 3.99L18.47 19H5.53L12 5.99z" />
          <path d="M11 16h2v2h-2zm0-6h2v4h-2z" opacity="0.9" />
        </svg>
      </div>
    </div>
    
    <h2 class="login-title">Inovar Assistente</h2>
    <p class="login-subtitle">Acesse a central offline de suporte inteligente</p>

    {#if errorMessage}
      <div class="error-banner">{errorMessage}</div>
    {/if}

    <div class="form-group">
      <label for="login-username" class="form-label">Nome de Usuário</label>
      <input 
        type="text" 
        id="login-username" 
        class="form-input" 
        placeholder="Seu usuário de técnico..." 
        bind:value={username}
        autocomplete="off"
        required
      />

      <label for="login-password" class="form-label" style="margin-top: 1.25rem;">Senha de Acesso</label>
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
        <label for="login-save-session" class="checkbox-label">Manter-me conectado neste terminal</label>
      </div>
    </div>

    <button onclick={handleSubmit} class="btn-login">
      <span>Conectar ao Sistema</span>
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <line x1="5" y1="12" x2="19" y2="12"></line>
        <polyline points="12 5 19 12 12 19"></polyline>
      </svg>
    </button>
  </div>
</div>

<style>
  .login-view-container {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100vh;
    background-color: var(--bg-primary);
    overflow: hidden;
  }

  .bg-glow-effect {
    position: absolute;
    width: 600px;
    height: 600px;
    background: radial-gradient(circle, rgba(244, 63, 94, 0.04) 0%, transparent 70%);
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    pointer-events: none;
    z-index: 0;
  }

  .login-card {
    position: relative;
    width: 100%;
    max-width: 400px;
    padding: 3rem 2.5rem;
    border-radius: var(--radius-lg);
    text-align: center;
    z-index: 10;
    box-shadow: 0 10px 40px -10px rgba(0, 0, 0, 0.5);
  }

  .login-logo-container {
    display: flex;
    justify-content: center;
    margin-bottom: 1.5rem;
  }

  .cyber-logo {
    width: 58px;
    height: 58px;
    border-radius: 14px;
    background: rgba(244, 63, 94, 0.04);
    border: 1px solid rgba(244, 63, 94, 0.3);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--inovar-red);
    box-shadow: 0 0 15px rgba(244, 63, 94, 0.1);
    transition: var(--transition-normal);
  }

  .cyber-logo:hover {
    transform: scale(1.05) rotate(5deg);
    border-color: var(--inovar-red);
    box-shadow: 0 0 25px rgba(244, 63, 94, 0.2);
  }

  .logo-svg {
    width: 28px;
    height: 28px;
    fill: currentColor;
  }

  .login-title {
    font-family: 'Outfit', sans-serif;
    font-size: 1.35rem;
    font-weight: 700;
    margin-bottom: 0.4rem;
    color: var(--text-primary);
    letter-spacing: -0.01em;
  }

  .login-subtitle {
    font-size: 0.78rem;
    color: var(--text-secondary);
    margin-bottom: 2rem;
  }

  .error-banner {
    background: rgba(239, 68, 68, 0.08);
    border: 1px solid rgba(239, 68, 68, 0.2);
    color: #f87171;
    padding: 0.75rem 1rem;
    border-radius: var(--radius-md);
    font-size: 0.78rem;
    margin-bottom: 1.5rem;
    text-align: left;
    line-height: 1.4;
  }

  .form-group {
    text-align: left;
    margin-bottom: 2rem;
  }

  .form-label {
    display: block;
    font-size: 0.7rem;
    font-weight: 600;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    margin-bottom: 0.45rem;
  }

  .checkbox-container {
    display: flex;
    align-items: center;
    gap: 0.55rem;
    margin-top: 1.25rem;
  }

  #login-save-session {
    cursor: pointer;
    width: 15px;
    height: 15px;
    accent-color: var(--inovar-red);
    border-radius: 4px;
  }

  .checkbox-label {
    font-size: 0.75rem;
    color: var(--text-secondary);
    cursor: pointer;
    user-select: none;
  }

  .btn-login {
    width: 100%;
    padding: 0.8rem 1.5rem;
    background: var(--inovar-red);
    border: none;
    color: #ffffff;
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

  .btn-login:hover {
    background: var(--inovar-red-hover);
    transform: translateY(-1px);
    box-shadow: 0 4px 15px rgba(244, 63, 94, 0.3);
  }

  .btn-login:active {
    transform: translateY(0);
  }
</style>
