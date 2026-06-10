const { normalizeRole } = require('../src/utils/roleUtils');

describe('Role Utils', () => {
    it('should convert roles to lowercase', () => {
        expect(normalizeRole('ADMIN')).toEqual('admin');
        expect(normalizeRole('Manager')).toEqual('manager');
    });

    it('should remove diacritics', () => {
        expect(normalizeRole('šéf')).toEqual('sef');
        expect(normalizeRole('říďa')).toEqual('rida');
        expect(normalizeRole('SENIOR OPERÁTOR')).toEqual('senior_operator');
    });

    it('should replace spaces with underscores', () => {
        expect(normalizeRole('Super Admin Role')).toEqual('super_admin_role');
        expect(normalizeRole('  spaced   ')).toEqual('spaced');
    });

    it('should handle falsy values gracefully', () => {
        expect(normalizeRole(null)).toEqual('');
        expect(normalizeRole(undefined)).toEqual('');
        expect(normalizeRole('')).toEqual('');
    });

    it('should handle non-string inputs safely', () => {
        expect(normalizeRole(123)).toEqual('123');
    });
});
