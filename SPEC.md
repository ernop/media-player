# media-player: spec and decisions

The one video and audio player for all of my projects. Every page that plays a file uses this
library instead of the browser's native controls or a player of its own. This file is the source of
truth for what the player does and why; change it in the same task as the code.

## Where it came from

Three of my projects had their own players. This library merges the best parts of each:

| Project | Taken from it |
|---|---|
| yt-archive (`yt_archive/static/player.js`) | The key map (J/K/L, arrows, `,` `.` frame steps, 0-9, PageUp/PageDown for chapters), speed steps, resume position, `#t=` links, flash messages, keys panel |
| voice-wei (`player-playlist.js`, `player.css`) | The notched, labeled seek scale with large elapsed and remaining times beside it |
| tesla-video-viewer (`web/app.js`) | Ctrl+Left/Right for one minute |

New here: Backspace returns from a jump, markers snap under the pointer, the frame step is measured
from the video, video scrubbing uses fast seeking, the volume slider has its own scale, the Media
Session handles the system's media keys, and errors are explained in the player.

## How it is used

- **Progressive enhancement.** A page writes a plain `<video controls>` or `<audio controls>` with
  `data-media-player`. Without the script it still plays with native controls. The script hides
  the native controls and draws its own around the element.
- **The media element stays the source of truth.** Page scripts keep using the element itself:
  they read and set `currentTime`, call `play()`, and listen for `timeupdate` and the other events.
  The player follows whatever the element does, whoever caused it.
- **Media that is not one element plays through a source.** Camera videos that share one clock, or
  an embedded YouTube player, are wrapped in an object that acts like a media element and given to
  `MediaPlayer.attach()` with the page element that shows them (see "Sources").
- **Each project keeps its own copy.** `copy-into.sh <folder>` copies `web/media-player.js` and
  `web/media-player.css` into the project with `media-player.sha256`, their checksums. The project's
  tests fail on a copy that differs from them, so a copy is never edited: fixes are made here and
  copied out again. `VERSION` names the version a copy is. Each project serves its copy so that
  browsers fetch a new one (the file's modification time in the URL, or `no-cache`).
- **No dependencies, no build step, no network requests.** The files are plain browser JavaScript and
  CSS. The player never loads fonts, scripts or anything else from another server and sends nothing
  anywhere.
- **Servers must answer HTTP Range requests (206 Partial Content).** Without them a browser cannot
  jump into the part of a large file it has not downloaded yet.

## Layout

- **Video:** the picture on top, filling the player's width with its aspect ratio kept (letterboxed
  on `--mp-media-bg`) and at most `--mp-video-max-height` tall. Below it the seek scale, then the
  controls. A large play button covers the picture until playback first starts. Clicking the picture
  plays or pauses; double-clicking toggles full screen.
- **Audio:** the seek scale and the controls, in a box as wide as its parent.
- **Controls row:** previous item, play/pause, next item (the item buttons only after `setItems()`);
  -30, -5, +5, +30 s (the `skips` option picks other amounts: a page whose listeners never need 5 s
  steps, such as an audiobook, can show only ±30 s, and a single pair stays on narrow players);
  "Half back" and "Half fwd" (with the `halfJumps` option); speed with - and +
  around the value; mute and the volume slider with its value (not for media without sound); one
  legend button per kind of marker; then, at the right, resume, repeat, captions, save frame, wide
  page, picture in picture, full screen and the keys panel button (each only when it applies).
  A page can move its own controls that belong to playback (a wall-clock time at the playhead, a
  "Follow the playhead" checkbox) into this row with `addControls()`, after the player's controls on
  the left, so the player keeps the full width instead of sharing a row with them.
