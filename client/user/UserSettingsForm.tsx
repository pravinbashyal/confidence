import React from "react"
import { useRecoilState } from "recoil"
import { currentUsernameState } from "./currentUsernameState"
export const UserSettingsForm = () => {
  const [username, setUsername] = useRecoilState(currentUsernameState)

  return (
    <input
      className="bg-grey-100 text-gray-900 rounded shadow p-2"
      value={username}
      onChange={(event) => setUsername(event.target.value)}
    />
  )
}
