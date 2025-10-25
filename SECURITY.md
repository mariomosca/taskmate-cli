# Security Policy

## Supported Versions

We actively support the following versions of TaskMate CLI with security updates:

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

## Reporting a Vulnerability

We take security vulnerabilities seriously. If you discover a security vulnerability in TaskMate CLI, please report it responsibly.

### How to Report

1. **Do NOT create a public GitHub issue** for security vulnerabilities
2. Send an email to: [INSERT SECURITY EMAIL]
3. Include the following information:
   - Description of the vulnerability
   - Steps to reproduce the issue
   - Potential impact
   - Any suggested fixes (if available)

### What to Expect

- **Acknowledgment**: We will acknowledge receipt of your report within 48 hours
- **Initial Assessment**: We will provide an initial assessment within 5 business days
- **Updates**: We will keep you informed of our progress
- **Resolution**: We aim to resolve critical vulnerabilities within 30 days

### Security Best Practices

When using TaskMate CLI:

#### API Keys and Secrets
- Never commit API keys to version control
- Use environment variables for sensitive configuration
- Regularly rotate your API keys
- Use the minimum required permissions for API keys

#### Local Data
- Session data is stored locally in SQLite database
- Ensure your system has appropriate file permissions
- Consider encrypting sensitive data at rest

#### Network Security
- All API communications use HTTPS
- Validate SSL certificates
- Be cautious when using public networks

### Vulnerability Disclosure Timeline

1. **Day 0**: Vulnerability reported
2. **Day 1-2**: Acknowledgment sent
3. **Day 3-7**: Initial assessment and triage
4. **Day 8-30**: Development and testing of fix
5. **Day 31**: Public disclosure (if resolved)

### Security Features

TaskMate CLI includes several security features:

- **Secure API Communication**: All external API calls use HTTPS
- **Local Data Storage**: Sensitive data is stored locally, not transmitted
- **Input Validation**: User inputs are validated and sanitized
- **Error Handling**: Sensitive information is not exposed in error messages

### Scope

This security policy covers:
- TaskMate CLI application code
- Dependencies and third-party libraries
- Configuration and deployment recommendations

### Out of Scope

The following are outside the scope of this policy:
- Issues in third-party services (Todoist, Claude, Gemini APIs)
- Social engineering attacks
- Physical security of user devices
- Issues requiring physical access to the user's machine

### Recognition

We appreciate security researchers who help keep TaskMate CLI secure. With your permission, we will:
- Acknowledge your contribution in our release notes
- Add you to our security contributors list

Thank you for helping keep TaskMate CLI secure! 🔒