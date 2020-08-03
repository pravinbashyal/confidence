import React, { useRef, createContext, useContext } from "react"
import io from "socket.io-client"

const SocketContext = createContext<ReturnType<typeof io> | undefined>(
  undefined
)

export const SocketProvider: React.FC<{ uri: string }> = ({
  children,
  uri,
}) => {
  const socketRef = useRef(io(uri))
  return (
    <SocketContext.Provider value={socketRef.current}>
      {children}
    </SocketContext.Provider>
  )
}

export const useSocket = () => {
  const socket = useContext(SocketContext)
  if (!socket) {
    throw new Error("Must use in SocketContext")
  }
  return socket
}
