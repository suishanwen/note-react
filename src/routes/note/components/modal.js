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
        const token = localStorage.getItem('adminToken');
        if (!token) {
            message.warn('未登录，请先前往 /login 设置 Token');
            return;
        }
        Window.progress.open();
        $.ajax({
            url: Path.getUri(`api/note/delete/${sessionStorage.getItem("thread")}`),
            type: "post",
            headers: { 'x-auth-token': token },
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
                message.error(data.responseJSON ? data.responseJSON.message : '删除失败');
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
                    <p>确认删除该 Note？此操作不可撤销。</p>
                    <button className="btn btn-danger auth-button" onClick={this.delete}>确认删除</button>
                </div>
            </Modal>
        )
    }


}


export default AuthModal;

