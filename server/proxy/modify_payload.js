import _ from 'lodash';
import getKibanaIndexName from './get_kibana_index_name';

export default function modifyPayload(server) {
  const config = server.config();

  return function (request) {

    let req = request.raw.req;
    return new Promise(function (fulfill, reject) {

      let body = '';

      // Accumulate requested chunks
      req.on('data', function (chunk) {
        body += chunk;
      });

      req.on('end', function () {
        fulfill({
          payload: replaceRequestBody(body)
        });
      });

    });

    // Replace kibana.index in mget request body
    function replaceRequestBody(body) {
      if (!request.path.endsWith('_mget')) {
        return new Buffer(body);
      }
      try {
        if (!body) {
          return new Buffer(body);
        }
        let data = JSON.parse(body);
        let payload = '';
        if ('docs' in data) {
          let replaced = false;
          let i = 0;
          data['docs'] = _.map(data['docs'], function (doc) {
            if ('_index' in doc && doc['_index'] == config.get('kibana.index')) {
              const replacedIndex = getKibanaIndexName(server, request);
              if (replacedIndex) {
                doc['_index'] = replacedIndex;
                replaced = true;
                server.log(['plugin:own-home', 'debug'], 'Replace docs[' + i + '][\'_index\'] "' + config.get('kibana.index') + '" with "' + replacedIndex + '"');
              }
            }
            i++;
            return doc;
          });
          payload = JSON.stringify(data);
          if (replaced) {
            server.log(['plugin:own-home', 'debug'], 'Original request payload: ' + JSON.stringify(JSON.parse(body)));
            server.log(['plugin:own-home', 'debug'], 'Replaced request payload: ' + payload);
          }
        }
        return new Buffer(payload);
      } catch (err) {
        server.log(['plugin:own-home', 'error'], 'Bad JSON format: ' + body + ': ' + err);
        return new Buffer(body);
      }
    }

  };
};
