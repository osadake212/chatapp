/**
 * spa.model.js
 */

/*global TAFFY, $, spa */
spa.model = (function () {
  'use strict';
  var
    configMap = { anon_id: 'a0' },
    stateMap = {
      anon_user: null,
      cid_serial: 0,
      people_cid_map: {},
      people_db: TAFFY(),
      user: null,
      is_connected: false
    },

    isFakeData = true,
    personProto, makeCid, clearPeopleDb, completeLogin,
    makePerson, people, chat, initModule;

    // personオブジェクトのプロトタイプ
    personProto = {
      get_is_user: function () {
        return this.cid === stateMap.user.cid;
      },
      get_is_anon: function () {
        return this.cid === stateMap.anon_user.cid;
      }
    };

    makeCid = function () {
      return 'c' + String(stateMap.cid_serial++);
    };

    clearPeopleDb = function () {
      var user = stateMap.user;
      stateMap.people_db = TAFFY();
      stateMap.people_cid_map = {};
      if (user) {
        stateMap.people_db.insert(user);
        stateMap.people_cid_map[user.cid] = user;
      }
    };

    completeLogin = function (user_list) {
      var user_map = user_list[0];
      delete stateMap.people_cid_map[user_map.cid];
      stateMap.user.cid = user_map._id;
      stateMap.user.id = user_map._id;
      stateMap.user.css_map = user_map.css_map;
      stateMap.people_cid_map[user_map.id] = stateMap.user;

      chat.join();
      $.gevent.publish('spa-login', [stateMap.user]);
    };

    makePerson = function (person_map) {
      var person,
        cid = person_map.cid,
        css_map = person_map.css_map,
        id = person_map.id,
        name = person_map.name;

      if (cid === undefined || !name) {
        throw 'client id and name required';
      }

      person = Object.create(personProto);
      person.cid = cid;
      person.name = name;
      person.css_map = css_map;

      if (id) { person.id = id; }

      stateMap.people_cid_map[cid] = person;

      stateMap.people_db.insert(person);
      return person;
    };

    // ----- people model -----
    people = ( function () {
      var get_by_cid, get_db, get_user, login, logout;

      get_by_cid = function (cid) {
        return stateMap.people_cid_map[cid];
      };

      get_db = function () { return stateMap.people_db; };

      get_user = function () { return stateMap.user; };

      login = function (name) {
        var sio = isFakeData ? spa.fake.mockSio : spa.data.getSio();

        stateMap.user = makePerson({
          cid: makeCid(),
          css_map: {top: 25, left: 25, 'background-color': '#8f8'},
          name: name
        });

        sio.on('userupdate', completeLogin);

        sio.emit('adduser', {
          cid: stateMap.user.cid,
          css_map: stateMap.user.css_map,
          name: stateMap.user.name
        });
      };

      logout = function () {
        var user = stateMap.user;
        chat._leave();

        stateMap.user = stateMap.anon_user;
        clearPeopleDb();

        $.gevent.publish('spa-logout', [user]);
      };

      return {
        get_by_cid: get_by_cid,
        get_db: get_db,
        get_user: get_user,
        login: login,
        logout: logout
      };
    }());

    // ----- chat model -----
    chat = (function () {
      var
        _publish_listchange, _publish_updatechat,
        _update_list, _leave_chat, join_chat,
        get_chatee, send_msg, set_chatee,
        chatee = null, update_avatar;

        // ユーザーリストを更新する
        _update_list = function (arg_list) {
          var i, person_map, make_person_map,
            people_list = arg_list[0],
            is_chatee_online = false;

          clearPeopleDb();

          for (i = 0; i < people_list.length; ++i) {
            person_map = people_list[i];
            if (!person_map.name) {
              continue;
            }

            // ユーザーを特定したらcss_mapを更新する
            if (stateMap.user && stateMap.user.id === person_map._id) {
              stateMap.user.css_map = person_map.css_map;
              continue;
            }

            make_person_map = {
              cid: person_map._id,
              css_map: person_map.css_map,
              id: person_map._id,
              name: person_map.name
            };

            if (chatee && chatee.id === make_person_map.id) {
              is_chatee_online = true;
            }

            makePerson(make_person_map);
          }

          stateMap.people_db.sort('name');

          // チャット相手がオンラインでなくなっている場合は、チャット相手を解除する
          if (chatee && !is_chatee_online) {
            set_chatee('');
          }
        };

        _publish_listchange = function (arg_list) {
          _update_list(arg_list);
          $.gevent.publish('spa-listchange', [arg_list]);
        };

        _publish_updatechat = function (arg_list) {
          var msg_map = arg_list[0];

          if (!chatee) {
            set_chatee(msg_map.sender_id);
          } else if (msg_map.sender_id !== stateMap.user.id && msg_map.sender_id !== chatee.id) {
            set_chatee(msg_map.sender_id);
          }

          $.gevent.publish('spa-updatechat', [msg_map]);
        };

        _leave_chat = function () {
          var sio = isFakeData ? spa.fake.mockSio : spa.data.getSio();
          chatee = null;
          stateMap.is_connected = false;
          if (sio) {
            sio.emit('leavechat');
          }
        };

        get_chatee = function () {
          return chatee;
        };

        join_chat = function () {
          var sio;

          if (stateMap.is_connected) {
            return false;
          }

          if (stateMap.user.get_is_anon()) {
            console.warn('User must be defined before joining chat');
            return false;
          }

          sio = isFakeData ? spa.fake.mockSio : spa.data.getSio();
          sio.on('listchange', _publish_listchange);
          sio.on('updatechat', _publish_updatechat);
          stateMap.is_connected = true;
          return true;
        };

        send_msg = function (msg_text) {
          var msg_map,
            sio = isFakeData ? spa.fake.mockSio : spa.data.getSio();

          if (!sio) {
            return false;
          }

          if(!(stateMap.user && chatee)) {
            return false;
          }

          msg_map = {
            dest_id: chatee.id,
            dest_name: chatee.name,
            sender_id: stateMap.user.id,
            msg_text: msg_text
          };

          // updatechatを発行したので、送信メッセージを表示できる
          _publish_updatechat([msg_map]);
          sio.emit('updatechat', msg_map);
          return true;
        };

        set_chatee = function (person_id) {
          var new_chatee;

          new_chatee = stateMap.people_cid_map[person_id];
          if (new_chatee) {
            if (chatee && chatee.id === new_chatee.id) {
              return false;
            }
          } else {
            new_chatee = null;
          }

          $.gevent.publish('spa-setchatee', {
            old_chatee: chatee,
            new_chatee: new_chatee
          });

          chatee = new_chatee;
          return true;
        };

        // avatar_update_map
        // {
        //   person_id: <string>,
        //   css_map: {
        //     top: <int>,
        //     left: <int>,
        //     'background-color': <string>
        //   }
        // }
        update_avatar = function (avatar_update_map) {
          var sio = isFakeData ? spa.fake.mockSio : spa.data.getSio();
          if (sio) {
            sio.emit('updateavatar', avatar_update_map);
          }
        };

        return {
          _leave: _leave_chat,
          get_chatee: get_chatee,
          join: join_chat,
          send_msg: send_msg,
          set_chatee: set_chatee,
          update_avatar: update_avatar
        };
    }());

    initModule = function () {
      // 匿名ユーザーを初期化する
      stateMap.anon_user = makePerson({
        cid: configMap.anon_id,
        id: configMap.anon_id,
        name: 'anonymous'
      });
      stateMap.user = stateMap.anon_user;
    };

  return {
    initModule: initModule,
    people: people,
    chat: chat
  };
}());
