import getGroups from './get_groups';

export default function (server, request, remoteUser, kibanaIndexSuffix) {
  const validate = async function () {
    const groups = await getGroups(server, request, remoteUser);
    for (let group of groups) {
      if (group == kibanaIndexSuffix) {
        return true;
      }
    }
    return false;
  }
  return validate();
};
