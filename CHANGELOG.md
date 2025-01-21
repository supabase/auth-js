# Changelog

## [2.68.0](https://github.com/supabase/auth-js/compare/v2.67.3...v2.68.0) (2025-01-21)


### Features

* consider session expired with margin on getSession() without auto refresh ([#1027](https://github.com/supabase/auth-js/issues/1027)) ([80f88e4](https://github.com/supabase/auth-js/commit/80f88e4bd2809db765a8d103954e827d8473b7db))


### Bug Fixes

* remove `internal-types.ts` ([#1014](https://github.com/supabase/auth-js/issues/1014)) ([28ead89](https://github.com/supabase/auth-js/commit/28ead89af47bcdaccc6cc2f2c7f013bed8cf3d50))
* update docs to add scrypt ([#1012](https://github.com/supabase/auth-js/issues/1012)) ([1225239](https://github.com/supabase/auth-js/commit/1225239e239bde1b25037a88867d4c484caf8301))

## [2.67.3](https://github.com/supabase/auth-js/compare/v2.67.2...v2.67.3) (2024-12-17)


### Bug Fixes

* return redirect errors early  ([#1003](https://github.com/supabase/auth-js/issues/1003)) ([9751b80](https://github.com/supabase/auth-js/commit/9751b8029b4235a63dcb525e7ce7cc942c85daf5))

## [2.67.2](https://github.com/supabase/auth-js/compare/v2.67.1...v2.67.2) (2024-12-16)


### Bug Fixes

* `isBrowser()` to include check on `window` ([#982](https://github.com/supabase/auth-js/issues/982)) ([645f224](https://github.com/supabase/auth-js/commit/645f22447e68ba13e43e359d1524e95fe025d771))

## [2.67.1](https://github.com/supabase/auth-js/compare/v2.67.0...v2.67.1) (2024-12-13)


### Bug Fixes

* revert [#992](https://github.com/supabase/auth-js/issues/992) and [#993](https://github.com/supabase/auth-js/issues/993) ([#999](https://github.com/supabase/auth-js/issues/999)) ([12b2848](https://github.com/supabase/auth-js/commit/12b2848237854f3d70b9989920ad50e2c4186fff))

## [2.67.0](https://github.com/supabase/auth-js/compare/v2.66.1...v2.67.0) (2024-12-12)


### Features

* wrap navigator.locks.request with plain promise to help zone.js ([#989](https://github.com/supabase/auth-js/issues/989)) ([2e6e07c](https://github.com/supabase/auth-js/commit/2e6e07c21a561ca13d5e74b69609c2cc93f104f4)), closes [#830](https://github.com/supabase/auth-js/issues/830)


### Bug Fixes

* add email_address_invalid error code ([#994](https://github.com/supabase/auth-js/issues/994)) ([232f133](https://github.com/supabase/auth-js/commit/232f133b1a84b4c667e994f472098aa5cde2088d))
* return error early for redirects ([#992](https://github.com/supabase/auth-js/issues/992)) ([9f32d30](https://github.com/supabase/auth-js/commit/9f32d30e17954c5d4320b374a108617cda5ab357))

## [2.66.1](https://github.com/supabase/auth-js/compare/v2.66.0...v2.66.1) (2024-12-04)


### Bug Fixes

* add loose auto complete to string literals where applicable ([#966](https://github.com/supabase/auth-js/issues/966)) ([fd9248d](https://github.com/supabase/auth-js/commit/fd9248d7aecd0bd00381dff162969d8014a3359a))
* add new error codes ([#979](https://github.com/supabase/auth-js/issues/979)) ([dfb40d2](https://github.com/supabase/auth-js/commit/dfb40d24188f7e8b0d34e51ded15582086250c51))
* don't remove session for identity linking errors ([#987](https://github.com/supabase/auth-js/issues/987)) ([e68ebe6](https://github.com/supabase/auth-js/commit/e68ebe604d15d881b23678d180cccb7115f16f4e))

## [2.66.0](https://github.com/supabase/auth-js/compare/v2.65.1...v2.66.0) (2024-11-01)


### Features

* add process lock for optional use in non-browser environments (React Native) ([#977](https://github.com/supabase/auth-js/issues/977)) ([8af88b6](https://github.com/supabase/auth-js/commit/8af88b6f4e41872b73e84c40f71793dab6c62126))


### Bug Fixes

* typo in warning message ([#975](https://github.com/supabase/auth-js/issues/975)) ([4f21f93](https://github.com/supabase/auth-js/commit/4f21f9324b2c3d55630b8d0a6759a264b0472dd8))
* update soft-deletion docs ([#973](https://github.com/supabase/auth-js/issues/973)) ([cb052a9](https://github.com/supabase/auth-js/commit/cb052a9b0846048feef18080d830cc36a9ed7282))

## [2.65.1](https://github.com/supabase/auth-js/compare/v2.65.0...v2.65.1) (2024-10-14)


### Bug Fixes

* Call `SIGNED_OUT` event where session is removed ([#854](https://github.com/supabase/auth-js/issues/854)) ([436fd9f](https://github.com/supabase/auth-js/commit/436fd9f967ad6d515b8eca179d06032619a1b071))
* improve `mfa.enroll` return types ([#956](https://github.com/supabase/auth-js/issues/956)) ([8a1ec06](https://github.com/supabase/auth-js/commit/8a1ec0602792191bd235d51fd45c0ec2cabdf216))
* move MFA sub types to internal file ([#964](https://github.com/supabase/auth-js/issues/964)) ([4b7455c](https://github.com/supabase/auth-js/commit/4b7455c2631ca4e00f01275c7342eb37756ede23))
* remove phone mfa deletion, match on error codes ([#963](https://github.com/supabase/auth-js/issues/963)) ([ef3911c](https://github.com/supabase/auth-js/commit/ef3911cd1a082a6825ce25fe326081e096bd55f5))

## [2.65.0](https://github.com/supabase/auth-js/compare/v2.64.4...v2.65.0) (2024-08-27)


### Features

* add bindings for Multi-Factor Authentication (Phone) ([#932](https://github.com/supabase/auth-js/issues/932)) ([b957c30](https://github.com/supabase/auth-js/commit/b957c30782065e4cc421a526c62c101d35c443d4))
* add kakao to sign in with ID token ([#845](https://github.com/supabase/auth-js/issues/845)) ([e2337ba](https://github.com/supabase/auth-js/commit/e2337bad535598d9f751505de52a18c59f1505c3))
* remove session, emit `SIGNED_OUT` when JWT `session_id` is invalid ([#905](https://github.com/supabase/auth-js/issues/905)) ([db41710](https://github.com/supabase/auth-js/commit/db41710b1a35ef559158a936d0a95acc0b1fca96))


### Bug Fixes

* Correct typo in GoTrueClient warning message ([#938](https://github.com/supabase/auth-js/issues/938)) ([8222ee1](https://github.com/supabase/auth-js/commit/8222ee198a0ab10570e8b4c31ffb2aeafef86392))
* don't throw error in exchangeCodeForSession ([#946](https://github.com/supabase/auth-js/issues/946)) ([6e161ec](https://github.com/supabase/auth-js/commit/6e161ece3f8cd0d115857e2ed4346533840769f0))
* move docker compose to v2 ([#940](https://github.com/supabase/auth-js/issues/940)) ([38eef89](https://github.com/supabase/auth-js/commit/38eef89ff61b49eb65ee26b7d2201148d1fc3b77))

## [2.64.4](https://github.com/supabase/auth-js/compare/v2.64.3...v2.64.4) (2024-07-12)


### Bug Fixes

* update types  ([#930](https://github.com/supabase/auth-js/issues/930)) ([dbc5962](https://github.com/supabase/auth-js/commit/dbc5962d609cc0470b5b03160f4cd8b9e7d03ce3))

## [2.64.3](https://github.com/supabase/auth-js/compare/v2.64.2...v2.64.3) (2024-06-17)


### Bug Fixes

* don't call removeSession prematurely  ([#915](https://github.com/supabase/auth-js/issues/915)) ([e0dc518](https://github.com/supabase/auth-js/commit/e0dc51849680fa8f1900de786c4a7e77eab8760e))
* limit proxy session warning to once per client instance ([#900](https://github.com/supabase/auth-js/issues/900)) ([4ecfdda](https://github.com/supabase/auth-js/commit/4ecfdda65188b71322753e57622be8eafe97ed6b))
* patch release workflow ([#922](https://github.com/supabase/auth-js/issues/922)) ([f84fb50](https://github.com/supabase/auth-js/commit/f84fb50a4357af49acac6ca151057d2af74d63c9))
* type errors in verifyOtp ([#918](https://github.com/supabase/auth-js/issues/918)) ([dcd0b9b](https://github.com/supabase/auth-js/commit/dcd0b9b682412a2f1d2deaab26eb8094e50b67fd))

## [2.64.2](https://github.com/supabase/auth-js/compare/v2.64.1...v2.64.2) (2024-05-03)


### Bug Fixes

* signOut should ignore 403s ([#894](https://github.com/supabase/auth-js/issues/894)) ([eeb77ce](https://github.com/supabase/auth-js/commit/eeb77ce2a1ddee94c38f17533c9b748bf2950f67))
* suppress getSession warning whenever _saveSession is called ([#895](https://github.com/supabase/auth-js/issues/895)) ([59ec9af](https://github.com/supabase/auth-js/commit/59ec9affa01c780fb18f668291fa7167a65c391d))

## [2.64.1](https://github.com/supabase/auth-js/compare/v2.64.0...v2.64.1) (2024-04-25)


### Bug Fixes

* return error if missing session or missing custom auth header ([#891](https://github.com/supabase/auth-js/issues/891)) ([8d16578](https://github.com/supabase/auth-js/commit/8d165787ec46929cba68d18c35161463240f61e3))

## [2.64.0](https://github.com/supabase/auth-js/compare/v2.63.2...v2.64.0) (2024-04-25)


### Features

* remove `cache: no-store` as it breaks cloudflare ([#886](https://github.com/supabase/auth-js/issues/886)) ([10e9d38](https://github.com/supabase/auth-js/commit/10e9d3871c5a9ce50d15c35c7fd7045cad504670))


### Bug Fixes

* Revert "fix: `getUser` returns null if there is no session ([#876](https://github.com/supabase/auth-js/issues/876))" ([#889](https://github.com/supabase/auth-js/issues/889)) ([6755fef](https://github.com/supabase/auth-js/commit/6755fef2aefd1bc84a26182f848c0912492cb106))
* revert check for access token in header ([#885](https://github.com/supabase/auth-js/issues/885)) ([03d8ba7](https://github.com/supabase/auth-js/commit/03d8ba7ca5c485979788d6f121199e4370622491))

## [2.63.2](https://github.com/supabase/auth-js/compare/v2.63.1...v2.63.2) (2024-04-20)


### Bug Fixes

* check for access token in header ([#882](https://github.com/supabase/auth-js/issues/882)) ([ae4a53d](https://github.com/supabase/auth-js/commit/ae4a53de7eb41ebde3b4e1abe823e2ffcb53a71d))

## [2.63.1](https://github.com/supabase/auth-js/compare/v2.63.0...v2.63.1) (2024-04-18)


### Bug Fixes

* `getUser` returns null if there is no session ([#876](https://github.com/supabase/auth-js/issues/876)) ([6adf8ca](https://github.com/supabase/auth-js/commit/6adf8caa4ca803e65f943cc88a2849f5905a044a))
* implement exponential back off on the retries of `_refreshAccessToken` method ([#869](https://github.com/supabase/auth-js/issues/869)) ([f66711d](https://github.com/supabase/auth-js/commit/f66711ddf87ea705a972a860d7ebfb6e0d003c6b))
* update session warning ([#879](https://github.com/supabase/auth-js/issues/879)) ([3661130](https://github.com/supabase/auth-js/commit/36611300fa6d1378a7633c62d2f816d3803f2774))

## [2.63.0](https://github.com/supabase/gotrue-js/compare/v2.62.2...v2.63.0) (2024-03-26)


### Features

* add method for anonymous sign-in ([#858](https://github.com/supabase/gotrue-js/issues/858)) ([e8a1fc9](https://github.com/supabase/gotrue-js/commit/e8a1fc9a40947b949080107138eade09f06f5868))
* add support for error codes ([#855](https://github.com/supabase/gotrue-js/issues/855)) ([99821f4](https://github.com/supabase/gotrue-js/commit/99821f4a1f6fdb3a222cd0f660210016e6cc823e))
* explicit `cache: no-store` in fetch ([#847](https://github.com/supabase/gotrue-js/issues/847)) ([034bee0](https://github.com/supabase/gotrue-js/commit/034bee09c3f0a4613d9a3e7bd3bc5f70682f5a66))
* warn use of `getSession()` when `isServer` on storage ([#846](https://github.com/supabase/gotrue-js/issues/846)) ([9ea94fe](https://github.com/supabase/gotrue-js/commit/9ea94fe11f4a6a4b6305aa4fe75c4661074437a7))


### Bug Fixes

* refactor all pkce code into a single method ([#860](https://github.com/supabase/gotrue-js/issues/860)) ([860bffc](https://github.com/supabase/gotrue-js/commit/860bffc8f75292e71630fb7241e11a754200dab8))
* remove data type ([#848](https://github.com/supabase/gotrue-js/issues/848)) ([15c7c82](https://github.com/supabase/gotrue-js/commit/15c7c8258b2d42d3378be4f7738c728a07523579))
