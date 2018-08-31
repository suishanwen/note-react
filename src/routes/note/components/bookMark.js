import React from 'react';
import $ from 'jquery';
import "../index.css"
import Path from "../../../constants/Path";

class Bookmark extends React.Component {
    state = {
        showButton: false
    };


    setButtonShow = (val) => {
        this.setState({
            showButton: val
        })
    };

    editNote = (type) => {
        if (type === 0) {
            sessionStorage.setItem("thread", "");
        }
        const {history} = this.props.ownProps;
        history.push("edit");
    };

    deleteNote = () => {
        this.props.ownProps.setModalView(true);
    };

    backList = () => {
        const {history} = this.props.ownProps;
        history.push("list");
    };

    render() {
        let bookmarkHtml = <div className="book-mark" onMouseOver={this.setButtonShow.bind(this, false)}
                                onMouseOut={this.setButtonShow.bind(this, true)}
                                onClick={this.setButtonShow.bind(this, true)}><span><img
            src="http://bitcoinrobot.cn/file/img/note/bookmarks.jpg"/></span></div>;
        let buttonHtml = <div className="operate">
            <ul>
                <li>
                    <button className="btn btn-primary" onClick={this.editNote.bind(this, 0)}>新增</button>
                </li>
                <li>
                    <button className="btn btn-danger" onClick={this.editNote.bind(this, 1)}>编辑</button>
                </li>
                <li>
                    <button className="btn btn-danger" onClick={this.deleteNote.bind(this, 1)}>删除</button>
                </li>
                <li>
                    <button className="btn btn-default" onClick={this.backList}>返回</button>
                </li>
            </ul>
        </div>;
        return (
            <div>
                {!this.state.showButton && this.props.source !== 'sw' && bookmarkHtml}
                {this.state.showButton && buttonHtml}
            </div>

        );
    }

    componentDidUpdate() {
        if (this.state.showButton) {
            setTimeout(() => {
                const {history} = this.props.ownProps;
                if (history.location.pathname === "/note") {
                    this.setButtonShow(false);
                }
            }, 3000);
        }
    }

}


export default Bookmark;
