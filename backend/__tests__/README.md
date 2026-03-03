# Sentinel Test Suite

Comprehensive test coverage for Sentinel DevOps Agent with unit, integration, and chaos engineering tests.

## Test Pyramid Structure

```
            ┌─────────────────────────────────┐
           │       E2E Chaos Tests           │  ← Full stack, ~90s
           │   (6 scenarios, real Docker)    │
           └──────────────┬──────────────────┘
                          │
           ┌──────────────▼──────────────────┐
           │     Integration Tests           │  ← API + DB
           │   (2 suites, mocked Docker)     │
           └──────────────┬──────────────────┘
                          │
           ┌──────────────▼──────────────────┐
           │       Unit Tests                │  ← Pure logic
           │ (3 suites, all mocked)          │
           └─────────────────────────────────┘
```

## Test Suites

### Unit Tests (`__tests__/unit/`)

Fast, isolated tests with all dependencies mocked.

- **docker-healer.test.js** - Container healing logic
  - Restart operations
  - Security policy enforcement
  - Incident storage
  - Service scaling

- **docker-monitor.test.js** - Container monitoring
  - Metrics collection
  - Stats parsing
  - Stream handling
  - Resource cleanup

- **rbac-service.test.js** - Role-based access control
  - Permission checks
  - Role assignment
  - User authorization

**Run unit tests:**
```bash
npm run test:unit
```

### Integration Tests (`__tests__/integration/`)

Tests with real Express server and database, mocked Docker.

- **api-endpoints.test.js** - REST API endpoints
  - `/api/status` - System status
  - `/api/activity` - Activity logs
  - `/api/docker/*` - Docker operations
  - `/api/kestra-webhook` - AI analysis webhook

- **healing-cycle.test.js** - Complete healing flow
  - Detection → Healing → Verification
  - Multi-container healing
  - MTTR measurement
  - Security blocking

**Run integration tests:**
```bash
npm run test:integration
```

### E2E Chaos Tests (`__tests__/e2e/`)

Full-stack tests with real backend and Docker daemon.

**Prerequisites:**
- Backend server running
- Docker daemon accessible
- Test services deployed

**Scenarios:**

1. **Service Crash and Auto-Recovery**
   - Simulates service crash
   - Verifies detection within 15s
   - Confirms recovery within 90s

2. **Degraded Performance Detection**
   - Triggers slow response times
   - Validates degraded state detection

3. **Multiple Concurrent Failures**
   - Crashes 3 services simultaneously
   - Verifies parallel healing

4. **CLI-Triggered Simulation**
   - Uses CLI to simulate failures
   - Observes autonomous recovery

5. **Activity Log Verification**
   - Confirms incident logging
   - Validates audit trail

6. **Stress Test - Rapid Failures**
   - 3 rapid successive failures
   - Tests system resilience

**Run E2E tests:**
```bash
# Automated (starts backend, runs tests, cleans up)
./backend/__tests__/run-e2e.sh

# Manual (requires backend running on port 4000)
npm run test:e2e
```

## Quick Start

### Run All Tests
```bash
cd backend
npm test
```

### Run with Coverage
```bash
npm run test:coverage
```

### Watch Mode (Development)
```bash
npm run test:watch
```

### Run Specific Test File
```bash
npm test -- docker-healer.test.js
```

### Run Tests Matching Pattern
```bash
npm test -- --testNamePattern="restart"
```

## Test Configuration

### Environment Variables

```bash
# Test mode
NODE_ENV=test

# Backend URL for E2E tests
TEST_BACKEND_URL=http://localhost:4000

# Enable debug output
DEBUG_TEST=true

# JWT secret for auth tests
JWT_SECRET=test-secret-key

# Auto-heal timeout (ms)
AUTO_HEAL_TIMEOUT_MS=10000
```

### Jest Configuration

See `backend/jest.config.js` for:
- Test environment setup
- Coverage thresholds
- Mock configurations
- Timeout settings

## Coverage Goals

Target coverage (Phase 2 roadmap):

