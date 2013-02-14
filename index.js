var twitter = require('twit');
var markov = require('markov');
var _ = require('underscore');
var events = require('events');

/* oauth: Twitter API auth tokens, format described at https://github.com/ttezel/twit#readme
 * users: array of usernames that should take part in the conversation
 * order: order of the markov chain
 * messagecount: length of conversation
 * callback: Runs when complete, gets array of objects containing "user" and "tweet"
 */

module.exports = function(oauth, users, order, messagecount, callback)
{
    //Create EventEmitter
    var emitter = new events.EventEmitter();

    //Defaults
    if(!order) order = 2;  //May lower this default if it causes problems w/ Twitter's message length
    if(!messagecount) messagecount = users.length * 5; //Default five messages per user

    //Init Twitter API
    var tapi = new twitter(oauth);

    //Array of seeded chains
    var chains = [];
    var messages = [];
    var seedcount = 0;

    var addTweetWord = function(tweet, word)
    {
        if(tweet.length + word.length + 1 > 140)
        {
            return false;
        }
        else if(tweet.length === 0)
            return word;
        else
            return tweet + " " + word;
    };

    var constructTweet = function(chain, respondee, prepend)
    {
        //Pick our starting word
        var start;
        if(respondee)
        {
            start = chain.search(respondee);
        }
        if(!start)
        {
            start = chain.pick();
        }

        //Generate words from start word
        var words = chain.forward(start);

        //Keep adding words to tweet until we run out of characters
        var tweet;
        var newTweet = prepend;

        //Note that we need to check for newTweet false, not falsiness
        for(var i = 0; newTweet !== false && i < words.length; i++)
        {
            tweet = newTweet;
            newTweet = addTweetWord(tweet, words[i]);
        }
        return tweet;
    };

    emitter.on("seed", function(){
        //Are all the chains seeded?
        if(++seedcount == users.length)
        {
            var lastMessage = "";
            //Generate messages
            for(var i = 0; i < messagecount; i++)
            {
                //Create prepend to emulate @ reply structure
                var prepend = "";
                for(var j = 0; j < i && j < users.length; j++)
                {
                    //Make sure it's not the current user
                    if(j != i % users.length)
                    {
                        prepend += "@" + users[j] + " ";
                    }
                }
                prepend = prepend.replace(/\s*$/,"");

                //Generate tweet
                if(i > 0)
                    messages.push({user: users[i % users.length], tweet: constructTweet(chains[i % users.length], messages[i-1].tweet, prepend)});
                else
                    messages.push({user: users[0], tweet: constructTweet(chains[i % users.length], null, prepend)});

            }

            //Return messages through callback
            callback(messages);
        }
    });

    //Get latest tweets for each user and use them to seed markov chains
    _.each(users, function(user, userindex){

        tapi.get('statuses/user_timeline', { screen_name: user, count: 200, trim_user: true }, function(err, reply){
            if(err)
            {
                callback(null);
            }
            var tweets = "";

            _.each(reply, function(tweet){
                tweets += tweet.text.replace(/@\w*/g, "").replace(/RT:?/g, "").replace(/https?:[\w\/]*/g, "") + "\n";
            });

            var userchain = markov(order);

            userchain.seed(tweets, function(){
                chains[userindex] = userchain;
                emitter.emit("seed");
            });
        });

    });

};