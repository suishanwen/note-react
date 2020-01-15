import React from 'react';
import Search from './containers/Search'
import NoteList from './containers/NoteList'
import "./index.css"
import Contact from "../note/components/contact";

// const List = () => (
//     <div className="note-list-index">
//         <Search/>
//         <NoteList/>
//     </div>
// );
class List extends React.Component {

    componentWillMount() {
    }


    render() {
        return (
            <div className="note-list-index">
                <Search/>
                <NoteList ownProps={this.props}/>
                <Contact/>
            </div>
        );
    }
}

export default List
