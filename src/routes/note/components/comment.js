import React from 'react';
import "../index.css"
import $ from "jquery";
import Path from "../../../constants/Path";
import JSON from "../../../constants/Json";
import {message} from 'antd';

class Comment extends React.Component {
    state = {
        comments: []
    };

    constructor(props) {
        super(props);
    }

    componentDidMount() {
        this.foldComment();
        this.refreshComment();
        setTimeout(this.foldComment);
    }

    refreshComment = () => {
        $.post(`api/comment/get?thread=${this.props.thread}`, null, data => {
            this.setState({comments: data})
        });
    };

    saveComment = () => {
        const comment = $("input[name='comment']").val();
        if (!comment) {
            message.warning("评论不能为空！");
            return false;
        }
        if (Window.progress.isProcessing) {
            return false;
        }
        Window.progress.open();
        $.ajax({
            url: Path.getUri('api/comment/add'),
            type: "post",
            contentType: "application/json;charset=utf-8",
            data: JSON.stringify({
                "comment": comment,
                "thread": this.props.thread
            }),
            success: (res) => {
                $("input[name='comment']").val("");
                Window.progress.close();
                console.log(res);
                this.refreshComment()
            },
            error: (data) => {
                console.log(data);
                Window.progress.close();
                message.error(data.responseJSON.message);
            }
        });
    };


    delComment = (id) => {
        Window.progress.open();
        $.ajax({
            url: Path.getUri(`api/comment/delete/${id}`),
            type: "post",
            data: null,
            success: (res) => {
                Window.progress.close();
                console.log(res);
                this.refreshComment()
            },
            error: (data) => {
                console.log(data);
                Window.progress.close();
                message.error(data.responseJSON.message);
            }
        });
    };

    foldComment = () => {
        $(".comment-index").slideToggle();
    };

    render() {
        const comments = this.state.comments;
        return (
            <div>
                <div className="comment-toggle">
                    <i className="fa fa-align-justify" aria-hidden="true" onClick={this.foldComment}/>
                </div>
                <div className="comment-index">
                    <h5>评论区</h5>
                    <div className="comment-area">
                        {
                            comments.map(item =>
                                <div key={item.id} className="comment-div">
                                    <div className="comment" title={item.comment}>
                                        {item.comment}
                                    </div>
                                    <div className="comment-info">
                                        <div className="ip">{item.ip}
                                            {item.operable ? <i className="fa fa-times" aria-hidden="true"
                                                                onClick={this.delComment.bind(this, item.id)}/> :
                                                <div></div>}
                                        </div>
                                        <div className="time">{item.commentTime}</div>
                                    </div>
                                </div>
                            )
                        }
                    </div>
                    <div className="comment-editor">
                        <input type="textarea" className="editor" name="comment"/>
                        <input type="button" className="editor-submit" value="提交" onClick={this.saveComment}/>
                    </div>
                </div>
            </div>
        );
    }

}


export default Comment;
