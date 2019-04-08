import { readFileSync } from 'fs';
import { format as formatUrl } from 'url';
import httpolyglot from 'httpolyglot';
import url from 'url';
import Hapi from 'hapi';
import Wreck from 'wreck';
import createAgent from './create_agent';
import mapUri from './map_uri';
import getReplacedIndex from '../get_replaced_index';

module.exports = function(kbnServer, yarOptions) {

  let server;

  const uri = url.parse(kbnServer.config().get('own_home.explicit_kibana_index_url.proxy.url'));
  if (uri.protocol == 'https:') {
    server = Hapi.Server({
      host: uri.hostname,
      port: uri.port,
      tls: true,
      listener: httpolyglot.createServer({
        key: readFileSync(kbnServer.config().get('own_home.explicit_kibana_index_url.proxy.ssl.key')),
        cert: readFileSync(kbnServer.config().get('own_home.explicit_kibana_index_url.proxy.ssl.certificate')),

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
      path: '/{suffix?}',
      handler: function (request, h) {
        const suffix = request.params.suffix ? '/' + encodeURIComponent(request.params.suffix) : '';
        h.redirect(suffix + '/app/kibana');
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
        proxy: {
          mapUri: await mapUri(kbnServer),
          agent: createAgent(kbnServer),
          xforward: true,
          passThrough: true,
          acceptEncoding: false,
          timeout: kbnServer.config().get('elasticsearch.requestTimeout'),
          onResponse: function (err, response, request, h) {
            if (err) {
              throw err;
            }
            if (request.path.endsWith('/bundles/commons.bundle.js')) {
              const wreckRead = async function () {
                const payload = await Wreck.read(response, { json: true });
                try {
                  let p = payload;
                  const originalPayload = payload.toString();
                  if (originalPayload.length > 0) {
                    const replacedIndex = await getReplacedIndex(kbnServer, request);
                    if (replacedIndex) {
                      const suffix = replacedIndex.slice(kbnServer.config().get('kibana.index').length + 1);
                      const modifiedPayload = originalPayload.replace(/scope.url(:|;)/g, 'scope.url.replace("app/kibana", "' + suffix + '/app/kibana")' + "$1");
                      if (modifiedPayload !== originalPayload) {
                        kbnServer.log(['plugin:own-home', 'debug'], 'Replace the string in commons.bundle.js: "app/kibana" => "' + suffix + '/app/kibana"');
                      } else {
                        kbnServer.log(['plugin:own-home', 'warning'], 'Failed to replace the string in commons.bundle.js: "app/kibana" => "' + suffix + '/app/kibana"');
                      }
                      response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
                      response.headers['Content-length'] = JSON.stringify(modifiedPayload).length;
                      p = modifiedPayload;
                    }
                  } else {
                    kbnServer.log(['plugin:own-home', 'debug'], 'Replacement skipped because the target file has already been chached.');
                  }
                  const r = h.response(p);
                  r.headers = response.headers;
                  return r;
                } catch (err) {
                  throw err;
                }
              };
              return wreckRead();
            } else {
              const r = h.response(response);
              r.headers = response.headers;
              return r;
            }
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

    try {
      await server.register({
        plugin: require('yar'),
        options: yarOptions
      });
    } catch (err) {
      kbnServer.log(['plugin:own-home', 'error'], 'Unknown error occured at the init()');
    }

  };
  start();
};
