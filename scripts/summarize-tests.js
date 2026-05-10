const fs = require('fs');
const { execSync } = require('child_process');

console.log('🚀 Running E2E tests...');
try {
  execSync('npx playwright test tests/safety_guard.spec.js tests/inventory_ops.spec.js tests/operator_chat.spec.js tests/profile_management.spec.js --reporter=json > test-results.json', { stdio: 'pipe' });
} catch (e) {
  // Playwright returns non-zero exit code if tests fail, which is expected.
}

const results = JSON.parse(fs.readFileSync('test-results.json', 'utf8'));

const summary = {
  total: results.config.projects.length * results.suites.length, // Rough estimate
  passed: 0,
  failed: 0,
  skipped: 0,
  details: []
};

function processSuite(suite) {
  if (suite.specs) {
    suite.specs.forEach(spec => {
      spec.tests.forEach(test => {
        const status = test.status || (test.results[0]?.status);
        if (status === 'expected' || status === 'passed') summary.passed++;
        else if (status === 'skipped') summary.skipped++;
        else {
          summary.failed++;
          summary.details.push({
            name: spec.title,
            file: suite.file,
            error: test.results[0]?.error?.message || 'Unknown error'
          });
        }
      });
    });
  }
  if (suite.suites) {
    suite.suites.forEach(processSuite);
  }
}

results.suites.forEach(processSuite);

console.log('\n📊 TEST RESULT SUMMARY');
console.log('━━━━━━━━━━━━━━━━━━━━━');
console.log(`✅ Passed:  ${summary.passed}`);
console.log(`❌ Failed:  ${summary.failed}`);
console.log(`⏭️  Skipped: ${summary.skipped}`);
console.log('━━━━━━━━━━━━━━━━━━━━━\n');

if (summary.failed > 0) {
  console.log('❌ FAILURES:');
  summary.details.forEach((d, i) => {
    console.log(`${i+1}. [${d.file}] ${d.name}`);
    console.log(`   Error: ${d.error.split('\n')[0]}`);
  });
}
