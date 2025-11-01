# Commit Message Guidelines

This project follows [Conventional Commits](https://www.conventionalcommits.org/).

## Format
```
<type>: <description>

[optional body]
```

## Types

- **feat**: A new feature
- **fix**: A bug fix
- **docs**: Documentation changes
- **chore**: Maintenance tasks (dependencies, configs, etc.)
- **refactor**: Code changes that neither fix bugs nor add features
- **test**: Adding or updating tests
- **style**: Code style changes (formatting, missing semicolons, etc.)

## Examples
```bash
feat: add user login endpoint
fix: resolve video buffering issue on mobile
docs: update API documentation for auth routes
chore: upgrade Next.js to v14.2
refactor: simplify video upload logic
test: add unit tests for authentication service
style: format backend code with black
```

## Rules

- Use lowercase for type and description
- Keep the description short and imperative ("add" not "added")
- No period at the end of the description
- If needed, add a body after a blank line for more context
