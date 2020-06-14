const app = require('express')();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

class Poll {
    votes = {}

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

const poll = new Poll()

app.get('/', (_req, res) => {
  res.sendFile(__dirname + '/index.html');
});


io.on('connection', (socket) => {
    socket.on('ready', () => {
        socket.emit('changed', poll.votes)
    })

    socket.on('confidence', ({ confidence, username }) => {
        poll.vote(username, confidence)
        io.emit('changed', poll.votes)
    })

    socket.on('clear', () => {
        poll.clear()
        io.emit('changed', poll.votes)
    })

    socket.on('unset', ({ username }) => {
        poll.unset(username)
        io.emit('changed', poll.votes)
    })
});

http.listen(process.env.PORT || 3000, () => {
  console.log('listening on', process.env.PORT || 3000);
});
