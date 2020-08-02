import { atom } from "recoil"

export const usernameState = atom({
  key: "usernameState",
  default: window.localStorage.getItem("username") || makePersistedUsername(),
})

function makePersistedUsername() {
  const username = `Anon-${Date.now()}`
  window.localStorage.setItem("username", username)
  return username
}
