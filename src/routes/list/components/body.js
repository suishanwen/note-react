import React from 'react';
import $ from 'jquery';
import {Table} from 'antd';
import DateUtil from '../../../constants/DateUtil'

const Body = ({data, query, resetInit, ...props}) => {
    if (!data.init) {
        query();
    }
    let columns = [];
    if (window["isMobile"]) {
        columns = [{
            title: 'id',
            dataIndex: 'id',
            key: 'id',
            width: '12%',
        }, {
            title: '标题',
            dataIndex: 'title',
            key: 'title',
            width: '88%',
        }];
    } else {
        columns = [{
            title: '行号',
            dataIndex: 'rowIndex',
            key: 'rowIndex',
            width: '5%',
        }, {
            title: 'thread',
            dataIndex: 'id',
            key: 'id',
            width: '5%',
        }, {
            title: '标题',
            dataIndex: 'title',
            key: 'title',
            width: '75%',
        }, {
            title: ' 时间',
            dataIndex: 'date',
            key: 'date',
            width: '15%',
            render: function (text, record, index) {
                return DateUtil.formatDateTime(text);
            }
        }];
    }
    let rowClick = (note, index) => {
        resetInit();
        const {history} = props.ownProps;
        sessionStorage.setItem("thread", note.id);
        history.push(`/note`);
    };
    const fontSize = window.getComputedStyle(document.documentElement)["fontSize"];
    const rem = parseFloat(fontSize.replace("px", ""));
    return (
        <Table bordered columns={columns} dataSource={data.list} size='middle'
               pagination={{pageSize: Math.ceil(($(window).height() - 170 / 54 * rem) / 47 / 54 * rem)}}
               onRowClick={rowClick}
               style={{height: $(window).height() - (56 / 54 * rem) + "px"}}/>
    )
};

export default Body;