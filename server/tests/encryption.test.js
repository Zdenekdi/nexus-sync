const { encrypt, decrypt } = require('../src/utils/encryption');

describe('Encryption Utils', () => {
    it('should encrypt and decrypt a valid string', async () => {
        const text = 'hello secret world';
        const encrypted = await encrypt(text);
        expect(encrypted).toBeDefined();
        expect(encrypted).not.toEqual(text);

        const decrypted = await decrypt(encrypted);
        expect(decrypted).toEqual(text);
    });

    it('should handle null or empty inputs gracefully', async () => {
        expect(await encrypt(null)).toBeNull();
        expect(await decrypt(null)).toBeNull();
        expect(await encrypt('')).toBeNull();
        expect(await decrypt('')).toBeNull();
    });

    it('should return null when decrypting invalid format', async () => {
        const invalidData = 'invalid:format:data';
        const decrypted = await decrypt(invalidData);
        expect(decrypted).toBeNull();
    });
});
