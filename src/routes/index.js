import Nav from './nav';
import List from './list';
import Note from './note';
import Edit from './edit';
import Login from './login';
import "antd/dist/antd.css";


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
        name: "Login",
        path: '/login',
        component: Login
    }
];
export default routes;
