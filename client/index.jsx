import React, { useState, useEffect } from "react"
import { render } from "react-dom"
import io from "socket.io-client"

const useSimpleLocalStorageValue = (key, def) => {
  const initial = window.localStorage.getItem(key) || def
  window.localStorage.setItem(key, initial)
  const [value, setValue] = useState(initial)
  const setValueNew = (newValue) => {
    window.localStorage.setItem(key, newValue)
    setValue(newValue)
  }
  return [value, setValueNew]
}

const useSocket = (subscribe) => {
  const [socket] = useState(io())

  useEffect(() => {
    if (subscribe) {
      subscribe(socket)
    }

    return () => socket.close()
  }, [socket])

  return socket
}

const invert = (value) => {
  const dict = {}
  Object.entries(value).forEach((entry) => {
    const key = entry[1]
    if (!dict[key]) {
      dict[key] = []
    }
    dict[key].push(entry[0])
  })
  return dict
}

const useConfidences = (socket, username) => {
  const [confidences, setConfidences] = useState({})

  useEffect(() => {
    socket.on("votes", ({ votes }) => setConfidences(votes))
  }, [socket])

  const unset = () => socket.emit("unset", { username })
  const confidence = (value) =>
    socket.emit("confidence", { confidence: value, username })
  const clear = () => socket.emit("clear")

  useEffect(() => {
    return () => unset()
  }, [username])

  return { confidences, confidence, unset, clear }
}

const useHidden = (socket) => {
  const [hidden, setHidden] = useState(true)

  useEffect(() => {
    socket.on("hidden", ({ hidden }) => setHidden(hidden))
  }, [socket])

  return { hidden, setHidden: (hidden) => socket.emit("hide", { hidden }) }
}

const Clear = ({ onClear }) => (
  <button
    className="p-2 bg-green-600 text-green-100 rounded shadow"
    onClick={onClear}
  >
    Clear
  </button>
)

const Confidence = ({ value, selected, onSelect }) => (
  <button
    className={`p-2 rounded-full shadow-lg ${
      selected ? "bg-green-400" : "bg-green-200"
    } hover:bg-green-400`}
    style={{
      transform: selected ? "scale(1.2)" : "scale(1)",
      transition: "0.05s ease-in-out transform",
    }}
    onClick={onSelect}
  >
    <span
      className="flex items-center justify-center bg-white rounded-full text-lg"
      style={{ width: "4ch", height: "4ch" }}
    >
      {value}
    </span>
  </button>
)

const ConfidencePicker = ({ selected, onSelect, onUnset }) => (
  <div className="flex flex-row flex-wrap -ml-2 -mt-2">
    {CONFIDENCE_VALUES.map((value) => (
      <div className="m-2" key={value}>
        <Confidence
          value={value}
          selected={value === selected}
          onSelect={() => (selected !== value ? onSelect(value) : onUnset())}
        />
      </div>
    ))}
  </div>
)

const VoteCount = ({ confidences }) => {
  const confidencesByValue = invert(confidences)
  const confidencesWithVotesSorted = Object.entries(confidencesByValue).sort(
    (entry1, entry2) => entry2[1].length - entry1[1].length
  )

  return (
    <>
      {confidencesWithVotesSorted.map((entry) => {
        const [value, votes] = entry
        const votesCount = votes.length

        return (
          <React.Fragment key={value}>
            <div className="text-lg text-center">
              -{value}- ({votesCount})
            </div>
            <div>{votes.join(", ")}</div>
          </React.Fragment>
        )
      })}
    </>
  )
}

const Sidebar = ({ username, setUsername, onClear, confidences, socket }) => {
  const { hidden, setHidden } = useHidden(socket)
  const voteCount = Object.values(confidences).length
  const voteTotal = Object.values(confidences).reduce(
    (total, c) => total + c,
    0
  )
  const avg = voteTotal / voteCount || 0
  const avgRounded = Math.round(avg * 100 + Number.EPSILON) / 100
  return (
    <div className="flex flex-col p-4 bg-green-800  text-green-200">
      <h2 className="text-lg text-center">Settings</h2>
      <div className="mb-4" />
      <input
        className="bg-grey-100 text-green-900 rounded shadow p-2"
        value={username}
        onChange={(event) => setUsername(event.target.value)}
      />

      <div className="m-4" />

      <h1 className="text-lg text-center">Confidences</h1>
      <div className="m-2" />
      <Clear onClear={onClear} />
      <div className="m-2" />
      <button
        className="p-2 bg-green-600 text-green-100 rounded shadow"
        onClick={() => setHidden(!hidden)}
      >
        {hidden ? "Show" : "Hide"}
      </button>
      <div className="pt-px bg-green-700 my-4" />
      <div className="text-center text-lg">Total: {voteCount}</div>
      {hidden ? (
        ""
      ) : (
        <>
          <div className="mb-4" />
          <div className="text-center text-lg">Avg: {avgRounded}</div>
          <div className="pt-px bg-green-700 my-4" />
          <VoteCount confidences={confidences} />
        </>
      )}
    </div>
  )
}

const CONFIDENCE_VALUES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

const App = () => {
  const socket = useSocket()
  const [username, setUsername] = useSimpleLocalStorageValue(
    "username",
    `Nobody-${Date.now().toString()}`
  )
  const { confidences, confidence, clear, unset } = useConfidences(
    socket,
    username
  )

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      socket.emit("ready", {})
    }, 10)

    return () => {
      clearTimeout(timeoutId)
    }
  }, [socket])

  return (
    <main className="flex flex-row min-h-screen items-stretch">
      <div className="p-4 bg-gray-100 flex-grow flex items-center justify-center">
        <div className="max-w-xl">
          <ConfidencePicker
            selected={confidences[username]}
            onSelect={confidence}
            onUnset={unset}
          />
          <div className="mb-16" />
        </div>
      </div>
      <Sidebar
        socket={socket}
        confidences={confidences}
        username={username}
        setUsername={setUsername}
        onClear={clear}
      />
    </main>
  )
}

render(<App />, document.getElementById("app"))
