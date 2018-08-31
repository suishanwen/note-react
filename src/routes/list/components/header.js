import React from 'react';
import {Input, Form} from 'antd';

const FormItem = Form.Item;


const Header = ({keyword, change, ...props}) => {
    const {getFieldDecorator} = props.form;
    const search = () => {
        // change(props.form.getFieldsValue().keyword);
        setTimeout(() => change(props.form.getFieldsValue().keyword), 0);
    };

    return (
        <Form>
            <FormItem style={{marginLeft: '40%'}}>
                {getFieldDecorator('keyword', {
                    rules: [{
                        required: false, message: 'Search',
                    }],
                    initialValue: keyword
                },)(
                    <Input style={{width: '30%'}} placeholder="Search" onChange={search}/>
                )}
            </FormItem>
        </Form>
    )
};

export default Form.create()(Header);
