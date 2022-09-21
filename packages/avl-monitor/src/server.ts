import http from 'http';
import net from 'net';
import path from 'path';
import events from 'events';
import crypto from 'crypto';
import express from 'express';
import expressSession from 'express-session';
import cookieParser from 'cookie-parser';
import passport from 'passport';
import csrf from 'csurf';
import createError from 'http-errors';
import { Strategy as LocalStrategy } from 'passport-local';
import { ensureLoggedIn as ensureLogIn } from 'connect-ensure-login';
import connectMongo from 'connect-mongo';
import pluralize from 'pluralize';
import { Server } from 'socket.io';
import Parser from 'avl-parser-bitrek';

import { GPS_DATA_RECEIVED, PASSWORD_HASH, SALT } from './constants';

const ensureLoggedIn = ensureLogIn();

export const getServer = (config, logger, collection) => {
  const l = logger(module);

  const sessionMiddleware = expressSession({
    name: 'sid',
    secret: config.server.sessionSecret,
    store: new (connectMongo(expressSession))({
      url: config.database.mongoUri,
    }),
  });

  configurePassport(config);

  const app = configureExpress(sessionMiddleware);

  const server = new http.Server(app);

  const io = new Server(server, { path: '/ws/' }).use(
    (socket: any, next: any) => {
      sessionMiddleware(socket.request, {} as any, next);
    },
  );

  const em = new events.EventEmitter();

  io.on('connection', function (socket: any) {
    if (!socket.request.session.passport.user) {
      socket.destroy();
      throw new Error('403');
    }

    l.info('socket.io connected');
    socket.on('disconnect', () => {
      l.info('socket.io disconnected');
    });

    socket.on('GET_DATA', async function (msg: any) {
      l.info('GET_DATA request: ' + msg);
      const data = await collection.find({ timestamp: { $gt: msg } }).toArray();
      console.log(data);
      socket.emit('SEND_DATA', data);
    });
  });

  const tcp = configureTcp(l, config, io, em);

  return {
    start: async () => {
      server.listen(config.server.httpPort, config.server.httpHost, () => {
        const serverAddress: any = server.address();
        l.info(
          'HTTP listening on ' +
            serverAddress?.family +
            ' ' +
            serverAddress?.address +
            ':' +
            serverAddress?.port +
            ' - UI is available in browser',
        );
      });

      tcp.listen(config.server.tcpPort, config.server.tcpHost, function () {
        const serverAddress: any = tcp.address();
        l.info(
          'TCP  listening on ' +
            serverAddress?.family +
            ' ' +
            serverAddress?.address +
            ':' +
            serverAddress?.port,
        );
      });
    },
    on: em.on.bind(em),
  };
};

function configureTcp(l: any, config: any, io, em: events) {
  const tcp = net.createServer(function (socket) {
    let imei = '';
    let errorCount = 0;

    const client = 'host ' + socket.remoteAddress + ':' + socket.remotePort;
    l.info('TCP connected ' + client);

    // releasing idling resources
    socket.setTimeout(config.server.tcpIdleTimeout, function () {
      l.debug(
        'TCP socket destroyed after idling for ' +
          config.server.tcpIdleTimeout +
          ' millis',
      );
      socket.destroy();
    });

    tcp.getConnections(function (err, count) {
      if (err) {
        l.error('ERROR on counting active TCP connections');
        return;
      }
      l.info('TCP active connections: ' + count);
    });

    socket.on('data', function (buffer) {
      l.info('TCP got data from ' + client);

      if (!Parser.canParse(buffer)) {
        l.error('Received a packet in an unknown format');
        socket.destroy();
        return;
      }

      const isImeiResponse = (data: unknown): data is { imei: string } => {
        return (
          data &&
          typeof data === 'object' &&
          'imei' in data &&
          (data as any)?.imei
        );
      };

      try {
        const parsedData = Parser.parse(buffer);
        if (isImeiResponse(parsedData)) {
          l.info('Connection negotiated, waiting for next data packet.');
          l.debug(`IMEI is ${parsedData.imei}`);
          imei = parsedData.imei;
          socket.write(String.fromCharCode(0x01));
          return;
        } else {
          if (!imei) {
            throw new Error('Received GPS data but have no IMEI?');
          }
          l.info('Received the parsed GPS data. Sending ACK');
          socket.write(String.fromCharCode(parsedData.recordCount), () => {
            socket.end();
          });

          em.emit(GPS_DATA_RECEIVED, { imei, ...parsedData });
        }
      } catch (ex) {
        l.error(ex);
        socket.write(String.fromCharCode(0x00), () => {
          errorCount++;
          if (errorCount > 2) {
            l.error('error count exceeds limit - closing TCP connection');
            socket.destroy();
          }
        });
      }
    });

    socket.on('close', () => {
      l.info('TCP disconnected ' + client);
    });

    socket.on('error', (err) => {
      l.error('TCP: ', err);
    });
  });

  return tcp;
}

