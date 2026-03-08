#!/bin/bash
# Quick Test Setup & Run Guide
# Copy this file content to run initial test setup

echo "🚀 Sentinel Backend Test Setup"
echo "=============================="
echo ""

# Check if we're in the backend directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run from backend directory."
    exit 1
fi

echo "📦 Installing dependencies..."
npm install || { echo "❌ npm install failed"; exit 1; }

echo ""
echo "✅ Installation complete!"
echo ""
echo "Available test commands:"
echo "  npm test              - Run all tests"
echo "  npm run test:watch    - Run tests in watch mode"
echo "  npm run test:coverage - Generate coverage report"
echo "  npm run test:unit     - Run unit tests only"
echo "  npm run test:integration - Run integration tests only"
echo ""
echo "🎯 Running all tests..."
echo ""

npm test

echo ""
echo "✨ Test run complete!"
exit $?
