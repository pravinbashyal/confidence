import { atom } from "recoil"

export const currentUsernameState = atom({
  key: "currentUsernameState",
  default: window.localStorage.getItem("username") || makePersistedUsername(),
})

function makePersistedUsername() {
  const username = `Anon-${Date.now()}`
  window.localStorage.setItem("username", username)
  return username
}
