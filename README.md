# S3 Folder Sync #

### What is S3 Folder Sync ###
S3 Folder Sync is a tool used to sync a local folder to an S3 bucket (Object Storage) and vice versa. The tool supports pgp encryption and decryption of files.
Typically, this is used to get setup scripts, SSL certificates and other supporting software from the S3 bucket for the local server 
or sync multiple servers from an S3 Bucket on an ongoing basis.

### How do I use S3 Folder Sync? ###

#### Upload files from local to S3 ####
```
s3-folder-sync.bin --mode=upload --encrypt=yes --folder=/path/to/local/folder --bucket=bucket-name
```
NB: This will encrypt the files that are uploaded to the S3 Bucket.

#### Download files from S3 to local ####
```
s3-folder-sync.bin --mode=download --encrypt=yes --folder=/path/to/local/folder --bucket=bucket-name
```

#### Upload files from local to S3 without Encryption ####
```
s3-folder-sync.bin --mode=upload --encrypt=no --folder=/path/to/local/folder --bucket=bucket-name
```

### Command Line Options ###

These are the available options for s3-folder-sync:

| Option                   | Description                                                                                                                                                                             |
|--------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| --mode=upload/download   | (Required) This selects the sync direction. --mode=upload would upload the local directory to the bucket. --mode=download would do the opposite.                                        |
| --encrypt=yes/no         | (Required) This enables or disables PGP file encryption. --encrypt=yes would enable --encrypt=no would disable.                                                                         |
| --bucket=name            | (Required) This is the name of the bucket you want to upload to or download from in your Object Storage (S3).                                                                           |
| --folder=/path/to/folder | (Required) This is local folder you want to upload from or download to.                                                                                                                 |
| --dotFiles=yes/no        | (Optional) Use this with upload mode to include or exclude dot / hidden files.                                                                                                          |
| --followSymbolicLinks=yes/no        | (Optional) Use this with upload mode to follow symbolic linked files.                                                                                                                   |
| --filter=*.html          | (Optional) Use this with upload mode to sync only a certain type of file or specific files. This can be set multiple times. Example:<br/>s3-folder-sync --filter=\*.html --filter=\*.js |
| --exclude=index.html     | (Optional) Use this with upload mode to exclude certain files or types of files. This can be set multiple times. Example:<br/>s3-folder-sync --exclude=\*.html --exclude=readme.md      |
| --import-key=XXXXXX      | (Optional) Use this option on its own to import a PGP key from a PEM file. Specify the file with full path to import.                                                                   |


### Configuration ###

S3 Folder Sync tool expects the configuration file `s3foldersync.conf` to be present in the same folder as the executable or in `/etc/s3-folder-sync/` folder.
On Windows and macOS the configuration file is expected to be in the same folder as the executable.

#### Configuration File Format ####

The configuration file uses an INI file format. The following are the supported sections and keys:

```
bucketSecretKey=
bucketAccessKey=
bucketEndpoint=
bucketRegion=
pgpPassphrase=
pgpPrivateKeyArmored=
pgpPublicKeyArmored=
```

- `bucketSecretKey` : This is the secret key for the S3 Bucket. This is a mandatory field.
- `bucketAccessKey` : This is the access key for the S3 Bucket. This is a mandatory field.
- `bucketEndpoint` : This is the HTTPS endpoint for the S3 Bucket. This is a mandatory field.
- `bucketRegion` : This is the region for the S3 Bucket. This is a mandatory field. Typically set to `US` or `EU`.
- `pgpPassphrase` : This is the passphrase used to encrypt and decrypt files. This is an optional field.
- `pgpPrivateKeyArmored` : This is the armored private key used to decrypt files. This is an optional field.
- `pgpPublicKeyArmored` : This is the armored public key used to encrypt files. This is an optional field.

## Development ##

### Versioning ###
- This project uses [Semantic Versioning](https://semver.org/).
- The version number is made up of 3 parts: Main Version, Release Version and Build Version.

### Committing Code ###
- Before a commit where the Version number is bumped / Tagged, update the package.json version field.
- Run `npm prepare-for-commit` on the command line to prep the build.
- All code must be committed to a branch and a pull request created for review.
- Once the pull request is approved, it can be merged into the main branch.


### License ###
S3 Folder Sync is an open-source software licensed under the [MIT licence](https://opensource.org/licenses/MIT).

