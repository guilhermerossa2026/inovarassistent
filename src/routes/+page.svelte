<script>
  import ChatView from '$lib/components/ChatView.svelte';

  let currentView = $state("chat"); // "chat" ou "admin"

  function openAdmin() {
    currentView = "admin";
  }

  function closeAdmin() {
    currentView = "chat";
  }
</script>

{#if currentView === "chat"}
  <ChatView onOpenAdmin={openAdmin} />
{:else}
  <!-- Placeholder para o painel Admin -->
  <div class="admin-placeholder-container" style="padding: 2rem; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh;">
    <h2 style="font-family: 'Outfit', sans-serif; margin-bottom: 1rem; color: var(--inovar-red);">Painel Administrativo</h2>
    <p style="color: var(--text-secondary); margin-bottom: 1.5rem;">Esta tela está sendo convertida para componentes Svelte premium!</p>
    <button 
      onclick={closeAdmin} 
      style="padding: 0.6rem 1.5rem; background: var(--cyber-blue); border: none; color: #fff; border-radius: var(--radius-md); cursor: pointer; font-weight: 600;"
    >
      Voltar ao Chat
    </button>
  </div>
{/if}
