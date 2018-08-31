class Path {


    static getUri = (url) => {
        let pathName = window.document.location.pathname;
        if (/^\//.test(url)) {
            return encodeURI(url);
        } else {
            return encodeURI(pathName.substring(0, pathName.substr(1).indexOf('/') + 1) + "/" + url);
        }
    };
}

export default Path