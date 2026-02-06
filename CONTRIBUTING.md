# Contributing to Sentinel

Thank you for your interest in contributing to **Sentinel**! We're excited to have you as part of our community. This document will guide you through the contribution process.

## 🎯 Code of Conduct

Please read and follow our [CODE_OF_CONDUCT.md](docs/CODE_OF_CONDUCT.md) before contributing.

## 📋 Getting Started

### Prerequisites

- **Node.js** 18+ and npm/yarn/pnpm
- **Docker** & **Docker Compose** (for running full stack)
- **Git** for version control

### Local Development Setup

1. **Clone the repository**

   ```bash
   git clone https://github.com/SKfaizan-786/sentinel-devops-agent.git
   cd sentinel-devops-agent
   ```

2. **Install dependencies**

   ```bash
   # Frontend
   cd sentinel-frontend
   npm install

   # Backend
   cd backend
   npm install

   # CLI
   cd cli
   npm install
   ```

3. **Set up environment variables**

   ```bash
   # Create .env files where needed
   # For Kestra: Set SECRET_GROQ_API_KEY for AI analysis
   ```

4. **Start the stack**

   ```bash
   # From root directory
   docker-compose up -d

   # In separate terminals:
   cd backend && npm start          # Runs on :4000
   cd sentinel-frontend && npm run dev  # Runs on :3000
   cd cli && npm start              # CLI entry point
   ```

5. **Verify setup**

   ```bash
   # Open http://localhost:3000 for dashboard
   # Open http://localhost:9090 for Kestra UI
   # Run CLI: npx sentinel status
   ```

---

## 🏗️ Project Structure

```
sentinel-devops-agent/
├── backend/                 # Express server (health checks, webhooks)
├── cli/                     # Commander.js CLI tool
├── kestra-flows/            # YAML workflow definitions
├── sentinel-frontend/       # Next.js dashboard
├── services/                # Mock services (auth, payment, notification)
├── docker-compose.yml       # Full stack orchestration
└── docs/                    # Documentation
```

**Key files to understand:**
- [ARCHITECTURE.md](docs/ARCHITECTURE.md) - System design & components
- [sentinel-frontend-prd.md](sentinel-frontend-prd.md) - UI/UX specifications
- [DEVELOPMENT.md](docs/DEVELOPMENT.md) - Development guidelines

---

## 💡 Types of Contributions

### 🐛 Bug Reports

Found a bug? Create an issue with:

- Clear title and description
- Steps to reproduce
- Expected vs actual behavior
- Environment (OS, Node version, browser)
- Screenshots if applicable

**Use label:** `bug`

### ✨ Feature Requests

Have an idea? Open an issue describing:

- What problem it solves
- How it works
- Why it's valuable
- Possible implementation approach

**Use label:** `enhancement`

### 📚 Documentation

Help improve docs by:

- Fixing typos or unclear sections
- Adding examples
- Clarifying APIs
- Improving architecture docs

**Use label:** `documentation`

### 🔧 Code Contributions

#### Feature Development

1. **Create a branch**

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Follow code standards**
   - Use TypeScript for frontend/type-safe code
   - Follow existing code style
   - Add comments for complex logic
   - Keep functions small and focused

3. **Write/update tests** (if applicable)

   ```bash
   npm run test
   npm run test:watch
   ```

4. **Commit with clear messages**

   ```bash
   git commit -m "feat(dashboard): add service metrics panel"
   # Format: type(scope): description
   # Types: feat, fix, docs, style, refactor, test, chore
   ```

5. **Push and create PR**

   ```bash
   git push origin feature/your-feature-name
   ```

#### Pull Request Process

1. **Update documentation** if adding/changing features
2. **Add/update tests** for new functionality
3. **Link related issues** in PR description
4. **Keep PRs focused** - one feature per PR
5. **Request review** from maintainers
6. **Address feedback** promptly

**PR Template:**

```markdown
## Description
Brief description of changes

## Related Issue
Closes #123

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Documentation update
- [ ] Breaking change

## How to Test
Steps to verify the changes

## Checklist
- [ ] Code follows style guidelines
- [ ] Documentation updated
- [ ] Tests added/updated
- [ ] No new warnings generated
```

---

## 🎨 Frontend Contribution Guidelines

### Component Structure

