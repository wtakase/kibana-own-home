import { readFileSync } from 'fs';
import { format as formatUrl } from 'url';
import httpolyglot from 'httpolyglot';
import tlsCiphers from '../../../../../src/server/http/tls_ciphers';
import url from 'url';
import Hapi from 'hapi';
import Wreck from 'wreck';
import createAgent from './create_agent';
import mapUri from './map_uri';
import getReplacedIndex from '../get_replaced_index';

module.exports = function(kbnServer, yarOptions) {

  const server = new Hapi.Server();

  server.register({
    register: require('kibi-h2o2')
  }, function (err) {
    if (err) {
      kbnServer.log(['plugin:own-home', 'error'], 'Failed to load kibi-h2o2');
    }
  });

  const uri = url.parse(kbnServer.config().get('own_home.explicit_kibana_index_url.proxy.url'));
  if (uri.protocol == 'https:') {
    server.connection({
      host: uri.hostname,
      port: uri.port,
      tls: true,
      listener: httpolyglot.createServer({
        key: readFileSync(kbnServer.config().get('own_home.explicit_kibana_index_url.proxy.ssl.key')),
        cert: readFileSync(kbnServer.config().get('own_home.explicit_kibana_index_url.proxy.ssl.cert')),

        ciphers: tlsCiphers,
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
    path: '/{suffix?}',
    handler: function (request, reply) {
      const suffix = request.params.suffix ? '/' + encodeURIComponent(request.params.suffix) : '';
      reply().redirect(suffix + '/app/kibana');
    }
  });

  server.route({
    method: ['GET', 'POST', 'PUT', 'DELETE'],
    path: '/{suffix}/{paths*}',
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
        acceptEncoding: false,
        timeout: kbnServer.config().get('elasticsearch.requestTimeout'),
        onResponse: function (err, response, request, reply) {
          if (err) {
            reply(err);
            return;
          }

          if (request.path.endsWith('/bundles/commons.bundle.js')) {
            Wreck.read(response, null, function (err, payload) {
              const originalPayload = payload.toString();
              if (originalPayload.length > 0) {
                const replacedIndex = getReplacedIndex(kbnServer, request);
                if (replacedIndex) {
                  const suffix = replacedIndex.slice(kbnServer.config().get('kibana.index').length + 1);
                  const modifiedPayload = originalPayload.replace(/scope.href(:|;)/g, 'scope.href.replace("app/kibana", "' + suffix + '/app/kibana")' + "$1");
                  if (modifiedPayload !== originalPayload) {
                    kbnServer.log(['plugin:own-home', 'debug'], 'Replace the string in commons.bundle.js: "app/kibana" => "' + suffix + '/app/kibana"');
                  } else {
                    kbnServer.log(['plugin:own-home', 'warning'], 'Failed to replace the string in commons.bundle.js: "app/kibana" => "' + suffix + '/app/kibana"');
                  }
                  response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
                  reply(modifiedPayload).headers = response.headers;
                } else {
                  reply(response);
                }
              } else {
                kbnServer.log(['plugin:own-home', 'debug'], 'Replacement skipped because the target file has already been chached.');
                reply(response);
              }
            });
          } else {
            reply(response);
          }
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

  server.register({
    register: require('yar'),
    options: yarOptions
  }, function (err) {
    if (err) {
      kbnServer.log(['plugin:own-home', 'error'], 'Unknown error occured at the init()');
    }
  });
};
