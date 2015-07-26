var moment = require('moment');

exports.format = function (date) {
    return date.toString();
};

exports.now = function() {
    return new Date();
};

exports.nowDate = function () {
    var now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
};

exports.moment = moment;