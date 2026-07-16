<script>
  // @ts-nocheck
  import { onMount } from 'svelte';
  import LoginView from '$lib/components/LoginView.svelte';
  import ChatView from '$lib/components/ChatView.svelte';
  import AdminView from '$lib/components/AdminView.svelte';
  import { storage } from '$lib/services/storage.svelte.js';

  let currentView = $state("login"); // "login", "chat", "admin"

  onMount(async () => {
    await storage.init();
    if (storage.currentUser) {
      currentView = "chat";
    }
  });

  function handleLoginSuccess() {
    currentView = "chat";
  }

  function handleLogout() {
    currentView = "login";
  }

  function openAdmin() {
    currentView = "admin";
  }

  function closeAdmin() {
    currentView = "chat";
  }
</script>

{#if currentView === "login"}
  <LoginView onLoginSuccess={handleLoginSuccess} />
{:else}
  <main style="height: 100vh; overflow: hidden; background-color: var(--bg-primary);">
    <!-- scanline cyberpunk overlay -->
    <div class="scanline-overlay" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06)); background-size: 100% 4px, 6px 100%; z-index: 99; opacity: 0.35;"></div>

    {#if currentView === "chat"}
      <ChatView onOpenAdmin={openAdmin} onLogout={handleLogout} />
    {:else if currentView === "admin"}
      <AdminView onCloseAdmin={closeAdmin} />
    {/if}
  </main>
{/if}
