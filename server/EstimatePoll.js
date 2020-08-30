// @ts-check

class EstimatePoll {
  /**
   * @type Record<string, string | undefined>
   */
  votes = {}

  hidden = true

  /**
   * @param {string} username
   * @param {string} estimate
   */
  vote(username, estimate) {
    this.votes[username] = estimate
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

exports.ConfidencePoll = EstimatePoll
