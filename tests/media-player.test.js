'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const mp = require('../web/media-player.js');

test('formatTime switches to hours and tenths only when asked', () => {
    assert.equal(mp.formatTime(0), '0:00');
    assert.equal(mp.formatTime(59.99), '0:59');
    assert.equal(mp.formatTime(61), '1:01');
    assert.equal(mp.formatTime(3723), '1:02:03');
    assert.equal(mp.formatTime(61, true), '0:01:01');
    assert.equal(mp.formatTime(5.67, false, true), '0:05.6');
    assert.equal(mp.formatTime(0.3, false, true), '0:00.3');
    assert.equal(mp.formatTime(-4), '0:00');
    assert.equal(mp.formatTime(NaN), '0:00');
    assert.equal(mp.formatTime(Infinity), '0:00');
});

test('formatPrecise shows milliseconds', () => {
    assert.equal(mp.formatPrecise(61.0333), '1:01.033');
    assert.equal(mp.formatPrecise(0.5, true), '0:00:00.500');
});

test('parseTime reads seconds, clock times and h/m/s', () => {
    assert.equal(mp.parseTime('93.5'), 93.5);
    assert.equal(mp.parseTime('90s'), 90);
    assert.equal(mp.parseTime('1:33'), 93);
    assert.equal(mp.parseTime('1:02:03'), 3723);
    assert.equal(mp.parseTime('1h2m3s'), 3723);
    assert.equal(mp.parseTime('2m'), 120);
    assert.equal(mp.parseTime(' 7 '), 7);
    assert.equal(mp.parseTime(''), null);
    assert.equal(mp.parseTime('soon'), null);
    assert.equal(mp.parseTime('1:2:3:4'), null);
});

test('timeFromHash finds t= among other fragment parts', () => {
    assert.equal(mp.timeFromHash(''), null);
    assert.equal(mp.timeFromHash('#section-2'), null);
    assert.equal(mp.timeFromHash('#t=93.5'), 93.5);
    assert.equal(mp.timeFromHash('#t=1:33'), 93);
    assert.equal(mp.timeFromHash('#t=1h2m3s'), 3723);
    assert.equal(mp.timeFromHash('#t=npt:10,20'), 10);
    assert.equal(mp.timeFromHash('#view=map&t=42'), 42);
    assert.ok(Number.isNaN(mp.timeFromHash('#t=soon')));
    assert.ok(Number.isNaN(mp.timeFromHash('#t=%E0%A4%A')));
});

test('chooseScale puts labeled notches as close as the labels allow', () => {
    assert.deepEqual(mp.chooseScale(600, 800, 30), { major: 60, minor: 10 });
    assert.deepEqual(mp.chooseScale(0.8, 800, 40), { major: 0.1, minor: 0 });
    assert.deepEqual(mp.chooseScale(20436, 1500, 52), { major: 1800, minor: 300 });
    assert.equal(mp.chooseScale(0, 800, 30), null);
    assert.equal(mp.chooseScale(600, 0, 30), null);
});

test('chooseScale never crowds labels and keeps minor notches dividing the major ones', () => {
    for (const duration of [0.5, 3, 9.9, 42, 150, 600, 3599, 3600, 7322, 20436, 86400]) {
        for (const width of [120, 300, 640, 1024, 1920, 3840]) {
            const labelPx = 44;
            const scale = mp.chooseScale(duration, width, labelPx);
            const majorPx = (scale.major / duration) * width;
            if (scale.major < 43200) {
                assert.ok(majorPx >= labelPx + 16, `${duration}s on ${width}px: labels ${majorPx}px apart`);
            }
            if (scale.minor) {
                const ratio = scale.major / scale.minor;
                assert.ok(Math.abs(ratio - Math.round(ratio)) < 1e-9, `${duration}s on ${width}px: ${scale.minor} does not divide ${scale.major}`);
                assert.ok((scale.minor / duration) * width >= 8);
            }
        }
    }
});

test('stepSpeed moves to the neighbouring speed and stops at the ends', () => {
    assert.equal(mp.stepSpeed(1, 1), 1.25);
    assert.equal(mp.stepSpeed(1, -1), 0.75);
    assert.equal(mp.stepSpeed(1.1, 1), 1.25);
    assert.equal(mp.stepSpeed(1.1, -1), 1);
    assert.equal(mp.stepSpeed(3, 1), 3);
    assert.equal(mp.stepSpeed(0.25, -1), 0.25);
});

