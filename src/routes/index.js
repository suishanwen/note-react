import Nav from './nav';
import List from './list';
import Note from './note';
import Edit from './edit';
import UploadFile from './upload';


const routes = [
    {
        exact: true,
        path: '/',
        component: Nav,
    },
    {
        name: "导航",
        path: '/nav',
        component: Nav
    },
    {
        name: "列表",
        path: '/list',
        component: List
    },
    {
        name: "Note",
        path: '/note',
        component: Note
    },
    {
        name: "Edit",
        path: '/edit',
        component: Edit
    },
    {
        name: "Upload",
        path: '/upload',
        component: UploadFile
    }
];
export default routes;
