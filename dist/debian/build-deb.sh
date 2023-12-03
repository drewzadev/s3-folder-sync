#!/bin/bash
set -e
WORKDIR=`pwd`
normalColour="\033[1m\033[0m"
yellowColour="\E[1;33m"
greenColour="\E[1;32m"
buildArch=$(uname -m)
if [[ ${buildArch} == 'aarch64' ]]
  then
    buildArch="arm64"
fi
if [[ ${buildArch} == 'x86_64' ]]
  then
    buildArch="amd64"
fi
echo -e "${yellowColour}########################################### ${normalColour}"
echo -e "${yellowColour} Building DEB for detected ARCH:${normalColour} ${buildArch}"
echo -e "${yellowColour}########################################### ${normalColour}"
echo -e ""
# Build Binary
echo -e "${yellowColour}Building Binary File... ${normalColour}"
npm run-script esbuild
if [[ ${buildArch} == 'arm64' ]]
  then
    npm run-script build-linux-arm64
  else
    npm run-script build-linux-amd64
fi
# Setup DEB build environment
echo -e "${yellowColour}Setting up DEB Build process... ${normalColour}"
cd "${HOME}/"
rm -rf "${HOME}/s3-folder-sync"
mkdir -p "${HOME}/s3-folder-sync"
mkdir -p ${HOME}/s3-folder-sync/etc/s3-folder-sync
mkdir -p ${HOME}/s3-folder-sync/opt/s3-folder-sync
mkdir -p ${HOME}/s3-folder-sync/debian
cp "${WORKDIR}/dist/debian/rules" ${HOME}/s3-folder-sync/debian/rules
cp "${WORKDIR}/dist/debian/changelog" ${HOME}/s3-folder-sync/debian/changelog
cp "${WORKDIR}/dist/debian/s3-folder-sync-${buildArch}.control" ${HOME}/s3-folder-sync/debian/control
cp "${WORKDIR}/dist/debian/copyright" ${HOME}/s3-folder-sync/debian/copyright
cp "${WORKDIR}/dist/debian/s3-folder-sync.install" ${HOME}/s3-folder-sync/debian/s3-folder-sync.install
cp "${WORKDIR}/dist/debian/s3-folder-sync.postinst" ${HOME}/s3-folder-sync/debian/s3-folder-sync.postinst
chmod ugo+x ${HOME}/s3-folder-sync/debian/rules
rm -rf ${WORKDIR}/dist/debs
mkdir -p ${WORKDIR}/dist/debs

# Build Stable DEB (Debian 10 and higher, Ubuntu 20.04 and higher)
cd "${HOME}/${PRODDIR}/"
s3foldersyncVersion=`cat ${WORKDIR}/dist/debian/version | grep 'version' | awk -F"=" '{print $2}'`
echo -e "${yellowColour}S3 Folder Sync Version is: ${s3foldersyncVersion} ${normalColour}"
if [[ ${buildArch} == 'arm64' ]]
  then
    npmBuildArch="arm64"
  else
    npmBuildArch="x86"
fi
cp "${WORKDIR}/dist/${npmBuildArch}/s3-folder-sync.bin" "${HOME}/s3-folder-sync/opt/s3-folder-sync/"
cd ${HOME}
rm -rf ${HOME}/s3-folder-sync_${s3foldersyncVersion}_${buildArch}
mkdir -p ${HOME}/s3-folder-sync_${s3foldersyncVersion}_${buildArch}
/usr/bin/cp -r ${HOME}/s3-folder-sync/* ${HOME}/s3-folder-sync_${s3foldersyncVersion}_${buildArch}/
cd ${HOME}/s3-folder-sync/
dpkg-buildpackage -us -uc -b

# Move files locally
mkdir -p ${WORKDIR}/dist/debs
mv ${HOME}/s3-folder-sync_${s3foldersyncVersion}_${buildArch}.deb ${WORKDIR}/dist/debs/s3-folder-sync_${s3foldersyncVersion}_${buildArch}.deb
rm -rf ${HOME}/s3-folder-sync_${s3foldersyncVersion}_${buildArch}
echo -e "${greenColour}--> Completed DEB file for ${buildArch} ${normalColour}"


# Clean up files.
echo -e "${yellowColour}Cleaning up all files... ${normalColour}"
rm -rf ${HOME}/s3-folder-sync
rm -f ${HOME}/*.buildinfo
rm -f ${HOME}/*.changes
rm -f ${HOME}/*.deb
echo -e "${greenColour}All Tasks Completed Successfully! ${normalColour}"
