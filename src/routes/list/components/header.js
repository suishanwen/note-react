import React from 'react';
import {Input, Form} from 'antd';
import $ from "jquery";

const FormItem = Form.Item;


const Header = ({keyword, change, ...props}) => {
    const {getFieldDecorator} = props.form;
    const search = () => {
        // change(props.form.getFieldsValue().keyword);
        setTimeout(() => {
            const kw = props.form.getFieldsValue().keyword;
            const id = forKeyword(window["noteList"], kw);
            if (id) {
                console.log(id + "-" + $('#' + id).offset().top);
                if (window["timer"]) {
                    clearTimeout(window["timer"]);
                }
                window["timer"] = setTimeout(() => {
                    console.log("sc");
                    $('html,body').animate({scrollTop: $('#' + id)[0].offsetTop}, 1000);
                }, 500);
            }
            //change(props.form.getFieldsValue().keyword)
        }, 0);
    };

    const forKeyword = (data = [], keyword = "") => {
        if (!keyword || data.length === 0) {
            return 0;
        }
        const _filter = data.filter(note => note.title.toUpperCase().indexOf(keyword.toUpperCase()) !== -1);
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
