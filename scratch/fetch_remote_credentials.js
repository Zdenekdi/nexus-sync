const axios = require('axios');
const crypto = require('crypto');
const fs = require('fs');

const API_BASE = 'http://78.141.202.139/api';
// Fallback secret from server/src/utils/encryption.js
const SECRET = '6f9b1c7a8e2d4f5a3b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;

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
    try {
        console.log('Logging in as App Owner...');
        const loginRes = await axios.post(`${API_BASE}/auth/login`, {
            email: 'owner@nexus.sync',
            password: 'Nexus2024!'
        });

        const token = loginRes.data.token;
        console.log('Login successful. Fetching profiles...');

        const profilesRes = await axios.get(`${API_BASE}/profiles`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        const allProfiles = profilesRes.data;
        // Filter for agency-01
        const agency01Profiles = allProfiles.filter(p => p.agencyId === 'agency-01');

        console.log(`Found ${agency01Profiles.length} profiles for agency-01.`);

        const results = agency01Profiles.map(p => {
            const decryptedStr = decrypt(p.credentials);
            let platformCredentials = null;
            if (decryptedStr) {
                try { platformCredentials = JSON.parse(decryptedStr); } catch (e) {}
            }

            const firstName = p.name.split(' ')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
            const hubEmail = `${firstName}@nexus.sync`;

            return {
                profileName: p.name,
                hubLogin: {
                    email: hubEmail,
                    password: 'password123 (default)'
                },
                platformCredentials: platformCredentials || 'No credentials stored'
            };
        });

        const outputFilename = 'agency_01_credentials_report.json';
        fs.writeFileSync(outputFilename, JSON.stringify(results, null, 2));
        console.log(`Report saved to ${outputFilename}`);

    } catch (error) {
        console.error('Error:', error.response ? error.response.data : error.message);
    }
}

main();
