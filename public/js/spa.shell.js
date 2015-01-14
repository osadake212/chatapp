/*global $, spa*/

spa.shell = (function () {
  'use strict';
  // ----- モジュールスコープ変数開始 -----
  var
    configMap = {
      anchor_schema_map: {
        chat: { opened: true, closed: true }
      },
      main_html: String()
        + '<div class="spa-shell-head">'
          + '<div class="spa-shell-head-logo">'
            + '<h1>SPA</h1>'
            + '<p>javascript end to end</p>'
          + '</div>'
          + '<div class="spa-shell-head-acct"></div>'
        + '</div>'
        + '<div class="spa-shell-main">'
          + '<div class="spa-shell-main-nav"></div>'
          + '<div class="spa-shell-main-content"></div>'
        + '</div>'
        + '<div class="spa-shell-foot"></div>'
        + '<div class="spa-shell-modal"></div>',
      chat_extend_time: 250,
      chat_retract_time: 350,
      chat_extend_height: 450,
      chat_retract_height: 15,
      chat_extended_title: 'Click to retract',
      chat_retracted_title: 'Click to extend',
      resize_interval: 200
    },
    stateMap = {
      $container: undefined,
      anchor_map: {},
      resize_idto: undefined
    },
    jqueryMap = {},
    copyAnchorMap, setJqueryMap,
    changeAnchorPart, onHashchange,
    onTapAcct, onLogin, onLogout, onResize,
    setChatAnchor, initModule;
  // ----- モジュールスコープ変数終了 -----

  // ----- ユーティリティメソッド開始 -----

  // 格納したアンカーマップのコピーを返す。オーバーヘッドを最小限にする。
  copyAnchorMap = function () {
    return $.extend(true, {}, stateMap.anchor_map);
  };
  // ----- ユーティリティメソッド終了 -----

  // ----- DOMメソッド開始 -----
  /**  */
  setJqueryMap = function () {
    var $container = stateMap.$container;

    jqueryMap = {
      $container: $container,
      $acct: $container.find('.spa-shell-head-acct'),
      $nav: $container.find('.spa-shell-main-nav')
    };
  };

  /** URIアンカーの要素部分を変更する */
  changeAnchorPart = function (arg_map) {
    var
      anchor_map_revise = copyAnchorMap(),
      bool_return = true,
      key_name, key_name_dep;

    // アンカーマップへ変更を統合開始
    for (key_name in arg_map) {
      if (arg_map.hasOwnProperty(key_name)) {
        // 反復中に従属キーを飛ばす
        if (key_name.indexOf('_') === 0) {
          continue;
        }
        // 独立キー値を更新する
        anchor_map_revise[key_name] = arg_map[key_name];

        // 合致する独立キーを更新する
        key_name_dep = '_' + key_name;
        if (arg_map[key_name_dep]) {
          anchor_map_revise[key_name_dep] = arg_map[key_name_dep];
        } else {
          delete anchor_map_revise[key_name_dep];
          delete anchor_map_revise['_s' + key_name_dep];
        }
      }
    }
    // アンカーマップへ変更を統合終了

    // URIの更新開始
    try {
      $.uriAnchor.setAnchor(anchor_map_revise);
    } catch (error) {
      // URIを既存の状態に置き換える
      $.uriAnchor.setAnchor(stateMap.anchor_map, null, true);
      bool_return = false;
    }

    return bool_return;
  };
  // ----- DOMメソッド終了 -----

  // ----- イベントハンドラ開始 -----
  onResize = function () {
    // リサイズインターバルの管理
    if (stateMap.resize_idto) {
      return true;
    }

    spa.chat.handleResize();
    stateMap.resize_idto = setTimeout(
      function () {stateMap.resize_idto = undefined; },
      configMap.resize_interval
    );

    return true;
  };

  onHashchange = function (event) {
    var
      anchor_map_previous = copyAnchorMap(),
      anchor_map_proposed,
      _s_chat_previous, _s_chat_proposed,
      s_chat_proposed,
      is_ok = true;

    // アンカーの解析を試みる
    try {
      anchor_map_proposed = $.uriAnchor.makeAnchorMap();
    } catch (error) {
      $.uriAnchor.setAnchor(anchor_map_previous, null, true);
      return false;
    }

    stateMap.anchor_map = anchor_map_proposed;

    // 便利な変数
    _s_chat_previous = anchor_map_previous._s_chat;
    _s_chat_proposed = anchor_map_proposed._s_chat;

    // 変更されている場合のチャットコンポーネントの調整
    if (!anchor_map_previous || _s_chat_previous !== _s_chat_proposed) {
      s_chat_proposed = anchor_map_proposed.chat;
      switch (s_chat_proposed) {
        case 'opened':
          is_ok = spa.chat.setSliderPosition('opened');
          break;
        case 'closed':
          is_ok = spa.chat.setSliderPosition('closed');
          break;
        default:
          spa.chat.setSliderPosition('closed');
          delete anchor_map_proposed.chat;
          $.uriAnchor.setAnchor(anchor_map_proposed, null, true);
          break;
      }
    }

    // スライダーの変更が拒否された場合にアンカーを元に戻す処理
    if (!is_ok) {
      if (anchor_map_previous) {
        $.uriAnchor.setAnchor(anchor_map_previous, null, true);
        stateMap.anchor_map = anchor_map_previous;
      } else {
        delete anchor_map_proposed.chat;
        $.uriAnchor.setAnchor(anchor_map_proposed, null, true);
      }
    }

    return false;
  };

  onTapAcct = function (event) {
    var user_name, user = spa.model.people.get_user();
    if (user.get_is_anon()) {
      user_name = prompt('please sign-in');
      spa.model.people.login(user_name);
      jqueryMap.$acct.text('...processing...');
    } else {
      spa.model.people.logout();
    }
    return false;
  };

  onLogin = function (event, login_user) {
    jqueryMap.$acct.text(login_user.name);
  };

  onLogout = function (event, logout_user) {
    jqueryMap.$acct.text('please sign-in');
  };

  // ----- イベントハンドラ終了 -----

  // ----- コールバック -----
  setChatAnchor = function (position_type) {
    return changeAnchorPart({ chat: position_type });
  };

  // ----- パブリックメソッド開始 -----
  initModule = function ($container) {
    var data_mode_str;

    // URIクエリパラメーターが設定されている場合はデータを偽に設定する
    data_mode_str = window.location.search === '?fake' ? 'fake' : 'live';
    spa.model.setDataMode(data_mode_str);

    // HTMLをロードし、jQueryコレクションをマッピングする
    stateMap.$container = $container;
    $container.html(configMap.main_html);
    setJqueryMap();

    $.uriAnchor.configModule({
      schema_map: configMap.anchor_schema_map
    });

    // 機能モジュールを構成して初期化する
    spa.chat.configModule({
      set_chat_anchor: setChatAnchor,
      chat_model: spa.model.chat,
      people_model: spa.model.people
    });
    spa.chat.initModule(jqueryMap.$container);

    // アバターモジュールの初期化
    spa.avtr.configModule({
      chat_model: spa.model.chat,
      people_model: spa.model.people
    });
    spa.avtr.initModule(jqueryMap.$nav);

    // URIアンカー変更イベントを処理する
    $(window)
      .bind('resize', onResize)
      .bind('hashchange', onHashchange)
      .trigger('hashchange');

    $.gevent.subscribe($container, 'spa-login', onLogin);
    $.gevent.subscribe($container, 'spa-logout', onLogout);

    jqueryMap.$acct.text('Please sign-in').bind('utap', onTapAcct);
  };
  // ----- パブリックメソッド終了 -----

  return { initModule: initModule };
}());
