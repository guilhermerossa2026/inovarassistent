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
    {#if currentView === "chat"}
      <ChatView onOpenAdmin={openAdmin} onLogout={handleLogout} />
    {:else if currentView === "admin"}
      <AdminView onCloseAdmin={closeAdmin} />
    {/if}
  </main>
{/if}
