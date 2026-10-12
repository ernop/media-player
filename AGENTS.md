# Agent instructions: media-player

The shared video and audio player for all of the user's projects. Read [SPEC.md](SPEC.md) before
changing anything; it holds the requirements and the decisions behind them. Usage and theming are in
[README.md](README.md).

Repository: [ernop/media-player](https://github.com/ernop/media-player), public (owner's choice,
2026-10-11), default branch `master`.

## Rules

- **Record decisions in SPEC.md in the same task.** New behavior, changed keys, new options: the spec
  changes with the code.
- **One table for keys.** Add or change keys only in `KEYS` in `web/media-player.js`; the key handler
  and the keys panel both read it. Update the key table in SPEC.md to match.
- **No dependencies, no build step, no network requests.** Never load fonts, scripts, images or
  anything else from another server, and never send anything anywhere.
- **The media element stays the source of truth.** Never keep a separate idea of the position, speed
  or volume; read the element and follow its events, so page scripts that use the element keep
  working. A source (SPEC.md, "Sources") stands in for the element and is read the same way; code
  that only works on a real element (`<source>` children, picture in picture, frame capture) checks
  `isElement`.
- **Keys declare what they need.** A `KEYS` entry lists the capabilities it needs (`needs`) or must
  not have (`without`) from `CAPABILITIES`; add a capability there and in `Player.capabilities()`
  rather than testing player state inside `match`.
- **Projects keep copies, never a path to this checkout** (owner, 2026-10-11). Each project has its
  own copy made by `./copy-into.sh <folder>`, with `media-player.sha256` for its tests, and never
  edits it. A change here reaches a project only when copied: bump `VERSION` in
  `web/media-player.js` (patch for fixes, minor for new options or behavior), copy it into the
  projects in "Used by" (README.md) that should have it, then run their tests and check their pages.
- **The user's UI rules apply:** one line per row; no gray or faded text (pure white on dark, pure
  black on light); values larger and bolder than their labels; full width, no fixed pixel widths for
  the layout; every slider shows notches, numbers at both ends and its current value; the layout
  follows the player's width; headings larger or heavier than what they head.
- **Surface errors.** No silent fallbacks: a failure shows in the player or next to the element.

## Checks

```sh
node --test                 # unit tests
demo/make-media.sh          # once: the demo's media
demo/serve.py 8000          # then open http://127.0.0.1:8000/demo/ in Firefox
```

After a visual change, look at the demo in Firefox (dark and light page, wide and narrow) and at the
pages of the projects that use the player.
