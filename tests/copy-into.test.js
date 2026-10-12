'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const mp = require('../web/media-player.js');

const ROOT = path.join(__dirname, '..');

test('copy-into.sh copies both files with their checksums and names the version', (t) => {
    const project = fs.mkdtempSync(path.join(os.tmpdir(), 'media-player-copy-'));
    t.after(() => fs.rmSync(project, { recursive: true, force: true }));
    const folder = path.join(project, 'static', 'media-player');

    const said = execFileSync('sh', [path.join(ROOT, 'copy-into.sh'), folder], { encoding: 'utf8' });

    assert.match(said, new RegExp(`^media-player ${mp.VERSION.replace(/\./g, '\\.')} copied into `));
    const lines = fs.readFileSync(path.join(folder, 'media-player.sha256'), 'utf8').trim().split('\n');
    assert.deepEqual(lines.map((line) => line.split(/\s+\*?/)[1]), ['media-player.js', 'media-player.css']);
    for (const line of lines) {
        const [digest, name] = line.split(/\s+\*?/);
        const copy = fs.readFileSync(path.join(folder, name));
        assert.ok(copy.equals(fs.readFileSync(path.join(ROOT, 'web', name))), `${name} is the library's file`);
        assert.equal(crypto.createHash('sha256').update(copy).digest('hex'), digest);
    }
});

test('copy-into.sh needs exactly one folder', () => {
    assert.throws(() => execFileSync('sh', [path.join(ROOT, 'copy-into.sh')], { stdio: 'pipe' }),
        (error) => error.status === 2 && /usage:/.test(String(error.stderr)));
});
