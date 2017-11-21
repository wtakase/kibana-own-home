import { defaults, omit, trimRight, trimLeft } from 'lodash';
import { parse as parseUrl, format as formatUrl, resolve } from 'url';
import replaceKibanaIndex from './replace_kibana_index_in_path';

export default function mapUri(server, mappings) {
  const config = server.config();

  function joinPaths(pathA, pathB) {
    return trimRight(pathA, '/') + '/' + trimLeft(pathB, '/');
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

    // pathname
    const path = replaceKibanaIndex(server, request, request.path, mappings);
    mappedUrlComponents.pathname = joinPaths(esUrlBasePath, path);

    // querystring
    const mappedQuery = defaults(omit(request.query, '_'), esUrlQuery || {});
    if (Object.keys(mappedQuery).length) {
      mappedUrlComponents.query = mappedQuery;
    }

    const mappedUrl = formatUrl(mappedUrlComponents);
    server.log(['plugin:own-home', 'debug'], 'mappedUrl: ' + mappedUrl);

    // NOTE(wtakase): Override authorization header to force to access by elasticsearch.username.
    if (config.get('own_home.force_to_access_by_es_user')) {
      const username = config.get('elasticsearch.username');
      const password = config.get('elasticsearch.password');
      if (username && password) {
        request.headers['Authorization'] = 'Basic ' + new Buffer(username + ':' + password).toString('base64');
        server.log(['plugin:own-home', 'debug'], 'authorization header has been overridden.');
      }
    }

    done(null, mappedUrl, request.headers);

  };
};
