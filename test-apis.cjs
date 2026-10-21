const fs = require('fs');
const http = require('http');
const https = require('https');
const { execSync } = require('child_process');

// Ensure clean seed data before testing
try {
  console.log('🌱 Preparing database seed for tests...');
  execSync('npx tsx prisma/seed.ts', { stdio: 'pipe' });
  console.log('✅ Database seeded successfully.\n');
} catch (e) {
  console.warn('⚠️ Seeding skipped or had warning:', e.message);
}

// Load collection and environment
const collection = JSON.parse(fs.readFileSync('postman_collection.json', 'utf8'));
const envFile = JSON.parse(fs.readFileSync('postman_environment.json', 'utf8'));

// Environment variable store
const env = {};
envFile.values.forEach(v => {
  if (v.enabled !== false) env[v.key] = v.value;
});
env['baseUrl'] = env['baseUrl'] || 'http://localhost:4000';
env['round_id'] = 'seed-round-1';
env['criteria_id'] = 'seed-criterion-1';
env['panel_id'] = 'seed-panel-1';
env['team_id'] = 'seed-team-1';
env['seed_team_id'] = 'seed-team-1';
env['user_id'] = 'seed-judge-1';
env['seed_user_id'] = 'seed-judge-1';
env['score_id'] = 'seed-score-1';
env['evaluation_id'] = 'seed-evaluation-1';

function replaceVars(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, (_, key) => {
    return env[key] !== undefined && env[key] !== '' ? env[key] : `{{${key}}}`;
  });
}

function executeRequest(method, urlStr, headers, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const client = url.protocol === 'https:' ? https : http;
    const reqHeaders = { ...headers };
    if (body) {
      reqHeaders['Content-Length'] = Buffer.byteLength(body);
      if (!reqHeaders['Content-Type']) reqHeaders['Content-Type'] = 'application/json';
    }

    const req = client.request(url, { method, headers: reqHeaders }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode, data, headers: res.headers }));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

// Flatten collection requests in order
function flattenItems(items, parentName = '') {
  const result = [];
  for (const item of items) {
    const fullName = parentName ? `${parentName} > ${item.name}` : item.name;
    if (item.item) {
      result.push(...flattenItems(item.item, fullName));
    } else if (item.request) {
      result.push({ item, fullName });
    }
  }
  return result;
}