- **Narrow players** (container queries on the player's own width): below 44rem the larger skip
  buttons (all but the smallest pair, so ±30 s by default), the names in the marker legend (its
  swatches and counts stay) and the word "Speed" go; below 30rem the volume slider (its number and the
  mute button stay) and the legend go, and the times shrink. The controls wrap rather than overflow.
  The half-jump buttons stay at every width: a page asks for them because its listeners move that way,
  and phones, where the keys are missing, need them most.
- **Full screen** shows the whole player: the picture fills the screen and the scale and controls sit
  over its bottom on `--mp-overlay-bg`. While playing they hide after 2.5 s without pointer or key
  input, and come back on any movement.

## Seek scale

- Elapsed time on the left, remaining time (with a minus sign) on the right, both in the largest,
  boldest type in the player with tabular figures, so they are the first thing the eye finds.
- The remaining time is the whole length minus the whole elapsed time, so the two always add up to the
  length printed at the right end of the scale.
- Times are `m:ss`, or `h:mm:ss` when the length is an hour or more, with tenths when the length is
  under 10 seconds.
- **Notches:** labeled notches are as close together as their labels allow (the widest label plus
  16 px), on round intervals (0.1, 0.2, 0.5, 1, 2, 5, 10, 15, 30 s; 1, 2, 5, 10, 15, 30 min;
  1, 2, 3, 6, 12 h). Unlabeled minor notches divide each interval evenly when they can be at least
  8 px apart, at most 10 per interval. Both ends are always labeled, aligned inside the scale; a
  centered label too close to an end label is left out. The scale is redrawn whenever the player's
  width or the media's length changes, so a wider player shows a finer scale.
- The track shows played (accent), downloaded (`--mp-buffered`) and markers (`--mp-marker`, or the
  color of their kind), and animated stripes while the browser waits for data. The marker the
  playhead is at or past is drawn taller and wider, so the scale shows which part is playing.
- **Pointer:** pressing anywhere on the track jumps there; dragging scrubs. While dragging, video uses
  `fastSeek()` (nearest keyframe, fast) and the release goes to the exact spot. Hovering shows the time
  under the pointer and, over a marker, the marker's label. A press within 6 px of a marker lands
  exactly on it.
- The track is a focusable `role="slider"` with `aria-valuetext` such as "1:14 of 2:30".

## Volume slider

A range input from 0 to 100 with a notch every 10, longer notches with the numbers 0, 50 and 100 under
it, and the current value next to it in bold ("Muted" while muted). The notches line up with where the
slider's thumb actually sits.

## Keys

The `KEYS` table in `web/media-player.js` drives both the key handler and the keys panel (`?`). The
panel lists only the keys that do something on that player.

| Keys | Action | Where |
|---|---|---|
| Space, K | Play or pause | Page |
| Left, Right | Back or forward 5 s; with Shift 1 s; with Ctrl 1 min | Page |
| J, L | Back or forward 10 s | Page |
| Shift+J | Back to half the time played | Page |
| Shift+L | Forward to as far before the end as the playhead is after the start; past the middle, halfway to the end | Page |
| 0 to 9 | Jump to 0% to 90% of the way through | Page |
| Backspace | Back to where the last jump left; pressed again, back to where it went | Page |
| PageUp, PageDown | Previous or next marker of the kinds shown (when there are markers) | Player |
| PageUp, PageDown | Back or forward 1 min (when there are no markers) | Player |
| Home, End | Start or end | Player |
| Shift+P, Shift+N | Previous or next item (after `setItems()`) | Page |
| `,` `.` | Previous or next frame; pauses (video) | Page |
| `<` `>`, `[` `]` | Slower or faster | Page |
| R | Repeat on or off | Page |
| Up, Down | Volume up or down 5% (media with sound) | Player |
| M | Mute or unmute (media with sound) | Page |
| C | Captions on or off (video with a captions or subtitles track) | Page |
| S | Save the frame showing as a picture (video) | Page |
| T | Wide page or normal width (with the `wide` option) | Page |
| F, double-click | Full screen (video) | Page |
| I, P | Picture in picture (video, where the browser offers it) | Page |
| ? | Show or hide the keys panel | Page |
| Esc | Close the keys panel | Page |

- **Page** keys work wherever focus is on the page; **Player** keys only after clicking or tabbing into
  the player, because the page needs Up, Down, Home, End, PageUp and PageDown for scrolling. A page
  whose own elements drive the player (a list of shots to click) calls `player.focus()` on a click, so
  PageUp and PageDown then step from there. While focus is anywhere in the player, mouse click
  included, its edge is drawn in the accent color, so it is clear when these keys go to the player.
- Letters work the same with Caps Lock on. Shift makes a letter another key: J and Shift+J do
  different things.
- Held keys repeat only where repeating means moving further (arrows, J, L, the half jumps, 0 to 9,
  PageUp and PageDown, frames, speed, volume). Keys that switch something or act once (play, mute,
  repeat, captions, save frame, wide page, full screen, picture in picture, the keys panel,
  Backspace, the item keys) act once per press, so holding S saves one picture.
- When a page has several players, page keys go to the one last played, clicked or focused; with
  exactly one player they go to it. A player inside something hidden (another view of a one-page app)
  takes no page keys.
- The focused element keeps the keys it needs: every key while typing in a text field, text area,
  select or editable content; Space on buttons, links, checkboxes and the like; and arrow, Home, End
  and Page keys on sliders, radio buttons, tabs, menus and lists. The player's own position slider is
  the exception: it takes all of the player's keys.
- After a mouse click on one of the player's buttons, focus moves to the player itself, so the next
  Space plays or pauses instead of pressing that button again. A keyboard press keeps focus on the
  button.
- Keys with Alt or Meta are never taken, and with Ctrl only Ctrl+Left and Ctrl+Right.

## Jumping

- **Jump back (Backspace).** Any seek of 15 s or more records where it left from, whoever made it:
  keys, the scale, a page script setting `currentTime`, a `#t=` link. Backspace returns there and
  records the spot it left, so pressing it again goes back again. Small skips (arrows, ±5 s) are not
  jumps and leave the recorded spot alone.
- **Percent jumps.** 0 to 9 jump to that tenth of the length.
- **Half jumps.** Shift+J goes back to half the time played (from 40:00 to 20:00), for finding a spot
  by halving. Shift+L goes forward to the mirror point, as far before the end as the playhead is after
  the start (from 10:00 in a 60:00 file to 50:00); past the middle there is no mirror point ahead, so
  it goes halfway to the end. The `halfJumps` option (`data-half-jumps`) also shows them as buttons.
- **Markers.** A page passes markers (chapters, speaker changes, events) as `data-markers`, a JSON list
  of `{"t": seconds, "label": "text"}`, and names them with `data-markers-label` ("Chapter"). They show
  on the track and in the legend, the pointer snaps to them, and PageUp and PageDown move between them
  (with focus in the player). Going back skips a marker less than a second behind, so pressing again
  keeps moving back while playing. Going forward skips a marker less than a quarter second ahead: it
  is about to play anyway, and a jump that lands a hair before its marker does not find that marker
  again. A marker without a time is a page bug and stops the player with an error. A marker may carry
  an `id`, which comes back in the marker event so the page can find its own item, and a `color` of
  its own, which wins over its kind's (every sighting of one car in one color).
- **Kinds of markers.** Markers of several kinds (spoken todos, notes, speaker changes) share one
  scale: `data-marker-kinds` lists the kinds as `[{"kind": "todo", "label": "Todo", "color": "#…"}]` in
  order of importance, and each marker names its `kind`. The first kind is drawn on top where markers
  overlap. A marker of a kind not in the list is a page bug and stops the player with an error. The
  legend has a button per kind with its color, name and count; pressing it hides that kind from the
  scale, and PageUp and PageDown then pass over it. Hidden kinds are not remembered: the next page
  view shows every kind.
- **The current marker.** The last marker at or before the playhead is drawn taller on the scale, and
  each change is announced as a `media-player:marker` event, so a page can follow along (a shot strip,
  a chapter list).
- **Frame steps.** `,` and `.` pause and move one frame. The frame length is the smallest gap between
  frames the video has shown while playing (`requestVideoFrameCallback`), or `data-fps` when the page
  knows it, or 1/30 s before either is known.

## Repeat

- **R and the repeat button** (two arrows in a loop, filled in the accent color while on) switch
  repeat on or off, and a flash message says which. With repeat on, the media starts again from the
  start each time it reaches the end, and keeps playing.
- **Repeat is the media's `loop`.** The button shows the element's `loop`, and switching repeat sets
  it, so a page that writes `<video loop>` (an animated GIF kept as a video) opens with repeat on,
  and a page script that changes `loop` shows at once. The browser repeats an element by itself,
  without a gap and without an `ended` event, so a page that goes on to its next item when one ends
  stays on the one repeating. `loop` belongs to the element, not to its file: repeat stays on when
  the page gives the element another file (the next part of a book).
- **Starting again is not a jump.** With repeat on, a seek from the last 2 s to the first 2 s is the
  media starting again, and Backspace still goes back to where the last jump left.
- **Not remembered.** Each page view starts with the page's `loop`, off when the element has none.
- A source repeats through a `loop` of its own ("Sources").

## Address and remembered settings

- **`#t=` in the page address** starts the first player on the page at that time. It accepts `93.5`,
  `93.5s`, `1:33`, `1:02:03`, `1h2m3s`, and the Media Fragments forms `npt:93.5` and `93.5,120` (the end
  is ignored). On load the jump is silent; when the fragment changes later, the player jumps and shows
  the time. A `t=` it cannot read is reported in the player, not ignored.
- **Resume.** For media of 2 minutes or more, the position is saved every 5 s while playing, on pause
  and when leaving the page, keyed by the media's URL path. On the next visit a "Resume at 12:34" button
  appears; the player never jumps there by itself, because an unexpected jump is worse than one click.
  A position within 5 s of either end is forgotten. A `#t=` link replaces the resume offer.
  `data-resume="off"` turns this off for a player.
- **Speed** is remembered separately for video and for audio (people listen to recordings faster than
  they watch video); **volume** is shared. Muting is not remembered, and neither is repeat. Until
  someone changes the volume, the player keeps the level the page gave the element (a site may play
  media below full volume), and unmuting a player whose volume is at 0 returns to that level.
- **Captions** on or off and **wide page** on or off are remembered and shared by every player on the
  site: someone who reads captions wants them on the next video too.
- Everything is kept in the browser's local storage under keys starting `media-player:`, separately for
  each site. If the browser refuses storage, the player still works and the keys panel says that
  nothing is remembered.

## Errors

- A file that cannot play shows the reason in the player (loading stopped, network error, cannot
  decode, unsupported format or file not loadable), with the browser's own message when it gives one.
  This includes files that failed before the script ran.
- A refused `play()` (other than a pause that interrupted it) is shown the same way.
- A player that cannot start (for example invalid `data-markers`) puts the reason next to the element,
  logs the error to the console, and leaves the native controls in place.
- Refused full screen or picture in picture is shown in the flash message.

## System media controls

The player that last started playing claims the Media Session: the keyboard's media keys, headset
buttons and the system's media controls play, pause, skip and seek it, and the system shows its title
(`data-title`, or the page title) and position. With items, the previous and next track buttons move
between them.

## Items

A page whose media comes in parts (the parts of a book, the files in a list) calls
`player.setItems({label: 'Part', previous, next})`, where `previous` and `next` are functions that
switch to that item, or null at either end. The player shows previous and next buttons beside play
(dashed when there is none), takes Shift+P and Shift+N, and hands the system's previous and next track
buttons to them. The page switches the item itself, usually by giving the element another file, and
calls `setItems()` again for the new item; `setItems(null)` removes the buttons. When the element is
given another file, the player forgets the jump-back spot and the resume offer, and takes the
remembered position's key from the new file.

## Saving frames

S and the camera button save the frame showing. By default the browser downloads it as a PNG named
after the title and the time ("Talk 12-34.567.png"). A page that keeps frames itself passes
`saveFrame`, a function given `{time, blob, player}` that may return a promise of the message to show
("Saved to the gallery"). For a source, `blob` is null: only the page can draw a source's picture.
Failures show in the flash message; a video from another site without CORS headers cannot be captured.

## Wide page

With the `wide` option (`data-wide`), T and a button switch the class `mp-wide` on the page's `<html>`
element. The page's CSS decides what wide means (a wider column, a hidden sidebar); the player only
switches the class, remembers it, and sends `media-player:wide`.

## Events

The player sends these events from its root element (`.mp`). They bubble, so a page can listen on
`document`; `event.detail.player` is the player.

| Event | `detail` | When |
|---|---|---|
| `media-player:seek` | `from`, `to`, `cause` | The player moved the playhead. `cause`: `skip`, `percent`, `marker`, `half-back`, `half-forward`, `jump-back`, `start`, `end`, `frame`, `scale`, `resume`, `address`, `media-session` |
| `media-player:marker` | `index`, `marker` | The current marker changed (`index` -1 and `marker` null before the first one) |
| `media-player:captions` | `showing` | Captions were switched on or off |
| `media-player:repeat` | `repeat` | Repeat was switched on or off |
| `media-player:wide` | `wide` | Wide page was switched on or off |

What page scripts do themselves, a seek or setting `loop`, is not announced: the page already knows
about it, and the element's own `seeking` and `seeked` events report every seek, repeat starting
the media again included.

## Sources

A source stands in for the media element when the media is not one `<video>` or `<audio>`: camera
videos that must play on one clock, or a player embedded from another site. It is an object that
acts like a media element, usually a subclass of `MediaPlayer.Source`:

- **Properties the player reads:** `currentTime` (also set), `duration`, `paused`, `ended`, `seeking`,
  `playbackRate` and `defaultPlaybackRate` (also set); `volume` and `muted` (also set) unless the
  player has `sound: false`; `loop` (also set), which `MediaPlayer.Source` keeps, off until
  switched; and, when it has them, `readyState` (by default 1 once `duration` is known), `buffered`,
  `error` and `textTracks`.
- **Methods:** `play()` (may return a promise) and `pause()`.
- **Events,** sent with `emit(name)` under the media element's names: `loadedmetadata`,
  `durationchange`, `play`, `playing`, `pause`, `ended`, `timeupdate`, `seeking`, `seeked`, `waiting`,
  `canplay`, `progress`, `ratechange`, `volumechange`, `error`, `loadstart`, `emptied`. As with a
  media element, `currentTime` already gives the new time when `seeking` is sent: the player notes
  where a jump left from on `seeking`, for Backspace.
- **Repeat.** An element repeats by itself; a source cannot, since only its page knows how to play
  it again, so the player does it. When a source sends `ended` with `loop` on, the player seeks it
  to 0 and plays it, once the page's own handlers for `ended` have run, and not if one of them
  started it playing (a page that went on to its next item). This start again is not announced as a
  seek, as the browser's for an element is not. A source without `loop`, one not made from
  `MediaPlayer.Source` that does not provide it, has no repeat button and no R.

`MediaPlayer.attach(source, {stage, kind, ...})` builds the player around `stage`, the page element
that shows the source, and takes the same options as `enhance()`. `kind` ('video' or 'audio') is
required, since a source has no tag name to tell. The stage gets the class `mp-source`. Clicks on the
stage are left to the page (a camera grid enlarges a camera on click); double-click still toggles full
screen. Picture in picture is not offered for a source, and a source has no remembered position
unless the page gives it a `resumeKey`.

## Look

- Every text is `--mp-text` at full strength (white on dark, black on light). Secondary text is
  smaller or lighter in weight, never gray or faded. Disabled buttons get a dashed border instead of
  faded text. Flash messages appear and disappear without fading.
- The values (elapsed, remaining, speed, volume) are bold and larger than their labels and units.
- Every row in the keys panel is one line; descriptions that do not fit end in an ellipsis and show in
  full on hover. The panel's rows flow into as many columns as the player's width allows.
- The player fills its parent's width; nothing in it has a fixed pixel width.
- Colors, fonts, sizes and corners come from `--mp-*` custom properties (see `README.md`), so each
  project maps its own design tokens onto the player. Button size (`--mp-control-size`) is separate
  from label size, so a page used while driving can have 58px tap targets with labels that still let
  a phone fit two buttons per row.

## Testing

- `node --test` runs `tests/media-player.test.js`: time formatting and parsing, `#t=` reading, the
  notch spacing, speed steps, markers and their kinds, the half jumps, repeat starting again told
  from a jump, a source's `loop`, frame file names, and that no key, with or without Shift, does two
  things on any kind of player.
- `demo/index.html` shows a video with two kinds of markers, wide page, half jumps and frame saving;
  audio in parts; two cameras on one clock through a source; audio in a resizable box, with `loop`
  written by the page; and a missing file. A line at the top shows the player's events as they happen. `demo/make-media.sh` makes its
  media with ffmpeg (a test pattern with the time and frame number burned in, so seeks and frame steps
  can be read off the picture). `demo/serve.py` serves it with Range support, which
  `python3 -m http.server` lacks: without it the browser can only seek within what it has downloaded.

## Decisions

- **Plain script, not a framework or web component.** A page keeps its own `<video>` or `<audio>`
  element and its scripts keep working with it; the player needs no build and no shadow DOM to theme
  through.
- **Copies, not a sibling checkout** (owner, 2026-10-11: no project depends on another checkout
  sitting next to it, "we never have such guarantees"; every library a project uses is copied in).
  A project runs from its own checkout alone. The cost is that a fix reaches a project only when it
  is copied there; the checksums keep every copy unedited, so this repository stays the one place to
  fix. Until 2026-10-11 projects loaded the files from `../media-player`.
- **No automatic resume.** Offering a button is predictable; jumping on load surprises.
- **Repeat is the element's `loop`, not a setting of the player's** (2026-10-27). The browser
  repeats an element without a gap and without ending it, `<video loop>` and page scripts that set
  `loop` keep working, and the state lives in one place, the element, as speed and volume do.
- **Repeat is not remembered** (2026-10-27). Repeat is a choice about one file, a song or a short
  clip, while captions, speed and wide page are about the person. Carried to the next file, it
  would start again media nobody asked to hear twice: the same surprise as jumping on load.
- **R for repeat.** It is free among this player's keys and starts the word; L, which VLC and mpv
  use for looping, is 10 s forward here, as on YouTube.
- **Backspace for jump back.** Browsers no longer use it for page history, it is not used by the
  other players' keys, and "undo the jump" matches what it does in text.
- **Home, End, Up, Down, PageUp and PageDown only with focus in the player, with markers or
  without.** Taking them page-wide would break scrolling on pages that are mostly text, like
  transcripts, and pages with markers are often such pages: a recording above its transcript, a video
  above a long list of its shots. Clicking the player, or a page element that calls `focus()`, hands
  them over.
- **Shift+letter for the half jumps and items.** J, L and P are taken. Shift+J and Shift+L sit on the
  same keys as the 10 s jumps they extend, and Shift+P and Shift+N are YouTube's previous and next.
- **T widens the page** as it switches YouTube's theater mode, so the key people know keeps working;
  **S saves a frame** (snapshot), a letter no other action uses.
- **Kinds on one list of markers, not one list per kind.** Snapping, PageUp and PageDown and the
  current marker stay one sorted list; the kind only decides color, drawing order and whether it is
  shown.
- **Wide page is a class on `<html>`.** Only the page knows what wider means for its layout; the
  player switches the class and remembers it.
- **Sources act like media elements.** The player keeps one code path for everything it plays; a
  source only has to answer what an element answers and send the same events.
- **Events bubble from the player's root.** A page listens on `document` without holding on to the
  player object, and several players on a page are told apart by `detail.player`.
