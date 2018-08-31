import React from 'react';
import ReactDOM from 'react-dom';
import {createStore} from './store';

import $ from 'jquery';
import App from './App';
import routes from './routes';
import registerServiceWorker from './registerServiceWorker';
import 'vdap-ui/style/';
import './index.css';

const store = createStore(window.__INITIAL_STATE__);
const fontSize = window.getComputedStyle(document.documentElement)["fontSize"];
const rem = parseFloat(fontSize.replace("px", ""));

window["isMobile"] = ["Android", "iPhone", "SymbianOS", "Windows Phone", "iPad", "iPod"].some(agent => navigator.userAgent.indexOf(agent) !== -1);

window["rem"] = rem;

window["width"] = $(window).width();


ReactDOM.render(
    <App store={store} routes={routes}/>,
    document.getElementById('root')
);

registerServiceWorker();