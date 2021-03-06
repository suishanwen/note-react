import {applyMiddleware, compose, createStore as createReduxStore} from 'redux'
import {createLogger} from 'redux-logger';
import {makeRootReducer} from '../reducers'


const logger = createLogger({
    collapsed: true,

});

const createStore = (initialState = {}) => {

    const middleware = [logger];


    const enhancers = [];
    let composeEnhancers = compose;


    const store = createReduxStore(
        makeRootReducer(),
        initialState,
        composeEnhancers(
            applyMiddleware(...middleware),
            ...enhancers
        )
    );
    store.asyncReducers = {};


    // if (module.hot) {
    //     module.hot.accept('reducers', () => {
    //         const reducers = require('reducers').default;
    //         store.replaceReducer(reducers(store.asyncReducers))
    //     })
    // }

    return store
};

export default createStore
