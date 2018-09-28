# Change Log

## [v0.13.8](https://github.com/kybishop/ember-attacher/tree/v0.13.8) (2018-09-28)
[Full Changelog](https://github.com/kybishop/ember-attacher/compare/v0.13.7...v0.13.8)

**Closed issues:**

- Deprecation: Use closure actions instead of `sendAction` [\#148](https://github.com/kybishop/ember-attacher/issues/148)
- Few files missing 404 errors [\#142](https://github.com/kybishop/ember-attacher/issues/142)
- Replace ember-cli-sass with postcss [\#108](https://github.com/kybishop/ember-attacher/issues/108)

**Merged pull requests:**

- Use closure actions instead of sendAction [\#149](https://github.com/kybishop/ember-attacher/pull/149) ([scottwernervt](https://github.com/scottwernervt))
- Update ember-cli-sass [\#147](https://github.com/kybishop/ember-attacher/pull/147) ([jrjohnson](https://github.com/jrjohnson))

## [v0.13.7](https://github.com/kybishop/ember-attacher/tree/v0.13.7) (2018-07-25)
[Full Changelog](https://github.com/kybishop/ember-attacher/compare/v0.13.6...v0.13.7)

**Closed issues:**

- Tweak the CSS to work with positions like right-start [\#139](https://github.com/kybishop/ember-attacher/issues/139)
- Animation support for more Popper.js placements \(right-start, etc.\) [\#134](https://github.com/kybishop/ember-attacher/issues/134)
- Animation: 'fill' is not compatible with arrow: true [\#126](https://github.com/kybishop/ember-attacher/issues/126)
- Tooltip background color is transparent for long text. [\#101](https://github.com/kybishop/ember-attacher/issues/101)

**Merged pull requests:**

- fix\(warning on arrow/fill incompat\) [\#144](https://github.com/kybishop/ember-attacher/pull/144) ([kybishop](https://github.com/kybishop))
- feat: works with placement modifiers \(start/end\) [\#143](https://github.com/kybishop/ember-attacher/pull/143) ([urbany](https://github.com/urbany))

## [v0.13.6](https://github.com/kybishop/ember-attacher/tree/v0.13.6) (2018-05-25)
[Full Changelog](https://github.com/kybishop/ember-attacher/compare/v0.13.5...v0.13.6)

**Closed issues:**

- lazyLoad + showDelay causes error  [\#137](https://github.com/kybishop/ember-attacher/issues/137)
- Apply Dynamic Styles [\#135](https://github.com/kybishop/ember-attacher/issues/135)

**Merged pull requests:**

- fix\(race conditions with lazyRender and showDelay\) [\#138](https://github.com/kybishop/ember-attacher/pull/138) ([kybishop](https://github.com/kybishop))
- Pass in style attribute to style attachment [\#136](https://github.com/kybishop/ember-attacher/pull/136) ([jrjohnson](https://github.com/jrjohnson))

## [v0.13.5](https://github.com/kybishop/ember-attacher/tree/v0.13.5) (2018-04-27)
[Full Changelog](https://github.com/kybishop/ember-attacher/compare/v0.13.4...v0.13.5)

**Merged pull requests:**

- chore\(remove package-lock.json\) [\#132](https://github.com/kybishop/ember-attacher/pull/132) ([kybishop](https://github.com/kybishop))

## [v0.13.4](https://github.com/kybishop/ember-attacher/tree/v0.13.4) (2018-04-27)
[Full Changelog](https://github.com/kybishop/ember-attacher/compare/v0.13.3...v0.13.4)

**Closed issues:**

- addon.sass file not found [\#130](https://github.com/kybishop/ember-attacher/issues/130)

**Merged pull requests:**

- Enable sass [\#131](https://github.com/kybishop/ember-attacher/pull/131) ([lamabiker](https://github.com/lamabiker))
- fix\(user-supplied animation default can now prevent arrow warning\) [\#129](https://github.com/kybishop/ember-attacher/pull/129) ([kybishop](https://github.com/kybishop))
- Improve README [\#128](https://github.com/kybishop/ember-attacher/pull/128) ([mostafa-sakhiri](https://github.com/mostafa-sakhiri))

## [v0.13.3](https://github.com/kybishop/ember-attacher/tree/v0.13.3) (2018-04-03)
[Full Changelog](https://github.com/kybishop/ember-attacher/compare/v0.13.2...v0.13.3)

**Closed issues:**

- TypeError: Cannot set property arrow of \[object Object\] which has only a getter [\#123](https://github.com/kybishop/ember-attacher/issues/123)
- Unnecessary `babel-eslint` dependency? [\#122](https://github.com/kybishop/ember-attacher/issues/122)
- Using with overlays? [\#120](https://github.com/kybishop/ember-attacher/issues/120)

**Merged pull requests:**

- fix\(user-supplied default for "arrow"\) [\#124](https://github.com/kybishop/ember-attacher/pull/124) ([kybishop](https://github.com/kybishop))
- chore\(bump deps\) ember 3.0 [\#119](https://github.com/kybishop/ember-attacher/pull/119) ([kybishop](https://github.com/kybishop))

## [v0.13.2](https://github.com/kybishop/ember-attacher/tree/v0.13.2) (2018-03-20)
[Full Changelog](https://github.com/kybishop/ember-attacher/compare/v0.13.1...v0.13.2)

**Closed issues:**

- TypeError: setting getter-only property "eventsEnabled" [\#117](https://github.com/kybishop/ember-attacher/issues/117)
- setting `arrow: true` in config/environment.js throws error [\#114](https://github.com/kybishop/ember-attacher/issues/114)
- "Uncaught Error: Could not find module `@ember/component`" when upgrading from 0.11.4 to 0.13.1 [\#112](https://github.com/kybishop/ember-attacher/issues/112)
- Warning when setting 'modifiers' in app defaults \(environment.js\) [\#111](https://github.com/kybishop/ember-attacher/issues/111)
- Option to add an offset/padding [\#107](https://github.com/kybishop/ember-attacher/issues/107)
- Far too slow on initial render of pages with \> 100 tooltips [\#100](https://github.com/kybishop/ember-attacher/issues/100)
- Add GitHub "Star" button to example website [\#92](https://github.com/kybishop/ember-attacher/issues/92)
- Expose `registerAPI` [\#86](https://github.com/kybishop/ember-attacher/issues/86)

**Merged pull requests:**

- Expose register api [\#118](https://github.com/kybishop/ember-attacher/pull/118) ([kybishop](https://github.com/kybishop))
- chore\(improve example app\) [\#116](https://github.com/kybishop/ember-attacher/pull/116) ([kybishop](https://github.com/kybishop))
- feat: get hideOn clickout to work on iOS [\#115](https://github.com/kybishop/ember-attacher/pull/115) ([necojackarc](https://github.com/necojackarc))
- add modifiers to DEFAULTS [\#113](https://github.com/kybishop/ember-attacher/pull/113) ([enkol](https://github.com/enkol))
- feat\(true lazy rendering\) [\#102](https://github.com/kybishop/ember-attacher/pull/102) ([kybishop](https://github.com/kybishop))

## [v0.13.1](https://github.com/kybishop/ember-attacher/tree/v0.13.1) (2018-02-13)
[Full Changelog](https://github.com/kybishop/ember-attacher/compare/v0.13.0...v0.13.1)

**Closed issues:**

- Block-scoped declarations \(let, const, function, class\) not yet supported outside strict mode [\#106](https://github.com/kybishop/ember-attacher/issues/106)
- Warning in ember-cli console [\#105](https://github.com/kybishop/ember-attacher/issues/105)

**Merged pull requests:**

- chore\(bump deps\) ember 2.18, etc. [\#110](https://github.com/kybishop/ember-attacher/pull/110) ([kybishop](https://github.com/kybishop))
- Fix missing back tick [\#104](https://github.com/kybishop/ember-attacher/pull/104) ([ctjhoa](https://github.com/ctjhoa))
- Fix credit link [\#103](https://github.com/kybishop/ember-attacher/pull/103) ([ctjhoa](https://github.com/ctjhoa))

## [v0.13.0](https://github.com/kybishop/ember-attacher/tree/v0.13.0) (2017-12-04)
[Full Changelog](https://github.com/kybishop/ember-attacher/compare/v0.12.2...v0.13.0)

**Closed issues:**

- Jank when using isShown=true with animation="fill" [\#99](https://github.com/kybishop/ember-attacher/issues/99)
- Popper briefly flickers in top left on initial show if no animation is used [\#95](https://github.com/kybishop/ember-attacher/issues/95)
- Attacher-Component breaks ember-metrics [\#93](https://github.com/kybishop/ember-attacher/issues/93)

**Merged pull requests:**

- chore\(bump deps\) ember 2.17, etc. [\#98](https://github.com/kybishop/ember-attacher/pull/98) ([kybishop](https://github.com/kybishop))
- fix\(initial positioning flicker when not using animations\) [\#97](https://github.com/kybishop/ember-attacher/pull/97) ([kybishop](https://github.com/kybishop))
- BREAKING\(update popper dep\) target arg is now popperTarget [\#96](https://github.com/kybishop/ember-attacher/pull/96) ([kybishop](https://github.com/kybishop))

## [v0.12.2](https://github.com/kybishop/ember-attacher/tree/v0.12.2) (2017-11-28)
[Full Changelog](https://github.com/kybishop/ember-attacher/compare/v0.12.1...v0.12.2)

**Closed issues:**

- Causes my builds to fail? [\#87](https://github.com/kybishop/ember-attacher/issues/87)
- hideOn and showOn broken when undefined [\#76](https://github.com/kybishop/ember-attacher/issues/76)

**Merged pull requests:**

- fix\(initial positioning\) larger attachments stay in window more reliably [\#91](https://github.com/kybishop/ember-attacher/pull/91) ([kybishop](https://github.com/kybishop))
- fix\(hideOn/showOn set to '' should set them to null\) [\#89](https://github.com/kybishop/ember-attacher/pull/89) ([kybishop](https://github.com/kybishop))
- feat\(use defaults for hideOn/showOn when passed undefined\) [\#88](https://github.com/kybishop/ember-attacher/pull/88) ([kybishop](https://github.com/kybishop))

## [v0.12.1](https://github.com/kybishop/ember-attacher/tree/v0.12.1) (2017-11-04)
[Full Changelog](https://github.com/kybishop/ember-attacher/compare/v0.12.0...v0.12.1)

**Closed issues:**

- Dev-mode currently borked for v0.12.0 [\#84](https://github.com/kybishop/ember-attacher/issues/84)

**Merged pull requests:**

- chore\(bump deps\) ember-popper for bugfix [\#85](https://github.com/kybishop/ember-attacher/pull/85) ([kybishop](https://github.com/kybishop))

## [v0.12.0](https://github.com/kybishop/ember-attacher/tree/v0.12.0) (2017-11-03)
[Full Changelog](https://github.com/kybishop/ember-attacher/compare/v0.11.4...v0.12.0)

**Closed issues:**

- Testing [\#40](https://github.com/kybishop/ember-attacher/issues/40)

**Merged pull requests:**

- Update readme [\#83](https://github.com/kybishop/ember-attacher/pull/83) ([kybishop](https://github.com/kybishop))
- fix\(css\) better tooltip widths [\#82](https://github.com/kybishop/ember-attacher/pull/82) ([kybishop](https://github.com/kybishop))
- BREAKING\(get rid of inner component\) [\#81](https://github.com/kybishop/ember-attacher/pull/81) ([kybishop](https://github.com/kybishop))
- Set aria-hidden when showing/hiding [\#80](https://github.com/kybishop/ember-attacher/pull/80) ([rwwagner90](https://github.com/rwwagner90))
- chore\(upgrade deps\) ember 2.16, etc. [\#79](https://github.com/kybishop/ember-attacher/pull/79) ([kybishop](https://github.com/kybishop))
- Move mixins to separate file, reduce redundant styles [\#78](https://github.com/kybishop/ember-attacher/pull/78) ([rwwagner90](https://github.com/rwwagner90))

## [v0.11.4](https://github.com/kybishop/ember-attacher/tree/v0.11.4) (2017-10-18)
[Full Changelog](https://github.com/kybishop/ember-attacher/compare/v0.11.3...v0.11.4)

**Closed issues:**

- Feature Request - Lazy Render [\#74](https://github.com/kybishop/ember-attacher/issues/74)

**Merged pull requests:**

- Support innerClass option [\#77](https://github.com/kybishop/ember-attacher/pull/77) ([rwwagner90](https://github.com/rwwagner90))
- Adds lazyRender support [\#75](https://github.com/kybishop/ember-attacher/pull/75) ([Duder-onomy](https://github.com/Duder-onomy))

## [v0.11.3](https://github.com/kybishop/ember-attacher/tree/v0.11.3) (2017-09-22)
[Full Changelog](https://github.com/kybishop/ember-attacher/compare/v0.11.2...v0.11.3)

**Closed issues:**

- Cannot find module package.json [\#72](https://github.com/kybishop/ember-attacher/issues/72)
- Syntax error in IE 11 on development build [\#71](https://github.com/kybishop/ember-attacher/issues/71)

**Merged pull requests:**

- fix\(filters\) downgrade babel-plugin-filter-imports [\#73](https://github.com/kybishop/ember-attacher/pull/73) ([kybishop](https://github.com/kybishop))
- feat\(isVisible test helper\) [\#70](https://github.com/kybishop/ember-attacher/pull/70) ([kybishop](https://github.com/kybishop))
- chore\(showOn tests\) focus and mouseenter [\#69](https://github.com/kybishop/ember-attacher/pull/69) ([kybishop](https://github.com/kybishop))

## [v0.11.2](https://github.com/kybishop/ember-attacher/tree/v0.11.2) (2017-09-20)
[Full Changelog](https://github.com/kybishop/ember-attacher/compare/v0.11.1...v0.11.2)

**Merged pull requests:**

- fix\(perf\) manually add run loop to RAF calls [\#68](https://github.com/kybishop/ember-attacher/pull/68) ([kybishop](https://github.com/kybishop))

## [v0.11.1](https://github.com/kybishop/ember-attacher/tree/v0.11.1) (2017-09-16)
[Full Changelog](https://github.com/kybishop/ember-attacher/compare/v0.11.0...v0.11.1)

**Merged pull requests:**

- chore\(bump deps\) ember-popper 0.6.4, etc. [\#67](https://github.com/kybishop/ember-attacher/pull/67) ([kybishop](https://github.com/kybishop))

## [v0.11.0](https://github.com/kybishop/ember-attacher/tree/v0.11.0) (2017-09-08)
[Full Changelog](https://github.com/kybishop/ember-attacher/compare/v0.10.6...v0.11.0)

**Closed issues:**

- Document attach-tooltip in the README [\#60](https://github.com/kybishop/ember-attacher/issues/60)
- Bug? Multiple tooltips can open when browser loses/gains focus. [\#54](https://github.com/kybishop/ember-attacher/issues/54)

**Merged pull requests:**

- Update readme [\#66](https://github.com/kybishop/ember-attacher/pull/66) ([kybishop](https://github.com/kybishop))
- Attach tooltip improvements and passthrough ariaRole [\#65](https://github.com/kybishop/ember-attacher/pull/65) ([kybishop](https://github.com/kybishop))

## [v0.10.6](https://github.com/kybishop/ember-attacher/tree/v0.10.6) (2017-09-07)
[Full Changelog](https://github.com/kybishop/ember-attacher/compare/v0.10.5...v0.10.6)

**Merged pull requests:**

- Use RAF for animations [\#63](https://github.com/kybishop/ember-attacher/pull/63) ([kybishop](https://github.com/kybishop))
- fix\(more foolproof initial position\) [\#62](https://github.com/kybishop/ember-attacher/pull/62) ([kybishop](https://github.com/kybishop))

## [v0.10.5](https://github.com/kybishop/ember-attacher/tree/v0.10.5) (2017-09-05)
[Full Changelog](https://github.com/kybishop/ember-attacher/compare/v0.10.4...v0.10.5)

**Closed issues:**

- Popover/tooltip doesn't reposition on sharp browser resize. [\#43](https://github.com/kybishop/ember-attacher/issues/43)

**Merged pull requests:**

- chore\(bump deps\) ember-cli, ember-popper, etc. [\#61](https://github.com/kybishop/ember-attacher/pull/61) ([kybishop](https://github.com/kybishop))

## [v0.10.4](https://github.com/kybishop/ember-attacher/tree/v0.10.4) (2017-09-01)
[Full Changelog](https://github.com/kybishop/ember-attacher/compare/v0.10.3...v0.10.4)

**Closed issues:**

- Adding aria-describedby attribute to target? [\#37](https://github.com/kybishop/ember-attacher/issues/37)
- How to test usage of addon? [\#34](https://github.com/kybishop/ember-attacher/issues/34)

**Merged pull requests:**

- fix\(initial position\) more foolproof when using isShown [\#59](https://github.com/kybishop/ember-attacher/pull/59) ([kybishop](https://github.com/kybishop))
- Test fixups [\#58](https://github.com/kybishop/ember-attacher/pull/58) ([kybishop](https://github.com/kybishop))
- feat\(attach-tooltip component\) has expected tooltip defaults [\#57](https://github.com/kybishop/ember-attacher/pull/57) ([kybishop](https://github.com/kybishop))
- chore\(remove jquery\) [\#56](https://github.com/kybishop/ember-attacher/pull/56) ([kybishop](https://github.com/kybishop))
- chore\(tests for hideOn='mouseleave'\) [\#55](https://github.com/kybishop/ember-attacher/pull/55) ([kybishop](https://github.com/kybishop))

## [v0.10.3](https://github.com/kybishop/ember-attacher/tree/v0.10.3) (2017-08-29)
[Full Changelog](https://github.com/kybishop/ember-attacher/compare/v0.10.2...v0.10.3)

**Closed issues:**

- Regression? attacher's hide action does not hide on subsequent interaction [\#53](https://github.com/kybishop/ember-attacher/issues/53)
- hideOn support for pressing the escape key [\#36](https://github.com/kybishop/ember-attacher/issues/36)

**Merged pull requests:**

- Update README.md examples [\#52](https://github.com/kybishop/ember-attacher/pull/52) ([GCheung55](https://github.com/GCheung55))
- feat\(hideOn escapekey\) [\#51](https://github.com/kybishop/ember-attacher/pull/51) ([kybishop](https://github.com/kybishop))

## [v0.10.2](https://github.com/kybishop/ember-attacher/tree/v0.10.2) (2017-08-28)
[Full Changelog](https://github.com/kybishop/ember-attacher/compare/v0.10.1...v0.10.2)

**Closed issues:**

- Add hideOn support for clickout [\#39](https://github.com/kybishop/ember-attacher/issues/39)

**Merged pull requests:**

- feat\(hideOn clickout\) [\#50](https://github.com/kybishop/ember-attacher/pull/50) ([kybishop](https://github.com/kybishop))

## [v0.10.1](https://github.com/kybishop/ember-attacher/tree/v0.10.1) (2017-08-28)
[Full Changelog](https://github.com/kybishop/ember-attacher/compare/v0.10.0...v0.10.1)

**Closed issues:**

- isShown, showOn, and hideOn do not work together [\#25](https://github.com/kybishop/ember-attacher/issues/25)

**Merged pull requests:**

- feat\(onchange hook on visibility change\) [\#49](https://github.com/kybishop/ember-attacher/pull/49) ([kybishop](https://github.com/kybishop))
- fix\(isShown and initial positioning + multi-hide bugs\) [\#48](https://github.com/kybishop/ember-attacher/pull/48) ([kybishop](https://github.com/kybishop))

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