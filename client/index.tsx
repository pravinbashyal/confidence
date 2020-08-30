import React from "react"
import { render } from "react-dom"
import { HashRouter as Router, Route, Redirect, Switch } from "react-router-dom"
import { ConfidencesPage } from "./ConfidencesPage"
import { EstimatesPage } from "./EstimatesPage"

const App = () => {
  return (
    <Router>
      <Switch>
        <Route path="/confidences" component={ConfidencesPage} />
        <Route path="/estimates" component={EstimatesPage} />
        <Redirect path="/" to="/confidences" />
      </Switch>
    </Router>
  )
}

render(<App />, document.getElementById("app"))
