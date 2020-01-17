import {connect} from "react-redux"
import Header from "../components/header"
import {filterNoteList} from '../../models/actions/noteAction';


const mapStateToProps = (state) => {
    return {keyword: state.noteList.keyword, list: state.noteList.data};
};

const mapDispatchToProps = (dispatch) => {
    return {
        change: (keyword) => {
            if (keyword !== undefined) {
                dispatch(filterNoteList(keyword))
            }
        }
    }
};
const Search = connect(
    mapStateToProps,
    mapDispatchToProps
)(Header);

export default Search
