# Commit Guide

This project uses Husky to standardize commits with emojis and ensure code quality before pushing.

## Commit Message Format

Use emojis at the beginning of your commit messages to categorize changes:

### Available Emojis

| Emoji | Code                 | Usage                      |
| ----- | -------------------- | -------------------------- |
| ✨    | `:sparkles:`         | New feature                |
| 🐛    | `:bug:`              | Bug fix                    |
| 📝    | `:memo:`             | Documentation              |
| 🎨    | `:art:`              | Code improvement/structure |
| ♻️    | `:recycle:`          | Refactoring                |
| ⚡    | `:zap:`              | Performance improvement    |
| 🔒    | `:lock:`             | Security                   |
| ✅    | `:white_check_mark:` | Tests                      |
| 🔧    | `:wrench:`           | Configuration              |
| 🚀    | `:rocket:`           | Deploy/CI/CD               |
| 🔥    | `:fire:`             | Remove code/files          |
| 💄    | `:lipstick:`         | UI/styling                 |
| 🏷️    | `:label:`            | Types/interfaces           |
| 📦    | `:package:`          | Dependencies               |
| 🚧    | `:construction:`     | Work in progress           |
| 🧹    | `:broom:`            | Lint/Format fixes          |

## Examples

```bash
git commit -m "✨ Add JWT authentication"
git commit -m "🐛 Fix email validation"
git commit -m "📦 Update dependencies"
git commit -m "🎨 Improve code structure in user service"
git commit -m "🧹 Run lint and format fixes"
```

## Git Hooks

### prepare-commit-msg

When you run `git commit` without a message, a template will be shown with all available emojis and examples.

### commit-msg

Validates that every commit message starts with an allowed emoji. If you try to commit without an emoji, the commit will be **blocked** and you'll see a list of available emojis.

### pre-push

Before pushing to remote, the following checks will run automatically:

1. **ESLint** - Lints and auto-fixes code issues
2. **Prettier** - Formats code according to project standards

If any check fails, the push will be blocked until issues are fixed.

## Tips

- Keep commit messages short and descriptive (max 50 characters for the subject)
- Use imperative mood: "Add feature" not "Added feature"
- Choose the most appropriate emoji for your change
- The template will appear automatically when you run `git commit` without `-m`
