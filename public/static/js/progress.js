let Progress = function () {
    let isProcessing = false;
    let progress = null;
    let open = function () {
        if (isProcessing) {
            console.warn("progress is open");
            return false;
        } else {
            isProcessing = true;
            progress = new Progress().open();
        }
    };

    let close = function () {
        if (isProcessing) {
            isProcessing = false;
            progress.close();
        } else {
            console.warn("progress is close");
        }
    };

    function Progress() {
        this._element = $('<div class="alert-level">\n' +
            '    <i style="position: absolute;top: 50%;left: 50%;" class=\'fa fa-spinner fa-pulse\'>\n' +
            '</div>');
    }

    Progress.prototype.open = function () {
        $(window.top.document).find('body').append(this._element);
        return this;
    };

    Progress.prototype.close = function () {
        this._element.remove();
    };

    return {
        "isProcessing": isProcessing,
        "open": open,
        "close": close
    };
};


Window.progress = new Progress();