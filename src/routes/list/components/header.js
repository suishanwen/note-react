import React from 'react';
import {Input, Form} from 'antd';
import $ from "jquery";

const FormItem = Form.Item;


const Header = ({keyword, list, change, ...props}) => {
    const {getFieldDecorator} = props.form;
    const search = () => {
        setTimeout(() => {
            const kw = props.form.getFieldsValue().keyword;
            const id = forKeyword(kw);
            if (id) {
                if (window["timer"]) {
                    clearTimeout(window["timer"]);
                }
                window["timer"] = setTimeout(() => {
                    $('html,body').animate({scrollTop: $('#' + id)[0].offsetTop}, 1000);
                }, 500);
            }
            //change(props.form.getFieldsValue().keyword)
        }, 0);
    };

    const forKeyword = (keyword = "") => {
        if (!keyword || !list || list.length === 0) {
            return 0;
        }
        const _filter = list.filter(note => note.title.toUpperCase().indexOf(keyword.toUpperCase()) !== -1);
        if (_filter.length > 0) {
            return _filter[0].id;
        }
    };

    return (
        <Form className="note-search">
            <FormItem style={{marginLeft: '40%'}}>
                {getFieldDecorator('keyword', {
                    rules: [{
                        required: false, message: 'Search',
                    }],
                    initialValue: keyword
                },)(
                    <Input style={{width: '120px'}} placeholder="Search" onChange={search}/>
                )}
            </FormItem>
        </Form>
    )
};

export default Form.create()(Header);
