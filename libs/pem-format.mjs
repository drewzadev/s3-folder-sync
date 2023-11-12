/**
 * This module is used to convert a single line PGP Key into a multiline PEM format key.
 */
export default class PemFormat {
  constructor () {
    this.pgpPrivateKeyHeader = '-----BEGIN PGP PRIVATE KEY BLOCK-----'
    this.pgpPrivateKeyFooter = '-----END PGP PRIVATE KEY BLOCK-----'
    this.pgpPublicKeyHeader = '-----BEGIN PGP PUBLIC KEY BLOCK-----'
    this.pgpPublicKeyFooter = '-----END PGP PUBLIC KEY BLOCK-----'
    this.keyTypes = {
      pgpPrivate: {
        header: this.pgpPrivateKeyHeader,
        footer: this.pgpPrivateKeyFooter
      },
      pgpPublic: {
        header: this.pgpPublicKeyHeader,
        footer: this.pgpPublicKeyFooter
      }
    }
    this.pemKeyWidth = 64
  }

  /**
   * Splits a string into an array, breaking the string up at the given character width
   * @param {string} string - Provided long string
   * @param {int} width - The number of characters to split the string up into
   * @returns {*[]}
   */
  splitString (string, width) {
    if (string.length <= width) {
      return [string]
    }

    let last = 0
    let result = []

    for (let index = width ; index < string.length ; index += width) {
      result.push(string.substring(last, index))
      last = index
    }
    result.push(string.substring(last))

    return result
  }

  /**
   * Unwraps a PEM formatted PGP Key, removing line breaks and whitespaces
   * @param {string} pemKey - The actual key data
   * @returns {string}
   */
  unwrapKey (pemKey) {
    const longKeyString = pemKey.replace(/(\r\n|\n|\r)/gm, "");
    return longKeyString
  }

  /**
   * Wraps a PGP key into its PEM format with line breaks at 64 characters
   * and includes header and footer
   * @param {string} keyType - The type of key. Options: pgpPrivate, pgpPublic
   * @param {string} key - The actual key data
   * @returns {string}
   */
  wrapKey (keyType, key) {
    const base64Key = key.substring(keyType.header.length +1, key.indexOf(keyType.footer)).trim()
    const splitKey = this.splitString(base64Key, this.pemKeyWidth).join('\n')
    const finalKey = keyType.header + '\n\n' + splitKey + '\n' + keyType.footer
    return finalKey
  }
}



