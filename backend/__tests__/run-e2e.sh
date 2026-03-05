#!/bin/bash

# E2E Test Runner for Sentinel
# Starts backend, runs chaos tests, and cleans up

set -e

echo "🚀 Starting Sentinel E2E Test Suite"
echo "===================================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
BACKEND_PORT=4001
TEST_TIMEOUT=180

# Resolve script directory and change to backend directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")"
cd "$BACKEND_DIR"

echo "Working directory: $(pwd)"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running. Please start Docker first.${NC}"
    exit 1
fi

echo -e "${GREEN}✓${NC} Docker is running"

# Check if backend dependencies are installed
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}⚠${NC}  Installing backend dependencies..."
    npm install
fi

# Start backend in test mode
echo -e "${YELLOW}⏳${NC} Starting backend server (port $BACKEND_PORT)..."
export NODE_ENV=test
export PORT=$BACKEND_PORT
export JWT_SECRET=test-secret-key
export AUTO_HEAL_TIMEOUT_MS=10000

# Start backend in background
node index.js > /tmp/sentinel-backend-test.log 2>&1 &
BACKEND_PID=$!

echo -e "${GREEN}✓${NC} Backend started (PID: $BACKEND_PID)"

# Wait for backend to be ready
echo -e "${YELLOW}⏳${NC} Waiting for backend to be ready..."
MAX_WAIT=30
WAITED=0
while [ $WAITED -lt $MAX_WAIT ]; do
    if curl -s http://localhost:$BACKEND_PORT/api/status > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} Backend is ready"
        break
    fi
    sleep 1
    WAITED=$((WAITED + 1))
done

if [ $WAITED -eq $MAX_WAIT ]; then
    echo -e "${RED}❌ Backend failed to start within ${MAX_WAIT}s${NC}"
    kill $BACKEND_PID 2>/dev/null || true
    exit 1
fi

# Run E2E tests
echo ""
echo "🧪 Running E2E Chaos Engineering Tests"
echo "======================================="

export TEST_BACKEND_URL=http://localhost:$BACKEND_PORT

if npm test -- --testPathPattern=e2e --testTimeout=$((TEST_TIMEOUT * 1000)); then
    echo ""
    echo -e "${GREEN}✅ All E2E tests passed!${NC}"
    TEST_EXIT=0
else
    echo ""
    echo -e "${RED}❌ Some E2E tests failed${NC}"
    TEST_EXIT=1
fi

# Cleanup
echo ""
echo "🧹 Cleaning up..."
kill $BACKEND_PID 2>/dev/null || true
echo -e "${GREEN}✓${NC} Backend stopped"

# Show backend logs if tests failed
if [ $TEST_EXIT -ne 0 ]; then
    echo ""
    echo -e "${YELLOW}📋 Backend logs:${NC}"
    tail -n 50 /tmp/sentinel-backend-test.log
fi

exit $TEST_EXIT
