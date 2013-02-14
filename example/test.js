var hmarkov = require('../index.js');
var creds = require('./config.js');

hmarkov(creds, ['iamaboutus', '________maaaaax', 'afamiglietti'], 1, 9, function(messages){
    console.log(messages);
});