test('normalizeMarkers sorts and refuses markers without a time', () => {
    assert.deepEqual(mp.normalizeMarkers(null), []);
    assert.deepEqual(mp.normalizeMarkers([{ t: 30, label: 'B' }, { t: '5' }]), [
        { t: 5, label: '', kind: '', id: null, color: '' },
        { t: 30, label: 'B', kind: '', id: null, color: '' },
    ]);
    assert.deepEqual(mp.normalizeMarkers([{ t: 1, kind: 'note', id: 7, color: 'hsl(40 55% 52%)' }]),
        [{ t: 1, label: '', kind: 'note', id: 7, color: 'hsl(40 55% 52%)' }]);
    assert.throws(() => mp.normalizeMarkers([{ label: 'no time' }]), /marker 0 has no time/);
    assert.throws(() => mp.normalizeMarkers([{ t: -1 }]), /marker 0/);
    assert.throws(() => mp.normalizeMarkers({ t: 1 }), /array/);
});

test('normalizeKinds keeps the order and refuses unnamed or repeated kinds', () => {
    assert.deepEqual(mp.normalizeKinds(undefined), []);
    assert.deepEqual(mp.normalizeKinds([{ kind: 'todo', label: 'Todo', color: '#f80' }, { kind: 'note', label: 'Note' }]), [
        { kind: 'todo', label: 'Todo', color: '#f80' },
        { kind: 'note', label: 'Note', color: '' },
    ]);
    assert.throws(() => mp.normalizeKinds([{ label: 'Todo' }]), TypeError);
    assert.throws(() => mp.normalizeKinds([{ kind: 'todo' }]), TypeError);
    assert.throws(() => mp.normalizeKinds([{ kind: 'a', label: 'A' }, { kind: 'a', label: 'B' }]), TypeError);
});

test('lastAtOrBefore finds the marker the playhead is at or past', () => {
    const times = [10, 60, 120];
    assert.equal(mp.lastAtOrBefore(times, 0), -1);
    assert.equal(mp.lastAtOrBefore(times, 10), 0);
    assert.equal(mp.lastAtOrBefore(times, 59.9), 0);
    assert.equal(mp.lastAtOrBefore(times, 60), 1);
    assert.equal(mp.lastAtOrBefore(times, 500), 2);
    assert.equal(mp.lastAtOrBefore([], 5), -1);
});

test('skipAmounts takes a list or a string, smallest first, and falls back to 5 and 30', () => {
    assert.deepEqual(mp.skipAmounts(undefined), [5, 30]);
    assert.deepEqual(mp.skipAmounts([30]), [30]);
    assert.deepEqual(mp.skipAmounts('30'), [30]);
    assert.deepEqual(mp.skipAmounts('30, 10 10'), [10, 30]);
    assert.deepEqual(mp.skipAmounts([0, -5, 'x']), [5, 30]);
});

test('halfJumpTarget halves back and mirrors forward until past the middle', () => {
    assert.equal(mp.halfJumpTarget(100, 1000, -1), 50);
    assert.equal(mp.halfJumpTarget(0, 1000, -1), 0);
    assert.equal(mp.halfJumpTarget(100, 1000, 1), 900);
    assert.equal(mp.halfJumpTarget(500, 1000, 1), 750);
    assert.equal(mp.halfJumpTarget(900, 1000, 1), 950);
    assert.equal(mp.halfJumpTarget(1000, 1000, 1), 1000);
});

test('frameFileName makes a safe file name with the time in it', () => {
    assert.equal(mp.frameFileName('Trip: day 1/2', 61.5, false), 'Trip_ day 1_2 1-01.500.png');
    assert.equal(mp.frameFileName('', 3723.25, true), 'frame 1-02-03.250.png');
    assert.equal(mp.frameFileName('  ', 0, false), 'frame 0-00.000.png');
});

test('adjacentMarker steps forward and keeps stepping back while playing', () => {
    const markers = mp.normalizeMarkers([{ t: 10 }, { t: 60 }, { t: 120 }]);
    assert.equal(mp.adjacentMarker(markers, 0, 1).t, 10);
    assert.equal(mp.adjacentMarker(markers, 10, 1).t, 60);
    assert.equal(mp.adjacentMarker(markers, 120, 1), null);
    assert.equal(mp.adjacentMarker(markers, 60.4, -1).t, 10);
    assert.equal(mp.adjacentMarker(markers, 75, -1).t, 60);
    assert.equal(mp.adjacentMarker(markers, 10.5, -1), null);
});

