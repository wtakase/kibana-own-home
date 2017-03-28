export default function (server, kibanaIndexSuffix) {
  return server.config().get('own_home.local.groups').indexOf(kibanaIndexSuffix) >= 0;
}
