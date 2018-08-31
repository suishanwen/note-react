import React from 'react';
import "../index.css"
import $ from 'jquery';
import DateUtil from "../../../constants/DateUtil";
import Path from "../../../constants/Path";

class Body extends React.Component {

    state = {
        id: "",
        title: "",
        content: "",
        poster: "",
        ip: "",
        postTime: "",
        editTime: "",
        summary: "",
        tag: "",
        recommend: 0,
        init: false
    };

    queryById = (thread) => {
        if (Window.progress.isProcessing) {
            return false;
        }
        Window.progress.open();
        $.get(Path.getUri(`api/note/get?id=${thread}`), (data) => {
            Window.progress.close();
            this.setState(Object.assign({}, data, {init: true}));
        });
    };


    componentDidMount() {
        if (!this.state.init) {
            let thread = this.props.thread;
            this.queryById(thread);
        }
        if (window["isMobile"]) {
            $(".note-index .box")[0].style.width = `${window["width"] - 2}px`;
        }
    }

    render() {
        let note = this.state;
        let editHtml = "";
        if (note.id === 73) {
            editHtml = <span>本主题于{DateUtil.formatDateTime(note.editTime)}自动更新</span>
        } else if (note.editTime) {
            editHtml = <span>本主题最后于{DateUtil.formatDateTime(note.editTime)}编辑</span>
        }
        return (
            <div>
                <div className="edit">
                    {editHtml}
                </div>
                <div className="title">
                    主题：<span>{note.title}</span>
                    作者：<span>{note.poster}</span>
                    ip：<span>{note.ip}</span>
                    时间：<span>{DateUtil.formatDateTime(note.postTime)}</span>
                </div>
                <div className="box">
                    <div className="content" id="content">loading...</div>
                </div>
            </div>
        );
    }

    componentDidUpdate() {
        $("#content")[0].innerHTML = this.state.content;
    }

}


export default Body;
