const app = require("express")()
const http = require("http").createServer(app)
const broadcaster = require("socket.io")(http)
const path = require("path")

const file = path.resolve(__dirname, "..", "client", "index.html")
const options = {}
const Bundler = require("parcel-bundler")
const bundler = new Bundler(file, options)
app.use(bundler.middleware())

class ConfidencePoll {
  votes = {}
  hidden = true

  vote(username, confidence) {
    this.votes[username] = confidence
  }

  clear() {
    this.votes = {}
  }

  unset(username) {
    this.votes[username] = undefined
  }
}

const confidencePoll = new ConfidencePoll()

broadcaster.on("connection", (subscriber) => {
  subscriber.on("ready", () => {
    subscriber.emit("votes", { votes: confidencePoll.votes })
    subscriber.emit("hidden", { hidden: confidencePoll.hidden })
  })

  subscriber.on("hide", ({ hidden }) => {
    confidencePoll.hidden = Boolean(hidden)
    broadcaster.emit("hidden", { hidden: confidencePoll.hidden })
  })

  subscriber.on("confidence", ({ confidence, username }) => {
    confidencePoll.vote(username, confidence)
    broadcaster.emit("votes", { votes: confidencePoll.votes })
  })

  subscriber.on("clear", () => {
    confidencePoll.clear()
    broadcaster.emit("votes", { votes: confidencePoll.votes })
  })

  subscriber.on("unset", ({ username }) => {
    confidencePoll.unset(username)
    broadcaster.emit("votes", { votes: confidencePoll.votes })
  })
})

http.listen(process.env.PORT || 3000, () => {
  console.log("listening on", process.env.PORT || 3000)
})
