import $ from 'jquery';

(() => {
    //timeline
    $(window).on("load resize", function () {
        $.timeline_right_position_top = 0;
        $.timeline_old_right_position_top = 0;
        $.timeline_left_position_top = 0;
        $.timeline_old_left_position_top = 0;
        const w_width = ($(window).width() > 1600) ? 1600 : $(window).width();
        $.timeline_item_width = (w_width - 50) / 2;
        $(".time_line_wap").each(function () {
            //if class name already exit remove
            $(this).children("a.left_timer").remove();
            $(this).children("a.right_timer").remove();
            $(this).removeClass("left_timeline");
            $(this).removeClass("right_timeline");
            if ($(window).width() < 970) {
                $("#note_list_timeline .container-fluid").css({"position": "absolute"});
                const positon_left = $("#note_list_timeline .container-fluid").position().left + 100;
                //put on right
                $(this).css({
                    'left': 70,
                    'top': $.timeline_right_position_top,
                    'width': $(window).width() - positon_left
                });
                $(this).addClass("right_timeline");
                $.timeline_old_right_position_top = $.timeline_right_position_top;
                $.timeline_right_position_top = $.timeline_right_position_top + $(this).outerHeight() + 40;
                $(this).prepend("<a href=\"#\" class=\"right_timer\"><span class=\"glyphicon glyphicon-time\"></span></a>");
                $(this).children("a.right_timer").css({left: -86, width: 60,});
            } else if ($.timeline_left_position_top == 0) {
                $("#note_list_timeline .container-fluid").css({"position": "relative"});
                //put on left
                $(this).css({
                    'left': 0,
                    'top': 0,
                    'width': $.timeline_item_width - 50
                });
                $(this).addClass("left_timeline");
                $.timeline_old_left_position_top = $.timeline_left_position_top;
                $.timeline_left_position_top = $.timeline_left_position_top + $(this).outerHeight() + 40;
                $(this).prepend("<a href=\"#\" class=\"left_timer\"><span class=\"glyphicon glyphicon-time\"></span></a>");
                $(this).children("a.left_timer").css({left: $.timeline_item_width - 50,});
            } else if ($.timeline_right_position_top < $.timeline_left_position_top) {
                $("#note_list_timeline .container-fluid").css({"position": "relative"});
                $.timeline_right_position_top = ($.timeline_old_left_position_top + 40) < $.timeline_right_position_top ? $.timeline_right_position_top : $.timeline_right_position_top + 40;
                //put on right
                $(this).css({
                    'left': $.timeline_item_width + 79,
                    'top': $.timeline_right_position_top,
                    'width': $.timeline_item_width - 50
                });
                $(this).addClass("right_timeline");
                $.timeline_old_right_position_top = $.timeline_right_position_top;
                $.timeline_right_position_top = $.timeline_right_position_top + $(this).outerHeight() + 40;
                $(this).prepend("<a href=\"#\" class=\"right_timer\"><span class=\"glyphicon glyphicon-time\"></span></a>");
                $(this).children("a.right_timer").css({left: -99,});
            } else {
                $("#note_list_timeline .container-fluid").css({"position": "relative"});
                $.timeline_left_position_top = ($.timeline_old_right_position_top + 40) < $.timeline_left_position_top ? $.timeline_left_position_top : $.timeline_left_position_top + 40;
                //put on left
                $(this).css({
                    'left': 0,
                    'top': $.timeline_left_position_top,
                    'width': $.timeline_item_width - 50
                });
                $(this).addClass("left_timeline");
                $.timeline_old_left_position_top = $.timeline_left_position_top;
                $.timeline_left_position_top = $.timeline_left_position_top + $(this).outerHeight() + 40;
                $(this).prepend("<a href=\"#\" class=\"left_timer\"><span class=\"glyphicon glyphicon-time\"></span></a>");
                $(this).children("a.left_timer").css({left: $.timeline_item_width - 50,});
            }
            //calculate and define container height
            if ($.timeline_left_position_top > $.timeline_right_position_top) {
                $("#note_list_timeline .container-fluid").height($.timeline_left_position_top - 40);
                $("#note_list_timeline").height($.timeline_left_position_top + 200);
            } else {
                $("#note_list_timeline .container-fluid").height($.timeline_right_position_top - 40);
                $("#note_list_timeline").height($.timeline_right_position_top + 200);
            }
            $(this).fadeIn();
        });
    });
})();


const getUnit = (count, unit) => {
    if (count === 1 || unit === "month") {
        return count + " " + unit + " ago";
    } else {
        return count + " " + unit + "s ago";

    }
};

export const getTimeInfo = (t, n) => {
    var pDate = new Date(t);
    var year = n.getFullYear() - pDate.getFullYear();
    var month = (n.getMonth() + 1) - (pDate.getMonth() + 1);
    var days = n.getDate() - pDate.getDate();
    var weeks = parseInt(days / 7);
    var hours = n.getHours() - pDate.getHours();
    var minutes = n.getMinutes() - pDate.getMinutes();
    var seconds = n.getSeconds() - pDate.getSeconds();
    if (year === 1 && month < 0) {
        return getUnit(12 + month, "month");
    } else if (year > 0) {
        return getUnit(year, "year");
    } else if (month === 1 && days < 0) {
        days = parseInt(((new Date().getTime() - pDate.getTime()) / 1000 / 60 / 60 / 24));
        weeks = parseInt(days / 7);
        if (weeks > 0) {
            return getUnit(weeks, "week");
        }
        return getUnit(days, "day");
    } else if (month > 0) {
        return getUnit(month, "month");
    } else if (weeks > 0) {
        return getUnit(weeks, "week");
    } else if (days === 1 && hours < 0) {
        return getUnit(24 + hours, "hour");
    } else if (days > 0) {
        return getUnit(days, "day");
    } else if (hours === 1 && minutes < 0) {
        return getUnit(60 + minutes, "minute");
    } else if (hours > 0) {
        return getUnit(hours, "hour");
    } else if (minutes === 1 && seconds < 0) {
        return getUnit(60 + seconds, "second");
    } else if (minutes > 0) {
        return getUnit(minutes, "minute");
    } else {
        return getUnit(seconds, " second");
    }
};
