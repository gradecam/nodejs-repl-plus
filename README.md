repl-plus
=========

A batteries included node REPL with yield support.

`repl-plus` enhances the basic node REPL with support for promises and generators.
The shell will automatically resolve variables which are promises when they become fulfilled.
This module is intended to be useful by itself or as a base for creating a custom
REPL shell for your own projects.

## Install

```
npm install repl-plus
```

You may want to install globally so you can benefit from the enhancements provided by
this REPL on a daily basis.

## Usage

```
# assumes a global install
$ repl-plus
To exit press ^C twice, or ^D once.
repl+> var d = q.defer(), p = d.promise;
repl+> d.resolve(22);
resolved: p
repl+> p
22
repl+> b = yield q(44)
44
repl+> 
```

An example using `mongoose`

```
$ ./examples/mongoose.js
To exit press ^C twice, or ^D once.
mongoose+> todos = yield models.Todo.find().exec()
[ { _id: 55959a1d76da6c2a5fc61110,
    title: 'Get MongooseReplPlus working.',
    __v: 0,
    done: true } ]
mongoose+> .history
var d = q.defer(), p = d.promise;
d.resolve(22);
p
b = yield q(44)
todos = yield models.Todo.find().exec()
mongoose+> 
```

## Inspired By

* [embed-shell](https://github.com/gradecam/nodejs-embed-shell)
* [co-repl](https://github.com/littlehaker/co-repl)
* [co-yongoose](https://github.com/littlehaker/co-yongoose)
* [repl.history](https://github.com/tmpvar/repl.history)