```typescript
// components/MyComponent.tsx
"use client"; // if using React hooks

import { ComponentType } from "react";
import { cn } from "@/lib/utils";

interface MyComponentProps {
  variant?: "primary" | "secondary";
  children: React.ReactNode;
}

export function MyComponent({ variant = "primary", children }: MyComponentProps) {
  return (
    <div className={cn("base-styles", {
      "primary-styles": variant === "primary",
      "secondary-styles": variant === "secondary",
    })}>
      {children}
    </div>
  );
}
```

### Styling

- **Use Tailwind CSS** classes
- **Reference** `globals.css` for custom variables
- **Test** responsive design (mobile, tablet, desktop)
- **Follow** glassmorphism aesthetic (semi-transparent, backdrop blur)

### Adding Features

1. **Create component** in appropriate folder
2. **Add TypeScript types** for all props
3. **Use existing hooks** (useMetrics, useIncidents, useWebSocket)
4. **Test** on dashboard pages
5. **Update** mockData if needed

---

## 🔌 Backend Contribution Guidelines

### API Endpoints

When adding endpoints:

```javascript
// Express endpoint
app.get('/api/new-endpoint', (req, res) => {
  try {
    // Validate input
    // Process
    res.json({ success: true, data: {} });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
```

### Health Checks

Update service monitoring in `backend/index.js`:

```javascript
const services = [
  { name: 'service-name', url: 'http://service:port/health' }
];
```

### Integration with Kestra

Update workflow YAML files in `kestra-flows/`:

```yaml
- id: new-task
  type: io.kestra.plugin.core.http.Request
  uri: http://your-service:port/health
```

---

## 🤖 CLI Contribution Guidelines

### Adding Commands

```javascript
// cli/src/commands.js
export const newCommand = async (arg1, arg2) => {
  try {
    const result = await someAction(arg1);
    console.log(chalk.green(`✅ Success: ${result}`));
  } catch (error) {
    console.log(chalk.red(`❌ Error: ${error.message}`));
  }
};
```

Register in `cli/index.js`:

```javascript
program
  .command('newcommand')
  .description('Description of command')
  .argument('<arg1>', 'Argument description')
  .action(async (arg1) => {
    await newCommand(arg1);
  });
```

---

## 🧪 Testing

```bash
# Frontend tests
cd sentinel-frontend
npm run test

# Backend tests
cd backend
npm run test

# Lint check
npm run lint
```

---

## 📖 Documentation Standards

- **Use Markdown** for all docs
- **Include code examples** for clarity
- **Keep sections organized** with headers
- **Add diagrams** for complex flows (ASCII or Mermaid)
- **Link to related docs**

---

## 🚀 Performance Considerations

- **Frontend:** Keep bundle size low, lazy load components
- **Backend:** Use caching, batch operations
- **Kestra:** Optimize workflow frequency and parallel tasks
- **CLI:** Fast startup time, minimal dependencies

---

## 🐛 Debugging Tips

### Frontend

```bash
# Enable React DevTools
# Check Network tab for API calls
# Use console.log with clear prefixes
```

### Backend

```bash
# Check logs: docker logs backend
# Use Postman/curl for API testing
# Enable debug mode: DEBUG=* npm start
```

### Kestra

```bash
# UI at http://localhost:9090
# Check execution logs for each workflow run
# Test workflows with manual triggers
```

### CLI

```bash
# Verbose output: DEBUG=* sentinel status
# Test against local backend
```

---

## 📋 Issue Labels

| Label | Meaning |
|-------|---------|
| `bug` | Something isn't working |
| `enhancement` | Feature request or improvement |
| `documentation` | Docs need update |
| `good first issue` | Good for new contributors |
| `help wanted` | Extra attention needed |
| `in progress` | Currently being worked on |
| `blocked` | Blocked by another issue |

---

## 🎓 Learning Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Express.js](https://expressjs.com/)
- [Kestra Documentation](https://kestra.io/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

---

## ❓ Questions?

- **GitHub Issues:** Post in issues section
- **Discussions:** Use GitHub Discussions
- **Email:** Contact maintainers

---

## 🙏 Recognition

Contributors will be recognized in:

- [CONTRIBUTORS.md](CONTRIBUTORS.md)
- GitHub's contributors page
- Release notes for significant contributions

---

## 📜 License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

**Thank you for making Sentinel better! 🚀**
