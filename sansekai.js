const { BufferJSON, WA_DEFAULT_EPHEMERAL, generateWAMessageFromContent, proto, generateWAMessageContent, generateWAMessage, prepareWAMessageMedia, areJidsSameUser, getContentType } = require("@whiskeysockets/baileys");
const fs = require("fs");
const util = require("util");
const chalk = require("chalk");
const { GoogleGenerativeAI } = require('@google/generative-ai');
let setting = require("./key.json");

// Initialize Gemini AI with the API key
const genAI = new GoogleGenerativeAI(setting.keygemini);

module.exports = sansekai = async (client, m, chatUpdate) => {
  try {
    // Extract message body depending on its type
    var body = m.mtype === "conversation" ? m.message.conversation :
           m.mtype == "imageMessage" ? m.message.imageMessage.caption :
           m.mtype == "videoMessage" ? m.message.videoMessage.caption :
           m.mtype == "extendedTextMessage" ? m.message.extendedTextMessage.text :
           m.mtype == "buttonsResponseMessage" ? m.message.buttonsResponseMessage.selectedButtonId :
           m.mtype == "listResponseMessage" ? m.message.listResponseMessage.singleSelectReply.selectedRowId :
           m.mtype == "templateButtonReplyMessage" ? m.message.templateButtonReplyMessage.selectedId :
           m.mtype === "messageContextInfo" ? m.message.buttonsResponseMessage?.selectedButtonId || 
           m.message.listResponseMessage?.singleSelectReply.selectedRowId || m.text :
           "";
    if (m.mtype === "viewOnceMessageV2") return;
    var budy = typeof m.text == "string" ? m.text : "";

    var prefix = /^[\\/!#.]/gi.test(body) ? body.match(/^[\\/!#.]/gi) : "/";
    const isCmd2 = body.startsWith(prefix);
    const command = body.replace(prefix, "").trim().split(/ +/).shift().toLowerCase();
    const args = body.trim().split(/ +/).slice(1);
    const pushname = m.pushName || "No Name";
    const botNumber = await client.decodeJid(client.user.id);
    const itsMe = m.sender == botNumber;  // Check if the sender is the bot itself
    let text = (q = args.join(" "));

    const from = m.chat;
    const reply = m.reply;
    const sender = m.sender;
    const mek = chatUpdate.messages[0];

    const color = (text, color) => {
      return !color ? chalk.green(text) : chalk.keyword(color)(text);
    };

    // Group
    const groupMetadata = m.isGroup ? await client.groupMetadata(m.chat).catch((e) => {}) : "";
    const groupName = m.isGroup ? groupMetadata.subject : "";

    // Push Message To Console
    let argsLog = budy.length > 30 ? `${q.substring(0, 30)}...` : budy;

    if (isCmd2 && !m.isGroup) {
      console.log(chalk.black(chalk.bgWhite("[ LOGS ]")), color(argsLog, "turquoise"), chalk.magenta("From"), chalk.green(pushname), chalk.yellow(`[ ${m.sender.replace("@s.whatsapp.net", "")} ]`));
    } else if (isCmd2 && m.isGroup) {
      console.log(
        chalk.black(chalk.bgWhite("[ LOGS ]")),
        color(argsLog, "turquoise"),
        chalk.magenta("From"),
        chalk.green(pushname),
        chalk.yellow(`[ ${m.sender.replace("@s.whatsapp.net", "")} ]`),
        chalk.blueBright("IN"),
        chalk.green(groupName)
      );
    }

    // Prevent the bot from responding to its own messages
    if (itsMe) return;

    if (isCmd2) {
      switch (command) {
        case "help": case "menu": case "start": case "info":
          m.reply(`*Whatsapp Bot Gemini AI*
            
*(Gemini AI Chat)*  
Cmd: ${prefix}ai  
Ask anything to AI.  

*(Source Code Bot)*  
Cmd: ${prefix}sc  
Shows the source code used in this bot.`);
          break;

        // Chat AI with Gemini
        case "ai": case "gemini": case "ask":
          try {
            if (setting.keygemini === "ISI_APIKEY_GEMINI_DISINI") {
              return reply("API key is missing. Please add the Gemini API key in the key.json file.");
            }
            if (!text) return reply(`Chat with AI.\n\nExample:\n${prefix}${command} What is a recession?`);

            // Set up the model and initiate chat
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
            const chat = model.startChat({
              history: [
                {
                  role: "user",
                  parts: [{ text: text }],  // User's input
                }
              ]
            });

            // Send the user's message to the Gemini model
            let result = await chat.sendMessage(text);

            // Send back the AI's response
            await m.reply(result.response.text());
          } catch (error) {
            console.error(error);
            m.reply("Sorry, an error occurred: " + error.message);
          }
          break;

        case "sc": case "script": case "scbot":
          m.reply("This bot uses the code from https://github.com/Sansekai/Wa-OpenAI, but now integrated with Google Gemini AI.");
          break;

        default: {
          if (isCmd2 && budy.toLowerCase() != undefined) {
            if (m.chat.endsWith("broadcast")) return;
            if (m.isBaileys) return;
            if (!budy.toLowerCase()) return;
            if (argsLog || (isCmd2 && !m.isGroup)) {
              console.log(chalk.black(chalk.bgRed("[ ERROR ]")), color("command", "turquoise"), color(`${prefix}${command}`, "turquoise"), color("not available", "turquoise"));
            } else if (argsLog || (isCmd2 && m.isGroup)) {
              console.log(chalk.black(chalk.bgRed("[ ERROR ]")), color("command", "turquoise"), color(`${prefix}${command}`, "turquoise"), color("not available", "turquoise"));
            }
          }
        }
      }
    } else {
      // If there's no prefix but there's text, the bot responds using AI
      if (budy) {
        try {
          const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
          const chat = model.startChat({
            history: [
              {
                role: "user",
                parts: [{ text: budy }],  // User's input
              }
            ]
          });

          let result = await chat.sendMessage(budy);
          await m.reply(result.response.text());
        } catch (error) {
          console.error(error);
          m.reply("Sorry, an error occurred: " + error.message);
        }
      }
    }
  } catch (err) {
    m.reply(util.format(err));
  }
};

let file = require.resolve(__filename);
fs.watchFile(file, () => {
  fs.unwatchFile(file);
  console.log(chalk.redBright(`Update ${__filename}`));
  delete require.cache[file];
  require(file);
});
