import * as actionTypes from './ActionTypes';

export const queryNoteList = (data) => {
    return {type: actionTypes.Query_Note_List, data: data};
};
export const resetNoteListInit = (data) => {
    return {type: actionTypes.Reset_Note_List_Init, data: data};
};

export const filterNoteList = (keyword) => {
    return {type: actionTypes.Filter_Note_List, keyword: keyword}
};

export const setModalView = (data) => {
    return {type: actionTypes.Set_Modal_View, data: data};
};