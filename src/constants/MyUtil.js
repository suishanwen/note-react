class MyUtil {
    static getQueryString = (queryString, name) => {
        let reg = new RegExp("(^|&)" + name + "=([^&]*)(&|$)", "i");

        let r = queryString.substr(1).match(reg);

        if (r != null) {

            return unescape(r[2])

        }

        return null;
    };
}

export default MyUtil