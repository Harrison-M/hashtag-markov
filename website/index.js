var express = require('express');
var hmarkov = require('../index.js');
var config = require('./config.js');
var _ = require('underscore');

var app = express();

//app.use(express.static(__dirname + '/public'));

app.get('/', function(req, res){
    if(req.query.names){
        var names = req.query.names.split(',');
        if(names.length < 2)
        {
            res.render('index.jade', {conversation: "Please include 2 or more users", names: req.query.names, order: req.query.order});
            return;
        }
        var order = parseInt(req.query.order, 10);
        if(!order)
            order = 2;
        if(order < 1)
        {
            res.render('index.jade', {conversation: "Please include 2 or more users", names: req.query.names, order: req.query.order});
            return;
        }
        hmarkov(config, names, order, names.length * 5, function(messages){
            var result = "";
            if(!messages)
            {
                res.render('index.jade',{conversation: "Generation failed, please check that all usernames are valid and try again later.", names: req.query.names, order: req.query.order});
                return;
            }

            _.each(messages, function(message){
                result += "<p>";
                result += "<strong>@" + message.user + ": </strong>";
                result += message.tweet;
                result += "</p>\n";
            });

            res.render('index.jade', {conversation: result, names: req.query.names, order: req.query.order});
        });
    }
    else
    {
        res.render('index.jade',{conversation: "", names: "", order: 1});
    }
});

var port = process.env.PORT || 3000;
app.listen(port);