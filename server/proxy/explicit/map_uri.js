import { defaults, omit, trimRight, trimLeft, pull } from 'lodash';
import { parse as parseUrl, format as formatUrl, resolve } from 'url';
import getSuffixFromPath from './get_suffix_from_path';
import getRemoteUser from '../../get_remote_user';
import validate from '../../validate';

export default function mapUri(server) {
  const config = server.config();

  function joinPaths(pathA, pathB) {
    return trimRight(pathA, '/') + '/' + trimLeft(pathB, '/');
  }

  return function (request, done) {
    const {
      protocol: kibanaUrlProtocol,
      slashes: kibanaUrlHasSlashes,
      auth: kibanaUrlAuth,
      hostname: kibanaUrlHostname,
      port: kibanaUrlPort,
      pathname: kibanaUrlBasePath,
      query: kibanaUrlQuery
    } = parseUrl(server.info.uri, true);

    // copy most url components directly from the server.info.uri
    const mappedUrlComponents = {
      protocol: kibanaUrlProtocol,
      slashes: kibanaUrlHasSlashes,
      auth: kibanaUrlAuth,
      hostname: kibanaUrlHostname,
      port: kibanaUrlPort
    };

    // pathname
    const suffix = getSuffixFromPath(request.path);
    const remoteUser = getRemoteUser(server, request);
    if (suffix !== null && remoteUser !== null) {
      validate(server, request, remoteUser, suffix, null);
      mappedUrlComponents.pathname = joinPaths(kibanaUrlBasePath, request.path.split('/').slice(2).join('/'));
    } else {
      mappedUrlComponents.pathname = joinPaths(kibanaUrlBasePath, request.path);
    }

    // querystring
    const mappedQuery = defaults(omit(request.query, '_'), kibanaUrlQuery || {});
    if (Object.keys(mappedQuery).length) {
      mappedUrlComponents.query = mappedQuery;
    }

    const mappedUrl = formatUrl(mappedUrlComponents);
    server.log(['plugin:own-home', 'debug'], 'mappedUrl: ' + mappedUrl);
    // TODO(wtakase): Investigate why 'acceptEncoding: false' doesn't work
    delete request.headers['accept-encoding'];
    done(null, mappedUrl, request.headers);

  };
};
