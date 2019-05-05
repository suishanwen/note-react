import React from 'react';
import "./index.css"
import $ from 'jquery';
import Body from './components/body'
import Bookmark from "./components/bookMark";
import Comment from "./components/comment";
import Contact from "./components/contact";
import AuthModal from './components/modal'
import MyUtil from "../../constants/MyUtil";
import {connect} from "react-redux";
import {setModalView} from "../models/actions/noteAction";

class Note extends React.Component {
    render() {
        const {location} = this.props;
        let thread = MyUtil.getQueryString(location.search, "thread");
        let source = MyUtil.getQueryString(location.search, "source");
        if (!thread) {
            thread = sessionStorage.getItem("thread");
        } else {
            sessionStorage.setItem("thread", thread);
        }
        return (
            <div className="note-index" style={{height: $(window).height()}}>
                <Bookmark thread={thread} ownProps={this.props} source={source}/>
                <Body thread={thread}/>
                <Comment thread={thread}/>
                <AuthModal thread={thread} ownProps={this.props}/>
                <Contact/>
            </div>

        );
    }

}

const mapStateToProps = (state) => {
    return {modalView: state.note.modalView};
};

const mapDispatchToProps = (dispatch) => {
    return {
        setModalView: (visiable) => {
            dispatch(setModalView(visiable))
        }
    }
};
export default connect(
    mapStateToProps,
    mapDispatchToProps
)(Note);
