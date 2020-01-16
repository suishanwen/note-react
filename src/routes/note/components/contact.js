import React from 'react';
import "../index.css"
import $ from 'jquery';

class Contact extends React.PureComponent {

    componentDidMount() {
        const element = $("a.bitcoin");
        element.hover(function (e) {
                $("body").append("<p id='bitcoin'><img src='https://bitcoinrobot.cn/mine/images/bitcoin.png' /></p>");
                $("#bitcoin")
                    .css("top", (e.pageY - 220) + "px")
                    .css("left", (e.pageX) + "px")
                    .css("position", "absolute")
                    .fadeIn("fast");
            },
            function () {
                $("#bitcoin").remove();
            });
        element.mousemove(function (e) {
            $("#bitcoin")
                .css("top", (e.pageY - 220) + "px")
                .css("left", (e.pageX) + "px");
        });
    }

    verify = () => {
        window.open("https://bitcoinrobot.cn#/note?source=sw&&thread=70");
    };


    render() {
        return (
            <div className="contact-index">
                <ul className="list-inline social-link">
                    <li>
                        <a href="http://wpa.qq.com/msgrd?v=3&uin=526253340&site=qq&menu=yes" target="_blank"><i
                            className="fa fa-qq"/></a>
                    </li>
                    <li>
                        <a href="http://www.weibo.com/suiswinging2012" target="_blank"><i className="fa fa-weibo"/></a>
                    </li>
                    <li>
                        <a href="http://www.github.com/suishanwen" target="_blank"><i className="fa fa-github"/></a>
                    </li>
                    <li>
                        <span className="copyright">Copyright &copy; 2020 suishanwen | Bitcoin(Cash) Address :
                            <a href="https://bch.btc.com/1D3TFfPSPGnjKfaryX56fpx32GGqNSWDzi" className="bitcoin"
                               target="_blank">1D3TFfPSPGnjKfaryX56fpx32GGqNSWDzi</a>(<a
                                onClick={this.verify}>verify</a>)
                        </span>
                    </li>
                </ul>

            </div>
        );
    }

}


export default Contact;


