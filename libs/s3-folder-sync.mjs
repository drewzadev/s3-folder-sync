import _ from 'lodash'
import fs from 'fs-extra'
import fg from 'fast-glob';
import __ from './attempt.mjs'
import S3Bucket from './s3bucket.mjs'
import PgpEncryption from './pgp-encryption.mjs'

export default class S3FolderSync {
  constructor (config, logger) {
    this.config = config
    this.logger = logger
    this.s3Bucket = null
    this.pgp = null
  }

  /**
   * Starts the S3 Folder Sync App
   * @returns {Promise<unknown>}
   */
  start() {
    return new Promise(async (resolve, reject) => {
      this.logger.info('Info: Configuration loaded.')

      this.checkConfigAndArguments()
      const folder = this.cleanFolderPath(this.config.args.folder)
      const bucketName = this.config.args.bucket

      this.pgp = new PgpEncryption(this.config, this.logger)
      if(this.config.args.encrypt === 'yes') {
        const [initPgpError, initPgpResult] = await __(this.pgp.init())
        if (initPgpError) {
          return reject(initPgpError)
        }
      }

      this.s3Bucket = new S3Bucket(this.config, this.logger)
      this.s3Bucket.init()

      if(this.config.args.mode === 'upload') {
        const [testError, testResult] = await __(this.s3Bucket.testBucketAccess(bucketName))
        if (testError) {
          return reject(testError)
        }
        if (!testResult){
          return reject('Error: Object Storage Bucket Access Failed.')
        }
        this.logger.info('Connection to S3 Bucket initialised.')

        const [getDirListError, getDirListResult] = await __(this.getDirectoryList(folder, this.config.args.filter, this.config.args.exclude, this.config.args.dotFiles, this.config.args.followSymbolicLinks))
        if (getDirListError) {
          return reject(getDirListError)
        }

        this.logger.info(`Found ${_.size(getDirListResult)} files to upload in the folder: ${folder}`)

        const [error, result] = await __(this.uploadFileListToS3(getDirListResult, bucketName))
        if (error) {
          return reject(getDirListError)
        }

      } else if(this.config.args.mode === 'download') {

        const [testError, testResult] = await __(this.s3Bucket.testBucketAccess(bucketName))
        if (testError) {
          return reject(testError)
        }
        if (!testResult){
          return reject('Error: S3 Object Storage Bucket Access Failed.')
        }
        this.logger.info('Connection to S3 Bucket initialised.')


        const [listError, listResult] = await __(this.s3Bucket.listObjects(bucketName))
        if (listError) {
          return reject(listError)
        }
        if (_.isEmpty(listResult.Contents)){
          this.logger.warn('No files available to download from S3 Bucket.')
          return resolve('No files available to download from S3 Bucket.')
        }

        const [downloadError, downloadResult] = await __(this.downloadListOfObjects(bucketName, listResult.Contents, folder))
        if (downloadError) {
          this.logger.error(listError)
          return reject(listError)
        }

      } else {
        this.logger.error('Error: Invalid --mode argument. Must be either "upload" or "download".')
        return reject('Error: Invalid --mode argument. Must be either "upload" or "download".')
      }

      this.logger.info('S3 Folder Sync completed.')
      return resolve(true)
    })
  }

