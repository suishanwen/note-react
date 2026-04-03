import React from 'react';
import { Form, Input, Button, message } from 'antd';
import $ from 'jquery';
import Path from '../../constants/Path';

const FormItem = Form.Item;

class Login extends React.Component {
    handleLogin = () => {
        const token = this.props.form.getFieldsValue().token;
        if (!token) {
            message.warning('请输入 Token');
            return;
        }
        $.ajax({
            url: Path.getUri('api/auth/login'),
            type: 'post',
            contentType: 'application/json;charset=utf-8',
            data: JSON.stringify({ token }),
            success: () => {
                localStorage.setItem('adminToken', token);
                message.success('登录成功');
                const { history } = this.props;
                history.push('/nav');
            },
            error: (data) => {
                message.error(data.responseJSON ? data.responseJSON.message : '登录失败');
            }
        });
    };

    render() {
        const { getFieldDecorator } = this.props.form;
        return (
            <div style={{ maxWidth: 320, margin: '120px auto', padding: '0 16px' }}>
                <h3>管理员登录</h3>
                <Form>
                    <FormItem label="Token">
                        {getFieldDecorator('token', {
                            rules: [{ required: true, message: 'Token 不能为空' }]
                        })(
                            <Input.Password placeholder="输入管理员 Token" />
                        )}
                    </FormItem>
                    <FormItem>
                        <Button type="primary" onClick={this.handleLogin} block>登录</Button>
                    </FormItem>
                </Form>
            </div>
        );
    }
}

export default Form.create()(Login);
