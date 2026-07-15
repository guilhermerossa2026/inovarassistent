const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const distDir = path.join(__dirname, '..', 'dist');
const destination = path.join(__dirname, '..', 'Inovar Assist.exe');

console.log('--- Automação Pós-Compilação de Executável ---');

// 1. Tenta encerrar qualquer processo do Inovar Assist em execução para destravar o arquivo
try {
  console.log('Verificando e encerrando instâncias ativas de Inovar Assist.exe...');
  if (process.platform === 'win32') {
    execSync('taskkill /F /IM "Inovar Assist.exe" 2>nul || ver >nul');
  }
} catch (err) {
  // Ignora se não houver instâncias em execução
}

try {
  if (!fs.existsSync(distDir)) {
    console.error('Erro: A pasta dist/ não existe. Rode a compilação primeiro.');
    process.exit(1);
  }

  const files = fs.readdirSync(distDir);
  // Encontra o executável portátil (excluindo instaladores de Setup)
  const exeFile = files.find(f => f.endsWith('.exe') && !f.toLowerCase().includes('setup'));

  if (exeFile) {
    const source = path.join(distDir, exeFile);
    console.log(`Encontrado executável portátil: ${exeFile}`);

    // 2. Tenta remover o executável antigo explicitamente para certificar o overwrite
    if (fs.existsSync(destination)) {
      console.log('Excluindo versão anterior do executável da raiz...');
      try {
        fs.unlinkSync(destination);
      } catch (err) {
        console.error(`AVISO CRÍTICO: Não foi possível excluir a versão anterior em ${destination}.`);
        console.error('Motivo:', err.message);
        console.error('Certifique-se de fechar completamente o aplicativo (inclusive processos em segundo plano no Gerenciador de Tarefas) e tente novamente.');
        process.exit(1);
      }
    }

    console.log(`Copiando novo executável portátil para a raiz...`);
    fs.copyFileSync(source, destination);
    console.log('Sucesso! Executável copiado para:', destination);

    // 3. Exclui a pasta dist/ inteira para deixar apenas o executável na raiz
    console.log('Limpando a pasta dist/ de compilação...');
    try {
      fs.rmSync(distDir, { recursive: true, force: true });
      console.log('Sucesso! Pasta dist/ excluída permanentemente.');
    } catch (err) {
      console.warn('Aviso: Não foi possível remover a pasta dist/ completamente:', err.message);
    }
  } else {
    console.error('Nenhum arquivo executável portátil (.exe) encontrado na pasta dist/.');
    process.exit(1);
  }
} catch (e) {
  console.error('Ocorreu um erro ao copiar o executável:', e.message);
  process.exit(1);
}
