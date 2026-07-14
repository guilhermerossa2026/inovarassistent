const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, '..', 'dist');
const destination = path.join(__dirname, '..', 'Inovar Assist.exe');

console.log('--- Automação Pós-Compilação de Executável ---');

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
    console.log(`Copiando para o diretório raiz como: Inovar Assist.exe...`);
    
    fs.copyFileSync(source, destination);
    console.log('Sucesso! Executável copiado para:', destination);
  } else {
    console.error('Nenhum arquivo executável portátil (.exe) encontrado na pasta dist/.');
    process.exit(1);
  }
} catch (e) {
  console.error('Ocorreu um erro ao copiar o executável:', e.message);
  process.exit(1);
}
