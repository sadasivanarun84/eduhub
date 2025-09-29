#!/usr/bin/env node

/**
 * EduHub Test Suite
 * Basic functional tests to verify EduHub platform is working correctly
 */

const http = require('http');
const { execSync } = require('child_process');

const BASE_URL = 'http://localhost:3000';
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function makeRequest(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: 'GET',
      timeout: 5000
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

async function testServerAvailability() {
  log('\n🔍 Testing Server Availability...', colors.blue);

  try {
    const response = await makeRequest('/');
    if (response.statusCode === 200) {
      log('✅ EduHub server is running and accessible', colors.green);
      return true;
    } else {
      log(`❌ Server returned status code: ${response.statusCode}`, colors.red);
      return false;
    }
  } catch (error) {
    log(`❌ Failed to connect to server: ${error.message}`, colors.red);
    return false;
  }
}

async function testHomePageContent() {
  log('\n🏠 Testing Home Page Content...', colors.blue);

  try {
    const response = await makeRequest('/');
    const body = response.body;

    const checks = [
      { name: 'EduHub title', pattern: /EduHub|📚 EduHub/i, found: false },
      { name: 'Knowledge Quiz', pattern: /Knowledge Quiz|🧠.*Knowledge Quiz/i, found: false },
      { name: 'React root element', pattern: /<div id="root">/, found: false },
      { name: 'Vite client script', pattern: /@vite\/client/, found: false }
    ];

    checks.forEach(check => {
      check.found = check.pattern.test(body);
      if (check.found) {
        log(`  ✅ ${check.name} found`, colors.green);
      } else {
        log(`  ❌ ${check.name} not found`, colors.red);
      }
    });

    const allPassed = checks.every(check => check.found);
    if (allPassed) {
      log('✅ All home page content checks passed', colors.green);
    } else {
      log('❌ Some home page content checks failed', colors.red);
    }

    return allPassed;
  } catch (error) {
    log(`❌ Failed to test home page content: ${error.message}`, colors.red);
    return false;
  }
}

async function testPopQuizRoute() {
  log('\n🧠 Testing Pop Quiz Route...', colors.blue);

  try {
    const response = await makeRequest('/popquiz');
    if (response.statusCode === 200) {
      log('✅ Pop Quiz route is accessible', colors.green);
      return true;
    } else {
      log(`❌ Pop Quiz route returned status code: ${response.statusCode}`, colors.red);
      return false;
    }
  } catch (error) {
    log(`❌ Failed to access Pop Quiz route: ${error.message}`, colors.red);
    return false;
  }
}

async function testViteDevServer() {
  log('\n⚡ Testing Vite Development Setup...', colors.blue);

  try {
    const response = await makeRequest('/');
    const isViteRunning = response.body.includes('@vite/client') &&
                         response.body.includes('RefreshRuntime');

    if (isViteRunning) {
      log('✅ Vite development server is properly integrated', colors.green);
      return true;
    } else {
      log('❌ Vite development server integration not detected', colors.red);
      return false;
    }
  } catch (error) {
    log(`❌ Failed to test Vite setup: ${error.message}`, colors.red);
    return false;
  }
}

async function runAllTests() {
  log('🧪 Starting EduHub Test Suite...', colors.yellow);
  log('================================================', colors.yellow);

  const tests = [
    { name: 'Server Availability', fn: testServerAvailability },
    { name: 'Home Page Content', fn: testHomePageContent },
    { name: 'Pop Quiz Route', fn: testPopQuizRoute },
    { name: 'Vite Dev Server', fn: testViteDevServer }
  ];

  const results = [];

  for (const test of tests) {
    try {
      const result = await test.fn();
      results.push({ name: test.name, passed: result });
    } catch (error) {
      log(`❌ Test "${test.name}" threw an error: ${error.message}`, colors.red);
      results.push({ name: test.name, passed: false });
    }
  }

  log('\n📊 Test Results Summary:', colors.yellow);
  log('================================================', colors.yellow);

  results.forEach(result => {
    const status = result.passed ? '✅ PASS' : '❌ FAIL';
    const color = result.passed ? colors.green : colors.red;
    log(`${status} ${result.name}`, color);
  });

  const passedCount = results.filter(r => r.passed).length;
  const totalCount = results.length;

  log(`\n📈 Overall: ${passedCount}/${totalCount} tests passed`,
      passedCount === totalCount ? colors.green : colors.red);

  if (passedCount === totalCount) {
    log('🎉 All tests passed! EduHub is working correctly.', colors.green);
    return true;
  } else {
    log('⚠️  Some tests failed. Please check the issues above.', colors.yellow);
    return false;
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  runAllTests().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    log(`💥 Test suite crashed: ${error.message}`, colors.red);
    process.exit(1);
  });
}

module.exports = { runAllTests, testServerAvailability, testHomePageContent };