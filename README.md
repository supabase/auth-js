# ⚠️ REPOSITORY DEPRECATED - MOVED TO MONOREPO

> **🚨 This repository has been moved and will be archived on October 10, 2025**
>
> **All development has moved to the [Supabase JS Monorepo](https://github.com/supabase/supabase-js)**
>
> **If you're looking for the README of `auth-js`, you can find it at:**  
> **https://github.com/supabase/supabase-js/tree/master/packages/core/auth-js**
>
> ### What happened?
> This repository was merged into the main Supabase JS monorepo for better coordination, testing, and releases.
>
> ### What you need to do:
> - **📖 For documentation**: Visit the [new auth-js location](https://github.com/supabase/supabase-js/tree/master/packages/core/auth-js)
> - **🐛 For issues**: Create them in the [supabase-js repository](https://github.com/supabase/supabase-js/issues)
> - **🔧 For contributions**: See the [Contributing Guide](https://github.com/supabase/supabase-js/blob/master/CONTRIBUTING.md)
> - **📚 For migration help**: Read the [Migration Guide](https://github.com/supabase/supabase-js/blob/master/docs/MIGRATION.md)
>
> ### If you have open work:
> - **Uncommitted changes**: Manually transport your work to the monorepo (file structure is the same under `packages/core/auth-js/`)
> - **Open PRs**: Tag a maintainer in your PR and we'll help you migrate it
> - **Issues**: Will be transported to the supabase-js repository
>
> **⚠️ This is the old repository. Please use the [supabase-js monorepo](https://github.com/supabase/supabase-js) going forward.**

---

# `auth-js` (DEPRECATED - USE MONOREPO)

An isomorphic JavaScript client library for the [Supabase Auth](https://github.com/supabase/auth) API.

<div align="center">

[![pkg.pr.new](https://pkg.pr.new/badge/supabase/auth-js)](https://pkg.pr.new/~/supabase/auth-js)

</div>

## Docs

- Using `auth-js`: https://supabase.com/docs/reference/javascript/auth-signup
- TypeDoc: https://supabase.github.io/auth-js/v2

## Quick start

Install

```bash
npm install --save @supabase/auth-js
```

Usage

```js
import { AuthClient } from '@supabase/auth-js'

const GOTRUE_URL = 'http://localhost:9999'

const auth = new AuthClient({ url: GOTRUE_URL })
```

- `signUp()`: https://supabase.io/docs/reference/javascript/auth-signup
- `signIn()`: https://supabase.io/docs/reference/javascript/auth-signin
- `signOut()`: https://supabase.io/docs/reference/javascript/auth-signout

### Custom `fetch` implementation

`auth-js` uses the [`cross-fetch`](https://www.npmjs.com/package/cross-fetch) library to make HTTP requests, but an alternative `fetch` implementation can be provided as an option. This is most useful in environments where `cross-fetch` is not compatible, for instance Cloudflare Workers:

```js
import { AuthClient } from '@supabase/auth-js'

const AUTH_URL = 'http://localhost:9999'

const auth = new AuthClient({ url: AUTH_URL, fetch: fetch })
```

## Sponsors

We are building the features of Firebase using enterprise-grade, open source products. We support existing communities wherever possible, and if the products don’t exist we build them and open source them ourselves.

[![New Sponsor](https://user-images.githubusercontent.com/10214025/90518111-e74bbb00-e198-11ea-8f88-c9e3c1aa4b5b.png)](https://github.com/sponsors/supabase)

![Watch this repo](https://gitcdn.xyz/repo/supabase/monorepo/master/web/static/watch-repo.gif 'Watch this repo')
