#!/bin/bash
set -e
WORKDIR=`pwd`
buildArch=$(uname -m)
normalColour="\033[1m\033[0m"
yellowColour="\E[1;33m"
greenColour="\E[1;32m"
if [[ ${buildArch} == 'aarch64' ||  ${buildArch} == 'arm64' ]]
  then
    buildArch="aarch64"
fi
echo -e "${yellowColour}########################################### ${normalColour}"
echo -e "${yellowColour} Building RPM for detected ARCH:${normalColour} ${buildArch}"
echo -e "${yellowColour}########################################### ${normalColour}"
echo -e ""
# Build Binary
echo -e "${yellowColour}Building Binary File... ${normalColour}"
npm run-script esbuild
if [[ ${buildArch} == 'aarch64' ]]
  then
    npm run-script build-linux-arm64
  else
    npm run-script build-linux-amd64
fi
echo -e "${yellowColour}Setting up RPM Build process... ${normalColour}"
cd "${HOME}/"
# Build Stable RPM (RHEL 8 and higher)
rm -rf "${HOME}/rpmbuild"
mkdir -p "${HOME}/rpmbuild"
rm -rf "${HOME}/s3-folder-sync"
mkdir -p "${HOME}/s3-folder-sync"
cp "${WORKDIR}/dist/x86/s3-folder-sync.bin" "${HOME}/s3-folder-sync/"
cp "${WORKDIR}/dist/s3foldersync.conf" "${HOME}/s3-folder-sync/"
chmod u+x "${WORKDIR}/dist/rhel/rpmdev-setuptree.sh"
${WORKDIR}/dist/rhel/rpmdev-setuptree.sh
cp "${WORKDIR}/dist/rhel/s3-folder-sync-${buildArch}.spec" "${HOME}/rpmbuild/SPECS/"
dos2unix "${HOME}/rpmbuild/SPECS/s3-folder-sync-${buildArch}.spec"
echo -e "${yellowColour}Building RPM... ${normalColour}"
rpmbuild -bb "${HOME}/rpmbuild/SPECS/s3-folder-sync-${buildArch}.spec"
echo -e "${yellowColour}Finished Building RPM... ${normalColour}"
mkdir -p "${WORKDIR}/dist/rpms/"
cp ${HOME}/rpmbuild/RPMS/${buildArch}/*.rpm ${WORKDIR}/dist/rpms/
# Done
rm -rf "${HOME}/rpmbuild"
rm -rf "${HOME}/s3-folder-sync"
echo -e "${greenColour}Successfully created RPM file. ${normalColour}"
