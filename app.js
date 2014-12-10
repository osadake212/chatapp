/**
 * app.js
 * Webサーバー
 */


/*global */

'use strict';

var
  http = require('http'),
  express = require('express'),
  app = express(),
  server = http.createServer(app);

// ----- サーバー構成開始 -----

// 共通設定
app.configure( function () {
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.static(__dirname + '/public'));
  app.use(app.router);
});

// 開発
app.configure('development', function () {
  app.use(express.logger());
  app.use(express.errorHandler({
    dumpExceptinos: true,
    showStack: true
  }));
});

// 本番
app.configure('production', function () {
  app.use(express.errorHandler());
});

app.get('/', function (request, response) {
  response.redirect('/spa.html')
});

// ----- サーバー構成終了 -----

server.listen(3000);
console.log('Listening on port %d', server.address().port);
