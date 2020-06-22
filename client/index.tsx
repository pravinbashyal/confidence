import React, { useEffect, useRef, createContext, useContext } from "react"
import { render } from "react-dom"
import io from "socket.io-client"
import {
  RecoilRoot,
  atom,
  useRecoilState,
  useRecoilValue,
  selector,
  selectorFamily,
} from "recoil"

const SocketContext = createContext<ReturnType<typeof io> | undefined>(
  undefined
)
const SocketProvider: React.FC = ({ children }) => {
  const socketRef = useRef(io())
  return (
    <SocketContext.Provider value={socketRef.current}>
      {children}
    </SocketContext.Provider>
  )
}

const useSocket = () => {
  const socket = useContext(SocketContext)
  if (!socket) {
    throw new Error("Must use in SocketContext")
  }
  return socket
}

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
  const socket = useSocket()
  return () => socket.emit("clear")
}

const useVote = () => {
  const socket = useSocket()
  const [username] = useRecoilState(currentUsernameState)
  return (vote: number) =>
    socket.emit("confidence", { confidence: vote, username })
}

const useUnset = () => {
  const socket = useSocket()
  const [username] = useRecoilState(currentUsernameState)
  return () => socket.emit("unset", { username })
}

const CurrentUsernameSubscription = () => {
  const [currentUsername] = useRecoilState(currentUsernameState)
  const socket = useSocket()
  useEffect(() => {
    window.localStorage.setItem("username", currentUsername)
    return () => {
      socket.emit("unset", { username: currentUsername })
    }
  }, [currentUsername])
  return null
}

const InitialSubscription = () => {
  const socket = useSocket()
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

const invert = (value: { [index: string]: number }) => {
  const dict: { [index: number]: string[] } = {}
  Object.entries(value).forEach((entry) => {
    const key = entry[1]
    if (!dict[key]) {
      dict[key] = []
    }
    dict[key].push(entry[0])
  })
  return dict
}

const confidencesState = atom<{ [index: string]: number }>({
  key: "confidencesState",
  default: {},
})

const ConfidencesSubscription = () => {
  const socket = useSocket()
  const [, setConfidences] = useRecoilState(confidencesState)

  useEffect(() => {
    socket.on("votes", ({ votes }: any) => setConfidences(votes))
  }, [socket])

  return null
}

const hiddenState = atom({
  default: true,
  key: "hiddenState",
})

const HiddenStateSubscription = () => {
  const socket = useSocket()
  const [hidden, setHidden] = useRecoilState(hiddenState)
  const knownHiddenState = useRef(hidden)

  useEffect(() => {
    socket.on("hidden", ({ hidden: serverHidden }: any) => {
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

const ClearAllButton = () => {
  const onClear = useClear()
  return (
    <button
      className="p-2 bg-green-600 text-green-100 rounded shadow"
      onClick={onClear}
    >
      Clear All
    </button>
  )
}

const isConfidenceSelectedState = selectorFamily({
  key: "isConfidenceSelectedState",
  get: (value) => ({ get }) => {
    const username = get(currentUsernameState)
    const confidences = get(confidencesState)
    const selectedByUser = confidences[username]
    return selectedByUser === value
  },
})

const Confidence: React.FC<{ value: number }> = ({ value }) => {
  const isSelected = useRecoilValue(isConfidenceSelectedState(value))
  const onSelect = useVote()
  const onUnset = useUnset()
  const onClick = () => (isSelected ? onUnset() : onSelect(value))

  return (
    <button
      className={`p-2 rounded-full shadow-lg ${
        isSelected ? "bg-green-400" : "bg-green-200"
      } hover:bg-green-400`}
      style={{
        transform: isSelected ? "scale(1.2)" : "scale(1)",
        transition: "0.05s ease-in-out transform",
      }}
      onClick={onClick}
    >
      <span
        className="flex items-center justify-center bg-white rounded-full text-lg"
        style={{ width: "4ch", height: "4ch" }}
      >
        {value}
      </span>
    </button>
  )
}

const ConfidencePicker = () => {
  return (
    <div className="flex flex-row flex-wrap -ml-2 -mt-2">
      {CONFIDENCE_VALUES.map((value) => (
        <div className="m-2" key={value}>
          <Confidence value={value} />
        </div>
      ))}
    </div>
  )
}

const VoteCount = () => {
  const [confidences] = useRecoilState(confidencesState)
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

const voteStatisticsState = selector({
  key: "voteStatisticsState",
  get: ({ get }) => {
    const confidences = get(confidencesState)
    const voteCount = Object.values(confidences).length
    const voteTotal = Object.values(confidences).reduce(
      (total, c) => total + c,
      0
    )
    const avg = voteTotal / voteCount || 0
    const voteAverageRounded = Math.round(avg * 100 + Number.EPSILON) / 100

    return {
      voteAverageRounded,
      voteCount,
    }
  },
})

const UsernameForm = () => {
  const [username, setUsername] = useRecoilState(currentUsernameState)

  return (
    <input
      className="bg-grey-100 text-green-900 rounded shadow p-2"
      value={username}
      onChange={(event) => setUsername(event.target.value)}
    />
  )
}

const HideButton = () => {
  const [hidden, setHidden] = useRecoilState(hiddenState)

  return (
    <button
      className="p-2 bg-green-600 text-green-100 rounded shadow"
      onClick={() => setHidden(!hidden)}
    >
      {hidden ? "Show Results" : "Hide Results"}
    </button>
  )
}

const Sidebar = () => {
  const { voteCount, voteAverageRounded } = useRecoilValue(voteStatisticsState)
  const hidden = useRecoilValue(hiddenState)

  return (
    <div className="flex flex-col p-4 bg-green-800  text-green-200">
      <h2 className="text-lg text-center">Settings</h2>
      <div className="mb-4" />
      <UsernameForm />

      <div className="m-4" />

      <h1 className="text-lg text-center">Confidences</h1>
      <div className="m-2" />
      <ClearAllButton />

      <div className="m-2" />
      <HideButton />

      <div className="pt-px bg-green-700 my-4" />
      <div className="text-center text-lg"># Votes: {voteCount}</div>
      {hidden ? null : (
        <>
          <div className="mb-4" />
          <div className="text-center text-lg">Avg: {voteAverageRounded}</div>
          <div className="pt-px bg-green-700 my-4" />
          <VoteCount />
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
            </div>
          </div>
          <Sidebar />
        </main>
      </SocketProvider>
    </RecoilRoot>
  )
}

render(<App />, document.getElementById("app"))
