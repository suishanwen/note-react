import React from 'react';
import "./index.css"
import $ from 'jquery';
import {Input, Form, Checkbox, message} from 'antd';
import DateUtil from "../../constants/DateUtil";
import JSON from "../../constants/Json";
import Path from "../../constants/Path";

const FormItem = Form.Item;

class Edit extends React.Component {

    constructor(props) {
        super(props);
        const thread = sessionStorage.getItem("thread");
        if (thread) {
            this.queryById(thread);
        }
    }

    state = {
        id: null,
        title: "",
        content: "",
        poster: "",
        ip: "",
        postTime: null,
        editTime: null,
        summary: "",
        tag: "",
        recommend: false
    };


    queryById = (thread) => {
        if (Window.progress.isProcessing) {
            return false;
        }
        Window.progress.open();
        $.get(Path.getUri(`api/note/get?id=${thread}`), (data) => {
            Window.progress.close();
            data.recommend = data.recommend === 1;
            this.setState(data);
        });
    };

    backNote = () => {
        const {history} = this.props;
        if (this.thread) {
            history.push("note");
        } else {
            history.push("list");
        }
    };
    saveNote = () => {
        let content = $("#content").val();
        if (window["noteEditor"]) {
            content = window["noteEditor"].content();
        }
        let note = Object.assign({}, this.state, {
            recommend: this.state.recommend ? 1 : 0,
            title: this.props.form.getFieldsValue().title,
            poster: this.props.form.getFieldsValue().poster,
            summary: this.props.form.getFieldsValue().summary,
            tag: this.props.form.getFieldsValue().tag,
            content: this.px2Rem(content)
        });
        let url = "";
        if (note.id) {
            url = "api/note/edit";
        } else {
            url = "api/note/add";
        }
        if (Window.progress.isProcessing) {
            return false;
        }
        Window.progress.open();
        $.ajax({
            url: Path.getUri(url),
            type: "post",
            contentType: "application/json;charset=utf-8",
            data: JSON.stringify(note),
            success: (res) => {
                Window.progress.close();
                console.log(res);
                if (res === "") {
                    message.error("当前IP不允许编辑此贴!");
                } else {
                    this.thread = res.id;
                    sessionStorage.setItem("thread", res.id);
                    this.backNote();
                }
            },
            error: (data) => {
                console.log(data);
                Window.progress.close();
                message.error(data.responseJSON.message);
            }
        });
    };
    changeRecommend = () => {
        this.setState(Object.assign({}, this.state, {
            recommend: !this.state.recommend
        }))
    };
    newEditor = () => {
        const {rem} = window;
        window["noteEditor"] = new window.TQEditor('content', {
            toolbar: 'full',
            imageUploadUrl: 'https://bitcoinrobot.cn/api/file/upload',
            directInsertUploadImage: true,
            flashUploadUrl: 'https://bitcoinrobot.cn/api/file/upload',
            videoUploadUrl: 'https://bitcoinrobot.cn/api/file/upload',
            musicUploadUrl: 'https://bitcoinrobot.cn/api/file/upload',
            linkUploadUrl: 'https://bitcoinrobot.cn/api/file/upload'
        });
        const container = $("#TQEditorContainer_content")[0];
        let width = `${808 / 54 * rem}`;
        if (width > window["width"]) {
            window["noteEditor"].setWidth(1)
        } else {
            container.style.width = `${width}px`;
        }
        container.style.height = `${524 / 54 * rem}px`;
        window["noteEditor"].focus();
    };
    px2Rem = (content) => {
        return content;
    };

    componentDidMount() {
        if (window["isMobile"]) {
            $("#content")[0].style.width = `${window["width"] - 2}px`;
            const dom = $(".note-edit-index .note-info");
            for (let i = 0; i < dom.length; i++) {
                dom[i].style.width = `${window["width"]}px`;
            }
        }
    };

    render() {
        const {getFieldDecorator} = this.props.form;
        const formItemLayout = {
            labelCol: {
                xs: {span: 0},
                sm: {span: 3},
            },
            wrapperCol: {
                xs: {span: 0},
                sm: {span: 20},
            },
        };
        const formItemLayout2 = {
            labelCol: {
                xs: {span: 0},
                sm: {span: 6},
            },
            wrapperCol: {
                xs: {span: 0},
                sm: {span: 18},
            },
        };
        let note = this.state;
        let postTimeHtml = note.postTime ?
            <span>发布时间:{DateUtil.formatDateTime(note.postTime)}</span> :
            <span>&nbsp;</span>;
        let editTimeHtml = note.editTime ?
            <span>最后编辑:{DateUtil.formatDateTime(note.editTime)}</span> :
            <span>&nbsp;</span>;
        return (
            <div className="note-edit-index">
                <div>
                    <span className="note-subject badge">{note.id ? "编辑主题" : "新主题"}</span>
                    <FormItem>
                        {getFieldDecorator('recommend', {
                            rules: [{
                                required: false, message: 'recommend',
                            }],
                            initialValue: "Check"
                        },)(
                            <Checkbox id="recommend" checked={note.recommend} onChange={this.changeRecommend}
                            >推荐</Checkbox>
                        )}
                    </FormItem>
                </div>
                <div className="form-horizontal">
                    <div className="form-group note-info form-input">
                        <div>
                            <FormItem label="标题" {...formItemLayout} hasFeedback>
                                {getFieldDecorator('title', {
                                    rules: [{
                                        required: true, message: '标题不能为空！',
                                    }],
                                    initialValue: note.title
                                },)(
                                    <Input style={{width: "7.4rem"}}/>
                                )}
                            </FormItem>

                        </div>
                        <div>
                            <FormItem label="作者" {...formItemLayout2} hasFeedback>
                                {getFieldDecorator('poster', {
                                    rules: [{
                                        required: true, message: '作者不能为空！',
                                    }],
                                    initialValue: note.poster
                                },)(
                                    <Input style={{width: "2.3rem"}}/>
                                )}
                            </FormItem>
                        </div>
                    </div>
                    <div className="form-group note-info form-input">
                        <div>
                            <FormItem label="摘要" {...formItemLayout} hasFeedback>
                                {getFieldDecorator('summary', {
                                    rules: [{
                                        required: true, message: '摘要不能为空！',
                                    }],
                                    initialValue: note.summary
                                },)(
                                    <Input style={{width: "7.4rem"}}/>
                                )}
                            </FormItem>

                        </div>
                        <div>
                            <FormItem label="标签" {...formItemLayout2} hasFeedback>
                                {getFieldDecorator('tag', {
                                    rules: [{
                                        required: true, message: '标签不能为空！',
                                    }],
                                    initialValue: note.tag
                                },)(
                                    <Input style={{width: "2.3rem"}}/>
                                )}
                            </FormItem>
                        </div>
                    </div>
                    <div className="form-group">
                            <textarea name="content" id="content" readOnly
                                      style={{height: `${(524 - 50) / 54 * window["rem"]}px`}}
                                      className="content"
                                      value={note.content}
                                      onClick={this.newEditor}
                                      required>
                            </textarea>
                    </div>
                    <div className="form-group note-info">
                        {postTimeHtml}
                        {editTimeHtml}
                    </div>
                    <div className="form-group">
                        <button className="btn btn-default" onClick={this.backNote}>返回</button>
                        <button className="btn btn-primary" onClick={this.saveNote}>提交</button>
                    </div>
                </div>
            </div>
        )
    }
}

Edit = Form.create()(Edit);

export default Edit;
