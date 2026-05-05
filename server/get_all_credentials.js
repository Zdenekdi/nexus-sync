const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const fs = require('fs');
const prisma = new PrismaClient();

// Encryption settings from server/src/utils/encryption.js
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
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
  console.log('Fetching credentials for agency-01...');
  
  const profiles = await prisma.profile.findMany({
    where: { agencyId: 'agency-01' },
    select: {
      id: true,
      name: true,
      credentials: true
    }
  });

  const results = [];

  for (const profile of profiles) {
    const decryptedStr = decrypt(profile.credentials);
    let platformCredentials = null;
    if (decryptedStr) {
      try { platformCredentials = JSON.parse(decryptedStr); } catch (e) {}
    }

    // Attempt to find the Hub User account for this profile
    // Logic from create_model_accounts.js: name -> first part -> lowercase
    const firstName = profile.name.split(' ')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
    const hubEmail = `${firstName}@nexus.sync`;
    
    results.push({
      profileId: profile.id,
      profileName: profile.name,
      hubLogin: {
        email: hubEmail,
        password: 'password123 (default)'
      },
      platformCredentials: platformCredentials || 'No credentials stored'
    });
  }

  const outputFilename = 'all_credentials_agency_01.json';
  fs.writeFileSync(outputFilename, JSON.stringify(results, null, 2));
  console.log(`Successfully saved credentials for ${results.length} profiles to ${outputFilename}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
