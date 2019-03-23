import React from 'react';
import {Modal, message} from 'antd';
import $ from 'jquery';
import "../index.css"
import Path from "../../../constants/Path";

class AuthModal extends React.Component {
    constructor() {
        super();
    }

    backList = () => {
        const {history} = this.props.ownProps;
        history.push("list");
    };

    delete = () => {
        const authCode = $("#authCode").val();
        if (!authCode) {
            message.warn("AuthCode不能为空！");
            return
        }
        Window.progress.open();
        $.ajax({
            url: Path.getUri(`api/note/delete/${sessionStorage.getItem("thread")}`),
            type: "post",
            contentType: "application/json;charset=utf-8",
            data: authCode,
            success: (res) => {
                Window.progress.close();
                message.success("删除成功！");
                console.log(res);
                this.close();
                sessionStorage.removeItem("thread");
                this.backList();
            },
            error: (data) => {
                Window.progress.close();
                console.log(data);
                message.error(data.responseJSON.message)
            }
        });
    };

    close = () => {
        this.props.ownProps.setModalView(false);
    };

    render() {
        return (
            <Modal visible={this.props.ownProps.modalView}
                   footer={null}
                   width={400}
                   height={300}
                   destroyOnClose={true}
                   maskClosable={true}
                   onCancel={this.close}
                   closable={true}>
                <div className="form-group note-info">
                    <input type="password" id="authCode"/>
                    <button className="btn btn-danger auth-button" onClick={this.delete}>删除</button>
                </div>
            </Modal>
        )
    }


}


export default AuthModal;

