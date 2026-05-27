// Dados iniciais de semente (seed) para o Inovar Assist

const initialKnowledgeBase = [
  {
    id: "kb-001",
    title: "Erro de Timeout na Emissão de NF-e",
    category: "Fiscal",
    tags: ["nfe", "timeout", "sefaz", "integrador", "fiscal", "erro 500"],
    description: "Instabilidade de conexão com os servidores da SEFAZ ou bloqueio local de portas que impede o retorno do XML assinado.",
    clientFriendly: "Prezado cliente, identificamos que a falha na emissão da nota fiscal ocorre devido a uma instabilidade temporária de conexão com os servidores autorizadores da SEFAZ ou instabilidade em sua operadora de internet. Nossa equipe técnica já está reiniciando o serviço do módulo integrador local para reestabelecer a fila de processamento. Por favor, aguarde de 3 a 5 minutos e tente efetuar a reemissão do documento.",
    solution: `Este problema geralmente ocorre por instabilidade na SEFAZ ou regras de bloqueio no firewall do cliente.

### Procedimento de Diagnóstico e Correção:

1. **Verifique os Servidores da SEFAZ:**
   Consulte a disponibilidade no portal oficial da SEFAZ do estado do cliente.

2. **Teste de Latência de Rede:**
   No servidor do cliente, abra o **Prompt de Comando (CMD)** como administrador e execute:
   \`\`\`bash
   ping nfe.sefaz.rs.gov.br -t
   \`\`\`
   *(Substitua o endereço pelo servidor SEFAZ autorizador do estado correspondente).*

3. **Verificação de Portas:**
   Certifique-se de que a porta **443** (HTTPS) está liberada para tráfego de saída no firewall do cliente.

4. **Reinicialização do Integrador:**
   Se a rede estiver operante, reinicie o serviço integrador fiscal da Inovar executando os comandos abaixo no CMD como administrador:
   \`\`\`bash
   net stop InovarFiscal
   net start InovarFiscal
   \`\`\`
   
5. **Limpeza de Cache SSL:**
   Abra as *Opções da Internet* no Windows, vá até a aba *Conteúdo* e clique em **"Limpar estado SSL"**.`
  },
  {
    id: "kb-002",
    title: "Deadlock no Banco de Dados (Travamento do PDV)",
    category: "Banco de Dados",
    tags: ["banco", "deadlock", "travamento", "pdv", "sql", "kill"],
    description: "Concorrência de transações no banco SQL que trava as operações de vendas e fechamento de caixa.",
    clientFriendly: "Prezado cliente, identificamos um travamento temporário no processamento de vendas no PDV, ocasionado por uma sobrecarga/concorrência de transações simultâneas no banco de dados. Nossa equipe técnica já efetuou a liberação da conexão conflitante no servidor de forma segura. O sistema já retornou à normalidade e você pode continuar realizando suas vendas!",
    solution: `Um deadlock ocorre quando duas transações se bloqueiam mutuamente. Isso causa travamento geral nas telas do PDV.

### Como identificar e liberar:

1. **Identificar processos bloqueados:**
   Abra o SQL Server Management Studio (SSMS) conectado ao servidor do cliente e execute a query abaixo:
   \`\`\`sql
   SELECT 
       spid, 
       blocked, 
       waittime, 
       lastwaittype, 
       status, 
       cmd,
       hostname,
       program_name
   FROM sys.sysprocesses 
   WHERE blocked > 0;
   \`\`\`

2. **Descobrir o bloqueador principal:**
   Na coluna \`blocked\`, identifique o ID numérico do processo causador do bloqueio principal (geralmente aquele que não está bloqueado por ninguém, mas bloqueia outros).

3. **Derrubar o processo travado:**
   Execute o comando de liberação usando o ID identificado:
   \`\`\`sql
   KILL [ID_DO_PROCESSO];
   -- Exemplo: KILL 54;
   \`\`\`
   
   > [!CAUTION]
   > **Importante:** Apenas execute o \`KILL\` se tiver certeza de que não é um processo crítico de sincronização de retaguarda ou fechamento fiscal ativo.`
  },
  {
    id: "kb-003",
    title: "Configuração de Balança Filizola (Sem Leitura de Peso)",
    category: "Periféricos",
    tags: ["balança", "filizola", "peso", "com", "serial", "configurar"],
    description: "O PDV não consegue ler o peso transmitido pela balança Filizola conectada na porta Serial (COM).",
    clientFriendly: "Prezado cliente, identificamos que a balança Filizola não estava transmitindo o peso para o caixa porque a porta COM (serial) foi alterada ou desconectada no gerenciador de dispositivos do Windows. Realizamos o remapeamento da porta de comunicação e a sincronização dos parâmetros de Baud Rate (velocidade). O leitor de peso da balança já está operacional e calibrado para as vendas.",
    solution: `Caso o PDV retorne peso zerado ou erro de leitura ao acionar a pesagem da balança Filizola, siga estas etapas:

### Passo a Passo para Configuração:

1. **Verifique a Conexão Física:**
   Certifique-se de que o cabo serial RS-232 está plugado firmemente na balança e na porta COM do computador. Se estiver usando adaptador USB-Serial, confirme o driver nas propriedades do Windows.

2. **Identifique a Porta COM no Windows:**
   Abra o *Gerenciador de Dispositivos* e expanda a seção **"Portas (COM e LPT)"** para verificar qual número de porta COM foi atribuído (Ex: \`COM3\`).

3. **Parâmetros da Balança Filizola (Padrão):**
   No arquivo de configuração do PDV (\`config.ini\`) ou na tela de periféricos do sistema Inovar, configure a porta com os seguintes parâmetros:
   - **Baud Rate:** \`2400\` ou \`9600\` (depende do modelo da Filizola Platina)
   - **Data Bits:** \`8\`
   - **Parity:** \`None\`
   - **Stop Bits:** \`1\`
   - **Handshaking:** \`None\`

4. **Teste de Comunicação Direta:**
   Use o software oficial *Filizola Teste* ou um emulador de terminal (como PuTTY) na porta identificada para ver se os caracteres de peso estão chegando na tela.`
  },
  {
    id: "kb-004",
    title: "Impressora Térmica não Imprime (Fila de Spool Travada)",
    category: "Periféricos",
    tags: ["impressora", "termica", "nao imprime", "bobina", "spooler", "usb"],
    description: "Impressora não responde aos comandos de impressão de cupom fiscal ou recibo, mesmo ligada.",
    clientFriendly: "Prezado cliente, identificamos que a impressora térmica parou de imprimir devido a um acúmulo de documentos corrompidos na fila de impressão do Windows (Spooler), bloqueando novos cupons. Efetuamos a limpeza completa dos arquivos corrompidos e reiniciamos o serviço de spooler do Windows. A impressora já está ativa e todas as impressões pendentes serão emitidas automaticamente em instantes.",
    solution: `Quando a impressora térmica (Bematech, Elgin ou Epson) para de imprimir repentinamente, o spooler do Windows costuma estar travado com documentos corrompidos.

### Procedimento de Limpeza do Spooler:

1. **Retire a impressora da tomada USB/Energia** e recoloque após 5 segundos. Certifique-se de que o LED está verde (indica papel alimentado).

2. **Limpar a Fila de Impressão via CMD:**
   Abra o **Prompt de Comando (CMD)** como administrador e execute a sequência abaixo para limpar arquivos temporários corrompidos:
   \`\`\`bash
   -- Parar o serviço do spooler do Windows
   net stop spooler
   
   -- Excluir arquivos temporários da fila
   del /Q /F /S "%systemroot%\\System32\\Spool\\Printers\\*.*"
   
   -- Reiniciar o serviço do spooler
   net start spooler
   \`\`\`

3. **Verificar porta nas Propriedades da Impressora:**
   Vá em *Dispositivos e Impressoras* > Botão direito na impressora > *Propriedades da Impressora* > aba **Portas**.
   Certifique-se de que a porta marcada é a correta (ex: \`USB001\`, \`USB002\` ou \`ESDPRT\`).`
  }
];