- **Unit Tests**: 80%+ coverage
- **Integration Tests**: Critical paths covered
- **E2E Tests**: All healing scenarios validated

**Current coverage:**
```bash
npm run test:coverage
```

## Writing New Tests

### Unit Test Template

```javascript
/**
 * Unit Tests: [Module Name]
 * Tests [description] with mocked dependencies
 */

// Mock dependencies
jest.mock('../../path/to/dependency');

describe('Unit: [Module Name]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('[Function Name]', () => {
    it('should [expected behavior]', async () => {
      // Arrange
      const input = 'test-data';
      
      // Act
      const result = await functionUnderTest(input);
      
      // Assert
      expect(result).toBeDefined();
    });
  });
});
```

### Integration Test Template

```javascript
/**
 * Integration Tests: [Feature Name]
 * Tests [description] with real server
 */

const request = require('supertest');
const app = require('../../app'); // Your Express app

describe('Integration: [Feature Name]', () => {
  it('should [expected behavior]', async () => {
    const response = await request(app)
      .get('/api/endpoint')
      .expect(200);

    expect(response.body).toHaveProperty('data');
  });
});
```

### E2E Test Template

```javascript
/**
 * E2E Tests: [Scenario Name]
 * Tests [description] with full stack
 */

describe('E2E: [Scenario Name]', () => {
  it('should [expected behavior]', async () => {
    // Trigger failure
    await triggerFailure();
    
    // Wait for recovery
    const recovered = await waitForCondition(
      () => checkHealth(),
      90000 // 90s timeout
    );
    
    expect(recovered).toBe(true);
  }, 100000); // Test timeout
});
```

## Continuous Integration

### GitHub Actions Workflow

```yaml
name: Test Suite

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: |
          cd backend
          npm ci
      
      - name: Run unit tests
        run: |
          cd backend
          npm run test:unit
      
      - name: Run integration tests
        run: |
          cd backend
          npm run test:integration
        env:
          DATABASE_URL: postgresql://postgres:test@localhost:5432/sentinel_test
      
      - name: Run E2E tests
        run: |
          cd backend
          ./backend/__tests__/run-e2e.sh
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./backend/coverage/lcov.info
```

## Troubleshooting

### Tests Timing Out

E2E tests have long timeouts (90s+). If tests timeout:

1. Check backend logs: `/tmp/sentinel-backend-test.log`
2. Verify Docker is running: `docker info`
3. Increase timeout in test file
4. Check network connectivity

### Mock Issues

If mocks aren't working:

1. Clear Jest cache: `npm test -- --clearCache`
2. Verify mock paths are correct
3. Check mock is defined before module import

### Database Connection Errors

For integration tests:

1. Ensure PostgreSQL is running
2. Run migrations: `npm run db:migrate`
3. Check `DATABASE_URL` environment variable

### Docker Connection Errors

For E2E tests:

1. Verify Docker daemon: `docker ps`
2. Check Docker socket permissions
3. Ensure test containers are deployed

## Best Practices

1. **Isolation**: Each test should be independent
2. **Cleanup**: Always clean up resources in `afterEach`
3. **Mocking**: Mock external dependencies in unit tests
4. **Assertions**: Use specific assertions, avoid `toBeTruthy()`
5. **Timeouts**: Set appropriate timeouts for async operations
6. **Naming**: Use descriptive test names: "should [action] when [condition]"
7. **Coverage**: Aim for edge cases, not just happy paths

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supertest Guide](https://github.com/visionmedia/supertest)
- [Testing Best Practices](https://testingjavascript.com/)
- [Chaos Engineering Principles](https://principlesofchaos.org/)

## Contributing

When adding new features:

1. Write unit tests first (TDD)
2. Add integration tests for API changes
3. Update E2E scenarios if healing logic changes
4. Maintain 80%+ coverage
5. Document new test scenarios in this README

## Support

For test-related issues:
- Check existing tests for examples
- Review Jest documentation
- Open an issue with test output and logs
