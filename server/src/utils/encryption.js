const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // Standard pro GCM
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;

// V produkci musí být ENCRYPTION_KEY v .env!
// Pro vývoj použijeme fallback, ale v .env by mělo být 32 bajtů v hexu.
const SECRET = process.env.ENCRYPTION_KEY || '6f9b1c7a8e2d4f5a3b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a';

function encrypt(text) {
    if (!text) return null;
    
    const iv = crypto.randomBytes(IV_LENGTH);
    const salt = crypto.randomBytes(SALT_LENGTH);
    
    // Odvození klíče pomocí PBKDF2 pro vyšší bezpečnost
    const key = crypto.pbkdf2Sync(SECRET, salt, 100000, 32, 'sha512');
    
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const tag = cipher.getAuthTag();
    
    // Výsledek obsahuje sůl, iv, tag a samotná data pro pozdější dešifrování
    return `${salt.toString('hex')}:${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
}

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
        console.error('Decryption failed:', error);
        return null;
    }
}

module.exports = {
    encrypt,
    decrypt
};
