import React from 'react';
import {Upload, Icon, message} from 'antd';

const package_json = require("../../../package.json");

const Dragger = Upload.Dragger;

class UploadFile extends React.Component {
    render() {
        const props = {
            name: 'file',
            multiple: true,
            action: `${package_json.proxy}/api/file/upload?type=1`,
            onChange(info) {
                const status = info.file.status;
                if (status !== 'uploading') {
                    console.log(info.file, info.fileList);
                }
                if (status === 'done') {
                    message.success(`${info.file.name} file uploaded successfully.`);
                } else if (status === 'error') {
                    message.error(`${info.file.name} file upload failed.`);
                }
            },
        };
        return (
            <Dragger {...props}>
                <p className="ant-upload-drag-icon">
                    <Icon type="inbox"/>
                </p>
                <p className="ant-upload-text">Click or drag file to this area to upload</p>
                <p className="ant-upload-hint">Support for a single or bulk upload. Strictly prohibit from uploading
                    company data or other band files</p>
            </Dragger>
        );
    }
}

export default UploadFile
