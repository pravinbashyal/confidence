// @ts-check

class ConfidencePoll {
  /**
   * @type Record<string, number | undefined>
   */
  votes = {}

  hidden = true

  /**
   * @param {string} username
   * @param {number} confidence
   */
  vote(username, confidence) {
    this.votes[username] = confidence
  }

  clear() {
    this.votes = {}
  }

  /**
   *
   * @param {string} username
   */
  unset(username) {
    this.votes[username] = undefined
  }
}

exports.ConfidencePoll = ConfidencePoll
