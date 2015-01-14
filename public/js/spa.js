/*
 * spa.js
 * ルート名前空間モジュール
 */
/* global $, spa:true */
spa = (function () {
  'use strict';
  var initModule = function ($container) {
    spa.data.initModule();
    spa.model.initModule();

    // UIなしで実行できるようにする
    if (spa.shell && $container) {
      spa.shell.initModule($container);
    }
  };

  return { initModule: initModule };
}());
