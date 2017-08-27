# Change Log

## [v0.10.0](https://github.com/kybishop/ember-attacher/tree/v0.10.0) (2017-08-27)
[Full Changelog](https://github.com/kybishop/ember-attacher/compare/v0.9.0...v0.10.0)

**Closed issues:**

- Bug? mouseleave event adds mousemove event when interactive is true. [\#42](https://github.com/kybishop/ember-attacher/issues/42)
- use class instead of popperClass [\#41](https://github.com/kybishop/ember-attacher/issues/41)
- Tests should demonstrate testing other events. [\#38](https://github.com/kybishop/ember-attacher/issues/38)

**Merged pull requests:**

- chore\(follow eslint with ember-suave\) [\#47](https://github.com/kybishop/ember-attacher/pull/47) ([kybishop](https://github.com/kybishop))
- fix\(focus-out events should respect interactive\) [\#46](https://github.com/kybishop/ember-attacher/pull/46) ([kybishop](https://github.com/kybishop))
- feat\(tagless component\) popperClass is now class and id is passed to attachment [\#45](https://github.com/kybishop/ember-attacher/pull/45) ([kybishop](https://github.com/kybishop))
- fix\(interactive hideOn mouseleave\) only add listener once [\#44](https://github.com/kybishop/ember-attacher/pull/44) ([kybishop](https://github.com/kybishop))
- fix\(tests\) add waits for didInsertElement and show delay after clicking [\#35](https://github.com/kybishop/ember-attacher/pull/35) ([kybishop](https://github.com/kybishop))
- feat\(warnings in tests\) don't strip warnings in tests [\#33](https://github.com/kybishop/ember-attacher/pull/33) ([kybishop](https://github.com/kybishop))

## [v0.9.0](https://github.com/kybishop/ember-attacher/tree/v0.9.0) (2017-08-23)
[Full Changelog](https://github.com/kybishop/ember-attacher/compare/v0.8.4...v0.9.0)

## [v0.8.4](https://github.com/kybishop/ember-attacher/tree/v0.8.4) (2017-08-23)
[Full Changelog](https://github.com/kybishop/ember-attacher/compare/v0.8.3...v0.8.4)

**Closed issues:**

- Generic CSS selectors conflicts with other CSS libs [\#28](https://github.com/kybishop/ember-attacher/issues/28)

**Merged pull requests:**

- Cleanup and fixes for non-default app container [\#32](https://github.com/kybishop/ember-attacher/pull/32) ([kybishop](https://github.com/kybishop))
- Renaming .popper and .tooltip [\#31](https://github.com/kybishop/ember-attacher/pull/31) ([GCheung55](https://github.com/GCheung55))
- Tests and code cleanup [\#30](https://github.com/kybishop/ember-attacher/pull/30) ([rwwagner90](https://github.com/rwwagner90))

## [v0.8.3](https://github.com/kybishop/ember-attacher/tree/v0.8.3) (2017-08-21)
[Full Changelog](https://github.com/kybishop/ember-attacher/compare/v0.8.2...v0.8.3)

**Merged pull requests:**

- Check whether component is not destroyed inside `next` [\#29](https://github.com/kybishop/ember-attacher/pull/29) ([krasnoukhov](https://github.com/krasnoukhov))
- feat\(make isShown toggleable\) [\#27](https://github.com/kybishop/ember-attacher/pull/27) ([kybishop](https://github.com/kybishop))
- Module syntax [\#26](https://github.com/kybishop/ember-attacher/pull/26) ([rwwagner90](https://github.com/rwwagner90))

## [v0.8.2](https://github.com/kybishop/ember-attacher/tree/v0.8.2) (2017-08-18)
[Full Changelog](https://github.com/kybishop/ember-attacher/compare/v0.8.1...v0.8.2)

**Merged pull requests:**

- fix\(destruction\) don't set isVisible when being destroyed [\#24](https://github.com/kybishop/ember-attacher/pull/24) ([kybishop](https://github.com/kybishop))

## [v0.8.1](https://github.com/kybishop/ember-attacher/tree/v0.8.1) (2017-08-17)
[Full Changelog](https://github.com/kybishop/ember-attacher/compare/v0.8.0...v0.8.1)

## [v0.8.0](https://github.com/kybishop/ember-attacher/tree/v0.8.0) (2017-08-17)
[Full Changelog](https://github.com/kybishop/ember-attacher/compare/v0.7.0...v0.8.0)

**Merged pull requests:**

- feat\(isShown\) add support for initial isShown state [\#23](https://github.com/kybishop/ember-attacher/pull/23) ([kybishop](https://github.com/kybishop))

## [v0.7.0](https://github.com/kybishop/ember-attacher/tree/v0.7.0) (2017-08-09)
[Full Changelog](https://github.com/kybishop/ember-attacher/compare/v0.6.0...v0.7.0)

**Merged pull requests:**

- feat\(hide on focus-out\) also fix bugs with hideOnBlur [\#22](https://github.com/kybishop/ember-attacher/pull/22) ([kybishop](https://github.com/kybishop))

## [v0.6.0](https://github.com/kybishop/ember-attacher/tree/v0.6.0) (2017-07-25)
[Full Changelog](https://github.com/kybishop/ember-attacher/compare/v0.5.1...v0.6.0)

**Merged pull requests:**

- chore\(bump deps\) ember popper v0.5 and more [\#21](https://github.com/kybishop/ember-attacher/pull/21) ([kybishop](https://github.com/kybishop))

## [v0.5.1](https://github.com/kybishop/ember-attacher/tree/v0.5.1) (2017-07-08)
[Full Changelog](https://github.com/kybishop/ember-attacher/compare/v0.5.0...v0.5.1)

**Closed issues:**

- compatibility with babel 5 [\#13](https://github.com/kybishop/ember-attacher/issues/13)

**Merged pull requests:**

- fix\[imports\] absolute path for dev-only import [\#20](https://github.com/kybishop/ember-attacher/pull/20) ([kybishop](https://github.com/kybishop))
- fix\[babel options\] don't overwrite existing babel options [\#19](https://github.com/kybishop/ember-attacher/pull/19) ([kybishop](https://github.com/kybishop))
- chore\[bump deps\] ember-popper v0.3.1 and more [\#18](https://github.com/kybishop/ember-attacher/pull/18) ([kybishop](https://github.com/kybishop))

## [v0.5.0](https://github.com/kybishop/ember-attacher/tree/v0.5.0) (2017-06-27)
[Full Changelog](https://github.com/kybishop/ember-attacher/compare/v0.4.0...v0.5.0)

**Closed issues:**

- FastBoot support: ReferenceError: document is not defined [\#15](https://github.com/kybishop/ember-attacher/issues/15)
- Tooltips delayed after scroll [\#4](https://github.com/kybishop/ember-attacher/issues/4)

**Merged pull requests:**

- chore\(tests\) added basic smoke test [\#17](https://github.com/kybishop/ember-attacher/pull/17) ([kybishop](https://github.com/kybishop))
- feat\(fastboot\) fastboot support [\#16](https://github.com/kybishop/ember-attacher/pull/16) ([kybishop](https://github.com/kybishop))
- Fix typo [\#12](https://github.com/kybishop/ember-attacher/pull/12) ([ctjhoa](https://github.com/ctjhoa))

## [v0.4.0](https://github.com/kybishop/ember-attacher/tree/v0.4.0) (2017-05-24)
[Full Changelog](https://github.com/kybishop/ember-attacher/compare/v0.3.0...v0.4.0)

## [v0.3.0](https://github.com/kybishop/ember-attacher/tree/v0.3.0) (2017-05-18)
[Full Changelog](https://github.com/kybishop/ember-attacher/compare/v0.2.1...v0.3.0)

**Closed issues:**

- Allow user-defined defaults that override the normal defaults [\#1](https://github.com/kybishop/ember-attacher/issues/1)

**Merged pull requests:**

- User-defined defaults [\#11](https://github.com/kybishop/ember-attacher/pull/11) ([enkol](https://github.com/enkol))

## [v0.2.1](https://github.com/kybishop/ember-attacher/tree/v0.2.1) (2017-05-18)
[Full Changelog](https://github.com/kybishop/ember-attacher/compare/v0.2.0...v0.2.1)

## [v0.2.0](https://github.com/kybishop/ember-attacher/tree/v0.2.0) (2017-05-18)
**Closed issues:**

- Warning shows up when running ember s [\#8](https://github.com/kybishop/ember-attacher/issues/8)
- actions in ember-attacher content dont' work if app customizes rootElement [\#6](https://github.com/kybishop/ember-attacher/issues/6)
- Error: Compile Error: eq is not a helper [\#5](https://github.com/kybishop/ember-attacher/issues/5)
- Installation fails when installing ember-popper with npm [\#2](https://github.com/kybishop/ember-attacher/issues/2)

**Merged pull requests:**

- pass through popperContainer [\#10](https://github.com/kybishop/ember-attacher/pull/10) ([kybishop](https://github.com/kybishop))
- update ember-popper dep [\#9](https://github.com/kybishop/ember-attacher/pull/9) ([kybishop](https://github.com/kybishop))
- include ember-truth-helpers [\#7](https://github.com/kybishop/ember-attacher/pull/7) ([kybishop](https://github.com/kybishop))
- fix installation of ember-popper [\#3](https://github.com/kybishop/ember-attacher/pull/3) ([kybishop](https://github.com/kybishop))



\* *This Change Log was automatically generated by [github_changelog_generator](https://github.com/skywinder/Github-Changelog-Generator)*