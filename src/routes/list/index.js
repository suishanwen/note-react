import React from 'react';
import Search from './containers/Search'
import NoteList from './containers/NoteList'
import "./index.css"


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
            </div>
        );
    }
}

export default List