  /**
   * Checks provided Config options and Arguments and returns any errors
   * guiding the user on how to configure the app
   */
  checkConfigAndArguments () {
    let configErrorAndExit = false
    let argsErrorAndExit = false
    if (_.isEmpty(this.config.bucketSecretKey)) {
      this.logger.error(`Error: Config file is missing the bucketSecretKey option.`)
      configErrorAndExit = true
    }
    if (_.isEmpty(this.config.bucketAccessKey)) {
      this.logger.error(`Error: Config file is missing the bucketAccessKey option.`)
      configErrorAndExit = true
    }
    if (_.isEmpty(this.config.bucketEndpoint)) {
      this.logger.error(`Error: Config file is missing the bucketEndpoint option.`)
      configErrorAndExit = true
    }
    if (_.isEmpty(this.config.bucketRegion)) {
      this.logger.error(`Error: Config file is missing the bucketRegion option.`)
      configErrorAndExit = true
    }
    if (_.isEmpty(this.config.pgpPassphrase)) {
      this.logger.error(`Error: Config file is missing the pgpPassphrase option.`)
      configErrorAndExit = true
    }
    if (_.isEmpty(this.config.pgpPrivateKeyArmored)) {
      this.logger.error(`Error: Config file is missing the pgpPrivateKeyArmored option.`)
      configErrorAndExit = true
    }
    if (_.isEmpty(this.config.pgpPublicKeyArmored)) {
      this.logger.error(`Error: Config file is missing the pgpPublicKeyArmored option.`)
      configErrorAndExit = true
    }
    if (_.isEmpty(this.config.args.mode)) {
      this.logger.error(`Missing the --mode argument.`)
      argsErrorAndExit = true
    }
    if (_.isEmpty(this.config.args.encrypt)) {
      this.logger.error(`Missing the --encrypt argument.`)
      argsErrorAndExit = true
    }
    if (_.isEmpty(this.config.args.bucket)) {
      this.logger.error(`Missing the --bucket argument.`)
      argsErrorAndExit = true
    }
    if (_.isEmpty(this.config.args.folder)) {
      this.logger.error(`Missing the --folder argument.`)
      argsErrorAndExit = true
    }
    if (_.isEmpty(this.config.args.dotFiles)) {
      this.config.args.dotFiles = true
    } else {
      this.config.args.dotFiles = this.config.args.dotFiles === 'yes'
    }
    if (_.isEmpty(this.config.args.followSymbolicLinks)) {
      this.config.args.followSymbolicLinks = true
    } else {
      this.config.args.followSymbolicLinks = this.config.args.followSymbolicLinks === 'yes'
    }
    if (_.isEmpty(this.config.args.filter)) {
      this.config.args.filter = ['*']
    }
    if (_.isEmpty(this.config.args.exclude)) {
      this.config.args.exclude = []
    }

    if(configErrorAndExit) {
      this.logger.info('The config file should have the following options: \n' +
        'bucketSecretKey=XXXXXX  : (Required) This is the Secret Key or Password for your Object Storage (S3) account. \n' +
        'bucketAccessKey=XXXXXX  : (Required) This is the Access Key for your Object Storage (S3) account. \n' +
        'bucketEndpoint=XXXXXX   : (Required) This is URL that points to your Object Storage account. Do not add the https:// prefix. \n' +
        'bucketRegion=XX         : (Required) This is Region code for your Object Storage account. Typically "US".')
      process.exit(1)
    }
    if(argsErrorAndExit) {
      this.logger.info('You can provide the following arguments: \n' +
        '--mode=XXXXXX        : (Required) This selects the sync direction. --mode=upload would upload the local directory to the bucket. --mode=download would do the opposite.  \n' +
        '--encrypt=XXXXXX     : (Required) This enables or disables PGP file encryption. --encrypt=yes would enable --encrypt=no would disable. \n' +
        '--bucket=XXXXXX      : (Required) This is the name of the bucket you want to upload to or download from in your Object Storage (S3). \n' +
        '--folder=XXXXXX      : (Required) This is local folder you want to upload from or download to. \n' +
        '--import-key=XXXXXX  : (Optional) Use this option on its own to import a PGP key from a PEM file. Specify the file with full path to import. \n' +
        'Example: # ./s3-folder-sync --mode=upload --encrypt=yes --bucket=nginx-configs --folder=/etc/nginx \n')
      process.exit(1)
    }
  }

  /**
   * Downloads a list of fileObjects from a given bucket to a destination folder.
   * If the file is encrypted then it will attempt to decrypt if the option is enabled.
   * @param {string} bucket - Name of S3 / Object Storage bucket
   * @param {array} objectsList - An array of objects in S3 lib format
   * @param {string} destinationFolder - Full path of destination folder
   * @returns {Promise<unknown>}
   */
  downloadListOfObjects(bucket, objectsList, destinationFolder) {
    return new Promise(async (resolve, reject) => {
      for (const object of objectsList) {

        const [downloadError, downloadResult] = await __(this.s3Bucket.downloadObject(object.Key, bucket))
        if (downloadError) {
          this.logger.error('Error:', downloadError)
          return reject(downloadError)
        }

        // Check if object is encrypted with pgp
        if (object.Key.endsWith('.pgp')) {
          if(this.config.args.encrypt !== 'yes') {
            this.logger.warn(`File ${object.Key} is encrypted with pgp but --encrypt=yes argument was not specified. Not downloading file.`)
            continue
          }
          const fileName = object.Key.replace('.pgp', '')
          const destinationFilePath = destinationFolder + '/' + fileName
          this.logger.info('Destination File Path:', destinationFilePath)

          const [decryptAndSaveError, decryptAndSaveResult] = await __(this.pgp.decryptAndSaveFile(downloadResult, destinationFilePath))
          if (decryptAndSaveError) {
            this.logger.error('Decrypting and saving file failed.', decryptAndSaveError)
            return reject(decryptAndSaveError)
          }
        } else {
          const destinationFilePath = destinationFolder + '/' + object.Key
          this.logger.info(`Downloading unencrypted file: ${object.Key} to ${destinationFilePath}.`)
          const [writeFileError, writeFileResult] = await __(fs.writeFile(destinationFilePath, downloadResult, {encoding: 'utf8'}))
          if (writeFileError) {
            this.logger.error('Error saving Object to file: ', writeFileError)
            return reject(writeFileError)
          }
        }

        this.logger.info(`Downloaded file: ${object.Key} successfully.`)
      }
      resolve (true)
    })
  }

