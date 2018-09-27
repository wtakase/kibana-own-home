export default function (request) {
  const authToken = 'authorization';

  if (authToken in request.headers) {
    const authHeader = request.headers[authToken];
    const authMethod = authHeader.split(' ')[0].toLowerCase();
    if (authMethod === 'bearer') {
      return authHeader.substring(7);
    }
  }

  return null;
}
