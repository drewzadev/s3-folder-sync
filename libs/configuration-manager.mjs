import ConfigIniParser from 'config-ini-parser'
import fs from 'fs-extra'
import _ from 'lodash'
import __ from './attempt.mjs'

export default class ConfigurationManager {
  constructor (mainConfigFile, localConfigFile) {
    this.mainConfigFile = mainConfigFile
    this.localConfigFile = localConfigFile
    this.delimiter = '\n'
  }

  returnAvailableConfigFilePath () {
    if (fs.pathExists(this.localConfigFile)) {
      return this.localConfigFile
    } else {
      if (fs.pathExists(this.mainConfigFile)) {
        return this.mainConfigFile
      } else {
        return null
      }
    }
  }

  openFile (filePath) {
    return new Promise(async (resolve, reject) => {
      let configFileContents = ''

      const file = fs.createReadStream(filePath, { encoding: 'utf8' })

      file.on('error', function (error) {
        throw new Error('Error: Problem reading config file: ' + filePath + ', error was: ' + error)
      })

      file.on('data', function (data) {
        configFileContents = data.toString()
      })

      file.on('close', function () {
        return resolve(configFileContents)
      })

      file.on('end', () => {
        file.destroy()
      })
    })
  }

  async getConfig () {
      const parser = new ConfigIniParser.ConfigIniParser(this.delimiter)
      const configFilePath = this.returnAvailableConfigFilePath()
      console.log('Info: Using config file: ' + configFilePath)

      const [error, result] = await __(this.openFile(configFilePath))
      if (error) {
        throw new Error(error)
      }

      try{
        parser.parse(result)
      } catch (error) {
        throw new Error(error.message)
      }

      const pgpPassphrase = parser.getOptionFromDefaultSection('pgpPassphrase', 'null')
      const bucketSecretKey = parser.getOptionFromDefaultSection('bucketSecretKey', 'null')
      const bucketAccessKey = parser.getOptionFromDefaultSection('bucketAccessKey', 'null')
      const bucketEndpoint = parser.getOptionFromDefaultSection('bucketEndpoint', 'null')
      const bucketRegion = parser.getOptionFromDefaultSection('bucketRegion', 'null')

      const pgpPrivateKeyArmored = parser.getOptionFromDefaultSection('pgpPrivateKeyArmored', 'null')
      const pgpPublicKeyArmored = parser.getOptionFromDefaultSection('pgpPublicKeyArmored', 'null')

      const finalConfig = {
        pgpPassphrase,
        bucketSecretKey,
        bucketAccessKey,
        bucketEndpoint,
        bucketRegion,
        pgpPrivateKeyArmored,
        pgpPublicKeyArmored
      }

      return finalConfig
  }

  setConfigValue (parser, keyValues) {
    _.forIn(keyValues, (value, key) => {
      parser.setOptionInDefaultSection(key, value)
    })
    return parser.stringify(this.delimiter)
  }

  writeConfigFile (configFile, configData, callback) {
    const options = { flags: 'wx+', encoding: 'utf8' }
    fs.writeFile(configFile, configData, options, callback)
  }
}