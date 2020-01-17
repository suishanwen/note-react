import React from 'react';
import $ from 'jquery';
import DateUtil from '../../../constants/DateUtil'
import {getTimeInfo} from "../timeline"

const Body = ({data, query, resetInit, ...props}) => {
    if (!data.init) {
        query();
    }

    let onRowClick = (note) => {
        resetInit();
        const {history} = props.ownProps;
        sessionStorage.setItem("thread", note.id);
        sessionStorage.setItem("title", note.title);
        history.push(`/note`);
    };

    let getPostTime = (postTime, isLast) => {
        if (isLast) {
            return DateUtil.formatDateTime(postTime, false);
        }
        return getTimeInfo(postTime, new Date());
    };

    setTimeout(() => {
        $(window).resize();
    });

    return (
        <div id="note_list_timeline" className="container_wapper">
            <h1>Timeline</h1>
            <div className="container-fluid">
                {data.list && data.list.map((note, index) => {
                    return <div id={note.id} className="time_line_wap" key={index} onClick={onRowClick.bind({}, note)}>
                        <div className="time_line_caption">{getPostTime(note.postTime, index === data.list.length - 1)}
                        </div>
                        <div className="time_line_paragraph">
                            <h1>{note.title}</h1>
                            <p>
                                <span className="glyphicon glyphicon-user"/>
                                <a>{note.poster}</a> &nbsp;&nbsp;
                                <span className="glyphicon glyphicon-bookmark"/>
                                <span key={index}>
                                    {note.tags && note.tags.map((tag, index) => {
                                        return <a key={index}>{tag}</a>
                                    })}
                            </span> &nbsp;&nbsp;
                            </p>
                            <p>{note.summary}</p>
                        </div>
                    </div>
                })}
            </div>
        </div>
    )
};

export default Body;
