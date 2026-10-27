# media-player

The one video and audio player for all of my projects: a notched, labeled seek scale with large
elapsed and remaining times, YouTube-style keys plus jump-back, markers, frame steps, repeat, resume
and `#t=` links. Plain JavaScript and CSS, no dependencies, no build step, no network requests.

What it does and why: [SPEC.md](SPEC.md).

## Use it in a page

Keep `controls` (the page still plays without the script) and add `data-media-player`:

```html
<link rel="stylesheet" href="/static/media-player/media-player.css">

<video controls preload="metadata" src="/files/talk.mp4" data-media-player data-title="Talk"></video>
<audio controls preload="metadata" src="/files/memo.m4a" data-media-player data-duration="5400"></audio>

<script src="/static/media-player/media-player.js"></script>
```

The script enhances every `video[data-media-player]` and `audio[data-media-player]` once the page has
loaded. The player takes the full width of its parent.

| Attribute | Meaning |
|---|---|
| `data-title` | Name for screen readers and the system's media controls |
| `data-duration` | Length in seconds, to draw the scale before the file's own length is known |
| `data-markers` | JSON list of `{"t": seconds, "label": "text"}` shown on the scale; optional `"kind"` and `"id"` |
| `data-markers-label` | What the markers are ("Chapter", "Speaker change"); default "Marker" |
| `data-marker-kinds` | JSON list of `{"kind": "todo", "label": "Todo", "color": "#f97316"}`, most important first, for markers of several kinds |
| `data-fps` | Frames per second, when known, for exact frame steps |
| `data-resume-key` | Key for the remembered position; default the media URL's path |
| `data-resume="off"` | Do not remember or offer the position |
| `data-half-jumps` | Show the half-jump buttons (Shift+J and Shift+L work without them) |
| `data-skips` | Seconds to have skip buttons for, such as `"30"`; default `"5 30"`. On narrow players only the smallest stays |
| `data-wide` | Offer wide page (T): the class `mp-wide` on `<html>`, which your CSS turns into a wider layout |
| `data-sound="off"` | The media has no sound: no volume controls or keys |
| `loop` | The element's own attribute: open with repeat on, which R and the repeat button switch |

## Copy it into a project

Each project keeps its own copy of the two files in `web/`; nothing loads them from this checkout,
since nothing guarantees it sits next to a project. Copy them with

```sh
./copy-into.sh ~/proj/some-project/static/media-player
```

which also writes `media-player.sha256`, their checksums. Have the project's tests compare the copy
with it, so a copy edited in place fails them: a fix is made here and then copied again. `VERSION`
in `media-player.js` says which version a copy is.

Serve the copy as one of the project's own static files, with something in the URL or the cache
headers that makes browsers fetch a new copy: the file's modification time (matthoom's template
tag, `core/templatetags/media_player.py`) or `Cache-Control: no-cache`.

The server that serves the media must answer HTTP Range requests (206 Partial Content), or jumping
into large files fails.

## Script API

```js
const player = MediaPlayer.enhance(videoElement, { title: 'Talk', markers: [{ t: 90, label: 'Q&A' }] });
player.setMarkers([{ t: 12, label: 'Speaker 2' }], 'Speaker change');
player.setMarkers(markers, { kinds: [{ kind: 'todo', label: 'Todo', color: '#f97316' }, { kind: 'note', label: 'Note' }] });
player.seek(95, 'Q&A');   // jump and show a label
player.addControls(clockElement, checkboxLabel);   // page controls in the player's controls row
player.setItems({ label: 'Part', previous: () => showPart(1), next: null });   // Shift+P, Shift+N
player.focus();                        // after a click on a page list that drives the player
player.toggleCaptions();               // as the C key; also toggleWide(), toggleKind('note'), saveFrame()
player.toggleRepeat();                 // as the R key; toggleRepeat(true) or toggleRepeat(false) sets it
MediaPlayer.get(videoElement);         // the player for an element, if enhanced
MediaPlayer.enhanceAll(container);     // enhance media added to the page later

// Keep saved frames yourself instead of downloading them:
MediaPlayer.enhance(videoElement, { saveFrame: ({ time, blob }) => upload(time, blob).then(() => 'Saved') });

// Follow the player: seeks it made, the current marker, captions, repeat, wide page.
document.addEventListener('media-player:marker', (event) => highlight(event.detail.marker));
```

Everything else goes through the media element itself: set `currentTime`, call `play()`, listen for
`timeupdate`. The player follows.

Media that is not one element (camera videos on one clock, an embedded player) plays through a
source, an object that acts like a media element:

```js
class Cameras extends MediaPlayer.Source { /* currentTime, duration, paused, play(), pause() ... */ }
MediaPlayer.attach(new Cameras(videos), { stage: gridElement, kind: 'video', sound: false });
```

What a source provides, and the events with their details: [SPEC.md](SPEC.md), "Sources" and
"Events".

## Theme it

Map your design tokens onto these custom properties on `.mp`; the defaults are white on black:

| Property | Used for |
|---|---|
| `--mp-bg`, `--mp-text`, `--mp-border` | Player background, all text and lines, borders |
| `--mp-accent`, `--mp-accent-text` | Played part, thumbs, play and resume buttons, the edge while the player has focus |
| `--mp-hover` | Button hover background |
| `--mp-buffered` | Downloaded part of the track |
| `--mp-marker` | Markers on the track (kinds with their own color use that) |
| `--mp-error` | Error frame |
| `--mp-media-bg` | Behind the video picture |
| `--mp-overlay-bg`, `--mp-overlay-text`, `--mp-overlay-hover` | Flash messages, hover times, full screen controls |
| `--mp-font`, `--mp-radius`, `--mp-radius-sm` | Font and corners |
| `--mp-fs-value`, `--mp-fs-control`, `--mp-fs-small` | Sizes of the times, controls and labels |
| `--mp-control-size` | Height of the buttons, and the least width of each; default `2.25em` of the control size. Large tap targets (58px for use while driving) without large labels |
| `--mp-video-max-height` | Tallest the picture gets outside full screen |
| `--mp-thumb` | Size of the slider thumbs |

```css
.mp {
    --mp-bg: var(--surface);
    --mp-text: var(--text);
    --mp-accent: var(--accent);
}
```

Keep text at full strength (white on dark, black on light); the player never fades or grays text.

## Try it and test it

```sh
demo/make-media.sh     # once: makes demo/media with ffmpeg
demo/serve.py 8000     # then open http://127.0.0.1:8000/demo/
node --test            # unit tests for the time, scale, marker and key logic, and copy-into.sh
```

`demo/serve.py` answers Range requests, which `python3 -m http.server` does not; without them the
browser can only seek within what it has downloaded.

## Used by

Each keeps its copy in the folder named; a change here reaches one only when it is copied there.

- matthoom, `static/media-player/`: Files previews, recording pages, the YouTube archive page,
  chat video attachments and voice memos
- yt-archive, `yt_archive/static/media-player/`: video pages (the video, the MP3 audio, shots as
  markers)
- tesla-video-viewer, `web/media-player/`: the clip viewer's camera grid, through a source
- voice-wei, the repository root (its deploys ship top-level files only): Books' listening player
