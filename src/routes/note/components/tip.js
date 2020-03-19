import React from 'react';
import "../index.css"
import JSON from "../../../constants/Json";
import {Form, Input, message} from 'antd';
import ScatterJS from '@scatterjs/core';
import ScatterEOS from '@scatterjs/eosjs2';
import {JsonRpc, Api} from 'eosjs'
import imageUrl from '../../../images/eos.png'


// Don't forget to tell ScatterJS which plugins you are using.
ScatterJS.plugins(new ScatterEOS());
const scatter = ScatterJS.scatter;
window.ScatterJS = null;
// Networks are used to reference certain blockchains.
const network = {
    blockchain: 'eos',
    protocol: 'https',
    host: 'nodes.get-scatter.com',
    port: 443,
    chainId: 'aca376f206b8fc25a6ed44dbdc66547c36c6c33e3a119ffbeaef943642f0e906',
    fullhost: () => {
        return `${network.protocol}://${network.host}${network.port ? ':' : ''}${network.port}`
    }
};
const key = 'updatable';

const rpc = new JsonRpc(network.fullhost(), {fetch});

const FormItem = Form.Item;

class Tip extends React.Component {
    state = {
        loginUser: null,
        tips: "0.0000",
        details: []
    };

    constructor(props) {
        super(props);
    }

    componentDidMount() {
        this.loadUser();
        this.getTips();
    }

    getTips = async () => {
        try {
            const data = await rpc.get_table_rows({
                json: true,                 // Get the response as json
                code: "bitcoinrobot",           // Contract that we target
                scope: "bitcoinrobot",          // Account that owns the data
                table: "tip",          // Table name
                table_key: "",           // Table secondary key name
                index_position: 2,
                key_type: "i64",
                limit: -1,
                lower_bound: parseInt(this.props.thread),     // Table primary key value
                upper_bound: parseInt(this.props.thread),     // Table primary key value
            });
            const rows = data.rows;
            console.log(rows);
            if (rows && rows.length > 0) {
                const sum = rows.map(row => parseFloat(row.quantity.replace(" EOS", ""))).reduce((q1, q2) => {
                    return q1 + q2
                }, 0).toFixed(4);
                this.setState(Object.assign(this.state, {tips: sum, details: rows}));
            }
        } catch (e) {
            console.log(e);
        }
    };

    loadUser = () => {
        let ls = localStorage.getItem("eos");
        if (ls) {
            ls = JSON.parse(ls);
            if (ls.expires > ls.startTime) {
                this.setState(Object.assign(this.state, {loginUser: ls.value}));
            } else {
                localStorage.removeItem("eos");
            }
        }
    };

    setUser = (account) => {
        console.log(account);
        const options = {
            name: 'eos',
            value: `${account.name}@${account.authority}`,
            expires: new Date().getTime() + 60 * 60 * 12 * 1000,
            startTime: new Date().getTime()//记录何时将值存入缓存，毫秒级
        };
        localStorage.setItem(options.name, JSON.stringify(options));
        this.loadUser();
    };

    logOut = () => {
        try {
            scatter.forgetIdentity();
        } catch (e) {

        }
        localStorage.removeItem("eos");
        this.setState(Object.assign(this.state, {loginUser: null}));
    };

