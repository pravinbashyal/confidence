import React, { useState, createContext, useContext } from "react"
import io from "socket.io-client"

const SocketContext = createContext<ReturnType<typeof io> | undefined>(
  undefined
)

export const SocketProvider: React.FC<{ uri: string }> = ({
  children,
  uri,
}) => {
  const [socket, setSocket] = useState<SocketIOClient.Socket | undefined>()

  React.useEffect(() => {
    const s = io(uri)
    setSocket(s)

    return () => {
      s.close()
    }
  }, [uri])

  if (!socket) {
    return null
  }

  return (
    <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>
  )
}

export const useSocket = () => {
  const socket = useContext(SocketContext)
  if (!socket) {
    throw new Error("Must use in SocketContext")
  }
  return socket
}
