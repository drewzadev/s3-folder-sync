import fs from 'fs-extra'
import * as openpgp from 'openpgp'
import __ from './attempt.mjs'
import PemFormat from './pem-format.mjs'

export default class PgpEncryption {
  constructor (config, logger) {
    this.config = config
    this.logger = logger
    this.pgpPrivateKeyArmored = config.pgpPrivateKeyArmored
    this.pgpPublicKeyArmored = config.pgpPublicKeyArmored
    this.pgpPrivateKey = null
    this.pgpPublicKey = null
    this.passphrase = config.pgpPassphrase
  }

  /**
   * Initialises PGP by de-armoring the PGP keys for use.
   * @returns {Promise<unknown>}
   */
  async init() {
    this.logger.info('Unlocking PGP Keys...')
    const pemFormat = new PemFormat()
    const pgpPrivateKeyArmoredPemFormat = pemFormat.wrapKey(pemFormat.keyTypes.pgpPrivate, this.config.pgpPrivateKeyArmored)
    const pgpPublicKeyArmoredPemFormat = pemFormat.wrapKey(pemFormat.keyTypes.pgpPublic, this.config.pgpPublicKeyArmored)

    const passphrase = this.passphrase
    const [readPrivateKeyError, readPrivateKeyResult] = await __(openpgp.readPrivateKey({ armoredKey: pgpPrivateKeyArmoredPemFormat }))
    if (readPrivateKeyError) {
      this.logger.error('Error reading private key: ', readPrivateKeyError)
      throw new Error(readPrivateKeyError)
    }
    const [privateKeyError, pgpPrivateKey] = await __(openpgp.decryptKey({ privateKey: readPrivateKeyResult, passphrase }))
    if (privateKeyError) {
      this.logger.error('Error decrypting PGP private key: ', privateKeyError)
      throw new Error(privateKeyError)
    }
    this.pgpPrivateKey = pgpPrivateKey
    this.logger.info('PGP Private Key unlocked')

    const [publicKeyError, pgpPublicKey] = await __(openpgp.readKey({ armoredKey: pgpPublicKeyArmoredPemFormat }))
    if (publicKeyError) {
      this.logger.error('Error decrypting PGP public key: ', publicKeyError)
      throw new Error(publicKeyError)
    }
    this.pgpPublicKey = pgpPublicKey
    this.logger.info('PGP Public Key unlocked')
    return true
  }

  /**
   * Decrypts a file and saves it to the specified path
   * @param {stream} stream - The readable file stream
   * @param {string} filePath - The destination file path to save the file to
   * @returns {Promise<unknown>}
   */
  async decryptAndSaveFile(stream, filePath) {
    const decryptedMessage = await openpgp.decrypt({
      message: await openpgp.readMessage({ armoredMessage: stream }),
      verificationKeys: this.pgpPublicKey,
      decryptionKeys: this.pgpPrivateKey
    })

    // Openpgp.js has a weird implementation where Uint8Array data is returned as a string
    // This converts the string back to a Uint8Array Buffer
    const dataBuffer = Buffer.from(Uint8Array.from(decryptedMessage.data.split(','))).toString('utf8')

    const [writeFileError, writeFileResult] = await __(fs.writeFile(filePath, dataBuffer, {encoding: 'utf8'}))
    if (writeFileError) {
      this.logger.error('Error decrypting PGP file: ', writeFileError)
      throw new Error(writeFileError)
    }

    this.logger.info('Finish Decrypting and saving file!')
    return true
  }

  /**
   * Encrypts a file and saves it to the file system with the ".pgp" suffix
   * @param {string} path - Full path to the files folder
   * @param {string} name - File name
   * @returns {Promise<unknown>}
   */
  encryptFile(path, name) {
    return new Promise(async (resolve, reject) => {
      this.logger.info(`Encrypting ${path}/${name}...`)
      // use fs to read file at filepath and return buffer
      let readableStream = fs.createReadStream(path + '/' + name)
      const encrypted = await openpgp.encrypt({
        message: await openpgp.createMessage({ text: readableStream }),
        encryptionKeys: this.pgpPublicKey,
        signingKeys: this.pgpPrivateKey
      })
      const pgpName = name + '.pgp'
      let writeStream = fs.createWriteStream(path + '/' + pgpName, {encoding: 'utf8'})
      encrypted.pipe(writeStream)
        .on('finish', () => {
          this.logger.info(`Successfully encrypted ${path}/${name}`)
          return resolve({path, name, pgpName})
        })
        .on('error', (error) => {
          this.logger.error(`Error encrypting ${path}/${name}: `, error)
          return reject(error)
        })
    })
  }

}
