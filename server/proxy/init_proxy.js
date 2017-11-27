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

  const server = new Hapi.Server();

  server.register({
    register: require('kibi-h2o2')
  }, function (err) {
    if (err) {
      kbnServer.log(['plugin:own-home', 'error'], 'Failed to load kibi-h2o2');
    }
  });

  const uri = url.parse(kbnServer.config().get('elasticsearch.url'));
  if (uri.protocol == 'https:') {
    server.connection({
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

    server.ext('onRequest', function (request, reply) {
      if (request.raw.req.socket.encrypted) {
        reply.continue();
      } else {
        reply.redirect(formatUrl({
          port,
          protocol: 'https',
          hostname: host,
          pathname: request.url.pathname,
          search: request.url.search,
        }));
      }
    });
  } else {
    server.connection({
      host: uri.hostname,
      port: uri.port
    });
  }

  server.route({
    method: ['GET', 'POST', 'PUT', 'DELETE'],
    path: '/{paths*}',
    config: {
      timeout: {
        socket: kbnServer.config().get('elasticsearch.requestTimeout')
      }
    },
    handler: {
      kibi_proxy: {
        mapUri: mapUri(kbnServer),
        agent: createAgent(kbnServer),
        xforward: true,
        passThrough: true,
        timeout: kbnServer.config().get('elasticsearch.requestTimeout'),
        modifyPayload: modifyPayload(kbnServer),
        onResponse: function (err, response, request, reply) {
          if (err) {
            reply(err);
            return;
          }

          Wreck.read(response, { json: true }, function (err, payload) {
            if (kbnServer.config().get('own_home.get_username_from_session.enabled')) {
              if (payload && payload.toString() == 'Unauthorized') {
                reply(Boom.unauthorized('plugin:own-home: unauthorized'));
                return;
              }
            }
            const replacedIndex = getReplacedIndex(kbnServer, request);
            if (replacedIndex && payload) {
              // Workaround for creating shortened url
              if (request.path.startsWith('/' + kbnServer.config().get('kibana.index') + '/url/')) {
                if (payload['found'] === false) {
                  reply();
                  return;
                }
              }
              if (payload['error']) {
                // Workaround for overwritting Kibana object
                if (payload['status'] === 409) {
                  reply(Boom.conflict('plugin:own-home: document_already_exists_exception'));
                  return;
                }

                // Workaround for no matching indices message
                if (request.path.endsWith('_field_caps') && payload['status'] === 404 && payload['error']['type'] === 'index_not_found_exception') {
                  reply({fields: {}});
                  return;
                }
              }
              // Back kibana.index to original one in responce body
              if (payload[replacedIndex]) {
                payload[kbnServer.config().get('kibana.index')] = payload[replacedIndex];
                delete payload[replacedIndex];
              }
            }
            reply(payload);
          });
        }
      }
    }
  });

  server.start((err) => {
    if (err) {
      throw err;
    }
    kbnServer.log(['plugin:own-home', 'info'], 'Proxy server started at ' + server.info.uri);
  });

  const yarOptions = {
    name: 'own-home-session',
    cache: {
      expiresIn: kbnServer.config().get('own_home.session.timeout')
    },
    cookieOptions: {
      password: kbnServer.config().get('own_home.session.secretkey'),
      isSecure: kbnServer.config().get('own_home.session.isSecure'),
      passThrough: true
    }
  };

  kbnServer.register({
    register: require('yar'),
    options: yarOptions
  }, function (err) {
    if (err) {
      kbnServer.log(['plugin:own-home', 'error'], 'Unknown error occured at the init()');
    }
  });

  server.register({
    register: require('yar'),
    options: yarOptions
  }, function (err) {
    if (err) {
      kbnServer.log(['plugin:own-home', 'error'], 'Unknown error occured at the init()');
    }
  });

  if (kbnServer.config().get('own_home.explicit_kibana_index_url.enabled')) {
    initExplicitProxy(kbnServer, yarOptions);
  }
};
