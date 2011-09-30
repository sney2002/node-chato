/**
 * Module dependencies.
 */

var express = require('express')
   ,app = module.exports = express.createServer()
   ,io = require("socket.io").listen(app)
   ;

// Configuration

app.configure(function(){
    app.set('views', __dirname + '/views');
    app.set('view engine', 'jade');
    app.use(express.bodyParser());
    app.use(express.methodOverride());
    app.use(express.cookieParser());
    app.use(express.session({ secret: 'your secret here' }));
    app.use(app.router);
    app.use(express.static(__dirname + '/public'));
});

app.configure('development', function(){
    app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
});

app.configure('production', function(){
    app.use(express.errorHandler()); 
});

// Routes
app.get('/', function(req, res){
    res.render('index', {
        title: 'Chato'
        ,layout: false
    });
});

/*
 * Obtener datos de sesión
 */
 var parseCookie = require('connect').utils.parseCookie
    ;

io.set('authorization', function(data, accept) {
   if (data.headers.cookie) {
      data.cookie = parseCookie(data.headers.cookie);
      data.sessionId = data.cookie['connect.sid'];
   } else {
       return accept('Usuario no identificado', false);
   }
   accept(null, true);
});

/*
 * Eventos socket.io
 */
var nicknames = {}
   ,rooms = {}
   ;

io.sockets.on('connection', function(socket) {
    // Identificar usuarios por primeros 10 caracteres de sessionId
    var sid = socket.handshake.sessionId.slice(0, 10);

    // El usuario se une a una room identificada por su id
    // así se puede notificar aun con varias pestañas abiertas
    socket.join(sid);
    
    // Usuario abrió otra pestaña del navegador
    if (rooms[sid]) {
        rooms[sid].tabs++;
        socket.emit('nickname accepted', rooms[sid].owner, sid);
    }

    // Enviar lista de usuarios conectados
    io.sockets.emit('users list', nicknames);

    // Nombre que identifica a este usuario
    socket.on('set nickname', function(nick, f) {
        // Usuario ya identificado
        if (rooms[sid]) {
            io.sockets.in(sid).emit('nickname error', 
            'No se puede cambiar el nombre de usuario');
        }
        // Nombre en uso
        else if (nicknames[nick]) {
            io.sockets.in(sid).emit('nickname error',
            'Nombre de usuario en uso'); 
        } else {
            rooms[sid] = {owner: nick, tabs: 1};
            nicknames[nick] = sid;
            io.sockets.in(sid).emit('nickname accepted', nick, sid);
            io.sockets.emit('user connected', {nick: nick, uid: sid});
        }
    });
 
    socket.on('msg', function(to, msg) {
        if (rooms[sid]) {
            io.sockets.in(to).emit('resive msg', sid, {from: rooms[sid].owner, msg: msg});
        }
        socket.broadcast.to(sid).emit('resive msg', to, {from: 'Yo', msg: msg});
    });
    
    socket.on('disconnect', function() {
     if (rooms[sid]) {
         rooms[sid].tabs--;

         if (!rooms[sid].tabs) {
            // Notificar desconexión del usuario
             io.sockets.emit('resive msg', sid, {from: "Server",
                            msg: rooms[sid].owner + " se ha desconectado"});
             io.sockets.emit('user disconnected', sid);
             // Borrar información
//             delete nicknames[rooms[sid].owner];
//             delete rooms[sid];
         }
     }

    });
});

// Triqui
io.sockets.on('error', function(){})
io.on('error', function(){})

app.listen(12119);
console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
