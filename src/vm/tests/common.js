/*
 * CDDL HEADER START
 *
 * The contents of this file are subject to the terms of the
 * Common Development and Distribution License, Version 1.0 only
 * (the "License").  You may not use this file except in compliance
 * with the License.
 *
 * You can obtain a copy of the license at http://smartos.org/CDDL
 *
 * See the License for the specific language governing permissions
 * and limitations under the License.
 *
 * When distributing Covered Code, include this CDDL HEADER in each
 * file.
 *
 * If applicable, add the following below this CDDL HEADER, with the
 * fields enclosed by brackets "[]" replaced with your own identifying
 * information: Portions Copyright [yyyy] [name of copyright owner]
 *
 * CDDL HEADER END
 *
 * Copyright (c) 2018, Joyent, Inc.
 *
 */

var f = require('util').format;
var cp = require('child_process');

var assert = require('/usr/node/node_modules/assert-plus');

function vmadm(args, opts, callback) {
    assert.arrayOfString(args, 'args');
    assert.object(opts, 'opts');
    assert.object(opts.log, 'opts.log');
    assert.optionalString(opts.stdin, 'opts.stdin');
    assert.func(callback, 'callback');

    var child;
    var fds = {stdout: '', stderr: ''};
    var log = opts.log;

    child = cp.spawn('/usr/vm/sbin/vmadm', args, {stdio: 'pipe'});
    log.debug('vmadm running with pid %d', child.pid);

    if (opts.stdin) {
        child.stdin.write(opts.stdin);
    }
    child.stdin.end();

    child.stdout.setEncoding = 'utf8';
    child.stdout.on('data', function (d) {
        fds.stdout += d;
    });

    child.stderr.setEncoding = 'utf8';
    child.stderr.on('data', function (d) {
        fds.stderr += d;
    });

    child.on('close', function (code, signal) {
        var err = null;
        var msg;

        msg = f('vmadm [%d] exited. code %d signal %s',
            child.pid, code, signal);

        log.warn({pid: child.pid, code: code, signal: signal}, msg);

        if (code !== 0) {
            err = new Error(msg);
        }

        callback(err, fds);
    });
}

function zfs(args, callback) {
    assert.arrayOfString(args, 'args');
    assert.func(callback, 'callback');

    var opts = {
        encoding: 'utf8'
    };
    cp.execFile('/usr/sbin/zfs', args, opts, function (err, stdout, stderr) {
        if (err) {
            callback(err);
            return;
        }

        if (stderr) {
            callback(new Error('stderr produced: ' + stderr));
            return;
        }

        callback(null, stdout);
    });
}

/*
 * nodeunit-plus `t.ifError` is weird and ignores the second (msg) argument.
 * This function is meant to be a replacement for `t.ifError` that honors the
 * message.
 */
function ifError(t, err, msg) {
    assert.object(t, 't');
    assert.optionalObject(err, 'err');
    assert.optionalString(msg, 'msg');

    if (!msg) {
        msg = '(unnamed assert)';
    }
    if (err) {
        msg = f('%s: %s', msg, err.message);
    }

    t.ok(!err, msg);
}

module.exports = {
    ifError: ifError,
    vmadm: vmadm,
    zfs: zfs
};