const initialLogs = [
  {
    id: "log-1",
    user: "Guilherme",
    query: "erro timeout nfe sefaz",
    timestamp: "2026-05-26T10:15:30.000Z",
    resolved: true,
    articleId: "kb-001"
  },
  {
    id: "log-2",
    user: "Alisson",
    query: "pdv travando no caixa",
    timestamp: "2026-05-26T11:20:15.000Z",
    resolved: true,
    articleId: "kb-002"
  },
  {
    id: "log-3",
    user: "Guilherme",
    query: "balança filizola configuracao",
    timestamp: "2026-05-26T13:05:40.000Z",
    resolved: true,
    articleId: "kb-003"
  },
  {
    id: "log-4",
    user: "Lucas",
    query: "impressora nao fiscal bematech",
    timestamp: "2026-05-26T13:42:00.000Z",
    resolved: false,
    articleId: "kb-004"
  },
  {
    id: "log-5",
    user: "Alisson",
    query: "erro de conexao banco de dados",
    timestamp: "2026-05-26T14:10:22.000Z",
    resolved: true,
    articleId: "kb-002"
  },
  {
    id: "log-6",
    user: "Lucas",
    query: "como emitir nfe em contingencia",
    timestamp: "2026-05-26T14:55:10.000Z",
    resolved: false,
    articleId: null
  }
];

// Exporta as variáveis de semente globalmente para serem usadas pelos demais scripts
window.initialKnowledgeBase = initialKnowledgeBase;
window.initialLogs = initialLogs;
