import { defaults, omit, trimEnd, trimStart } from 'lodash';
import { parse as parseUrl, format as formatUrl, resolve } from 'url';
import createKibanaIndex from './create_kibana_index';
import getReplacedIndex from './get_replaced_index';
import createClient from './create_client';
import getRemoteUser from '../get_remote_user';
import validate from '../validate';
import setKibanaIndex from '../set_kibana_index';

export default function mapUri(server) {
  const config = server.config();

  function joinPaths(pathA, pathB) {
    return trimEnd(pathA, '/') + '/' + trimStart(pathB, '/');
  }

  return async function (request) {
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
            request.headers['Authorization'] = 'Basic ' + new Buffer.from(username + ':' + password).toString('base64');
            server.log(['plugin:own-home', 'debug'], 'authorization header has been overridden.');
          }
        }

        if (kibanaIndexAction == 'created') {
          // NOTE(wtakase): Currently there is no way other than to wait a few seconds for the index creation.
          return sleep(config.get('own_home.wait_kibana_index_creation')).then(function () {
            server.log(['plugin:own-home', 'debug'], 'Wait a few seconds for Kibana index creation');
            return {
              uri: mappedUrl
            };
          });
        } else {
          return {
            uri: mappedUrl
          };
        }
      } else {
        return {
          uri: mappedUrl
        };
      }
    }

    const tenant = request.headers['tenant'];
    if (typeof tenant !== 'undefined' && tenant != null) {
      const remoteUser = getRemoteUser(server, request);
      const isValidated = await validate(server, request, remoteUser, tenant);
      if (isValidated) {
        setKibanaIndex(server, request, remoteUser, tenant);
      }
    }

    const replacedIndex = await getReplacedIndex(server, request);
    const originalIndex = config.get('kibana.index');
    const path = request.path;

    if (replacedIndex && path.indexOf(originalIndex) > -1 && path.indexOf(replacedIndex) === -1) {
      const reOriginalIndex = RegExp('(\\/)' + originalIndex + '(\\/|$)');
      const replacedPath = path.replace(reOriginalIndex, "$1" + replacedIndex + "$2");
      server.log(['plugin:own-home', 'debug'], 'Replace kibana.index "' + originalIndex + '" with "' + replacedIndex + '"');
      server.log(['plugin:own-home', 'debug'], 'Replaced path: ' + replacedPath);

      // Check replaced kibana index exists
      const client = createClient(server);
      return client.indices.exists({ index: replacedIndex }).then(function (exists) {
        if (exists === true) {
          return coreMapUri(replacedPath, false);
        } else {
          return createKibanaIndex(server, replacedIndex).then(function () {
                   return coreMapUri(replacedPath, 'created')
                 });
        }
      });
    } else {
      return coreMapUri(path, false);
    }
  };
};
