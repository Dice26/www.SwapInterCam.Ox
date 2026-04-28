# Contributing to SwapInterCam.ox

Thank you for your interest in contributing! This document provides guidelines and best practices.

---

## 🔒 Security First

### Before Every Commit:

1. **Audit staged files**:
   ```bash
   git add -n .
   ```
   This shows what will be committed without actually staging.

2. **Run the audit script**:
   ```bash
   npm run audit:commit
   ```
   This checks for sensitive data patterns.

3. **Review changes**:
   ```bash
   git diff --cached
   ```

### Never Commit:
- ❌ `.env` files (use `.env.example` instead)
- ❌ API keys, passwords, tokens
- ❌ `node_modules/` directory
- ❌ Log files (`*.log`)
- ❌ Personal IDE settings (`.vscode/`, `.idea/`)
- ❌ Build artifacts (`dist/`, `build/`)

---

## 📝 Code Standards

### JavaScript Style
- Use ES6+ features
- Async/await over callbacks
- Descriptive variable names
- Comments for complex logic

### File Organization
```
src/
├─ backend/        # Server-side code
├─ renderer/       # Client-side code
└─ main/           # Main process code
```

### Naming Conventions
- **Files**: `kebab-case.js`
- **Classes**: `PascalCase`
- **Functions**: `camelCase`
- **Constants**: `UPPER_SNAKE_CASE`

---

## 🔄 Git Workflow

### Branch Naming
- `feature/description` - New features
- `fix/description` - Bug fixes
- `docs/description` - Documentation
- `refactor/description` - Code refactoring

### Commit Messages
Follow conventional commits:

```
type(scope): description

[optional body]

[optional footer]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Formatting
- `refactor`: Code restructuring
- `test`: Adding tests
- `chore`: Maintenance

**Examples:**
```
feat(face-swap): add real-time preview
fix(camera): resolve device detection issue
docs(readme): update installation steps
```

---

## 🧪 Testing

### Before Submitting PR:

1. **Run smoke tests**:
   ```bash
   npm run smoke-test
   ```

2. **Check backend**:
   ```bash
   npm run backend:status
   ```

3. **Test locally**:
   ```bash
   npm start
   ```

---

## 📦 Adding Dependencies

1. **Check if necessary** - Avoid bloat
2. **Use exact versions** in `package.json`
3. **Document why** in commit message
4. **Update README** if user-facing

```bash
npm install --save-exact package-name
```

---

## 🐛 Reporting Issues

### Bug Reports Should Include:
- Clear description
- Steps to reproduce
- Expected vs actual behavior
- Environment (OS, Node version)
- Relevant logs

### Feature Requests Should Include:
- Use case description
- Proposed solution
- Alternative approaches considered

---

## 🔍 Code Review Checklist

Before requesting review:

- [ ] Code follows style guidelines
- [ ] No sensitive data in commits
- [ ] Tests pass locally
- [ ] Documentation updated
- [ ] Commit messages are clear
- [ ] No unnecessary files included
- [ ] `.gitignore` is respected

---

## 🚀 Pull Request Process

1. **Fork** the repository
2. **Create** a feature branch
3. **Make** your changes
4. **Test** thoroughly
5. **Commit** with clear messages
6. **Push** to your fork
7. **Open** a pull request

### PR Description Template:
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Documentation
- [ ] Refactoring

## Testing
How was this tested?

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No sensitive data included
```

---

## 📚 Documentation

### When to Update Docs:
- New features added
- API changes
- Configuration changes
- Installation steps modified

### Where to Document:
- `README.md` - User-facing features
- `CONTRIBUTING.md` - Developer guidelines
- Code comments - Complex logic
- API docs - Endpoint changes

---

## 🆘 Getting Help

- **Issues**: Open a GitHub issue
- **Email**: contact@swapintercam.ox
- **Discussions**: Use GitHub Discussions

---

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

**Thank you for contributing to SwapInterCam.ox!** 🎉
