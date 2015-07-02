#!/usr/bin/env node --harmony
'use strict';

module.exports = MongooseReplPlus;

var fs = require('fs');
var util = require('util');
var path = require('path');

var _ = require('lodash');

var ReplPlus = require(__dirname + '/repl-plus');


function MongooseReplPlus(mongoose, _verbose) {
    var self = this;
    if (!(self instanceof MongooseReplPlus)) {
        return new MongooseReplPlus(mongoose, _verbose);
    }
    ReplPlus.call(self);
    self.mongoose = mongoose || require('mongoose');
    self.connected = false;
    return self;
}

util.inherits(MongooseReplPlus, ReplPlus);

_.extend(MongooseReplPlus.prototype, {
    connect: function(uri, options, callback) {
        var self = this;
        var db = self.mongoose.connection;
        if (!self.connected) {
            self.mongoose.connect(uri || 'mongodb://localhost/test', options, callback);
            db.on('open', function() {
                self.connected = true;
            });
            db.on('error', function(err) {
                var msg = util.format('connection error: %s\n', err);
                var output = self.repl && self.repl.outputStream.write || console.log;
                output(msg);
                if (self.repl) { self.repl.displayPrompt(); }
            });
        }
        return self;
    },
    include: function(model_path) {
        var self = this;
        var mod;
        if (model_path) {
            var resolved_path = path.resolve(model_path);
            try {
                mod = require(resolved_path);
                /**
                 * support best practice method of exporting: function(conn)
                 */
                if (typeof(mod) === 'function') {
                    mod(self.mongoose);
                }
            } catch(e) {
                self.repl && self.repl.outputStream.write('unable to load model(s) from:' + model_path);
                throw e;
            }
        }
        if (self.repl) { self.repl.displayPrompt(); }
        return self;
    },
    includeDir: function(models_dir) {
        var self = this;
        if (models_dir) {
            var resolved_path = path.resolve(models_dir);
            var files = fs.readdirSync(resolved_path);
            _.each(files, function(file) {
                if (file !== 'index.js' && file.substr(-3) === '.js') {
                    self.include(resolved_path + '/' + file);
                }
            });
        }
        if (self.repl) { self.repl.displayPrompt(); }
        return self;
    },
    refreshModels: function(verbose) {
        var self = this;
        _.each(self.mongoose.models, function(v, k) {
            self.context.models[k] = v;
            if (verbose) {
                self.repl.outputStream.write('loaded model: ' + k + '\n');
            }
        });
        if (self.repl) { self.repl.displayPrompt(); }
        return self;
    },
    onStart: function() {
        var self = this;
        ReplPlus.prototype.onStart.call(self);
        self.refreshModels();
        self.repl.on('exit', function() {
            self.mongoose.connection.close();
        });
        self.addCommand('model', function(p) {
            self.include(p);
            self.refreshModels();
        }, 'include a model file');
        self.addCommand('modelD', function(p) {
            self.includeDir(p);
            self.refreshModels();
        }, 'include a directory of models');
        self.addCommand('models', function(verbose) {
            self.refreshModels(verbose);
            var msg = '\rmodels: [' + _.keys(self.context.models).sort().join(',') + ']\n';
            self.repl.outputStream.write(msg);
            self.repl.displayPrompt();
        }, 'refresh models references');
        self.repl.displayPrompt();
        return self;
    },
    defaultOpts: function(opts) {
        var self = this;
        opts = _.extend({prompt: 'mongoose+> '}, opts);
        var defaults = ReplPlus.prototype.defaultOpts.call(self, opts);
        _.extend(defaults.context, {
            mongoose: self.mongoose,
            models: {},
        });
        return defaults;
    },
});

if (!module.parent) {
    var program = require('commander');
    program
        .version('0.1.0')
        .option('-i, --include [model]', 'Include model')
        .option('-d, --dir [model directory]', 'Include model directory')
        .parse(process.argv);
    var repl = new MongooseReplPlus();
    repl.connect(program.args[0]);
    if (program.include) {
        repl.include(program.include)
    }
    if (program.dir) {
        repl.includeDir(program.dir)
    }
    repl.start();
}