  /**
   * Returns the folder listing for a given path and excludes sub-folders and ingore File Patterns
   * This function also allows for dot files and following symbolic links to be enabled or disabled.
   * @param {string} path - Full path of folder
   * @param {string} filterFilePatterns - An array of glob file patterns to filter by
   * @param {string} ignoreFilePatterns - An array of glob file patterns to specifically ignore
   * @param {boolean} showHiddenFiles - Show dot files
   * @param {boolean} followSymbolicLinks - Follow symbolic links
   * @returns {Promise<[]>}
   */
  async getDirectoryList (path, filterFilePatterns, ignoreFilePatterns, showHiddenFiles, followSymbolicLinks ) {
    const { glob } = fg
    const onlyFiles = true
    const objectMode = true
    const cwd = path
    const dot = showHiddenFiles
    const ignore = ignoreFilePatterns
    const options = { cwd, dot, onlyFiles, followSymbolicLinks, objectMode, ignore }

    const [error, result] = await __(glob(filterFilePatterns, options))
    if (error) {
      throw new Error(error)
    }
    if(_.isEmpty(result)) {
      return null
    }
    const dirEntries = _.map(result, (file) => {
      return file.dirent
    })
    const fileList = this.returnFilePathAndName(path, dirEntries)
    return fileList
  }

  /**
   * Returns an array of objects with path and filename
   * Excludes any sub-folders in the provided fileList
   * @param {string} path - Full path to folder
   * @param {array} fileList - An array of Dirent objects
   * @returns {[]}
   */
  returnFilePathAndName (path, fileList) {
    let returnList = []
    _.forEach(fileList, (file) => {
      if (!file.isDirectory()) {
        returnList.push({ path, name: file.name })
      }
    })
    return returnList
  }

  /**
   * Removes the trailing "/" from a folder path.
   * @param {string} path
   */
  cleanFolderPath (path) {
    if (_.endsWith(path, '/')) {
      return _.trimEnd(path, '/')
    }
    return path
  }

  /**
   * Uploads a given list of files with paths to the provided bucket.
   * Files are encrypted prior to being uploaded if enabled.
   * @param {array} fileList - Array of objects {path: "/example", name: "test.txt"}
   * @param {string} bucketName - Name of the S3 / Object Storage bucket
   * @returns {Promise<unknown>}
   */
  uploadFileListToS3 (fileList, bucketName) {
    return new Promise(async (resolve, reject) => {
      if(_.isEmpty(fileList)) {
        return resolve(false)
      }
      for (const file of fileList) {
        let filePath = file.path
        let fileName = file.name
        if(this.config.args.encrypt === 'yes') {
          const [encryptFileError, encryptFileResult] = await __(this.pgp.encryptFile(filePath, fileName))
          if (encryptFileError) {
            this.logger.error('Error while encrypting file:', encryptFileError)
            return reject(encryptFileError)
          }
          filePath = encryptFileResult.path
          fileName = encryptFileResult.pgpName
        }

        const [error, result] = await __(this.s3Bucket.uploadObject(filePath, fileName, bucketName))
        if (error) {
          this.logger.error('Object Storage upload error:', error)
          if(this.config.args.encrypt === 'yes') {
            const [removeFileError] = await __(fs.remove(filePath + '/' + fileName))
            if (removeFileError) {
              this.logger.error('Error while deleting temporary encrypted file:', removeFileError)
            }
          }
          return reject(error)
        }
        this.logger.info(`Successfully uploaded ${filePath}/${fileName} to S3 bucket.`)
        if(this.config.args.encrypt === 'yes') {
          const [removeFileError] = await __(fs.remove(filePath + '/' + fileName))
          if (removeFileError) {
            this.logger.error('Error while deleting temporary encrypted file:', removeFileError)
          }
        }
      }
      return resolve(true)
    })
  }

}
