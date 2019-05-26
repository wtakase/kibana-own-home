import { readFileSync } from 'fs';
import { format as formatUrl } from 'url';
import httpolyglot from 'httpolyglot';
import url from 'url';
import Hapi from 'hapi';
import Wreck from 'wreck';
import createAgent from './create_agent';
import mapUri from './map_uri';
import getReplacedIndex from './get_replaced_index';
import modifyPayload from './modify_payload';
import initExplicitProxy from './explicit/init_proxy';
import Boom from 'boom';

module.exports = function(kbnServer) {

  let server;

  const uri = url.parse(kbnServer.config().get('elasticsearch.hosts')[0]);
  if (uri.protocol == 'https:') {
    server = Hapi.Server({
      host: uri.hostname,
      port: uri.port,
      tls: true,
      listener: httpolyglot.createServer({
        key: readFileSync(kbnServer.config().get('own_home.ssl.key')),
        cert: readFileSync(kbnServer.config().get('own_home.ssl.certificate')),

        ciphers: kbnServer.config().get('server.ssl.cipherSuites').join(':'),
        // We use the server's cipher order rather than the client's to prevent the BEAST attack
        honorCipherOrder: true
      })
    });

    server.ext('onRequest', function (request, h) {
      if (request.raw.req.socket.encrypted) {
        h.continue;
      } else {
        h.redirect(formatUrl({
          port,
          protocol: 'https',
          hostname: host,
          pathname: request.url.pathname,
          search: request.url.search,
        }));
      }
    });
  } else {
    server = Hapi.Server({
      host: uri.hostname,
      port: uri.port
    });
  }

  const start = async function () {
    await server.register(require('h2o2'));

    server.route({
      method: ['GET', 'POST', 'PUT', 'DELETE'],
      path: '/{paths*}',
      config: {
        timeout: {
          socket: kbnServer.config().get('elasticsearch.requestTimeout')
        }
      },
      handler: {
        proxy: {
          mapUri: await mapUri(kbnServer),
          agent: createAgent(kbnServer),
          xforward: true,
          passThrough: true,
          timeout: kbnServer.config().get('elasticsearch.requestTimeout'),
          onBeforeSendRequest: await modifyPayload(kbnServer),
          onResponse: function (err, response, request, h) {
            if (err) {
              throw err;
            }
            const wreckRead = async function () {
              const payload = await Wreck.read(response, { json: true });
              try {
                let p = payload;
                if (kbnServer.config().get('own_home.get_username_from_session.enabled') && payload && payload.toString() == 'Unauthorized') {
                  p = h.response(Boom.unauthorized('plugin:own-home: unauthorized'));
                } else {
                  const replacedIndex = await getReplacedIndex(kbnServer, request);
                  if (replacedIndex && payload) {
                    // Workaround for creating shortened url
                    if (request.path.startsWith('/' + kbnServer.config().get('kibana.index') + '/url/')) {
                      if (payload['found'] === false) {
                        p = Wreck.toReadableStream();
                      }
                    } else if (payload['error']) {
                      // Workaround for overwritting Kibana object
                      if (payload['status'] === 409) {
                        p = Boom.conflict('plugin:own-home: document_already_exists_exception');
                      } else if (request.path.endsWith('_field_caps') && payload['status'] === 404 && payload['error']['type'] === 'index_not_found_exception') {
                        // Workaround for no matching indices message
                        p = {fields: {}};
                      }
                    } else if (payload[replacedIndex]) {
                      // Back kibana.index to original one in responce body
                      payload[kbnServer.config().get('kibana.index')] = payload[replacedIndex];
                      delete payload[replacedIndex];
                      p = payload;
                    }
                  }
                }

                // https://stackoverflow.com/questions/5515869
                function lengthInUtf8Bytes(str) {
                  // Matches only the 10.. bytes that are non-initial characters in a multi-byte sequence.
                  var m = encodeURIComponent(str).match(/%[89ABab]/g);
                  return str.length + (m ? m.length : 0);
                }

                const r = h.response(p);
                r.headers = response.headers;
                return r.header('Content-length', lengthInUtf8Bytes(JSON.stringify(p)));
              } catch (err) {
                throw err;
              }
            };
            return wreckRead();
          }
        }
      }
    });

    try {
      await server.start();
      kbnServer.log(['plugin:own-home', 'info'], 'Proxy server started at ' + server.info.uri);
    } catch (err) {
      kbnServer.log(['plugin:own-home', 'error'], err);
    }

    const yarOptions = {
      name: 'own-home-session',
      cache: {
        expiresIn: kbnServer.config().get('own_home.session.timeout')
      },
      cookieOptions: {
        password: kbnServer.config().get('own_home.session.secretkey'),
        isSecure: kbnServer.config().get('own_home.session.isSecure'),
        passThrough: true,
        ttl: kbnServer.config().get('own_home.session.cookie.ttl')
      }
    };

    try {
      await kbnServer.register({
        plugin: require('yar'),
        options: yarOptions
      });
    } catch (err) {
      kbnServer.log(['plugin:own-home', 'error'], err);
    }

    try {
      await server.register({
        plugin: require('yar'),
        options: yarOptions
      });
    } catch (err) {
      kbnServer.log(['plugin:own-home', 'error'], err);
    }

    if (kbnServer.config().get('own_home.explicit_kibana_index_url.enabled')) {
      initExplicitProxy(kbnServer, yarOptions);
    }
  };
  start();
};
