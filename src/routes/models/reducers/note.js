import * as actionTypes from '../actions/ActionTypes';

const note = (state = {modalView: false}, action) => {
    switch (action.type) {
        case actionTypes.Set_Modal_View:
            return Object.assign({}, state, {
                modalView: action.data
            });
        default:
            return state;
    }
};


export default note;
