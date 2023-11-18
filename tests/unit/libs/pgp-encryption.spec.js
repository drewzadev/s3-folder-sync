import { expect } from 'chai'
import fs from 'fs-extra'
import sinon from 'sinon'
import PemFormat from '../../../libs/pem-format.mjs'
import PgpEncryption from '../../../libs/pgp-encryption.mjs'

describe('PgpEncryption', () => {
  let pgpEncryption
  let config
  let logger

  beforeEach(() => {
    config = {
      pgpPrivateKeyArmored: '-----BEGIN PGP PRIVATE KEY BLOCK-----\naGVsbG8gd29ybGQ=\n-----END PGP PRIVATE KEY BLOCK-----',
      pgpPublicKeyArmored: '-----BEGIN PGP PUBLIC KEY BLOCK-----\naGVsbG8gd29ybGQ=\n-----END PGP PUBLIC KEY BLOCK-----',
      pgpPassphrase: 'passphrase'
    }
    logger = {
      info: sinon.stub(),
      error: sinon.stub()
    }
    pgpEncryption = new PgpEncryption(config, logger)
  })

  describe('init', () => {
    it('should initialize PGP keys', async () => {
      await pgpEncryption.init()
      expect(pgpEncryption.pgpPrivateKey).to.not.be.null
      expect(pgpEncryption.pgpPublicKey).to.not.be.null
    })
  })

  describe('decryptAndSaveFile', () => {
    it('should decrypt a file and save it to the specified path', async () => {
      const stream = fs.createReadStream('./test.txt')
      const filePath = './decrypted.txt'
      await pgpEncryption.decryptAndSaveFile(stream, filePath)
      expect(fs.existsSync(filePath)).to.be.true
    })
  })

  describe('encryptFile', () => {
    it('should encrypt a file and save it to the file system with the ".pgp" suffix', async () => {
      const path = '.'
      const name = 'test.txt'
      const result = await pgpEncryption.encryptFile(path, name)
      expect(result.pgpName).to.equal('test.txt.pgp')
      expect(fs.existsSync(`${path}/${result.pgpName}`)).to.be.true
    })
  })
})