import {connect} from "react-redux"
import Body from "../components/body"
import $ from 'jquery';
import Path from "../../../constants/Path"
import {queryNoteList, resetNoteListInit} from '../../models/actions/noteAction';


const filterByKeyword = (data = [], keyword = "") => {
    return data.filter(note => note.title.toUpperCase().indexOf(keyword.toUpperCase()) !== -1).map((note, index) => {
        return {
            rowIndex: index + 1,
            key: note.id,
            id: note.id,
            title: note.title,
            date: note.editTime ? note.editTime : note.postTime
        }
    })
};

const mapStateToProps = (state) => {
    window["noteList"] =  state.noteList.data;
    return {
        data: {
            init: state.noteList.init,
            list: state.noteList.data
        }
    };
};
const mapDispatchToProps = (dispatch, state) => {
    return {
        query: () => {
            if (Window.progress.isProcessing) {
                return false;
            }
            Window.progress.open();
            $.get(Path.getUri("api/note"), (data) => {
                Window.progress.close();
                data.forEach((note) => {
                    note.tags = note.tag ? note.tag.split("|") : [];
                    note.key = note.id;
                });
                dispatch(queryNoteList(data));
            });
        },
        resetInit: () => {
            dispatch(resetNoteListInit(false));
        }
    }
};


const NoteList = connect(
    mapStateToProps,
    mapDispatchToProps
)(Body);

export default NoteList
