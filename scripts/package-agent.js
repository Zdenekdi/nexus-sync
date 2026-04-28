const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const AGENT_DIR = path.join(__dirname, '../local-agent');
const DIST_DIR = path.join(AGENT_DIR, 'dist');

async function build() {
    console.log('📦 Zahajuji balení Nexus Local Agenta...');

    // 1. Vyčištění dist složky
    if (fs.existsSync(DIST_DIR)) {
        fs.rmSync(DIST_DIR, { recursive: true });
    }
    fs.mkdirSync(DIST_DIR, { recursive: true });

    // 2. Instalace závislostí v agentovi (lokálně)
    console.log('  -> Instaluji závislosti v local-agent...');
    try {
        execSync('npm install', { cwd: AGENT_DIR, stdio: 'inherit' });
    } catch (e) {
        console.warn('  ! Varování: npm install selhal, zkusím pokračovat s existujícími node_modules.');
    }

    // 3. Sestavení binárek pomocí pkg
    console.log('  -> Kompiluji binárky pro Win/Mac/Linux...');
    execSync('npm run build', { cwd: AGENT_DIR, stdio: 'inherit' });

    // 4. Vytvoření ZIP balíčků pomocí nativního zip příkazu
    const files = fs.readdirSync(DIST_DIR);
    
    for (const file of files) {
        if (file.endsWith('.zip')) continue;

        const isWin = file.includes('win');
        const isMac = file.includes('macos');
        const platform = isWin ? 'windows' : (isMac ? 'macos' : 'linux');
        const zipName = `nexus-agent-${platform}.zip`;
        
        console.log(`  -> Balím: ${zipName}`);

        const tempZipDir = path.join(DIST_DIR, `temp_${platform}`);
        if (fs.existsSync(tempZipDir)) fs.rmSync(tempZipDir, { recursive: true });
        fs.mkdirSync(tempZipDir);

        // Kopírování souborů do temp složky
        const execName = isWin ? 'nexus-agent.exe' : 'nexus-agent';
        fs.copyFileSync(path.join(DIST_DIR, file), path.join(tempZipDir, execName));
        fs.copyFileSync(path.join(AGENT_DIR, '.env.example'), path.join(tempZipDir, '.env.example'));

        const readmeContent = `
# Nexus Local Agent - Instalační příručka

1. Rozbalte tento archiv do složky.
2. Přejmenujte soubor ".env.example" na ".env".
3. Otevřete ".env" v textovém editoru a vložte svůj RELAY_TOKEN z webového dashboardu.
4. Ujistěte se, že máte spuštěný AdsPower.
5. Spusťte soubor "${execName}".

Více informací naleznete v manuálu v administraci Nexus Hub.
        `;
        fs.writeFileSync(path.join(tempZipDir, 'README.txt'), readmeContent);

        // Použití systému k zazipování
        try {
            execSync(`zip -r ../${zipName} .`, { cwd: tempZipDir, stdio: 'inherit' });
            console.log(`  ✅ Balíček ${zipName} vytvořen.`);
        } catch (e) {
            console.error(`  ❌ Chyba při zipování ${platform}: ${e.message}`);
        }

        // Úklid temp složky
        fs.rmSync(tempZipDir, { recursive: true });
    }

    console.log('\n✅ Hotovo! Balíčky najdete ve složce local-agent/dist/');
}

build().catch(err => {
    console.error('❌ Kritická chyba při balení:', err);
});
