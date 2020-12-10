import { BrowserRouter, Route, Switch } from 'react-router-dom';

import './App.css';
import MainPage from './components/MainPage/MainPage';
import Room from './components/Room/Room';

function App() {
  return (
    <BrowserRouter>
      <div className="App">
        <Switch>
          <Route path='/room' component={Room} />
          <Route path='/' render={(props) => <MainPage {...props} />} />
        </Switch>
      </div>
    </BrowserRouter>
  );
}

export default App;
