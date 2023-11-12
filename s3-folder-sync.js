import minimist from 'minimist'
import _ from 'lodash'
import winston from 'winston'
import jsonStringify from 'fast-safe-stringify'
import __ from './libs/attempt.mjs'
import ConfigurationManager from './libs/configuration-manager.mjs'
import S3FolderSync from './libs/s3-folder-sync.mjs'

/** Error Handler */
process.once('uncaughtException', (error) => {
  console.log(`Uncaught Exception Stack: ${error.stack}`)
  process.exit(1)
})

process.on('unhandledRejection', error => {
  console.log(`Unhandled Rejection Stack: ${error.stack}`)
  process.exit(1)
})

process.on('SIGINT', function () {
  console.log('Gracefully shutting down from SIGINT (Ctrl-C).')
  process.exit()
})

process.on('SIGTERM', function () {
  console.log('Gracefully shutting down...')
  process.exit()
})

// Logging
const logLikeFormat = {
  transform (info) {
    let strArgs = ''
    const { timestamp, level, message } = info
    const args = info[Symbol.for('splat')]
    const colour = info[Symbol.for('color')]
    if (_.size(args) > 0) {
      strArgs = args.map(jsonStringify).join(' ')
    }
    info[Symbol.for('message')] = `${timestamp} ${level}: ${message} ${strArgs}`
    return info
  }
}

const myLogFormatNew = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss.SSS'
  }),
  logLikeFormat
)

const configFile = '/etc/s3foldersync/s3foldersync.conf'
const localConfigFile = './s3foldersync.conf'
async function main () {
  const configManager = new ConfigurationManager(configFile, localConfigFile)
  const [error, config] = await __(configManager.getConfig())
  if (error) {
    throw new Error(error)
  }

  const argv = minimist(process.argv.slice(2))
  config.args = argv
  const logger = winston.createLogger({
    transports: [
      new winston.transports.Console({
        level: 'silly',
        handleExceptions: false,
        format: myLogFormatNew
      })
    ],
    exitOnError: false
  })
  const s3FolderSync = new S3FolderSync(config, logger)
  const [startError, startResult] = await __(s3FolderSync.start())
  if (startError) {
    throw new Error(startError)
  }
}

main().then(result => {
  process.exit(0)
}).catch(error => {
  console.error('Error: ', error)
  process.exit(1)
})
