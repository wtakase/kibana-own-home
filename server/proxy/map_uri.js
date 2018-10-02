import { defaults, omit, trimRight, trimLeft } from 'lodash';
import { parse as parseUrl, format as formatUrl, resolve } from 'url';
import replaceKibanaIndex from './replace_kibana_index_in_path';
import getJwt from '../jwt/get_jwt';
import verifyJwt from '../jwt/verify_jwt';
import Boom from 'boom';

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

    if (config.get('own_home.jwt.enabled')) {
      const jwtToken = getJwt(request);
      verifyJwt(server, jwtToken,
        () => {
          done(null, mappedUrl, request.headers);
        },
        () => {
          done(Boom.forbidden('Unauthorized'), null, null);
        });
    } else {
      done(null, mappedUrl, request.headers);
    }

  };
};
