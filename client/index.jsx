import React, { useEffect, useRef, createContext, useContext } from "react"
import { render } from "react-dom"
import io from "socket.io-client"
import { RecoilRoot, atom, useRecoilState } from "recoil"

const currentUsernameState = atom({
  key: "currentUsernameState",
  default:
    window.localStorage.getItem("username") ||
    (() => {
      const username = `Anon-${Date.now()}`
      window.localStorage.setItem("username", username)
      return username
    })(),
})

const useClear = () => {
  const socket = useContext(SocketContext)
  return () => socket.emit("clear")
}

const useVote = () => {
  const socket = useContext(SocketContext)
  const [username] = useRecoilState(currentUsernameState)
  return (vote) => socket.emit("confidence", { confidence: vote, username })
}

const useUnset = () => {
  const socket = useContext(SocketContext)
  const [username] = useRecoilState(currentUsernameState)
  return () => socket.emit("unset", { username })
}

const CurrentUsernameSubscription = () => {
  const [currentUsername] = useRecoilState(currentUsernameState)
  const socket = useContext(SocketContext)
  useEffect(() => {
    window.localStorage.setItem("username", currentUsername)
    return () => {
      socket.emit("unset", { username: currentUsername })
    }
  }, [currentUsername])
  return null
}

const SocketContext = createContext()
const SocketProvider = ({ children }) => {
  const socketRef = useRef(io())
  return (
    <SocketContext.Provider value={socketRef.current}>
      {children}
    </SocketContext.Provider>
  )
}

const InitialSubscription = () => {
  const socket = useContext(SocketContext)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      socket.emit("ready", {})
    }, 10)

    return () => {
      clearTimeout(timeoutId)
    }
  }, [socket])

  return null
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

const confidencesState = atom({
  key: "confidencesState",
  default: {},
})

const ConfidencesSubscription = () => {
  const socket = useContext(SocketContext)
  const [, setConfidences] = useRecoilState(confidencesState)

  useEffect(() => {
    socket.on("votes", ({ votes }) => setConfidences(votes))
  }, [socket])

  return null
}

const hiddenState = atom({
  default: true,
  key: "hiddenState",
})

const HiddenStateSubscription = () => {
  const socket = useContext(SocketContext)
  const [hidden, setHidden] = useRecoilState(hiddenState)
  const knownHiddenState = useRef(hidden)

  useEffect(() => {
    socket.on("hidden", ({ hidden: serverHidden }) => {
      knownHiddenState.current = serverHidden
      setHidden(serverHidden)
    })
  }, [socket])

  useEffect(() => {
    if (knownHiddenState.current !== hidden) {
      knownHiddenState.current = hidden
      socket.emit("hide", { hidden })
    }
  }, [hidden])

  return null
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

const ConfidencePicker = () => {
  const [username] = useRecoilState(currentUsernameState)
  const [confidences] = useRecoilState(confidencesState)
  const selected = confidences[username]
  const onSelect = useVote()
  const onUnset = useUnset()

  return (
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
}

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

const Sidebar = () => {
  const onClear = useClear()
  const [confidences] = useRecoilState(confidencesState)
  const [username, setUsername] = useRecoilState(currentUsernameState)
  const [hidden, setHidden] = useRecoilState(hiddenState)
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
  return (
    <RecoilRoot>
      <SocketProvider>
        <InitialSubscription />
        <HiddenStateSubscription />
        <ConfidencesSubscription />
        <CurrentUsernameSubscription />
        <main className="flex flex-row min-h-screen items-stretch">
          <div className="p-4 bg-gray-100 flex-grow flex items-center justify-center">
            <div className="max-w-xl">
              <ConfidencePicker />
              <div className="mb-16" />
            </div>
          </div>
          <Sidebar />
        </main>
      </SocketProvider>
    </RecoilRoot>
  )
}

render(<App />, document.getElementById("app"))
