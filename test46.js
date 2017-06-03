var Discord = require('discord.io');
var request = require("request");
var fs = require("fs");

const channel_timeout = 20000; // how long until a channel will be deleted after inactivity (in ms) (180000 = 3 minutes)
var channel_activity = {};
let channelIndex = [];
let xp = {};
let clanCreation = [];

// Ice Alliance
const server = "301392540723052544";
const owner = "176580265294954507";
const token = "PASTE TOKEN HERE";
const AFKchannel = "317164116072726538";
const VCmodRole = "317558545149329418";
let configurables = {}; // Will be filled in from a file

const confirmationStrings = [
    ["alpha", "brave", "chaffinch", "delta", "engine", "serpent"],
    ["apple", "banana", "cherry", "durian", "eggplant", "gherkin", "zucchini"],
    ["one", "two", "four", "nineteen", "twenty-one", "forty-two", "fifty-five", "seventy-seven"]
];
    

let roleLookup = {};

const roleCreators = ["313474655736299522", "313475563497062411"];

function plural(word, number) {
    var plurals = {
        is: "are", foot: "feet", person: "people", werewolf: "werewolves", wolf: "wolves"
    };
    if (number != 1) {
        if (plurals[word] != undefined) {
            word = plurals[word];
        } else {
            if (word.endsWith("s") || word.endsWith("ch")) {
                word += "es";
            } else {
                word += "s";
            }
        }
    }
    return word;
}

function mentionToID(string) {
    if (typeof(string) == "undefined" || string == "") {
        return undefined;
    } else {
        tmp = string.split(">")[0];
        return tmp.substr(tmp.length-18);
    }
}

function saveConfigurables() {
    fs.writeFile("configurables.txt", JSON.stringify(configurables, null, 4), {encoding: "utf8"});
}

function createIndex() {
    let t = Date.now();
    channelIndex.length = 0;
    let highest = 0;
    for (let c in bot.servers[server].channels) { // Reorder channels PROPERLY
        if (bot.servers[server].channels[c].position > highest) highest = bot.servers[server].channels[c].position;
    }
    console.log("Highest is "+highest);
    for (let i = 0; i <= highest; i++) {
        for (c in bot.servers[server].channels) {
            if (bot.servers[server].channels[c].position == i && bot.servers[server].channels[c].type == "voice") {
                channelIndex.push(bot.servers[server].channels[c]);
            }
        }
    }
    console.log("Indexed in "+(Date.now()-t)+"ms");
}

function sendEmbedMessage(channelID, title, message, type) {
    bot.sendMessage({
        to: channelID,
        embed: {
            color: (type == "error" ? 0xB00000 : 0x00B000),
            fields: [
                {
                    name: title,
                    value: message
                }
            ]
        }
    });
}

function getRoleID(name) {
    for (let r in bot.servers[server].roles) {
        let role = bot.servers[server].roles[r];
        if (role.name == name) return role.id;
    }
    return undefined;
}

function makeStringGreatAgain(string) {
    // Dedicated to Donald Trump, 2017. #covfefe
    return string.toLowerCase().replace(/ /g, "_").replace(/[^a-z]/, "-");
}

function randomResult(array) {
   return array[Math.floor(Math.random()*array.length)];
}

function fixChannelPositions() {
    let t = Date.now();
    let body = [];
    for (let i = 0; i < channelIndex.length; i++) {
        if (channelIndex[i].position != i) {
            body.push({"id": channelIndex[i].id, "position": i});
        }
    }
    let text = JSON.stringify(body);
    request({
        url: "https://discordapp.com/api/guilds/"+server+"/channels",
        headers: {
            "User-Agent": "DiscordBot (https://discordapp.com/, 1.0)",
            "Authorization": "Bot "+token,
            "Content-Type": "application/json"
        },
        method: "PATCH",
        body: text
    }, function(error, response, body) {
        if (error) console.log("Error!");
        console.log("Request accepted");
    });
    console.log("Sorted in "+(Date.now()-t)+"ms");
}

var bot = new Discord.Client({
    token: token,
    autorun: true
});

