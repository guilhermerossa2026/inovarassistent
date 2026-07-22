const fs = require('fs');
const path = require('path');

const targetName = 'Inovar Assistente.exe';
const sourceTauriApp = path.join(__dirname, '..', 'src-tauri', 'target', 'release', 'tauri-app.exe');
const sourceProduct = path.join(__dirname, '..', 'src-tauri', 'target', 'release', 'Inovar Assistente.exe');
const destination = path.join(__dirname, '..', targetName);

console.log('\n=====================================================================');
console.log('AUTOMAÇÃO PÓS-COMPILAÇÃO TAURI');
console.log('=====================================================================');

try {
  let source = '';
  if (fs.existsSync(sourceTauriApp)) {
    source = sourceTauriApp;
  } else if (fs.existsSync(sourceProduct)) {
    source = sourceProduct;
  }

  if (source) {
    console.log(`Localizado executável compilado: ${source}`);
    console.log(`Copiando para a raiz como: ${destination}...`);
    fs.copyFileSync(source, destination);
    console.log('Sucesso! Executável portátil na raiz do workspace foi atualizado.');
  } else {
    console.error(`Erro: Nenhum executável compilado encontrado em:`);
    console.error(`  - ${sourceTauriApp}`);
    console.error(`  - ${sourceProduct}`);
  }
} catch (e) {
  console.error('Erro ao copiar o executável:', e.message);
}
console.log('=====================================================================\n');
