const cp = require('child_process');
const fs = require('fs');
const path = require('path');

const targetDir = 'C:\\Users\\EIheoma\\Desktop\\greach-impact-complete-registration-deploy';

function run(cmd) {
  console.log(`\n> ${cmd}`);
  try {
    const out = cp.execSync(cmd, { cwd: targetDir, encoding: 'utf8' });
    if (out.trim()) console.log(out.trim());
    return { success: true, output: out };
  } catch (err) {
    console.error(`ERROR running "${cmd}":`, err.message);
    if (err.stdout) console.log('STDOUT:', err.stdout.toString());
    if (err.stderr) console.log('STDERR:', err.stderr.toString());
    return { success: false, error: err };
  }
}

// 1. Remove helper script if exists
const prepScript = path.join(targetDir, 'prepare_git_deploy.js');
if (fs.existsSync(prepScript)) {
  fs.unlinkSync(prepScript);
  console.log('Removed prepare_git_deploy.js');
}

// 2. Refine vercel.json
const vercelJsonPath = path.join(targetDir, 'vercel.json');
const vercelConfig = {
  "version": 2,
  "cleanUrls": true,
  "trailingSlash": false
};
fs.writeFileSync(vercelJsonPath, JSON.stringify(vercelConfig, null, 2), 'utf8');
console.log('Updated vercel.json with cleanUrls: true');

// 3. Git user configuration
run('git config user.name "Emmanuel Iheomamere"');
run('git config user.email "eiheomamere@gmail.com"');

// 4. Git add all changes
run('git add -A');

// 5. Git status
const statusRes = run('git status --short');

// 6. Git commit
const commitMsg = "Deploy update: Admin portal direct connectivity, security suite, dynamic pricing, and classroom integration";
run(`git commit -m "${commitMsg}"`);

// 7. Git push to origin main
console.log('\n--- Pushing to GitHub (origin main) to trigger Vercel deployment ---');
const pushRes = run('git push -u origin main');

if (pushRes.success) {
  console.log('\n======================================================');
  console.log('🎉 PUSH SUCCESSFUL! VERCEL DEPLOYMENT TRIGGERED!');
  console.log('Website: https://greachimpact.vercel.app');
  console.log('======================================================');
} else {
  console.log('\nPush encountered an issue. See log details above.');
}
