/**
 * Smí tenhle uživatel hodnotit komunikaci kolegů?
 *
 * Zrcadlí isManagerRole ze server/src/utils/authz.js. Server to hlídá tak jako
 * tak (POST i GET /api/qa/reviews vrací 403), ale UI nemá nabízet akci, která
 * skončí chybou — a hlavně nemá naznačovat, že se hodnocení někam zapsalo.
 *
 * Pozor, Senior Operator se sem počítá. Není to překlep: server to tak má
 * v isManagerRole a stejně to funguje i jinde v aplikaci. Kdyby se to mělo
 * změnit, musí se to změnit na obou stranách naráz.
 */
const MANAGER_ROLE_NAMES = new Set([
  'agency admin', 'admin', 'manager', 'senior manager', 'senior operator', 'app owner'
]);

export function canReviewCommunication(activeOperator) {
  if (!activeOperator) return false;
  if (activeOperator.isAppOwner || activeOperator.isAdmin || activeOperator.isManager) return true;
  if (activeOperator.isSeniorOperator) return true;
  const name = String(activeOperator.role || '').toLowerCase().replace(/_/g, ' ').trim();
  return MANAGER_ROLE_NAMES.has(name);
}
