#!/usr/bin/env node --harmony
'use strict;'

var MongooseReplPlus = require(__dirname + '/../').MongooseReplPlus;

new MongooseReplPlus()
    .connect()
    .includeDir(__dirname + '/models')
    .start();
