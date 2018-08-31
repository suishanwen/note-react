import {combineReducers} from 'redux'
import noteList from '../routes/models/reducers/noteList';
import note from '../routes/models/reducers/note';

export const makeRootReducer = (asyncReducers) => {
    return combineReducers({
        noteList: noteList,
        note: note
    })
};

export const injectReducer = (store, {key, reducer}) => {
    if (Object.hasOwnProperty.call(store.asyncReducers, key)) return;

    store.asyncReducers[key] = reducer;
    store.replaceReducer(makeRootReducer(store.asyncReducers))
};

export default makeRootReducer;
