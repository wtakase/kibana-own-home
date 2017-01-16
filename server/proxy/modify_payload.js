import _ from 'lodash';
import getKibanaIndexName from './get_kibana_index_name';
import createKibanaIndex from './create_kibana_index';
import createClient from './create_client';

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

        // Replace kibana.index in mget request body
        if (request.path.endsWith('_mget') && body) {
          const replacedIndex = getKibanaIndexName(server, request);
          const payload = replaceRequestBody(body, replacedIndex);
          if (payload) {
            checkIndexThenFullfill(payload, replacedIndex);
            return;
          }
        }
        fulfill({
          payload: new Buffer(body)
        });
      });

      function replaceRequestBody(body, replacedIndex) {
        try {
          let replaced = false;
          let data = JSON.parse(body);
          if ('docs' in data) {
            let i = 0;
            data['docs'] = _.map(data['docs'], function (doc) {
              if ('_index' in doc && doc['_index'] == config.get('kibana.index')) {
                if (replacedIndex) {
                  doc['_index'] = replacedIndex;
                  replaced = true;
                  server.log(['plugin:own-home', 'debug'], 'Replace docs[' + i + '][\'_index\'] "' + config.get('kibana.index') + '" with "' + replacedIndex + '"');
                  if (!('_id' in doc)) {
                    doc['_id'] = '.kibana-devnull';
                    server.log(['plugin:own-home', 'debug'], 'Missing docs[' + i + '][\'_id\']: Put .kibana-devnull');
                  }
                }
              }
              i++;
              return doc;
            });
            if (replaced) {
              return JSON.stringify(data);
            } else {
              return null;
            }
          }
        } catch (err) {
          server.log(['plugin:own-home', 'error'], 'Bad JSON format: ' + body + ': ' + err);
          return null;
        }
      }

      function checkIndexThenFullfill(payload, replacedIndex) {
        server.log(['plugin:own-home', 'debug'], 'Original request payload: ' + JSON.stringify(JSON.parse(body)));
        server.log(['plugin:own-home', 'debug'], 'Replaced request payload: ' + payload);
        const client = createClient(server);
        client.indices.exists({ index: replacedIndex, ignoreUnavailable: false }).then(function (exists) {
          if (exists !== true) {
            server.log(['plugin:own-home', 'info'], 'kibana.index ' + replacedIndex + ' not found. It will be created soon.');
            createKibanaIndex(server, replacedIndex).then(function () {
              server.log(['plugin:own-home', 'debug'], 'kibana.index creation finished. Set modified payload.');
              fulfill({
                payload: new Buffer(payload)
              });
            });
          } else {
            server.log(['plugin:own-home', 'debug'], 'kibana.index already exists. Set modified payload.');
            fulfill({
              payload: new Buffer(payload)
            });
          }
        });
      }

    });
  };
};
