import React from "react"
import { useRecoilState } from "recoil"
import { usernameState } from "./usernameState"
export const UserSettingsForm = () => {
  const [username, setUsername] = useRecoilState(usernameState)

  return (
    <input
      className="bg-grey-100 text-gray-900 rounded shadow p-2"
      value={username}
      onChange={(event) => setUsername(event.target.value)}
    />
  )
}
