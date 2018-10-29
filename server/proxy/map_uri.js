import { defaults, omit, trimEnd, trimStart } from 'lodash';
import { parse as parseUrl, format as formatUrl, resolve } from 'url';
import createKibanaIndex from './create_kibana_index';
import migrateConfig from './migrate_config';
import getReplacedIndex from './get_replaced_index';
import createClient from './create_client';

export default function mapUri(server) {
  const config = server.config();

  function joinPaths(pathA, pathB) {
    return trimEnd(pathA, '/') + '/' + trimStart(pathB, '/');
  }

  return function (request, done) {
    const {
      protocol: esUrlProtocol,
      slashes: esUrlHasSlashes,
      auth: esUrlAuth,
      hostname: esUrlHostname,
      port: esUrlPort,
      pathname: esUrlBasePath,
      query: esUrlQuery
    } = parseUrl(config.get('own_home.elasticsearch.url'), true);

    // copy most url components directly from the elasticsearch.url
    const mappedUrlComponents = {
      protocol: esUrlProtocol,
      slashes: esUrlHasSlashes,
      auth: esUrlAuth,
      hostname: esUrlHostname,
      port: esUrlPort
    };


    function coreMapUri(path, kibanaIndexAction) {
      // pathname
      mappedUrlComponents.pathname = joinPaths(esUrlBasePath, path);

      // querystring
      const mappedQuery = defaults(omit(request.query, '_'), esUrlQuery || {});
      if (Object.keys(mappedQuery).length) {
        mappedUrlComponents.query = mappedQuery;
      }

      const mappedUrl = formatUrl(mappedUrlComponents);

      if (kibanaIndexAction) {
        server.log(['plugin:own-home', 'debug'], 'mappedUrl: ' + mappedUrl);

        function sleep(time) {
          return new Promise((resolve, reject) => {
            setTimeout(() => {
              resolve();
            }, time);
          });
        }

        // NOTE(wtakase): Override authorization header to force to access by elasticsearch.username.
        if (config.get('own_home.force_to_access_by_es_user')) {
          const username = config.get('elasticsearch.username');
          const password = config.get('elasticsearch.password');
          if (username && password) {
            request.headers['Authorization'] = 'Basic ' + new Buffer(username + ':' + password).toString('base64');
            server.log(['plugin:own-home', 'debug'], 'authorization header has been overridden.');
          }
        }

        if (kibanaIndexAction == 'created') {
          // NOTE(wtakase): Currently there is no way other than to wait a few seconds for the index creation.
          sleep(config.get('own_home.wait_kibana_index_creation')).then(function () {
            server.log(['plugin:own-home', 'debug'], 'Wait a few seconds for Kibana index creation');
            done(null, mappedUrl, request.headers);
          });
        } else {
          done(null, mappedUrl, request.headers);
        }
      } else {
        done(null, mappedUrl, request.headers);
      }
    }

    const replacedIndex = getReplacedIndex(server, request);
    const originalIndex = config.get('kibana.index');
    const path = request.path;

    if (replacedIndex && path.indexOf(originalIndex) > -1 && path.indexOf(replacedIndex) === -1) {
      const reOriginalIndex = RegExp('(\\/)' + originalIndex + '(\\/|$)');
      const replacedPath = path.replace(reOriginalIndex, "$1" + replacedIndex + "$2");
      server.log(['plugin:own-home', 'debug'], 'Replace kibana.index "' + originalIndex + '" with "' + replacedIndex + '"');
      server.log(['plugin:own-home', 'debug'], 'Replaced path: ' + replacedPath);

      // Check replaced kibana index exists
      const client = createClient(server);
      client.indices.exists({ index: replacedIndex }).then(function (exists) {
        if (exists === true) {
          // Ignore 409 error: 'document_already_exists_exception'
          migrateConfig(server, replacedIndex, [409]).then(coreMapUri(replacedPath, 'migrated'));
        } else {
          createKibanaIndex(server, replacedIndex).then(coreMapUri(replacedPath, 'created'));
        }
      });
    } else {
      coreMapUri(path, false);
    }
  };
};
