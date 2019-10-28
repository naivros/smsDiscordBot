"use strict";
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
//                           Imports                           //
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//

const Discord = require('discord.js');
const notifier = require('mail-notifier');
const MailParser = require('mailparser').MailParser;
const fs = require('fs')
var os = require('os');
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
//                    Authentication Files                     //
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//

    /*
        This can be inline; however, for security purposes it's not in the public examples.
        External File {config.json} contents are below:

        {
            "user" : "discordUsername",
            "to": "Email that Receives all Discord Msgs (or phonenumber@vtext.com)",
            "from":"Passthrough Email (POP and IMAP enabled... (Recommneded GMAIL account))",
            "pass":"password plain-text (password for `from` email.)",
            "token":"Discord Token..."
        }
    */

let auth = JSON.parse(fs.readFileSync('config.json'))

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
//                      Gmail-Send Config                      //
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//

var send = require('gmail-send')({
  user: auth.from,
  pass: auth.pass,
  to:   auth.to
});

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
//                         On End Config                       //
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//

var onEnd = function (result) {
  if (result.error) {
    console.log(result.error)
    return
  }
  console.log("done")
  console.log(result.latestTime)
}

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
//                    Mail Notifier Config                     //
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//

var imap = {
  username: auth.from,
  password: auth.pass,
  host: "imap.gmail.com",
  port: 993, // imap port
  tls: true,
  tlsOptions: { rejectUnauthorized: false }
};

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
//                  Variable Initialization                    //
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//

var client = new Discord.Client();
let recvMessage = "" // message = received email without a prefix;
let command = "" // message with prefix
let emailPrefix = "!" // Prefix for Commands from Recv Emails
let currChannelID = "xxx" // Discord ChannelID to send MSGs to can be found by typing "\#channelName" in a Discord
let guildId = "xxx"; //GuildID to use.
let channelList = []



//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
//                         Functions                           //
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//

function recvMail(mail){
    if(typeof(mail["text"])!=="undefined"){
        recvMessage = mail["text"]
    }
}
function sendMail(subj, body){
    send({ // Overriding default parameters
      subject: subj,         // Override value set as default
      text: body
    }, function (err, res) {
      console.log('* [sendmail]: err:', err, '; res:', res);
    });
}

notifier(imap).on('mail', mail =>recvMail(mail)).start();

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
//                     Discord Functions                       //
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//


client.on("ready", function(){ // Discord.client is ready
    //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
    //    Constant Loop Listening for New Mail from MailNotifier   //
    //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
    function check() {

        setTimeout(() => {
            if(recvMessage !== ""){
                if(recvMessage.startsWith(emailPrefix)){ //determines whether it's a command or plain-text
                    let command = recvMessage.replace("\n","")
                    command = command.substr(emailPrefix.length).split(" ")
                    console.log(command)
                    switch (command[0].toLowerCase()) { //Parse command from Email => retrieve info from the Discord Server, and Email a Response
                        case "dir":
                            let i=0;
                            let message="\n";
                            client.guilds.get(guildId).channels.forEach(function (value, key, mapObj) {
                                if(client.channels.get(key + "").type == "text"){
                                    channelList.push({name: client.channels.get(key + "").name, id: client.channels.get(key + "").id})
                                    console.log(channelList)
                                    message = message + "[" + i + "]" + client.channels.get(key + "").name+"\n"
                                    i++;
                                }
                            });
                            sendMail("Command\n", message)
                        break;
                        case "c":
                            if(typeof(command[1])!=="undefined"){
                              if(typeof(channelList[command[1]]!=="undefined")){
                                  currChannelID = channelList[command[1]]["id"]
                                  sendMail("Command", "You have been moved into: " + channelList[command[1]]["name"]);
                              }
                            }

                        break;
                        default:
                            console.log("Undefined Command")
                        break;
                    }
                    recvMessage = ""
                }else{
                client.channels.get(currChannelID).send(auth.user + " >> " + recvMessage)
                recvMessage = ""

            }
            }
            check();
        }, 50)
    }
    let message =  os.EOL + "";
    let i = 0
    client.guilds.get(guildId).channels.forEach(function (value, key, mapObj) {
                                if(client.channels.get(key + "").type == "text"){
                                    channelList.push({name: client.channels.get(key + "").name, id: client.channels.get(key + "").id})
                                    console.log(channelList)
                                    message = message + "[" + i + "]" + client.channels.get(key + "").name+ os.EOL
                                    i++;
                                }
                            });
check();
    //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
    //                      Discord Commands                       //
    //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//

})

client.on("message", function(message) { //Discord.client received a message
    if (message.author.equals(client.user)){ //ignore msgs sent by bot
        return;
    }
    sendMail("<" + message.channel.name + "> [" + message.author.username +"]", " << " + message.content);
});
client.login(auth.token);
