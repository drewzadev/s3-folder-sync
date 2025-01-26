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
    const message = await openpgp.readMessage({
      armoredMessage: stream
    });

    const decryptedMessage = await openpgp.decrypt({
      message,
      verificationKeys: this.pgpPublicKey,
      decryptionKeys: this.pgpPrivateKey,
      format: 'binary'
    });

    await fs.writeFile(filePath, Buffer.from(decryptedMessage.data));

    this.logger.info('Finish Decrypting and saving file!');
    return true;
  }

  /**
   * Encrypts a file and saves it to the file system with the ".pgp" suffix
   * @param {string} path - Full path to the files folder
   * @param {string} name - File name
   * @returns {Promise<unknown>}
   */
  async encryptFile(path, name) {
    return new Promise(async (resolve, reject) => {
      try {
        this.logger.info(`Encrypting ${path}/${name}...`);

        // Read file as binary
        const sourceFilePath = `${path}/${name}`;
        const fileData = await fs.readFile(sourceFilePath);

        const encrypted = await openpgp.encrypt({
          message: await openpgp.createMessage({ binary: fileData }), // Use binary mode
          encryptionKeys: this.pgpPublicKey,
          signingKeys: this.pgpPrivateKey
        });

        const pgpName = name + '.pgp';
        const destFilePath = `${path}/${pgpName}`;
        await fs.writeFile(destFilePath, encrypted);

        this.logger.info(`Successfully encrypted ${sourceFilePath}`);
        return resolve({path, name, pgpName});
      } catch (error) {
        this.logger.error(`Error encrypting ${path}/${name}: `, error);
        return reject(error);
      }
    });
  }

}
