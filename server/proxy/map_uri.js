import { defaults, omit, trimStart, trimEnd } from 'lodash';
import { parse as parseUrl, format as formatUrl, resolve } from 'url';
import replaceKibanaIndex from './replace_kibana_index';

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

    // pathname
    let path = replaceKibanaIndex(server, request, request.path);
    mappedUrlComponents.pathname = joinPaths(esUrlBasePath, path);

    // querystring
    const mappedQuery = defaults(omit(request.query, '_'), esUrlQuery || {});
    if (Object.keys(mappedQuery).length) {
      mappedUrlComponents.query = mappedQuery;
    }

    const mappedUrl = formatUrl(mappedUrlComponents);
    server.log(['plugin:own-home', 'debug'], 'mappedUrl: ' + mappedUrl);
    done(null, mappedUrl, request.headers);

  };
};