bot.on('ready', function () {
    let raw = fs.readFileSync("xp.txt", {encoding: "utf8"});
    xp = JSON.parse(raw.slice(9));
    console.log("Loaded XP data");
    console.log('Logged in as %s - %s\n', bot.username, bot.id);
    configurables = JSON.parse(fs.readFileSync("configurables.txt", {encoding: "utf8"}));
    roleLookup = configurables.roleLookup;
    console.log("Loaded configurables");
    createIndex();
    fixChannelPositions();
    setInterval(() => {
        if (bot.servers[server] == undefined) return;
        let t = Date.now();
        let modified = false;
        for (member in bot.servers[server].members) {
            let vcid = bot.servers[server].members[member].voice_channel_id;
            if (vcid != null) {
                if (vcid in channel_activity) {
                    channel_activity[vcid].time = Date.now();
                    if (channel_activity[vcid].members.indexOf(member) == -1) {
                        channel_activity[vcid].members.push(member);
                        bot.editChannelPermissions({channelID: channel_activity[vcid].text, userID: member, allow: [Discord.Permissions.TEXT_READ_MESSAGES]});
                        console.log("Allowed "+bot.users[member].username+" to connect to "+bot.channels[vcid].name);
                    }
                }
                if (vcid != AFKchannel) {
                    if (xp[member] == undefined) {
                        xp[member] = {};
                        xp[member].xp = 0;
                        xp[member].totalxp = 0;
                        xp[member].time = 0;
                        xp[member].level = 1;
                    } else {
                        xp[member].time += 5;
                        let increase = Math.floor(Math.random()*3)+4;
                        xp[member].xp += increase;
                        xp[member].totalxp += increase;
                        if (xp[member].xp > xp[member].level*100) {
                            xp[member].level++;
                            xp[member].xp = 0;
                        }
                    }
                    xp[member].name = bot.users[member].username;
                    if (bot.servers[server].members[member].nick == null) {
                        xp[member].nick = bot.users[member].username;
                    } else {
                        xp[member].nick = bot.servers[server].members[member].nick;
                    }
                    xp[member].roles = bot.servers[server].members[member].roles;
                    xp[member].lastSpoke = Date.now();
                    modified = true;
                }
            }
        }
        if ((Date.now()-t) > 10) {
            console.log("Checked all members ("+(Date.now()-t)+"ms)");
        }
        for (let channelID in channel_activity) {
            if ((Date.now() - channel_activity[channelID].time) > channel_timeout) {
                console.log("Entire list looks like:\n"+JSON.stringify(channel_activity));
                console.log("Deleting channel "+JSON.stringify(bot.channels[channelID]));
                bot.deleteChannel(channel_activity[channelID].text, function() {
                    delete channel_activity[channelID];
                });
                bot.deleteChannel(channelID, function() {
                    console.log("Updated to:\n"+JSON.stringify(channel_activity));
                    createIndex();
                    fixChannelPositions();
                });
            }
        }
        if (modified) fs.writeFile("xp.txt", "let xp = "+JSON.stringify(xp), {encoding: "utf8"}, function() {});
        for (let clan = 0; clan < clanCreation.length; clan++) {
            if ((Date.now() - clanCreation[clan].timeout) > 120000) {
                delete clanCreation[clan];
            }
        }
    }, 5000);
});

