VERSION="5.1.1"
ZIP_FILE="own_home-${VERSION}.zip"
rm -rf node_modules
npm install --legacy-bundling
npm run build
unzip build/${ZIP_FILE}
git archive ${VERSION} kibana --output=${ZIP_FILE}
