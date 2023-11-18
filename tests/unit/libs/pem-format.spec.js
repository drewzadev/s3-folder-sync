import { should, expect } from 'chai'
import sinon from 'sinon'
import PemFormat from '../../../libs/pem-format.mjs'

describe('PemFormat Lib Test Suite', () => {
  let pemFormat;

  beforeEach(() => {
    pemFormat = new PemFormat();
  });

  describe('splitString', () => {
    it('should return an array with a single element if the string is shorter than the width', () => {
      const result = pemFormat.splitString('hello', 10);
      expect(result).to.deep.equal(['hello']);
    });

    it('should split the string into an array of strings with the given width', () => {
      const result = pemFormat.splitString('hello world', 5);
      expect(result).to.deep.equal(['hello', ' worl', 'd']);
    });
  });

  describe('unwrapKey', () => {
    it('should remove all line breaks and whitespaces from the key', () => {
      const result = pemFormat.unwrapKey('-----BEGIN PGP PRIVATE KEY BLOCK-----\n\naGVsbG8gd29ybGQ=\n\n-----END PGP PRIVATE KEY BLOCK-----');
      expect(result).to.equal('-----BEGIN PGP PRIVATE KEY BLOCK-----aGVsbG8gd29ybGQ=-----END PGP PRIVATE KEY BLOCK-----');
    });
  });

  describe('wrapKey', () => {
    it('should wrap the key with the header and footer and split it into lines of 64 characters', () => {
      const keyType = pemFormat.keyTypes.pgpPrivate;
      const key = '-----BEGIN PGP PRIVATE KEY BLOCK-----\naGVsbG8gd29ybGQ=\n-----END PGP PRIVATE KEY BLOCK-----';
      const result = pemFormat.wrapKey(keyType, key);
      expect(result).to.equal('-----BEGIN PGP PRIVATE KEY BLOCK-----\n\naGVsbG8gd29ybGQ=\n-----END PGP PRIVATE KEY BLOCK-----');
    });
  });
});