bot.on('message', function (user, userID, channelID, message, event) {
    var serverID = server;
    var words = message.split(" ");
    // create testing-1 text
    // create Music voice
    // create abcd text
    // create fff voice
    if (words[0] == "/recruit") {
        // Check for a mention
        let target;
        if (event.d.mentions.length != 0) target = event.d.mentions[0].id;
        let roleID = getRoleID(message.split(" ").slice(2).join(" "));
        if (target == undefined) {
            bot.sendMessage({to: channelID, message: "You must @mention a user to modify the roles of. Try `/recruit @mention Role Name`."});
            return;
        }
        // Check that Member role was typed
        if (configurables.roleLookup[roleID] == undefined) {
            bot.sendMessage({to: channelID, message: "That role doesn't exist or can't be assigned. Make sure you spelled it *exactly right*."});
            return;
        }
        // Check for the required role
        let allowed = false;
        for (let r of bot.servers[server].members[userID].roles) {
            if (configurables.recruitmentRoles.indexOf(r) != -1) allowed = true;
            if (configurables.roleLookup[roleID].header == r) allowed = true;
        }
        if (!allowed) {
            bot.sendMessage({to: channelID, message: "You don't have the required permissions to give roles."});
            return;
        }
        // Check for Needs Receptionist
        if (bot.servers[server].members[target].roles.indexOf("313807066995097612") == -1) {
            bot.sendMessage({to: channelID, message: "The target user doesn't have the \"Needs Receptionist\" role."});
            return;
        }
        bot.addToRole({serverID: server, roleID: roleID, userID: target}, function() {
            console.log("Added role");
            sendEmbedMessage(channelID, "Assigned role successfully!", bot.users[target].username+" was added to the role "+bot.servers[server].roles[roleID].name+".", "success");
        });
    } else if (words[0] == "/assignstaff" || words[0] == "/unassignstaff") {
        // Check for a mention
        let target;
        if (event.d.mentions.length != 0) target = event.d.mentions[0].id;
        if (target == undefined) {
            bot.sendMessage({to: channelID, message: "You must @mention a user to modify the roles of. Try `/assignstaff @mention Role Name`."});
            return;
        }
        // Check to make sure the required rank is held
        let roleID = getRoleID(message.split(" ").slice(2).join(" "));
        let targetImportance;
        if (configurables.staffHierarchy[roleID] == undefined) {
            bot.sendMessage({to: channelID, message: "The role you named isn't on my list of assignable roles."});
            return;
        } else {
            targetImportance = configurables.staffHierarchy[roleID].position;
        }
        let userImportance;
        for (let r of bot.servers[server].members[userID].roles) {
            if (configurables.staffHierarchy[r] != undefined) {
                if (userImportance == undefined || configurables.staffHierarchy[r].position < userImportance) {
                    userImportance = configurables.staffHierarchy[r].position;
                }
            }
        }
        if (targetImportance < userImportance || userImportance == undefined) {
            bot.sendMessage({to: channelID, message: "You can't assign or remove a role which is more important than your current role."});
            return;
        }
        if (words[0] == "/assignstaff") {
            bot.addToRole({serverID: server, roleID: roleID, userID: target}, function() {
                sendEmbedMessage(channelID, "Assigned role successfully!", bot.users[target].username+" was added to the role "+bot.servers[server].roles[roleID].name+".", "success");
            });
        } else {
            bot.removeFromRole({serverID: server, roleID: roleID, userID: target}, function() {
                sendEmbedMessage(channelID, "Removed role successfully!", bot.users[target].username+" was removed from the role "+bot.servers[server].roles[roleID].name+".", "success");
            });
        }
    } else if (words[0] == "/assign" || words[0] == "/unassign") {
        // Check for a mention
        let target;
        if (event.d.mentions.length != 0) target = event.d.mentions[0].id;
        if (target == undefined) {
            bot.sendMessage({to: channelID, message: "You must @mention a user to modify the roles of. Try `/assign @mention Role Name`."});
            return;
        }
        // Check for a common clan
        let commonClan;
        for (let r of bot.servers[server].members[userID].roles) {
            if (roleLookup[r] != undefined) {
                commonClan = r;
            }
        }
        if (bot.servers[server].members[target].roles.indexOf(commonClan) == -1) {
            bot.sendMessage({to: channelID, message: "You must be in the same clan as the @mentioned user."});
            return;
        }
        // Check to make sure the required rank is held
        let roleID = getRoleID(message.split(" ").slice(2).join(" "));
        let targetImportance;
        if (configurables.roleHierarchy[roleID] == undefined) {
            bot.sendMessage({to: channelID, message: "The role you named isn't on my list of assignable roles."});
            return;
        } else {
            targetImportance = configurables.roleHierarchy[roleID].position;
        }
        let userImportance;
        for (let r of bot.servers[server].members[userID].roles) {
            if (configurables.roleHierarchy[r] != undefined) {
                if (userImportance == undefined || configurables.roleHierarchy[r].position < userImportance) {
                    userImportance = configurables.roleHierarchy[r].position;
                }
            }
        }
        if (targetImportance < userImportance || userImportance == undefined) {
            bot.sendMessage({to: channelID, message: "You can't assign or remove a role which is more important than your current role."});
            return;
        }
        if (words[0] == "/assign") {
            bot.addToRole({serverID: server, roleID: roleID, userID: target}, function() {
                sendEmbedMessage(channelID, "Assigned role successfully!", bot.users[target].username+" was added to the role "+bot.servers[server].roles[roleID].name+".", "success");
            });
            if (targetImportance <= 5) bot.addToRole({serverID: server, roleID: roleLookup[commonClan].header, userID: target});
        } else {
            bot.removeFromRole({serverID: server, roleID: roleID, userID: target}, function() {
                sendEmbedMessage(channelID, "Removed role successfully!", bot.users[target].username+" was removed from the role "+bot.servers[server].roles[roleID].name+".", "success");
            });
        }
    } else if (words[0] == "/clan") {
        if (message.split(" ").length == 3 || event.d.mentions.length == 0) {
            bot.sendMessage({to: channelID, message: "Not enough information provided. Try `/clan @mention SHORT Full Clan Name`. Replace *SHORT* with a short name for the clan, e.g. *Crescent Moon Prime* → *CMP*, and *@mention* with a mention of the new Founding Warlord of the clan."});
            return;
        }
        let allowedRoles = ["312812741448433665", "315270033939103745", "313474655736299522", "313475563497062411"];
        let match = false;
        for (let r of bot.servers[server].members[userID].roles) {
            if (allowedRoles.indexOf(r) != -1) match = true;
        }
        if (!match) {
            bot.sendMessage({to: channelID, message: "You don't have one of the roles required to create a clan."});
            return;
        }
        let full = message.split(" ").slice(3).join(" ");
        let short = makeStringGreatAgain(words[2]);
        let confirm = randomResult(confirmationStrings[0])+" "+randomResult(confirmationStrings[1])+" "+randomResult(confirmationStrings[2]);
        clanCreation.push({userID: userID, confirmation: confirm, shortName: short, fullName: full, owner: event.d.mentions[0].id});
        bot.sendMessage({
            to: channelID,
            embed: {
                color: 0xF07000,
                title: 'Confirm creation of clan "'+full+'" ('+short+')',
                fields: [
                    {
                        name: "Details",
                        value: "**Name:** "+full+"\n**Short name:** "+short+"\n**Owner:** "+event.d.mentions[0].username,
                        inline: true
                    },{
                        name: "Roles",
                        value: full.toUpperCase()+"\n"+full+" Member",
                        inline: true
                    },{
                        name: "­", // Zero-width spaces are used here!!!!
                        value: "­",
                        inline: false
                    },{
                        name: "Text channels",
                        value: short+"_rules\n"+short+"_news\n"+short+"_clan_lobby\n"+short+"_staff_lobby",
                        inline: true
                    },{
                        name: "Voice channels",
                        value: full+"\nPublic Lobby\nMembers Lobby\n(seperator)",
                        inline: true
                    },{
                        name: "Confirm",
                        value: "/confirmclan "+confirm,
                        inline: false
                    }
                ]
            }
        });
    } else if (words[0] == "/confirmclan") {
        let index;
        for (let i of clanCreation) {
            if (i.userID == userID && message.indexOf(i.confirmation) != -1) index = i;
        }
        if (index == undefined) {
            bot.sendMessage({to: channelID, message: "You either typed the confirmation code wrong, the confirmation code expired (2 minutes), or you never issued `/clan`."});
            return;
        }
        bot.sendMessage({to: channelID, message: "Working on it..."});
        bot.createRole(serverID, function(e1, r1) { // Create HEADER role
            if (e1) { // Log error
                console.log(e1+" :: "+r1);
            } else {
                bot.editRole({serverID: serverID, roleID: r1.id, name: index.fullName.toUpperCase(), hoist: true, mentionable: true}, function(e2, r2) { // Set up HEADER role
                    if (e2) console.log(e2+" :: "+r2); // Log error
                });
                bot.createRole(serverID, function(e3, r3) { // Create Clan Name Member
                    if (e3) {
                        console.log(e3+" :: "+r3);
                    } else {
                        bot.editRole({serverID: serverID, roleID: r3.id, name: index.fullName+" Member", mentionable: false}, function(e4, r4) { // Edit Clan Name Member
                            if (e4) console.log(e4+" :: "+r4);
                        });
                        // Create text channels
                        bot.createChannel({serverID: serverID, name: index.shortName+"_rules", type: "text"}, function(e5, r5) {
                            if (e5) {
                                console.log(e5+" :: "+r5);
                            } else {
                                bot.editChannelPermissions({channelID: r5.id, roleID: server, deny: [Discord.Permissions.TEXT_READ_MESSAGES, Discord.Permissions.TEXT_SEND_MESSAGES]});
                                bot.editChannelPermissions({channelID: r5.id, roleID: r3.id, allow: [Discord.Permissions.TEXT_READ_MESSAGES]});
                                bot.editChannelPermissions({channelID: r5.id, roleID: r1.id, allow: [Discord.Permissions.TEXT_READ_MESSAGES, Discord.Permissions.TEXT_SEND_MESSAGES]});
                                bot.createChannel({serverID: serverID, name: index.shortName+"_news", type: "text"}, function(e6, r6) {
                                    if (e6) {
                                        console.log(e6+" :: "+r6);
                                    } else {
                                        bot.editChannelPermissions({channelID: r6.id, roleID: server, deny: [Discord.Permissions.TEXT_READ_MESSAGES, Discord.Permissions.TEXT_SEND_MESSAGES]});
                                        bot.editChannelPermissions({channelID: r6.id, roleID: r3.id, allow: [Discord.Permissions.TEXT_READ_MESSAGES]});
                                        bot.editChannelPermissions({channelID: r6.id, roleID: r1.id, allow: [Discord.Permissions.TEXT_READ_MESSAGES, Discord.Permissions.TEXT_SEND_MESSAGES]});
                                        bot.createChannel({serverID: serverID, name: index.shortName+"_clan_lobby", type: "text"}, function(e7, r7) {
                                            if (e7) {
                                                console.log(e7+" :: "+r7);
                                            } else {
                                                bot.editChannelPermissions({channelID: r7.id, roleID: server, deny: [Discord.Permissions.TEXT_READ_MESSAGES]});
                                                bot.editChannelPermissions({channelID: r7.id, roleID: r3.id, allow: [Discord.Permissions.TEXT_READ_MESSAGES]});
                                                bot.createChannel({serverID: serverID, name: index.shortName+"_staff_lobby", type: "text"}, function (e8, r8) {
                                                    if (e8) {
                                                        console.log(e8+" :: "+r8);
                                                    } else {
                                                        bot.editChannelPermissions({channelID: r8.id, roleID: server, deny: [Discord.Permissions.TEXT_READ_MESSAGES]});
                                                        bot.editChannelPermissions({channelID: r8.id, roleID: r1.id, allow: [Discord.Permissions.TEXT_READ_MESSAGES]});
                                                        bot.createChannel({serverID: serverID, name: index.fullName, type: "voice"}, function(e9, r9) {
                                                            if (e9) {
                                                                console.log(e9+" :: "+r9);
                                                            } else {
                                                                bot.editChannelPermissions({channelID: r9.id, roleID: server, deny: [Discord.Permissions.VOICE_CONNECT]});
                                                                bot.editChannelPermissions({channelID: r9.id, roleID: r1.id, allow: [Discord.Permissions.VOICE_CONNECT]});
                                                                bot.createChannel({serverID: serverID, name: "---Public Lobby", type: "voice"}, function(e10, r10) {
                                                                    if (e10) {
                                                                        console.log(e10+" :: "+r10);
                                                                    } else {
                                                                        bot.createChannel({serverID: serverID, name: "---Members Lobby", type: "voice"}, function(e11, r11) {
                                                                            if (e11) {
                                                                                console.log(e11+" :: "+r11);
                                                                            } else {
                                                                                bot.editChannelPermissions({channelID: r11.id, roleID: server, deny: [Discord.Permissions.VOICE_CONNECT]});
                                                                                bot.editChannelPermissions({channelID: r11.id, roleID: r3.id, allow: [Discord.Permissions.VOICE_CONNECT]});
                                                                                bot.createChannel({serverID: serverID, name: "____________________", type: "voice"}, function(e12, r12) {
                                                                                    if (e12) {
                                                                                        console.log(e12+" :: "+r12);
                                                                                    } else {
                                                                                        bot.editChannelPermissions({channelID: r12.id, roleID: server, deny: [Discord.Permissions.VOICE_CONNECT]});
                                                                                        bot.addToRole({serverID: serverID, userID: index.owner, roleID: r1.id});
                                                                                        bot.addToRole({serverID: serverID, userID: index.owner, roleID: "319377492483899393"});
                                                                                        configurables.roleLookup[r3.id] = {public: r10.id, members: r11.id, header: r1.id};
                                                                                        saveConfigurables();
                                                                                        bot.sendMessage({to: channelID, message: "I did my best, and I hope it was enough. Enjoy your new clan."});
                                                                                        // Remove index from clanCreation
                                                                                    }
                                                                                });
                                                                            }
                                                                        });
                                                                    }
                                                                });
                                                            }
                                                        });
                                                    }
                                                });
                                            }
                                        });
                                    }
                                });
                            }
                        });
                    }
                });
            }
        });
        // :weary:
    } else if (words[0] == "/wipexp") {
        if (bot.servers[server].members[userID].roles.indexOf("315270033939103745") != -1) {
            delete xp[mentionToID(words[1])];
        }
    } else if (words[0] == "/invite") {
        let vcid = bot.servers[server].members[userID].voice_channel_id;
        if (event.d.mentions.length == 0) {
            sendEmbedMessage(channelID, "No one was invited!", "Add some @mentions after /invite.", "error");
        } else if (vcid == null) {
            sendEmbedMessage(channelID, plural("User", event.d.mentions.length)+" could not be invited!", "Connect to a voice channel, then issue the command again.", "error");
        } else if (channel_activity[vcid] == undefined) {
            sendEmbedMessage(channelID, plural("User", event.d.mentions.length)+" could not be invited!", "You can only invite users to private rooms.", "error");
        } else {
            for (let m of event.d.mentions) {
                bot.editChannelPermissions({channelID: vcid, userID: m.id, allow: [Discord.Permissions.VOICE_CONNECT]});
                bot.editChannelPermissions({channelID: channel_activity[vcid].text, userID: m.id, allow: [Discord.Permissions.TEXT_READ_MESSAGES]});
                channel_activity[vcid].members.push(m.id);
            }
            sendEmbedMessage(channelID, "Permissions updated", "Allowed **"+event.d.mentions.length+"** more "+plural("person", event.d.mentions.length)+" to connect to **"+bot.channels[vcid].name+"** (and linked text channel)", "success");
        }
    } else if (words[0] == "/updatexp") {
        for (let member in xp) {
            xp[member].name = bot.users[member].username;
            if (bot.servers[server].members[member].nick == null) {
                xp[member].nick = bot.users[member].username;
            } else {
                xp[member].nick = bot.servers[server].members[member].nick;
            }
            xp[member].roles = bot.servers[server].members[member].roles;
            xp[member].totalxp = xp[member].xp + (xp[member].level-1)*100;
        }
    } else if (words[0] == "/rank") {
        let mention = event.d.mentions[0];
        if (mention != undefined) {
            mention = mention.id;
            if (bot.users[mention] != undefined) {
                userID = mention;
                user = bot.users[mention].username;
            }
        }
        if (xp[userID] == undefined) {
            sendEmbedMessage(channelID, "No data exists", "Spend time in a voice channel to gain experience!", "error");
        } else {
            let timeSpent = new Date(xp[userID].time*1000);
            bot.sendMessage({
                to: channelID,
                embed: {
                    color: 0x402590,
                    author: {
                        name: "Voice chat rank of "+user,
                        icon_url: "https://cdn.discordapp.com/avatars/"+userID+"/"+bot.users[userID].avatar+".png"
                    },
                    fields: [
                        {
                            name: "XP earned",
                            value: "**"+xp[userID].xp+"** points\nNext level at **"+xp[userID].level*100+"** points",
                            inline: true
                        },{
                            name: "Level reached",
                            value: "Level **"+xp[userID].level+"**",
                            inline: true
                        },{
                            name: "Time spent",
                            value: "**"+timeSpent.getUTCHours()+"** hours, **"+timeSpent.getUTCMinutes()+"** minutes, **"+timeSpent.getUTCSeconds()+"** seconds",
                            inline: true
                        }
                    ]
                }
            });
        }
    } else if (message.split(";")[0] == "/eval") {
        if (userID == owner) {
            bot.sendMessage({to: channelID, message: eval(message.split(";")[1])});
        }
    } else if (words[0] == "/roleid") {
        bot.sendMessage({to: channelID, message: getRoleID(message.slice(message.indexOf(" ")+1))});
    } else if (words[0] == "/check") {
        let output = "";
        for (let c in bot.servers[server].channels) {
            if (bot.servers[server].channels[c].type == "voice") output += bot.servers[server].channels[c].name+": "+bot.servers[server].channels[c].position+"\n";
        }
        if (output.length > 1950) output = output.split(0, 1950);
        bot.sendMessage({to: channelID, message: output});
    } else if (words[0].toLowerCase() == "/create") {
        message = message.replace(/member /, "members ");
        if (message == "/create") {
            bot.sendMessage({to: channelID, message: "Not enough information provided. Try `/create (public|members|private) CHANNEL NAME`."});
        } else if (words[1] != "public" && words[1] != "members" && words[1] != "private") {
            bot.sendMessage({to: channelID, message: "Incorrect channel type - must be `public`, `members` or `private`. Try `/create (public|members) CHANNEL NAME`."});
        } else if (words.length < 3) {
            bot.sendMessage({to: channelID, message: "Not enough information provided. Try `/create (public|members|private) CHANNEL NAME`."});
        } else {
            let position;
            let marker;
            let roleP;
            let roles = bot.servers[server].members[userID].roles;
            for (let r of roles) {
                if (roleLookup[r] != undefined) {
                    roleP = r;
                    if (words[1] == "private") {
                        marker = roleLookup[r]["members"];
                    } else {
                        marker = roleLookup[r][words[1]];
                    }
                }
            }
            for (let i of channelIndex) {
                if (i.id == marker) position = i.position;
            }
            if (position != undefined) {
                bot.createChannel({
                    serverID: server,
                    name: message.split("<")[0].split(" ").slice(2).join(" "),
                    type: "voice"
                }, (err, res) => {
                    if (err) {
                        bot.sendMessage({to: channelID, message: "Failed to create channel. Logged to console."});
                        console.log(err);
                        return;
                    } else {
                        channelIndex.splice(position+1, 0, bot.channels[res.id]);
                        channel_activity[res.id] = {time: Date.now(), members: [userID]};
                        bot.createChannel({
                            serverID: server,
                            name: makeStringGreatAgain(message.split("<")[0].split(" ").slice(2).join(" ")),
                            type: "text"
                        }, function(e, r) {
                            if (e) {
                                bot.sendMessage({to: channelID, message: "Couldn't create a text channel."});
                            } else {
                                channel_activity[res.id].text = r.id;
                                bot.editChannelPermissions({channelID: r.id, roleID: server, deny: [Discord.Permissions.TEXT_READ_MESSAGES]});
                                bot.editChannelPermissions({channelID: r.id, userID: userID, allow: [Discord.Permissions.TEXT_READ_MESSAGES]});
                                bot.editChannelPermissions({channelID: r.id, roleID: VCmodRole, allow: [Discord.Permissions.TEXT_READ_MESSAGES]});
                                bot.sendMessage({to: r.id, message: "REMEMBER: No one else can see this channel until you invite them.\nUse `/invite @mention`."});
                                for (let m of event.d.mentions) {
                                    bot.editChannelPermissions({channelID: r.id, userID: m.id, allow: [Discord.Permissions.TEXT_READ_MESSAGES]});
                                    channel_activity[r.id].members.push(m.id);
                                }
                            }
                        });
                        console.log("Created channel "+bot.channels[res.id].name+" at "+Date.now()+"\nEntire list looks like:\n"+JSON.stringify(channel_activity));
                        fixChannelPositions();
                        if (words[1] == "members") {
                            bot.editChannelPermissions({channelID: res.id, roleID: server, deny: [Discord.Permissions.VOICE_CONNECT]});
                            bot.editChannelPermissions({channelID: res.id, roleID: roleP, allow: [Discord.Permissions.VOICE_CONNECT]});
                            bot.editChannelPermissions({channelID: res.id, roleID: VCmodRole, allow: [Discord.Permissions.VOICE_CONNECT]});
                        } else if (words[1] == "private") {
                            console.log(event.d.mentions);
                            bot.editChannelPermissions({channelID: res.id, roleID: server, deny: [Discord.Permissions.VOICE_CONNECT]});
                            bot.editChannelPermissions({channelID: res.id, userID: userID, allow: [Discord.Permissions.VOICE_CONNECT]});
                            bot.editChannelPermissions({channelID: res.id, roleID: VCmodRole, allow: [Discord.Permissions.VOICE_CONNECT]});
                            for (let m of event.d.mentions) {
                                bot.editChannelPermissions({channelID: res.id, userID: m.id, allow: [Discord.Permissions.VOICE_CONNECT]});
                            }
                        }
                        sendEmbedMessage(channelID, "A new channel has been created!", "**"+user+"** made a new channel: **"+res.name+"**", "success");
                    }
                });
            } else {
                sendEmbedMessage(channelID, "Channel could not be created!", "**"+user+"** doesn't have a clan role.", "error");
            }
        }
    } else if (words[0].toLowerCase() == "/role") {
        if (words.length < 2) {
            bot.sendMessage({to: channelID, message: "Missing name for new role. Try `/role ROLE NAME`."});
        } else {
            let match = false;
            for (let r of roleCreators) {
                if (bot.servers[server].members[userID].roles.indexOf(r) != -1) match = true;
            }
            if (!match) {
                sendEmbedMessage(channelID, "Role could not be created!", "**"+user+"** doesn't have the required permissions.", "error");
            } else {
                var newrolename = message.slice(message.indexOf(" ")+1);
                bot.createRole(serverID, (err, res) => {
                    if (err) throw err;
                    bot.editRole({
                        serverID: serverID,
                        roleID: res.id,
                        name: newrolename,
                        mentionable: true
                    }, function (errr, ress) {
                        if (errr) throw errr;
                        sendEmbedMessage(channelID, "A new role has been created!", "**"+user+"** made a new role.", "success");
                    });
                });
            }
        }
    }
    if (!bot.users[userID].bot) {
        if (xp[userID] == undefined) {
            xp[userID] = {};
            xp[userID].xp = 0;
            xp[userID].totalxp = 0;
            xp[userID].time = 0;
            xp[userID].level = 1;
        } else {
            let increase = Math.floor(Math.random()*2)+1;
            xp[userID].xp += increase;
            xp[userID].totalxp += increase;
            if (xp[userID].xp > xp[userID].level*100) {
                xp[userID].level++;
                xp[userID].xp = 0;
            }
        }
        xp[userID].name = bot.users[userID].username;
        if (bot.servers[server].members[userID].nick == null) {
            xp[userID].nick = bot.users[userID].username;
        } else {
            xp[userID].nick = bot.servers[server].members[userID].nick;
        }
        xp[userID].roles = bot.servers[server].members[userID].roles;
        modified = true;
    }
});

bot.on("disconnect", function () {
    console.log("Bot disconnected, reconnecting...");
    bot.connect();
});