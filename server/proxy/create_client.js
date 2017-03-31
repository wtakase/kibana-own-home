import elasticsearch from 'elasticsearch';
import _ from 'lodash';
import Bluebird from 'bluebird';
const readFile = (file) => require('fs').readFileSync(file, 'utf8');
import util from 'util';
import url from 'url';

module.exports = function (server) {
  const config = server.config();

  class ElasticsearchClientLogging {
    error(err) {
      server.log(['plugin:own-home', 'error'], err);
    }
    warning(message) {
      server.log(['plugin:own-home', 'warning'], message);
    }
    info() {}
    debug() {}
    trace() {}
    close() {}
  }

  function createClient(options) {
    options = _.defaults(options || {}, {
      url: config.get('own_home.elasticsearch.url'),
      username: config.get('elasticsearch.username'),
      password: config.get('elasticsearch.password'),
      verifySsl: config.get('elasticsearch.ssl.verificationMode'),
      clientCrt: config.get('elasticsearch.ssl.certificate'),
      clientKey: config.get('elasticsearch.ssl.key'),
      ca: config.get('own_home.elasticsearch.ssl.certificateAuthorities'),
      apiVersion: config.get('elasticsearch.apiVersion'),
      pingTimeout: config.get('elasticsearch.pingTimeout'),
      requestTimeout: config.get('elasticsearch.requestTimeout'),
      keepAlive: true,
      auth: true
    });

    const uri = url.parse(options.url);

    let authorization;
    if (options.auth && options.username && options.password) {
      uri.auth = util.format('%s:%s', options.username, options.password);
    }

    const ssl = { rejectUnauthorized: options.verifySsl };
    if (options.clientCrt && options.clientKey) {
      ssl.cert = readFile(options.clientCrt);
      ssl.key = readFile(options.clientKey);
    }
    if (options.ca) {
      ssl.ca = options.ca.map(readFile);
    }

    const host = {
      host: uri.hostname,
      port: uri.port,
      protocol: uri.protocol,
      path: uri.pathname,
      auth: uri.auth,
      query: uri.query,
      headers: config.get('elasticsearch.customHeaders')
    };

    return new elasticsearch.Client({
      host,
      ssl,
      plugins: options.plugins,
      apiVersion: options.apiVersion,
      keepAlive: options.keepAlive,
      pingTimeout: options.pingTimeout,
      requestTimeout: options.requestTimeout,
      defer: function () {
        return Bluebird.defer();
      },
      log: ElasticsearchClientLogging
    });
  }

  return createClient();

};
