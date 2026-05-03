/**
 * Normalizes role name for language-agnostic comparison.
 * Removes diacritics, lowercase, and replaces spaces with underscores.
 * Example: 'SENIOR OPERÁTOR' -> 'senior_operator'
 */
const normalizeRole = (roleName) => {
    if (!roleName) return '';
    return String(roleName)
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, '_');
};

module.exports = {
    normalizeRole
};
