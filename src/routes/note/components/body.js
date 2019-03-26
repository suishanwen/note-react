import React from 'react';
import "../index.css"
import $ from 'jquery';
import DateUtil from "../../../constants/DateUtil";
import Path from "../../../constants/Path";

class Body extends React.Component {

    constructor(props) {
        super(props);
        let thread = this.props.thread;
        this.queryById(thread);
    }

    componentDidMount() {
        if (window["isMobile"]) {
            $(".note-index .box")[0].style.width = `${window["width"] - 2}px`;
            // setTimeout(() => {
            //     const imgs = document.getElementsByTagName("img");
            //     for (let i = 0; i < imgs.length; i++) {
            //         let item = imgs[i];
            //         const width = item.width;
            //         const height = item.height;
            //         if (width > window["width"]) {
            //             item.width = window["width"];
            //             item.height = window["width"] / width * height;
            //         }
            //     }
            // }, 1);
        }
    }

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
        recommend: 0
    };

    queryById = (thread) => {
        if (Window.progress.isProcessing) {
            return false;
        }
        Window.progress.open();
        $.get(Path.getUri(`api/note/get?id=${thread}`), (data) => {
            Window.progress.close();
            this.setState(data);
        });
    };


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
        let content = this.state.content;
        if (window["isMobile"]) {
            content = this.state.content.replace(/<img[^>]*>/gi, match => {
                let width;
                let result = match.replace(/width\s*?=\s*?([‘"])[\s\S]*?\1/ig, match1 => {
                    width = match1.substring(7, match1.lastIndexOf('"'));
                    if (width > window["width"]) {
                        return `width="${window["width"]}"`
                    }
                    return `width="${width}"`
                });
                if (width && width > window["width"]) {
                    result = result.replace(/height\s*?=\s*?([‘"])[\s\S]*?\1/ig, match2 => {
                        const height = match2.substring(8, match2.lastIndexOf('"'));
                        return `height="${window["width"] / width * height}"`
                    });
                }
                return result;
            });
        }
        $("#content")[0].innerHTML = content;
    }
}


export default Body;
