'use strict;'

module.exports = function(conn) {
    conn = conn || mongoose;
    var schema = mongoose.Schema({
        title: {type: String, required: true},
        done: {type: Boolean, required: true, default: false},
    });

    return conn.model('Todo', schema);
}

var mongoose = require('mongoose');
