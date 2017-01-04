export default function (server, request, remoteUser, suffix) {
  request.yar.set(remoteUser, { key: server.config().get('kibana.index') + '_' + suffix });
};
