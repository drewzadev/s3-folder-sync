Name:           s3-folder-sync
Version:        1.0.7
Release:        1
Summary:        Syncronise a local folder with an S3 / Object Storage bucket.
Group:          Applications/Tools
License:        MIT
URL:            https://github.com/drewzadev/
Vendor:         Andrew Burns
Packager:       Andrew Burns
BuildArch:      aarch64

%define __os_install_post %{nil}
%global LOCALSOURCEDIR %{getenv:HOME}

%description
Syncronise a local folder with an S3 / Object Storage bucket.

%build
cp %{LOCALSOURCEDIR}/s3-folder-sync/dist/rpm/s3-folder-sync.bin ./s3-folder-sync.bin
cp %{LOCALSOURCEDIR}/s3-folder-sync/dist/s3foldersync.conf ./s3foldersync.conf

%install
mkdir -p %{buildroot}/opt/s3-folder-sync
mkdir -p %{buildroot}/etc/s3-folder-sync
install -m 755 s3-folder-sync.bin %{buildroot}/opt/s3-folder-sync/s3-folder-sync.bin
install -m 600 s3foldersync.conf %{buildroot}/etc/s3-folder-sync/s3foldersync.conf

%files
/opt/s3-folder-sync/s3-folder-sync.bin

%config(noreplace) /etc/s3-folder-sync/s3foldersync.conf

%changelog
