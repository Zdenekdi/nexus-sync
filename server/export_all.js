const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const fs = require('fs');
const prisma = new PrismaClient();

const ALGORITHM = 'aes-256-gcm';
const SECRET = process.env.ENCRYPTION_KEY || '6f9b1c7a8e2d4f5a3b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a';

function decrypt(encryptedData) {
    if (!encryptedData) return null;
    try {
        const [saltHex, ivHex, tagHex, encryptedText] = encryptedData.split(':');
        const salt = Buffer.from(saltHex, 'hex');
        const iv = Buffer.from(ivHex, 'hex');
        const tag = Buffer.from(tagHex, 'hex');
        const key = crypto.pbkdf2Sync(SECRET, salt, 100000, 32, 'sha512');
        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
        decipher.setAuthTag(tag);
        let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    } catch (error) { return null; }
}

async function main() {
  console.log('--- GLOBAL SYSTEM EXPORT (ROLES, USERS, AGENCIES) ---');
  
  try {
    // 1. All Agencies
    const agencies = await prisma.agency.findMany();
    console.log(`- Found ${agencies.length} agencies`);

    // 2. All Roles
    const roles = await prisma.role.findMany();
    console.log(`- Found ${roles.length} roles`);

    // 3. All Users with Roles and Agency info
    const users = await prisma.user.findMany({
      include: { role: true, agency: true }
    });
    console.log(`- Found ${users.length} users total`);

    // 4. All Profiles with Credentials
    const profiles = await prisma.profile.findMany({
      include: { agency: true }
    });
    console.log(`- Found ${profiles.length} profiles total`);

    const exportData = {
      agencies: agencies.map(a => ({ id: a.id, name: a.name })),
      roles: roles.map(r => ({ id: r.id, name: r.name, isAppOwner: r.isAppOwner, isManager: r.isManager })),
      users: users.map(u => ({
        email: u.email,
        name: u.name,
        role: u.role?.name || '?',
        agency: u.agency?.name || u.agencyId || 'GLOBAL',
        active: u.active
      })),
      profiles: profiles.map(p => {
        const decryptedStr = decrypt(p.credentials);
        let platformCreds = [];
        if (decryptedStr) {
          try {
            const parsed = JSON.parse(decryptedStr);
            platformCreds = Array.isArray(parsed) ? parsed : Object.entries(parsed).map(([k, v]) => ({ platform: k, ...v }));
          } catch { platformCreds = [{ raw: decryptedStr }]; }
        }
        return {
          id: p.id,
          name: p.name,
          agency: p.agency?.name || p.agencyId,
          credentials: platformCreds
        };
      })
    };

    fs.writeFileSync('global_nexus_export.json', JSON.stringify(exportData, null, 2));

    // CSV format for easy reading
    const csvLines = ['Type,Name/Email,Role/Agency,Details'];
    agencies.forEach(a => csvLines.push(`Agency,"${a.name}","${a.id}","-"`));
    roles.forEach(r => csvLines.push(`Role,"${r.name}","ID: ${r.id}","Owner: ${r.isAppOwner}, Manager: ${r.isManager}"`));
    users.forEach(u => csvLines.push(`User,"${u.email}","${u.role} (${u.agency})","Active: ${u.active}"`));
    profiles.forEach(p => {
      if (p.credentials.length === 0) {
        csvLines.push(`Profile,"${p.name}","${p.agency}","No credentials"`);
      } else {
        p.credentials.forEach(pc => {
          csvLines.push(`Profile,"${p.name}","${p.agency}","Platform: ${pc.platform || pc.site || '?'}, User: ${pc.username || pc.email || ''}"`);
        });
      }
    });

    fs.writeFileSync('global_nexus_export.csv', csvLines.join('\n'));

    console.log('\nSUCCESS!');
    console.log('- JSON: global_nexus_export.json');
    console.log('- CSV: global_nexus_export.csv');

  } catch (err) {
    console.error('\nERROR:', err.message);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
