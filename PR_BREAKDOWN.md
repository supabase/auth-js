# PR Breakdown for WebAuthn Branch

## Current Branch Analysis
Your `bewinxed/add_mfa_webauthn_yubikey` branch contains multiple types of changes that should be separated into incremental PRs to maintain backwards compatibility and ease review.

## Recommended PR Sequence

### PR 1: Development Dependencies & Build Configuration Updates
**Priority: Foundation**
**Breaking Changes: None**

Files to include:
- `package.json` (only devDependencies changes)
- `package-lock.json` 
- `bun.lock`
- `.eslintrc.json` → `eslint.config.mjs` migration
- `tsconfig.json` (TypeScript 5.9 config updates)
- `.github/workflows/preview-release.yml`

Changes:
- Update TypeScript from 4.7.4 to 5.9.2
- Update ESLint and migrate to flat config
- Add bun.lock for Bun support
- Clean up eslint comments in test files

**Justification**: These are dev-only changes that don't affect the published package.

---

### PR 2: Type System Improvements & Utilities
**Priority: High (Foundation for WebAuthn)**
**Breaking Changes: None (backwards compatible)**

Files to include:
- `src/lib/types.ts` (partial - only the utility types and response refactoring)

New additions:
```typescript
// New utility types (non-breaking additions)
- type Prettify<T>
- type Without<T, U>
- type EvalIfNotUnknown<T, U>
- type XOR<A, B, C, D, E>
- type AuthRequestResult<T>
- type AuthRequestResultSafeDestructure<T>
```

Refactored types (using new utilities, but maintaining same shape):
- `AuthResponse` 
- `AuthResponsePassword`
- `AuthOtpResponse`
- `AuthTokenResponse`
- `AuthTokenResponsePassword`

**Justification**: These utility types make the codebase more maintainable and are needed for WebAuthn's discriminated unions. They're purely additive and don't break existing APIs.

---

### PR 3: WebAuthn DOM Types & Base Infrastructure
**Priority: High**
**Breaking Changes: None (new additions only)**

Files to include:
- `src/lib/webauthn.dom.ts` (new file)
- `src/lib/webauthn.errors.ts` (new file)
- `src/lib/base64url.ts` (if exists, for WebAuthn utilities)

Changes:
- Add WebAuthn DOM type definitions (self-contained, vendor-free implementation)
- Add WebAuthn error handling infrastructure
- Add base64url utilities for WebAuthn

**Justification**: These are foundational types for WebAuthn that don't affect existing functionality.

---

### PR 4: WebAuthn Core Implementation
**Priority: High**
**Breaking Changes: None (new feature)**

Files to include:
- `src/lib/webauthn.ts` (new file)
- `src/lib/types.ts` (WebAuthn-specific type additions only):
  - MFA WebAuthn types
  - Challenge/Verify parameters
  - Response types

Changes:
- Core WebAuthn implementation
- WebAuthnAbortService
- Browser credential preparation functions
- Server response formatting functions

**Justification**: Core WebAuthn functionality as a new feature, no impact on existing APIs.

---

### PR 5: GoTrueClient WebAuthn Integration
**Priority: High**
**Breaking Changes: None (extends existing APIs)**

Files to include:
- `src/GoTrueClient.ts` (WebAuthn-specific changes)
- `src/index.ts` (export new WebAuthn utilities)

Changes:
- Add WebAuthn support to MFA enroll/unenroll/verify methods
- Add credential preparation in responses
- Export WebAuthn utilities from index

**Justification**: Integrates WebAuthn into existing MFA flows without breaking changes.

---

### PR 6: Tests & Documentation
**Priority: Medium**
**Breaking Changes: None**

Files to include:
- `test/GoTrueClient.browser.test.ts` (WebAuthn tests)
- `test/GoTrueClient.test.ts` (WebAuthn test additions)
- `test/ethereum.test.ts` (if related to Web3 improvements)
- `README.md` updates

---

## Migration Strategy

1. **Create feature branches** from master for each PR:
   ```bash
   git checkout master
   git checkout -b feat/update-dev-deps     # PR 1
   git checkout -b feat/type-utilities      # PR 2
   git checkout -b feat/webauthn-dom-types  # PR 3
   git checkout -b feat/webauthn-core       # PR 4
   git checkout -b feat/webauthn-client     # PR 5
   git checkout -b feat/webauthn-tests      # PR 6
   ```

2. **Cherry-pick or manually apply changes** to each branch in order

3. **Stack PRs** - each subsequent PR should be based on the previous one once merged

## Breaking Change Analysis

✅ **No Breaking Changes Detected**

All changes appear to be:
- Additive (new features/types)
- Internal refactoring using compatible interfaces
- Development-only updates

The type refactoring using `AuthRequestResult` and `AuthRequestResultSafeDestructure` maintains the same external API shape while improving internal consistency.

## Notes

- The XOR utility type enables proper discriminated unions for WebAuthn parameters
- TypeScript 4.1+ is required for template literal types (`Hex = \`0x${string}\``)
- The refactored response types maintain backwards compatibility while reducing duplication