import * as openpgp from 'openpgp'
import minimist from 'minimist'
import fs from 'fs-extra'
import PemFormat from './libs/pem-format.mjs'
import ConfigIniParser from 'config-ini-parser'
import PgpEncryption from './libs/pgp-encryption.mjs'

const generatePgpKeys = async (name, email, passphrase) => {
  try {
    // Generate the key pair
    const { privateKey, publicKey } = await openpgp.generateKey({
      type: 'rsa',
      rsaBits: 4096,
      userIDs: [{ name, email }],
      passphrase,
      format: 'armored'
    })

    // Create PEM formatter instance
    const pemFormat = new PemFormat()
    // Format the keys correctly to be stored in the s3foldersync.conf file
    const wrappedPrivate = pemFormat.unwrapKey('"' + privateKey + '"')
    const wrappedPublic = pemFormat.unwrapKey('"' + publicKey + '"')
    console.log('Generated private and public keys...')
    return {
      privateKey: wrappedPrivate,
      publicKey: wrappedPublic
    }
  } catch (error) {
    console.error('Error generating PGP keys:', error)
    throw error
  }
}

const validateArgs = (argv) => {
  const required = ['name', 'email', 'passphrase']
  const missing = required.filter(arg => !argv[arg])

  if (missing.length > 0) {
    console.error('\nError: Missing required arguments:', missing.join(', '))
    console.error('\nUsage:')
    console.error('node pgp-key-generator.js --name="Your Name" --email="your.email@example.com" --passphrase="your-secure-passphrase"')
    process.exit(1)
  }

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(argv.email)) {
    console.error('\nError: Invalid email address format')
    process.exit(1)
  }

  // Basic passphrase validation
  if (argv.passphrase.length < 8) {
    console.error('\nError: Passphrase must be at least 8 characters long')
    process.exit(1)
  }
}

const saveCredentialsToFile = async (credentials) => {
  const filename = 'pgp-credentials.txt'

  // Format exactly like the working config file
  const content = `bucketSecretKey=
bucketAccessKey=
bucketEndpoint=
bucketRegion=
pgpPassphrase=${credentials.passphrase}
pgpPrivateKeyArmored=${credentials.privateKey}
pgpPublicKeyArmored=${credentials.publicKey}`

  try {
    await fs.writeFile(filename, content, 'utf8')
    console.log(`\nCredentials saved to ${filename}`)
    return filename
  } catch (error) {
    console.error('Error saving credentials to file:', error)
    throw error
  }
}

const validateWithAppCode = async (configFile) => {
  console.log('\nValidating keys using application code...')

  try {
    const configContent = await fs.readFile(configFile, 'utf8')
    const parser = new ConfigIniParser.ConfigIniParser('\n')
    parser.parse(configContent)

    const config = {
      pgpPassphrase: parser.getOptionFromDefaultSection('pgpPassphrase'),
      pgpPrivateKeyArmored: parser.getOptionFromDefaultSection('pgpPrivateKeyArmored'),
      pgpPublicKeyArmored: parser.getOptionFromDefaultSection('pgpPublicKeyArmored')
    }

    const logger = {
      info: (...args) => console.log(...args),
      error: (...args) => console.error(...args)
    }

    // Test key initialization using the app's PgpEncryption class
    const pgp = new PgpEncryption(config, logger)
    await pgp.init()

    console.log('Keys validated successfully using application code!')
    return true
  } catch (error) {
    console.error('Validation failed:', error)
    throw error
  }
}

const main = async () => {
  try {
    const argv = minimist(process.argv.slice(2))
    validateArgs(argv)

    console.log('\nGenerating PGP keys...')
    const keys = await generatePgpKeys(argv.name, argv.email, argv.passphrase)

    const credentials = {
      passphrase: argv.passphrase,
      privateKey: keys.privateKey,
      publicKey: keys.publicKey
    }

    const configFile = await saveCredentialsToFile(credentials)
    await validateWithAppCode(configFile)

    console.log('\nSuccess! The keys have been generated, saved, and validated.')
    console.log('You can now copy the contents of pgp-credentials.txt to your s3foldersync.conf file.')

  } catch (error) {
    console.error('\nFailed:', error)
    process.exit(1)
  }
}

main()
