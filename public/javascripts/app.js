(function(){
    var socket = io.connect()
        ,conf = {}
        ,error_box = document.getElementById("error")
        ,timeout = null
        ;

    $.$ = function() {
        var _ = $([0]);
        return function(elem) {
            _[0] = elem;
            return _
        };
    }();

    // Abrir chat si no lo esta
    function open_chatbox(chat_id) {
        var chat = document.getElementById(chat_id);
        if (!chat) {
            $("."+chat_id).click();
        } else {
            $.$(chat).show();
        }
    }

    // mostrar notificaciones del servidor
    function notify(msg) {
        $.$(error_box).text(msg).show();
        clearTimeout(timeout);
        timeout = setTimeout(function(){
            $.$(error).hide();
        }, 30000);
    }

    // Mostrar mensajes resividos
    function show_msg(chat_id, data) {
        var chat = $('#' + chat_id + ' ul');
        $('#msg-tmpl').tmpl(data).emoticons().appendTo(chat);
        chat.scrollTop(chat.scrollTop()+100000);
    }

    socket.once('connect', function() {
        notify('Bienvenido a Chato');
    });

    socket.on('reconnect', function() {
        notify('Te has reconectado a Chato');
    });

    socket.on('disconnect', function() {
        notify('Te has desconectado de Chato');
    });

    socket.once('nickname accepted', function(nick, uid) {
        conf.nick = nick;
        conf.uid = uid;
        document.getElementById('username').innerHTML = nick + ' ';
    });

    socket.on('nickname error', function(msg) {
        notify(msg);
    });

    // Mostrar lista de usuarios
    socket.on('users list', function(users) {
        var U = $.map(users, function(v, k) {
                return {nick: k, uid: v};
        });
        $('#users ul li').remove();
        $('#users-tmpl').tmpl(U).appendTo('#users ul');
    });

    // Agregar usuario a lista
    socket.on('user connected', function(user) {
        $('#users-tmpl').tmpl(user).appendTo('#users ul');
    });

    // Remover usuario de lista
    socket.on('user disconnected', function(uid) {
        $('a.' + uid).remove();
    });

    socket.on('resive msg', function(chat_id, data) {
        open_chatbox(chat_id);
        show_msg(chat_id, data);
    });

    /**
     * Eventos del usuario
     */
    $('#login').keydown(function(e) {
       if (e.keyCode == 13) {
          $('#login-button').click();
       }
    });

    $('#login-button').click(function(){
        var input = document.getElementById('login')
            ,nick = $.trim(input.value);
        if (nick) {
            socket.emit('set nickname', nick);
            input.value = '';
        }
    });

    $('#users').delegate('a', 'click', function(e) {
         var uid = this.className
             ,nick = this.innerHTML
             ,chatbox = document.getElementById(uid)
             ;

         if (chatbox) { 
             $.$(chatbox).show();
             return;
         } else if (uid === conf.uid) {
             return;
         }

        // Mostar chat
        $('#chatbox-tmpl').tmpl({nick: nick, uid: uid}).appendTo('#chats');

         $('#' + uid + ' input').keydown(function(e) {
             var msg = $.trim(this.value);
             if (msg && e.keyCode == 13) {
                 this.value = '';
                 socket.emit('msg', uid, msg);
                 show_msg(uid, {from: 'yo', msg: msg});
             }
         }).focus();
    });

    $('#chats').delegate('.close', 'click', function() {
        $.$(this).closest('div').hide();
    });

}());
