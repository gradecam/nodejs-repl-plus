#!/usr/bin/env node --harmony
'use strict';

module.exports = ReplPlus;

var fs = require('fs');
var vm = require('vm');

var q = require('q');
var _ = require('lodash');
var co = require('co');

var DEFAULT_MAX_HISTORY = 50;


function ReplPlus() {
    var self = this;
    if (!(self instanceof ReplPlus)) {
        return new ReplPlus();
    }
    self.ignore_keys = [];
    self.swap_ = false;
    return self;
}

_.extend(ReplPlus.prototype, {
    eval: function(cmd, context, filename, callback) {
        var self = this;
        try {
            var result = vm.runInContext(cmd, context);
            var o = _.omit(context, self.ignore_keys);
            _.each(o, function(val, key) {
                if (q.isPromiseAlike(val) && !val.__watched__) {
                    var p = context[key] = q(val);
                    p.__watched__ = true;
                    p.then(function(x) {
                        self.repl.outputStream.write('\rresolved: ' + key + '\n');
                        self.repl.displayPrompt();
                        delete p.__watched__;
                        context[key] = x;
                    }, function(e) {
                        self.repl.outputStream.write('\rfailed: ' + key + '\n');
                        self.repl.displayPrompt();
                        context[key] = e;
                    }).done();
                }
                // TODO: add support for resolving arrays and objects with promises
            });
            callback(null, result);
        } catch(e) {
            if (cmd.indexOf('yield') === -1) {
                throw e;
            }
            context.__CALLBACK__ = callback;
            cmd = cmd.trim().replace(/^var /, '').replace(/;$/, '');
            cmd = '__CO__(function*(){__CALLBACK__(null, ' + cmd + ')})';
            vm.createScript(cmd).runInNewContext(context);
        }
        if (self.swap_) {
            self.repl.context.__ = self.repl.context._;
            self.repl.context._ = _;
        }
    },
    addCommand: function(name, action, help) {
        var self = this;
        if (!self.repl) {
            throw new Error('repl must be started first.');
        }
        self.repl.commands[name] = {
            action: action,
            help: help || 'No help available',
        };
    },
    defaultOpts: function(opts) {
        var defaults;
        opts = opts || {};
        defaults = _.extend({
            output: process.stdout,
            input: process.stdin,
            prompt: 'repl+> ',
            context: opts.context || {},
            ignoreUndefined: true,
            max_history: DEFAULT_MAX_HISTORY,
            history_file: process.env.HOME + '/.node_history',
            swap_: false,
        }, opts);
        _.extend(defaults.context, {
            Q: q,
            q: q,
            __: _,
            _: void(0),
            co: co,
            __CO__: co,
            __CALLBACK__: void(0),
            __repl__: void(0),
        });
        return defaults;
    },
    addHistoryCmd: function(opts) {
        var self = this;
        var repl = self.repl, rli = repl.rli;
        var history = rli.history;
        var filterCommands = function(x) { x = x.trim(); return !(x[0] === '.'); };
        opts = _.extend({max_history: DEFAULT_MAX_HISTORY, history_file: null}, opts);
        if (opts.history_file) {
            try {
                history = repl.history = _.filter(fs.readFileSync(opts.history_file, {encoding: 'utf-8'}).split('\n').reverse());
                while(history.length > opts.max_history) {
                    history.pop();
                }
            } catch (e) {
            }
            process.on('exit', function() {
                try {
                    var out =  _.filter(history, filterCommands);
                    fs.writeFileSync(opts.history_file, out.reverse().join('\n'), {encoding: 'utf-8'});
                } catch(e) {
                    repl.outputStream.write('failed writing history to: ' + history.file + '\n');
                }
            });
        }
        rli.addListener('line', function(code) {
            code = (code || '').trim();
            if (!code) { return; }
            if (code[0] === '.') { history.shift(); }
            while(history.length > opts.max_history) {
                history.pop();
            }
        });
        var hist = function() {
            var out = _.filter(history, filterCommands);
            if (!out.length) { repl.displayPrompt(); }
            repl.outputStream.write(out.reverse().join('\n') + '\n');
            repl.displayPrompt();
        }
        self.addCommand('history', hist, 'Show history');
    },
    onStart: function() {
        var self = this;
        self.addCommand('swap_', function() {
            self.swap_ = !self.swap_;
            self.repl.displayPrompt();
        }, 'swap __ and _ (default: __ is lodash and _ is last result)');
        return self;
    },
    start: function start(opts) {
        var self = this;
        var repl;
        var output;
        opts = _.extend({
            eval: self.eval.bind(self),
        }, self.defaultOpts(opts));
        output = opts.output;
        self.ignore_keys = _.keys(opts.context);
        _.each(opts.doc, function(line) {
            output.write(line + '\n');
        });
        output.write('To exit press ^C twice, or ^D once.\n');
        repl = self.repl = require('repl').start(opts);
        self.addHistoryCmd(opts);
        self.context = opts.context;
        self.context.__repl__ = repl;
        var resetContext = function() {
            _.extend(repl.context, self.context);
        };
        resetContext();
        repl.on('reset', resetContext);
        repl.on('exit', function() {
            try {
                repl.outputStream.write('\n');
            } catch(e) {}
        });
        self.swap_ = opts.swap_;
        return self.onStart();
    }
});

if (!module.parent) {
    var repl = new ReplPlus();
    repl.start();
}