function configureExpress(sessionMiddleware: any) {
  const app = express();

  app.set('views', path.join(__dirname, '/../views'));
  app.set('view engine', 'ejs');
  app.locals.pluralize = pluralize;

  app
    .use(express.json())
    .use(express.urlencoded({ extended: true }))
    .use(cookieParser())
    .use('/public/css', express.static(path.join(__dirname + '/../public/css')))
    .use(sessionMiddleware)
    .use(csrf())
    .use(passport.authenticate('session'))
    .use(function (req: any, res, next) {
      const msgs = req.session.messages || [];
      res.locals.messages = msgs;
      res.locals.hasMessages = !!msgs.length;
      req.session.messages = [];
      next();
    })
    .use(function (req, res, next) {
      res.locals.csrfToken = req.csrfToken();
      next();
    })
    // .use(passport.initialize())
    // .use(passport.session())
    .get('/', ensureLoggedIn, function (_req, res) {
      res.sendFile(path.join(__dirname + '/../public/map.html'));
    })
    .get('/login', function (_req, res) {
      res.render('login');
    })
    .post(
      '/login/password',
      passport.authenticate('local', {
        successReturnToOrRedirect: '/',
        failureRedirect: '/login',
        failureMessage: true,
      }),
    )
    .use('/public', (req, res, next) => {
      ensureLoggedIn(req, res, () => {
        express.static(path.join(__dirname + '/../public'))(req, res, next);
      });
    })
    .post('/data', (req, res) => {
      console.log(req.body);
      return res.json(true);
    })
    .use(function (_req, _res, next) {
      next(createError(404));
    })
    .use(function (err: any, req: any, res: any, _next: any) {
      // set locals, only providing error in development
      res.locals.message = err.message;
      res.locals.error = req.app.get('env') === 'development' ? err : {};

      // render the error page
      res.status(err.status || 500);
      res.render('error');
    });

  return app;
}

function configurePassport(config: any) {
  passport.use(
    new LocalStrategy(function verify(username, password, cb) {
      if (username !== config.server.validUsername) {
        return cb(null, false, { message: 'Incorrect username or password' });
      }
      crypto.pbkdf2(
        password,
        SALT,
        310000,
        32,
        'sha256',
        function (err, hashedPassword) {
          if (err) {
            return cb(err);
          }
          if (!crypto.timingSafeEqual(PASSWORD_HASH, hashedPassword)) {
            return cb(null, false, {
              message: 'Incorrect username or password',
            });
          }

          return cb(null, { name: config.server.validUsername });
        },
      );
    }),
  );

  passport.serializeUser(function (user: any, cb) {
    process.nextTick(function () {
      cb(null, { name: user.name });
    });
  });

  passport.deserializeUser(function (user: any, cb) {
    process.nextTick(function () {
      return cb(null, user);
    });
  });
}
