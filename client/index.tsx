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
import { motion, HTMLMotionProps, AnimatePresence } from "framer-motion"

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
    <Button color={"red"} onClick={onClear}>
      Clear All
    </Button>
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
  const variants = {
    initial: { scale: 1 },
    selected: { scale: 1.2 },
  }
  return (
    <motion.button
      className={`p-2 rounded-full shadow-lg ${
        isSelected ? "bg-blue-500" : "bg-blue-200"
      } hover:bg-blue-500`}
      onClick={onClick}
      variants={variants}
      initial={"initial"}
      animate={isSelected ? "selected" : "initial"}
    >
      <span
        className="flex items-center justify-center bg-white rounded-full text-lg"
        style={{ width: "4ch", height: "4ch" }}
      >
        {value}
      </span>
    </motion.button>
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
      className="bg-grey-100 text-gray-900 rounded shadow p-2"
      value={username}
      onChange={(event) => setUsername(event.target.value)}
    />
  )
}

const Button: React.FC<HTMLMotionProps<"button"> & { color: string }> = ({
  children,
  color,
  ...props
}) => {
  return (
    <motion.button
      {...props}
      className={`p-2 bg-${color}-600 text-${color}-100 rounded shadow`}
      whileHover={{ translateY: -1 }}
    >
      {children}
    </motion.button>
  )
}

const HideButton = () => {
  const [hidden, setHidden] = useRecoilState(hiddenState)

  return (
    <Button color={"blue"} onClick={() => setHidden(!hidden)}>
      {hidden ? "Show Results" : "Hide Results"}
    </Button>
  )
}

const Divider = () => <div className="pt-px bg-gray-700 my-4" />

const Sidebar = () => {
  const { voteCount, voteAverageRounded } = useRecoilValue(voteStatisticsState)
  const hidden = useRecoilValue(hiddenState)

  return (
    <div className="flex flex-col p-4 bg-gray-800  text-gray-200">
      <AnimatePresence>
        <h2 className="text-lg text-center">Settings</h2>
        <div className="mb-4" />
        <UsernameForm />

        <div className="m-4" />

        <h1 className="text-lg text-center">Confidences</h1>
        <div className="m-2" />
        <ClearAllButton />

        <div className="m-2" />
        <HideButton />

        <Divider />
        <div className="text-center text-lg">
          # Votes:{" "}
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 2 } }}
            key={voteCount}
          >
            {voteCount}
          </motion.span>
        </div>
        {hidden ? null : (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.3 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.2 } }}
          >
            <Divider />
            <div className="text-center text-lg">Avg: {voteAverageRounded}</div>
            <Divider />
            <VoteCount />
          </motion.div>
        )}
      </AnimatePresence>
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
            <div>
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
