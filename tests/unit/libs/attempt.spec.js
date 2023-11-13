import { should } from 'chai'
import attempt from '../../../libs/attempt.mjs'
import * as fs from 'node:fs/promises'

describe('Attempt Lib Test Suite', function () {
  // create test for attempt.mjs module
  it('Should return an error if the file does not exist', async function () {
    const [error, result] = await attempt(fs.stat('./file-that-does-not-exist.mjs'))
    should().exist(error)
    should().not.exist(result)
  })
  it('Should return result if the file exists', async function () {
    const [error, result] = await attempt(fs.stat('./package.json'))
    should().exist(result)
    should().not.exist(error)
  })
})
