'use strict';

require('chai').should();
var path = require('path');

var service = require(path.join(__dirname, '..', 'mailgun-integration-service.js'))();

describe('Mailgun integration service', function () {
    context('Messages sending', function () {
        it.skip('Integral: should successfully send real email to me', function (done) {
            service.sendMessage({
                message: {
                    from: 'user@****.mailgun.com',
                    to: 'me@gmail.com',
                    subject: 'Hello from allcountjs!',
                    text: 'This is test! :)'
                },
                key: '***',
                domain: '****'
            }).then(function (res) {
                console.log('Success: %s', JSON.stringify(res));
                done();
            }).fail(function (err) {
                console.log('Error: %s', err.stack.toString());
                done();
            });
        });
    });
});