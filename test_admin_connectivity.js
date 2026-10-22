const fs = require('fs');
const path = require('path');
const assert = require('assert');

const baseDir = 'C:\\Users\\EIheoma\\Desktop\\greach-impact-complete-registration-deploy';

console.log('=== RUNNING ADMIN CONNECTIVITY TEST SUITE ===\n');

const checks = [
  {
    file: 'index.html',
    assertions: [
      { name: 'Header Nav Admin Button', pattern: /<a href="admin\.html"[^>]*>.*?<i class="fas fa-user-shield"><\/i>\s*Admin\s*<\/a>/s },
      { name: 'Footer Admin Console Link', pattern: /<a href="admin\.html"[^>]*>.*?Instructor &amp; Admin Console/s }
    ]
  },
  {
    file: 'training.html',
    assertions: [
      { name: 'Header Nav Admin Button', pattern: /<a href="admin\.html"[^>]*>.*?<i class="fas fa-user-shield"><\/i>\s*Admin\s*<\/a>/s },
      { name: 'Footer Admin Console Link', pattern: /<a href="admin\.html"[^>]*>.*?Instructor &amp; Admin Console/s }
    ]
  },
  {
    file: 'blog.html',
    assertions: [
      { name: 'Header Nav Admin Button', pattern: /<a href="admin\.html"[^>]*>.*?<i class="fas fa-user-shield"><\/i>\s*Admin\s*<\/a>/s },
      { name: 'Footer Admin Console Link', pattern: /<a href="admin\.html"[^>]*>.*?Instructor &amp; Admin Console/s }
    ]
  },
  {
    file: 'portfolio.html',
    assertions: [
      { name: 'Header Nav Admin Button', pattern: /<a href="admin\.html"[^>]*>.*?<i class="fas fa-user-shield"><\/i>\s*Admin\s*<\/a>/s },
      { name: 'Footer Admin Console Link', pattern: /<a href="admin\.html"[^>]*>.*?Instructor &amp; Admin Console/s }
    ]
  },
  {
    file: 'registration.html',
    assertions: [
      { name: 'Header WhatsApp Bar Admin Button', pattern: /<a href="admin\.html"[^>]*>.*?Admin Portal\s*<\/a>/s },
      { name: 'Footer Admin Console Link', pattern: /<a href="admin\.html"[^>]*>.*?Instructor &amp; Admin Console/s }
    ]
  },
  {
    file: 'classroom/index.html',
    assertions: [
      { name: 'Top Nav Admin Console Button', pattern: /<a href="\.\.\/admin\.html" class="nav-btn"[^>]*>.*?Admin Console<\/strong>\s*<\/a>/s },
      { name: 'Modal Tab Admin Link', pattern: /<a href="\.\.\/admin\.html"[^>]*>.*?Open Dedicated Super Admin Console/s }
    ]
  },
  {
    file: 'admin.html',
    assertions: [
      { name: 'Top Bar View Website Link', pattern: /<a href="index\.html"[^>]*class="btn-nav"[^>]*>.*?View Website<\/a>/s },
      { name: 'Top Bar Open Classroom Link', pattern: /<a href="classroom\/index\.html"[^>]*class="btn-nav classroom"[^>]*>.*?Open Classroom<\/a>/s }
    ]
  }
];

let totalPassed = 0;
let totalChecks = 0;

checks.forEach(c => {
  const filePath = path.join(baseDir, c.file);
  console.log(`Checking file: ${c.file}`);
  if (!fs.existsSync(filePath)) {
    console.error(`  FAIL: File does not exist: ${filePath}`);
    return;
  }
  const content = fs.readFileSync(filePath, 'utf8');
  c.assertions.forEach(a => {
    totalChecks++;
    if (a.pattern.test(content)) {
      console.log(`  PASS: ${a.name}`);
      totalPassed++;
    } else {
      console.error(`  FAIL: ${a.name}`);
    }
  });
});

console.log(`\nResults: ${totalPassed}/${totalChecks} assertions passed.`);
if (totalPassed === totalChecks) {
  console.log('\n>>> ALL ADMIN CONNECTIVITY CHECKS PASSED PERFECTLY! <<<');
} else {
  console.error('\n>>> SOME CHECKS FAILED! <<<');
  process.exit(1);
}
