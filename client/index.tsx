import React from "react"
import { render } from "react-dom"
import { RecoilRoot } from "recoil"
import { HashRouter as Router, Route, Redirect, Switch } from "react-router-dom"
import { ConfidencesPage } from "./ConfidencesPage"

const App = () => {
  return (
    <Router>
      <RecoilRoot>
        <Switch>
          <Route path="/confidences" component={ConfidencesPage} />
          <Redirect path="/" to="/confidences" />
        </Switch>
      </RecoilRoot>
    </Router>
  )
}

render(<App />, document.getElementById("app"))
