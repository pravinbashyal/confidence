// ts-check
const app = require("express")()
const http = require("http").createServer(app)
const io = require("socket.io")(http)
const path = require("path")

const file = path.resolve(__dirname, "..", "client", "index.html")
const options = {}
const Bundler = require("parcel-bundler")
const { ConfidencePoll } = require("./ConfidencePoll")
const { EstimatePoll } = require("./EstimatePoll")

const bundler = new Bundler(file, options)
app.use(bundler.middleware())

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

const estimatePoll = new ConfidencePoll()

const estimateBroadcaster = io.of("/estimate")
estimateBroadcaster.on("connection", (subscriber) => {
  subscriber.on("ready", () => {
    subscriber.emit("votes", { votes: estimatePoll.votes })
    subscriber.emit("hidden", { hidden: estimatePoll.hidden })
  })

  subscriber.on("hide", ({ hidden }) => {
    estimatePoll.hidden = Boolean(hidden)
    estimateBroadcaster.emit("hidden", { hidden: estimatePoll.hidden })
  })

  subscriber.on("estimate", ({ estimate, username }) => {
    estimatePoll.vote(username, estimate)
    estimateBroadcaster.emit("votes", { votes: estimatePoll.votes })
  })

  subscriber.on("clear", () => {
    estimatePoll.clear()
    estimateBroadcaster.emit("votes", { votes: estimatePoll.votes })
  })

  subscriber.on("unset", ({ username }) => {
    estimatePoll.unset(username)
    estimateBroadcaster.emit("votes", { votes: estimatePoll.votes })
  })
})

http.listen(process.env.PORT || 3000, () => {
  console.log("listening on", process.env.PORT || 3000)
})
