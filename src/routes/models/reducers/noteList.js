import * as actionTypes from '../actions/ActionTypes';

const noteList = (state = {data: []}, action) => {
    switch (action.type) {
        case actionTypes.Query_Note_List:
            return Object.assign({}, state, {
                init: true,
                data: action.data
            });
        case actionTypes.Filter_Note_List:
            return Object.assign({}, state, {
                keyword: action.keyword
            });
        case actionTypes.Reset_Note_List_Init:
            return Object.assign({}, state, {
                init: action.data
            });
        default:
            return state;
    }
};


export default noteList;