    doTips = () => {
        let tips = this.props.form.getFieldsValue().tips;
        if (!tips || tips <= 0) {
            message.warning("请输入金额-_-");
            return;
        }
        tips = Number(tips).toFixed(4);
        message.loading({content: 'waiting scatter login...', key});
        // First we need to connect to the user's Scatter.
        ScatterJS.scatter.connect('Tips').then(connected => {

            // If the user does not have Scatter or it is Locked or Closed this will return false;
            if (!connected) return false;
            // Now we need to get an identity from the user.
            // We're also going to require an account that is connected to the network we're using.
            const requiredFields = {accounts: [network]};
            scatter.getIdentity(requiredFields).then(() => {

                // Always use the accounts you got back from Scatter. Never hardcode them even if you are prompting
                // the user for their account name beforehand. They could still give you a different account.
                const account = scatter.identity.accounts.find(x => x.blockchain === 'eos');
                this.setUser(account);
                message.success({
                    content: `actor: ${account.name}, permission: ${account.authority}`,
                    key,
                    duration: 5
                });
                // Get a proxy reference to eosjs which you can use to sign transactions with a user's Scatter.
                const rpc = new JsonRpc(network.fullhost());
                const eos = ScatterJS.eos(network, Api, {rpc});
                // ----------------------------
                // Now that we have an identity,
                // an EOSIO account, and a reference
                // to an eosjs object we can send a transaction.
                // ----------------------------
                message.loading({content: 'waiting scatter confirm...', key});
                eos.transact({
                    actions: [
                        {
                            account: "eosio.token", //has to be the smart contract name of the token you want to transfer - eosio for EOS or eosjackscoin for JKR for example
                            name: "transfer",
                            authorization: [{actor: account.name, permission: account.authority}],
                            data: {
                                from: account.name,
                                to: "sw.bank",
                                quantity: `${tips} EOS`,
                                memo: `Tip ${tips} EOS to [${this.props.title}]`
                            }
                        }, {
                            account: "bitcoinrobot", //has to be the smart contract name of the token you want to transfer - eosio for EOS or eosjackscoin for JKR for example
                            name: "receive",
                            authorization: [{actor: account.name, permission: account.authority}],
                            data: {
                                from: account.name,
                                to: "sw.bank",
                                quantity: `${tips} EOS`,
                                thread: this.props.thread
                            }
                        }]
                }, {
                    blocksBehind: 3,
                    expireSeconds: 30,
                }).then(trx => {
                    // That's it!
                    message.success({
                        content: <a href={"https://bloks.io/transaction/" + trx.transaction_id} target="_blank">Transaction
                            ID: {trx.transaction_id}</a>,
                        key,
                        duration: 10
                    });
                    this.getTips();
                    console.log(`Transaction ID: ${trx.transaction_id}`);
                }).catch(error => {
                    console.error(error);
                    message.error({content: error.message, key, duration: 5});
                });

            }).catch(error => {
                // The user rejected this request, or doesn't have the appropriate requirements.
                console.error(error);
                message.error({content: error.message, key, duration: 5});
            });
        });
    };

    render() {
        const {getFieldDecorator} = this.props.form;
        console.log("this.state");
        console.log(this.state);
        return (
            <div>
                <div className="tip-index">
                    <div className="eos-user" style={{display: this.state.loginUser ? "block" : "none"}}>
                        <div className="user-auth"><a>{this.state.loginUser}</a></div>
                        <div className="log-out"><a onClick={this.logOut.bind(this)}><i
                            className="fa fa-sign-out"
                            aria-hidden="true"/></a></div>
                    </div>
                    <div>
                        <img className="eos-img" src={imageUrl}/>
                        <div className="tips">{this.state.tips}</div>
                    </div>
                    <div className="tip-operate">
                        <FormItem className="tips-input">
                            {getFieldDecorator('tips', {
                                rules: [{
                                    required: true, message: 'Tips',
                                }],
                                initialValue: "0.0001"
                            },)(
                                <Input style={{width: '90px'}} placeholder="Tips"/>
                            )}
                        </FormItem>
                        <button className="btn btn-primary" onClick={this.doTips.bind(this)}>打赏(Tip)</button>
                    </div>
                    <div className="detail-area" style={{display: this.state.details.length > 0 ? "block" : "none"}}>
                        {
                            this.state.details.map((detail, index) =>
                                <div key={index} className="detail">
                                    <a href={"https://bloks.io/transaction/" + detail.trxid} target="_blank">
                                        <span className="detail-id" title={detail.from}>
                                            {detail.from}
                                        </span>
                                        <span className="detail-amount">
                                            {detail.quantity}
                                        </span>
                                    </a>
                                </div>
                            )
                        }
                    </div>
                </div>
            </div>
        );
    }

}

Tip = Form.create()(Tip);

export default Tip;