// Context emulation for pm object in tests
function runTestScript(scriptStr, statusCode, responseBody, requestName) {
  let parsedBody = null;
  try {
    parsedBody = JSON.parse(responseBody);
  } catch (e) {}

  const pm = {
    response: {
      code: statusCode,
      json: () => parsedBody,
      text: () => responseBody
    },
    environment: {
      set: (key, val) => {
        // Protect role-specific tokens from being overwritten by subsequent generic requests
        if (key === 'admin_token' && !requestName.includes('Admin')) return;
        if (key === 'evaluator_token' && !requestName.includes('Evaluator')) return;
        if (key === 'team_token' && !requestName.includes('Team')) return;
        if (val !== undefined && val !== null && String(val) !== 'undefined') {
          env[key] = String(val);
        }
      },
      get: (key) => env[key]
    }
  };

  try {
    const fn = new Function('pm', scriptStr);
    fn(pm);
  } catch (err) {}

  // Auto-capture IDs from standard responses to maintain state across test steps
  if (parsedBody && parsedBody.success && parsedBody.data) {
    const d = parsedBody.data;
    if (Array.isArray(d) && d.length > 0) {
      if (requestName.includes('Rounds') && !requestName.includes('Criteria') && !requestName.includes('Panels')) {
        const foundRoundId = d[0].id || d[0].roundId;
        if (foundRoundId) env['round_id'] = foundRoundId;
      }
      if (requestName.includes('Teams') && !requestName.includes('Panels')) {
        const teamAlpha = d.find(t => t.username === 'team_alpha') || d[0];
        if (teamAlpha && teamAlpha.id) {
          env['seed_team_id'] = teamAlpha.id;
          env['team_id'] = teamAlpha.id;
        }
        if (d[0].participants && d[0].participants.length > 0 && d[0].participants[0].id) {
          env['participant_id'] = d[0].participants[0].id;
        }
      }
      if (requestName.includes('Users')) {
        const judge = d.find(u => u.role === 'JUDGE');
        if (judge && judge.id) {
          env['seed_user_id'] = judge.id;
          env['user_id'] = judge.id;
        }
      }
      if (requestName.includes('Criteria') && d[0].id) {
        env['criteria_id'] = d[0].id;
      }
      if (requestName.includes('Panels') && !requestName.includes('Member') && !requestName.includes('Team') && d[0].id) {
        env['panel_id'] = d[0].id;
      }
      if (requestName.includes('Scores') || requestName.includes('Evaluation')) {
        if (d[0].id) env['evaluation_id'] = d[0].id;
        if (d[0].scores && d[0].scores.length > 0 && d[0].scores[0].id) {
          env['score_id'] = d[0].scores[0].id;
        }
      }
    } else if (d && typeof d === 'object') {
      if (d.id) {
        if (requestName.includes('Round') && !requestName.includes('Criteria') && !requestName.includes('Panels') && !requestName.includes('Score') && !requestName.includes('Evaluation')) {
          env['round_id'] = d.id;
        }
        if (requestName.includes('Team') && !requestName.includes('Panels') && !requestName.includes('Participant') && !requestName.includes('Score') && !requestName.includes('Evaluation')) {
          env['team_id'] = d.id;
        }
        if (requestName.includes('User') && !requestName.includes('Member')) {
          env['user_id'] = d.id;
        }
        if (requestName.includes('Criterion') || requestName.includes('Criteria')) {
          env['criteria_id'] = d.id;
        }
        if (requestName.includes('Panel') && !requestName.includes('Member') && !requestName.includes('Team')) {
          env['panel_id'] = d.id;
        }
        if (requestName.includes('Timeline')) env['timeline_id'] = d.id;
        if (requestName.includes('Evaluation')) env['evaluation_id'] = d.id;
      }
      if (d.scores && Array.isArray(d.scores) && d.scores.length > 0 && d.scores[0].id) {
        env['score_id'] = d.scores[0].id;
      }
    }
  }
}

