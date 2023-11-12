import _ from 'lodash'
import fs from 'fs-extra'
import { S3Client, HeadBucketCommand, ListObjectsV2Command, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'
import __ from './attempt.mjs'

export default class S3Bucket {
  constructor (config, logger) {
    this.config = config
    this.logger = logger
    this.s3client = null
  }

  /**
   * Initialise the S3 Client connection.
   * @returns {S3Client}
   */
  init() {
    const s3Config = {
      region: this.config.bucketRegion,
      endpoint: 'https://' + this.config.bucketEndpoint,
      sslEnabled: true,
      s3ForcePathStyle: false,
      credentials: {
        accessKeyId: this.config.bucketAccessKey,
        secretAccessKey: this.config.bucketSecretKey
      }
    }
    this.s3client = new S3Client(s3Config)
    return this.s3client
  }

  /**
   * Attempts to connect to an S3 Bucket and returns the result.
   * @param {string} bucket - Name of the bucket.
   * @returns {*}
   */
  testBucketAccess(bucket) {
    if(_.isNull(this.s3client)) {
      throw new Error('S3 Client connection not initialised.')
    }
    if(_.isEmpty(bucket)) {
      throw new Error('Bucket name is required.')
    }
    const input = {
      Bucket: bucket
    }
    const command = new HeadBucketCommand(input)
    return this.s3client.send(command)
  }

  /**
   * Lists the Objects (files) inside a Bucket.
   * @param {string} bucket - Name of the bucket.
   * @returns {*}
   */
  listObjects(bucket) {
    if(_.isNull(this.s3client)) {
      throw new Error('S3 Client connection not initialised.')
    }
    if(_.isEmpty(bucket)) {
      throw new Error('Bucket name is required.')
    }
    const input = {
      Bucket: bucket,
      MaxKeys: 1000,
    }
    const command = new ListObjectsV2Command(input)
    return this.s3client.send(command)
  }

  /**
   * Downloads an Object (file) from an S3 Bucket.
   * @param {string} objectName - Name of the object/ file to download.
   * @param {string} bucket - Name of the bucket.
   * @returns {Promise<unknown>}
   */
  downloadObject (objectName, bucket) {
    return new Promise(async (resolve, reject) => {
      if(_.isNull(this.s3client)) {
        throw new Error('S3 Client connection not initialised.')
      }
      if(_.isEmpty(bucket) || _.isEmpty(objectName)) {
        throw new Error('Missing argument.')
      }
      const input = {
        Bucket: bucket,
        Key: objectName,
      }
      const command = new GetObjectCommand(input);
      const [error, result] = await __(this.s3client.send(command))
      if (error) {
        return reject(error)
      }
      if (_.has(result, 'Body') === false) {
        return reject('Error: Result body is empty.')
      }

      const stream = result.Body

      let contentsBuffer = Buffer.concat(await stream.toArray())
      const final = contentsBuffer.toString()
      resolve (final)
    })
  }

  /**
   * Uploads an Object (file) to an S3 Bucket.
   * @param {string} path - Folder path to the file.
   * @param {string} name - Name of the file to upload.
   * @param {string} bucket - Name of the bucket to upload to.
   * @returns {*}
   */
  uploadObject (path, name, bucket) {
    if(_.isNull(this.s3client)) {
      throw new Error('S3 Client connection not initialised.')
    }
    if(_.isEmpty(bucket) || _.isEmpty(path) || _.isEmpty(name)) {
      throw new Error('Missing argument.')
    }
    // , {encoding: 'utf8'}
    const readableStream = fs.createReadStream(path + '/' + name)
    const input = {
      Body: readableStream,
      Bucket: bucket,
      Key: name
    }
    const command = new PutObjectCommand(input)
    this.logger.info(`Uploading ${path}/${name} to S3 Bucket...`)
    return this.s3client.send(command)
  }

}
