import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';
import * as serviceWorker from './serviceWorker';
import {createStore} from './store';
import routes from './routes';
import './index.css';

const store = createStore(window.__INITIAL_STATE__);
const fontSize = window.getComputedStyle(document.documentElement)["fontSize"];
const rem = parseFloat(fontSize.replace("px", ""));

window["isMobile"] = ["Android", "iPhone", "SymbianOS", "Windows Phone", "iPad", "iPod"].some(agent => navigator.userAgent.indexOf(agent) !== -1);

window["rem"] = rem;

window["width"] = document.body.clientWidth;

ReactDOM.render(
    <App store={store} routes={routes}/>,
    document.getElementById('root')
);
// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.register();
