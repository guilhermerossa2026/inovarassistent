# Regras Gerais do Workspace — Inovar Assistente

Este arquivo define regras de comportamento e boas práticas de desenvolvimento obrigatórias que o assistente do IDE deve seguir ao atuar neste workspace.

---

## 1. Uso Obrigatório de Custom Skills
Para manter a máxima qualidade, consistência e excelência de engenharia no projeto:
- **Verificação Prévia**: O assistente deve SEMPRE verificar as skills disponíveis sob `.agents/skills/` no início de qualquer tarefa de programação, análise, design ou curadoria.
- **Aplicação de Diretrizes**: O assistente deve seguir de forma rigorosa as metodologias, fases e padrões de entrega definidos nas skills do projeto:
  - **`electron-developer`**: Para qualquer modificação no processo principal, preload ou empacotamento desktop.
  - **`fullstack-fixer`**: Para correção de bugs e vulnerabilidades de segurança.
  - **`qa-tester`**: Para auditorias de código e elaboração de relatórios de conformidade.
  - **`ui-ux-designer`**: Para refinamento visual de telas, CSS/HTML, transições e temas.
  - **`support-kb-curator`**: Para curadoria de artigos de erro de suporte e processamento de informações vindas do Discord.

---

## 2. Criação Proativa de Novas Skills
- Se o usuário solicitar a implementação de novos fluxos complexos (ex: sincronização de nuvem, automação de backups, logs avançados), e o assistente perceber a oportunidade de documentar as melhores práticas para garantir a consistência no futuro, ele deve sugerir e criar uma nova skill sob `.agents/skills/`.

---

## 3. Backups Estéticos e Rollback de Estilos
Em Julho de 2026, realizamos uma reformulação visual completa do Inovar Assistente para alinhá-lo com a plataforma **Suporte Hub** (cores escuras escuras `#000000`/`#0c0c0e`, vermelho `#940009`, azul `#104D73`, bordas arredondadas e labels em caixa alta stetched).
- **Arquivos de Backup**: Os estilos originais antes desse redesenho foram salvos como arquivos de backup `.bak` no diretório `css/`:
  - `css/variables.css.bak`
  - `css/admin.css.bak`
  - `css/main.css.bak`
  - `css/chat.css.bak`
- **Instruções de Rollback**: Caso o usuário solicite reverter a mudança estética do Suporte Hub e restaurar a cara original do Inovar Assistente, o assistente deve:
  1. Copiar `css/variables.css.bak` sobrescrevendo `css/variables.css`.
  2. Copiar `css/admin.css.bak` sobrescrevendo `css/admin.css`.
  3. Copiar `css/main.css.bak` sobrescrevendo `css/main.css`.
  4. Copiar `css/chat.css.bak` sobrescrevendo `css/chat.css`.
  5. Rodar o comando `npm run build-win` para recompilar e atualizar o executável da pasta raiz.

---

## 4. Recompilação Obrigatória do Executável (Build-Win)
- **Compilação Automática**: Sempre que houver alteração de código (novas features, correções de bugs, ajustes de design/CSS/HTML), o assistente deve **obrigatoriamente** rodar o comando `npm run build-win` para atualizar o executável portable (`Inovar Assist.exe`) na pasta raiz. Isso garante que a versão final empacotada do software esteja sempre alinhada com as modificações mais recentes.


