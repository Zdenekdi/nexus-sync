const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const fs = require('fs');
const prisma = new PrismaClient();

// Encryption settings from server/src/utils/encryption.js
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
    } catch (error) {
        return null;
    }
}

async function main() {
  console.log('--- EXPORTING DATA FOR AGENCY-01 ---');
  
  try {
    // 1. Export Profiles
    const profiles = await prisma.profile.findMany({
      where: { agencyId: 'agency-01' },
      select: {
        id: true,
        name: true,
        credentials: true
      }
    });

    const exportData = {
      profiles: [],
      users: []
    };

    const csvLines = ['Type,Name/Email,Role/HubEmail,Platform,Username,Password,Details'];

    for (const profile of profiles) {
      const decryptedStr = decrypt(profile.credentials);
      let platformCreds = [];
      
      if (decryptedStr) {
        try { 
          const parsed = JSON.parse(decryptedStr);
          if (Array.isArray(parsed)) {
            platformCreds = parsed;
          } else if (typeof parsed === 'object') {
            platformCreds = Object.entries(parsed).map(([key, val]) => ({ platform: key, ...val }));
          }
        } catch (e) {}
      }

      const firstName = profile.name.split(' ')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
      const hubEmail = `${firstName}@nexus.sync`;
      const hubPassword = 'password123';

      exportData.profiles.push({
        name: profile.name,
        hubEmail,
        hubPassword,
        platforms: platformCreds
      });

      if (platformCreds.length === 0) {
        csvLines.push(`Profile,"${profile.name}","${hubEmail}","N/A","N/A","N/A","N/A"`);
      } else {
        platformCreds.forEach(pc => {
          csvLines.push(`Profile,"${profile.name}","${hubEmail}","${pc.platform || pc.site || '?' }","${pc.username || pc.email || ''}","${pc.password || ''}","${pc.proxy || ''}"`);
        });
      }
    }

    // 2. Export Users (Admins, Managers, Operators)
    const users = await prisma.user.findMany({
      where: { agencyId: 'agency-01' },
      include: { role: true }
    });

    console.log(`- Found ${users.length} users for agency-01`);

    for (const user of users) {
      exportData.users.push({
        email: user.email,
        name: user.name,
        role: user.role?.name || 'User',
        active: user.active
      });
      csvLines.push(`User,"${user.email}","${user.role?.name || 'User'}","N/A","N/A","N/A","Active: ${user.active}"`);
    }

    fs.writeFileSync('agency_01_full_export.json', JSON.stringify(exportData, null, 2));
    fs.writeFileSync('agency_01_full_export.csv', csvLines.join('\n'));

    console.log('\nSUCCESS!');
    console.log('- Saved JSON to: agency_01_full_export.json');
    console.log('- Saved CSV to: agency_01_full_export.csv');
    console.log(`- Total profiles: ${profiles.length}`);
    console.log(`- Total users: ${users.length}`);

  } catch (err) {
    console.error('\nERROR EXPORTING DATA:');
    console.error(err.message);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
