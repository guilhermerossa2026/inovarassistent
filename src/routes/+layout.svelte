<script>
  import '../app.css'; // Importa a fundação estética global do Suporte Hub
  
  // Svelte 5 utiliza as runes para props e renderização de filhos
  let { children } = $props();
</script>

<!-- Renderiza as páginas filhas dentro do layout global -->
{@render children()}