// Keys as the handler passes them on: single characters lowercased, Shift as its own flag.
const KEY_NAMES = [' ', 'k', 'j', 'l', 'm', 'c', 's', 't', 'f', 'i', 'p', 'n', '?', ',', '.', '<', '>', '[', ']',
    '0', '5', '9', 'Backspace', 'Escape', 'Home', 'End', 'PageUp', 'PageDown',
    'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];
const PRESSES = KEY_NAMES.flatMap((key) => [{ key, shiftKey: false }, { key, shiftKey: true }]);

function* players() {
    for (let bits = 0; bits < 2 ** mp.CAPABILITIES.length; bits += 1) {
        yield Object.fromEntries(mp.CAPABILITIES.map((cap, index) => [cap, Boolean(bits & (1 << index))]));
    }
}

const FAKE_PLAYER = { help: { hidden: false }, markersLabel: 'Chapter', markerNames: () => 'chapter', items: { label: 'Part' } };

function matching(press, caps, focused) {
    const event = typeof press === 'string' ? { key: press, shiftKey: false } : press;
    return mp.KEYS.filter((entry) => entry.match({ ctrlKey: false, ...event }, FAKE_PLAYER) && mp.keyApplies(entry, caps, focused));
}

test('no key does two things for any kind of player', () => {
    for (const caps of players()) {
        for (const focused of [true, false]) {
            for (const press of PRESSES) {
                const found = matching(press, caps, focused);
                assert.ok(found.length <= 1, `${JSON.stringify(press)} on ${JSON.stringify(caps)} focused=${focused}: ${found.map((e) => e.keys)}`);
            }
        }
    }
});

test('keys the page scrolls with stay with the page unless the player has focus', () => {
    for (const caps of players()) {
        for (const key of ['Home', 'End', 'PageUp', 'PageDown']) {
            assert.equal(matching(key, caps, false).length, 0, key);
            assert.equal(matching(key, caps, true).length, 1, key);
        }
        for (const key of ['ArrowUp', 'ArrowDown']) {
            assert.equal(matching(key, caps, false).length, 0, key);
            assert.equal(matching(key, caps, true).length, caps.sound ? 1 : 0, key);
        }
    }
});

test('video-only keys do nothing on audio', () => {
    const audio = Object.fromEntries(mp.CAPABILITIES.map((cap) => [cap, cap !== 'video']));
    for (const key of [',', '.', 'f', 'i', 'p', 'c', 's']) {
        assert.equal(matching(key, audio, true).length, 0, key);
    }
});

test('Shift makes a letter another key', () => {
    const all = Object.fromEntries(mp.CAPABILITIES.map((cap) => [cap, true]));
    const keysFor = (key, shiftKey) => matching({ key, shiftKey }, all, false).map((entry) => entry.keys);
    assert.deepEqual(keysFor('j', false), ['J, L']);
    assert.deepEqual(keysFor('j', true), ['Shift+J']);
    assert.deepEqual(keysFor('l', true), ['Shift+L']);
    assert.deepEqual(keysFor('p', false), ['I, P']);
    assert.deepEqual(keysFor('p', true), ['Shift+P, Shift+N']);
    assert.deepEqual(keysFor('n', false), []);
    assert.deepEqual(keysFor('s', true), []);
    assert.deepEqual(keysFor('?', true), ['?']);
});

test('a player without sound, items, wide mode or frames leaves those keys alone', () => {
    const plain = Object.fromEntries(mp.CAPABILITIES.map((cap) => [cap, cap === 'video']));
    for (const press of ['m', 'ArrowUp', 's', 't', { key: 'p', shiftKey: true }, { key: 'n', shiftKey: true }]) {
        assert.equal(matching(press, plain, true).length, 0, JSON.stringify(press));
    }
});

test('every key entry explains itself and names only known capabilities', () => {
    for (const entry of mp.KEYS) {
        const help = typeof entry.help === 'function' ? entry.help(FAKE_PLAYER) : entry.help;
        assert.ok(entry.keys && help, JSON.stringify(entry.keys));
        assert.ok(entry.scope === 'page' || entry.scope === 'focus', entry.keys);
        for (const cap of [...(entry.needs || []), ...(entry.without || [])]) {
            assert.ok(mp.CAPABILITIES.includes(cap), `${entry.keys}: ${cap}`);
        }
    }
});
