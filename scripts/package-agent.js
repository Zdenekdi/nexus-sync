const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

const AGENT_DIR = path.join(__dirname, '../local-agent');
const DIST_DIR = path.join(AGENT_DIR, 'dist');

async function build() {
    console.log('📦 Zahajuji balení Nexus Local Agenta...');

    // 1. Vyčištění dist složky
    if (fs.existsSync(DIST_DIR)) {
        fs.rmSync(DIST_DIR, { recursive: true });
    }
    fs.mkdirSync(DIST_DIR);

    // 2. Instalace závislostí v agentovi
    console.log('  -> Instaluji závislosti...');
    execSync('npm install', { cwd: AGENT_DIR, stdio: 'inherit' });

    // 3. Sestavení binárek pomocí pkg
    console.log('  -> Kompiluji binárky pro Win/Mac/Linux...');
    execSync('npm run build', { cwd: AGENT_DIR, stdio: 'inherit' });

    // 4. Vytvoření ZIP balíčků pro každou platformu
    const files = fs.readdirSync(DIST_DIR);
    
    for (const file of files) {
        if (file.endsWith('.zip')) continue;

        const platform = file.includes('win') ? 'windows' : (file.includes('macos') ? 'macos' : 'linux');
        const zipName = `nexus-agent-${platform}.zip`;
        const output = fs.createWriteStream(path.join(DIST_DIR, zipName));
        const archive = archiver('zip', { zlib: { level: 9 } });

        console.log(`  -> Vytvářím balíček: ${zipName}`);

        archive.pipe(output);
        
        // Přidáme spustitelný soubor
        archive.file(path.join(DIST_DIR, file), { name: platform === 'windows' ? 'nexus-agent.exe' : 'nexus-agent' });
        
        // Přidáme pomocné soubory
        archive.file(path.join(AGENT_DIR, '.env.example'), { name: '.env.example' });
        
        // Přidáme README
        const readmeContent = `
# Nexus Local Agent - Instalační příručka

1. Rozbalte tento archiv do složky.
2. Přejmenujte soubor ".env.example" na ".env".
3. Otevřete ".env" v textovém editoru a vložte svůj RELAY_TOKEN z webového dashboardu.
4. Ujistěte se, že máte spuštěný AdsPower.
5. Spusťte soubor "${platform === 'windows' ? 'nexus-agent.exe' : 'nexus-agent'}".

Více informací naleznete v manuálu v administraci Nexus Hub.
        `;
        archive.append(readmeContent, { name: 'README.txt' });

        await archive.finalize();
    }

    console.log('\n✅ Hotovo! Balíčky najdete ve složce local-agent/dist/');
}

build().catch(err => {
    console.error('❌ Chyba při balení:', err);
});