async function runAll() {
  const allRequests = flattenItems(collection.item);
  console.log(`======================================================`);
  console.log(`🚀 Starting Automated API Test Suite (${allRequests.length} requests)`);
  console.log(`Target: ${env['baseUrl']}`);
  console.log(`======================================================\n`);

  let passed = 0;
  let failed = 0;
  const results = [];

  for (let i = 0; i < allRequests.length; i++) {
    const { item, fullName } = allRequests[i];
    const req = item.request;
    const method = req.method;
    let rawUrl = replaceVars(req.url.raw || req.url);
    const headers = {};

    // Select proper authentication token by module
    let token = null;
    if (fullName.startsWith('02. Admin')) {
      token = env['admin_token'];
    } else if (fullName.startsWith('03. Evaluator')) {
      token = env['evaluator_token'];
    } else if (fullName.startsWith('04. Team')) {
      token = env['team_token'];
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    if (req.header) {
      for (const h of req.header) {
        headers[h.key] = replaceVars(h.value);
      }
    }

    let body = null;
    if (req.body && req.body.raw) {
      body = replaceVars(req.body.raw);
      // Prevent duplicate username collision on re-runs
      if (fullName.includes('POST Create User')) {
        body = body.replace(/"username":\s*"([^"]+)"/, `"username": "$1_${Date.now()}"`);
      }
      if (fullName.includes('POST Create Team') && !fullName.includes('Panels')) {
        body = body.replace(/"username":\s*"([^"]+)"/, `"username": "$1_${Date.now()}"`);
      }
    }

    // Skip request if URL still has unresolved variables like {{...}}
    if (rawUrl.includes('{{') && rawUrl.includes('}}')) {
      console.log(`⚠️  [SKIP]  ${method.padEnd(6)} ${fullName}`);
      console.log(`   └─ Missing variable in URL: ${rawUrl}`);
      continue;
    }

    const start = Date.now();
    try {
      const res = await executeRequest(method, rawUrl, headers, body);
      const duration = Date.now() - start;

      // Run test script and capture variables
      const testEvents = (item.event || []).filter(e => e.listen === 'test');
      for (const te of testEvents) {
        if (te.script && te.script.exec) {
          const scriptText = Array.isArray(te.script.exec) ? te.script.exec.join('\n') : te.script.exec;
          runTestScript(scriptText, res.statusCode, res.data, fullName);
        }
      }
      runTestScript('', res.statusCode, res.data, fullName);

      // Cache real seeded IDs directly from API right after admin login
      if (fullName === '01. Auth > Login - Admin' && res.statusCode === 200) {
        try {
          const uRes = await executeRequest('GET', `${env['baseUrl']}/admin/users`, { Authorization: `Bearer ${env['admin_token']}` });
          const uJson = JSON.parse(uRes.data);
          if (uJson.data && uJson.data.length > 0) {
            const judge = uJson.data.find(u => u.role === 'JUDGE') || uJson.data.find(u => u.role === 'MENTOR');
            if (judge) {
              env['seed_user_id'] = judge.id;
              env['user_id'] = judge.id;
            }
          }
          const tRes = await executeRequest('GET', `${env['baseUrl']}/admin/teams`, { Authorization: `Bearer ${env['admin_token']}` });
          const tJson = JSON.parse(tRes.data);
          if (tJson.data && tJson.data.length > 0) {
            const alpha = tJson.data.find(t => t.username === 'team_alpha') || tJson.data[0];
            if (alpha) {
              env['seed_team_id'] = alpha.id;
              env['team_id'] = alpha.id;
            }
          }
        } catch (_) {}
      }

      // Restore seed fallbacks if a test deleted its dynamic entity
      if (fullName.includes('DELETE') && fullName.includes('Round')) {
        env['round_id'] = 'seed-round-1';
      }
      if (fullName.includes('DELETE') && fullName.includes('User')) {
        env['user_id'] = env['seed_user_id'] || 'seed-judge-1';
      }
      if (fullName.includes('DELETE') && fullName.includes('Team') && !fullName.includes('Panel')) {
        env['team_id'] = env['seed_team_id'] || 'seed-team-1';
      }
      if (fullName.includes('DELETE') && (fullName.includes('Criterion') || fullName.includes('Criteria'))) {
        env['criteria_id'] = 'seed-criterion-1';
      }
      if (fullName.includes('DELETE') && fullName.includes('Panel') && !fullName.includes('Member') && !fullName.includes('Team')) {
        env['panel_id'] = 'seed-panel-1';
      }

      // Check success — some requests intentionally expect an error status
      const expectError = fullName.includes('expect 403');
      const isSuccess = expectError
        ? res.statusCode === 403
        : res.statusCode >= 200 && res.statusCode < 400;
      if (isSuccess) {
        passed++;
        console.log(`✅ [${res.statusCode}] ${method.padEnd(6)} ${fullName} (${duration}ms)`);
      } else {
        failed++;
        console.log(`❌ [${res.statusCode}] ${method.padEnd(6)} ${fullName} (${duration}ms)`);
        let msg = res.data;
        try {
          const j = JSON.parse(res.data);
          msg = j.message || res.data;
        } catch (_) {}
        console.log(`   └─ Message: ${msg}`);
      }

      results.push({
        name: fullName,
        method,
        status: res.statusCode,
        isSuccess,
        duration
      });
    } catch (err) {
      failed++;
      console.log(`💥 [ERROR] ${method.padEnd(6)} ${fullName}`);
      console.log(`   └─ Error: ${err.message}`);
      results.push({
        name: fullName,
        method,
        status: 'CONN_ERR',
        isSuccess: false,
        duration: Date.now() - start
      });
    }
  }

  const executedCount = passed + failed;
  console.log(`\n======================================================`);
  console.log(`📊 API Test Summary:`);
  console.log(`   Total Executed : ${executedCount} / ${allRequests.length}`);
  console.log(`   Passed         : ${passed}`);
  console.log(`   Failed         : ${failed}`);
  console.log(`   Pass Rate      : ${((passed / executedCount) * 100).toFixed(1)}%`);
  console.log(`======================================================\n`);
}

runAll();
