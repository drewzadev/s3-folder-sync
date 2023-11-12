/**
 * Wraps an async function in try catch and returns it in one line array.
 * @param fn
 * @returns {array} [error, result]
 */
export default async fn => {
  try {
    const result = await fn
    return [null, result]
  } catch (error) {
    return [error, null]
  }
}
