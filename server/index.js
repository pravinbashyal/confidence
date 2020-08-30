// ts-check
const app = require("express")()
const http = require("http").createServer(app)
const io = require("socket.io")(http)
const path = require("path")

const file = path.resolve(__dirname, "..", "client", "index.html")
const options = {}
const Bundler = require("parcel-bundler")
const bundler = new Bundler(file, options)
app.use(bundler.middleware())

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

const confidencePoll = new ConfidencePoll()

const confidenceBroadcaster = io.of("/confidence")
confidenceBroadcaster.on("connection", (subscriber) => {
  subscriber.on("ready", () => {
    subscriber.emit("votes", { votes: confidencePoll.votes })
    subscriber.emit("hidden", { hidden: confidencePoll.hidden })
  })

  subscriber.on("hide", ({ hidden }) => {
    confidencePoll.hidden = Boolean(hidden)
    confidenceBroadcaster.emit("hidden", { hidden: confidencePoll.hidden })
  })

  subscriber.on("confidence", ({ confidence, username }) => {
    confidencePoll.vote(username, confidence)
    confidenceBroadcaster.emit("votes", { votes: confidencePoll.votes })
  })

  subscriber.on("clear", () => {
    confidencePoll.clear()
    confidenceBroadcaster.emit("votes", { votes: confidencePoll.votes })
  })

  subscriber.on("unset", ({ username }) => {
    confidencePoll.unset(username)
    confidenceBroadcaster.emit("votes", { votes: confidencePoll.votes })
  })
})

http.listen(process.env.PORT || 3000, () => {
  console.log("listening on", process.env.PORT || 3000)
})
