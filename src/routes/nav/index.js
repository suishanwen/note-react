import React from 'react';
import "./index.css"
import $ from 'jquery';
import RENDERER from "./render"

class Nav extends React.Component {
    navigate = (page) => {
        sessionStorage.removeItem("thread");
        const {history} = this.props;
        history.push(`/${page}`);
    };

    render() {
        return (

            <div id="jsi-cards-container" className="nav-main">
                <div className="nav-index">
                    <div className="add"
                         onClick={this.navigate.bind(this, 'edit')}><a>新增</a></div>
                    <div className="find" onClick={this.navigate.bind(this, 'list')}><a>查看</a></div>
                </div>
            </div>

        );
    }

    componentWillMount() {
        $("body").css({"overflow": "hidden"});
    }

    componentDidMount() {
        const {rem} = window;
        let marginTB = ($(window).height() / rem - 5.55) / 2;
        let marginLR = ($(window).width() - 11.1 * rem) / 4 / rem;
        $(".nav-index .add").css("margin", `${marginTB}rem ${marginLR}rem`);
        $(".nav-index .find").css("margin", `${marginTB}rem ${marginLR}rem`);
        RENDERER.init();
    }
}

export default Nav

