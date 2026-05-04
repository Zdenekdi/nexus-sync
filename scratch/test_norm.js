const normalizeRole = (roleName) => {
    if (!roleName) return '';
    return String(roleName)
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, '_');
};

console.log('Result for "Senior Operator":', normalizeRole('Senior Operator'));
console.log('Result for "SENIOR OPERÁTOR":', normalizeRole('SENIOR OPERÁTOR'));
console.log('Result for "senior operator":', normalizeRole('senior operator'));
