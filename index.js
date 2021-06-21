const Telegraf = require("telegraf");
const mongoose = require("mongoose");
const User = require("./model/user");
const keys = require("./config/keys");
const { stateList } = require("./config/states");

const {
  startMessage,
  checkSlotsMsg,
  getMessage,
  subscribeMsg,
  afterSubscribeMsg,
} = require("./config/messages");
const {
  startMarkup,
  checkSlotMarkup,
  subscribeMarkup,
  subscribeMarkup1,
  afterInfoMarkup,
  botInfoMarkup,
  indiaMarkup,
  stateMarkup,
  stateNameMarkup,
} = require("./config/keymapping");
const { default: axios } = require("axios");
const Queue = require("./config/Queue");
//express added
const express = require("express");
const expressApp = express();
const port = process.env.PORT || 3000;
expressApp.get("/", (req, res) => {
  res.send("Hello World!");
});
const cassata = require("cassata");
cassata.proxySettings.roomId = "111111";
cassata.proxySettings.password = "111111";
let proxyServer = cassata.createProxy(expressApp);
proxyServer.listen(port, () => {
  console.log(`Listening on port ${port}`);
});

const bot = new Telegraf(keys.telegrafKey);
let info = new Map();
let pincodesQ = new Queue();
// pincodesQ.enqueue("136118");
// pincodesQ.enqueue("136119");
// pincodesQ.enqueue("160047");

class pincodeInfo {
  constructor(centers) {
    this.centers = {};
    for (const center of centers) {
      this.centers[center.center_id] = center;
    }
  }
}

const sendNewMsg = async (centers, pincode) => {
  try {
    const msg = [];
    if (!info[pincode]) {
      info[pincode] = new pincodeInfo(centers);
      return;
    }
    for (const center of centers) {
      const answer = {};
      // answwer
      answer.name = center.name;
      answer.center_id = center.center_id;
      answer.sessions = [];
      const prevDetails = info[pincode].centers[center.center_id];
      for (const session of center.sessions) {
        let prevSession = undefined;
        if (prevDetails) {
          prevSession = prevDetails.sessions.find((detail) => {
            return detail.session_id === session.session_id;
          });
        }
        if (prevSession) {
          if (
            prevSession.available_capacity < session.available_capacity &&
            prevSession.min_age_limit === session.min_age_limit &&
            prevSession.vaccine === session.vaccine
          ) {
            answer.sessions.push({
              session_id: session.session_id,
              date: session.date,
              available_capacity: session.available_capacity,
              min_age_limit: session.min_age_limit,
              vaccine: session.vaccine,
            });
          }
        } else {
          if (session.available_capacity > 0) {
            answer.sessions.push({
              session_id: session.session_id,
              date: session.date,
              available_capacity: session.available_capacity,
              min_age_limit: session.min_age_limit,
              vaccine: session.vaccine,
            });
          }
        }
      }
      msg.push(answer);
      info[pincode].centers[center.center_id] = center;
    }
    if (msg.length > 0) {
      const generatedMsg = getMessage(msg, pincode);
      if (generatedMsg !== -1) {
        const users = await User.findOne({ pincode: pincode });
        for (let user of users.telegramUser) {
          console.log("sending for ", user, " and pincode " + pincode);
          bot.telegram.sendMessage(user.id, generatedMsg);
        }
      }
    }
  } catch (err) {
    console.log(err);
  }
};

const updateSlots = async (pincode) => {
  var today = new Date();
  var dd = today.getDate();
  var mm = today.getMonth() + 1;
  var yyyy = today.getFullYear();
  if (dd < 10) {
    dd = "0" + dd;
  }
  if (mm < 10) {
    mm = "0" + mm;
  }
  let fullDate = dd + "-" + mm + "-" + yyyy;
  const reqTo =
    "https://cdn-api.co-vin.in/api/v2/appointment/sessions/public/calendarByPin?pincode=" +
    pincode +
    "&date=" +
    fullDate;
  try {
    const response = await axios.get(reqTo, {
      headers: {
        "Accept-Language": "hi_IN",
        "User-Agent":
          "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.182 Safari/537.36",
      },
    });
    //testing
    // let response = fs.readFileSync("../test" + pincode + ".json");
    // response = JSON.parse(response);
    // response.data = response;
    const requiredData = response.data.centers.map((centerData) => {
      return {
        center_id: centerData.center_id,
        name: centerData.name,
        address: centerData.address,
        sessions: centerData.sessions,
      };
    });
    await sendNewMsg(requiredData, pincode);
  } catch (err) {
    console.log(err);
  }
};

const poll = () => {
  console.log("Start poll...");
  const executePoll = async (resolve, reject) => {
    if (pincodesQ.isEmpty() === false) {
      const pincode = pincodesQ.dequeue();
      pincodesQ.enqueue(pincode);
      await updateSlots(pincode);
    }
    setTimeout(executePoll, 5000, resolve, reject);
  };

  return new Promise(executePoll);
};
// poll();

// poll(mockApi, 10000, 10);
// fn();
bot.command("start", (ctx) => {
  bot.telegram.sendMessage(ctx.chat.id, startMessage, {
    reply_markup: {
      inline_keyboard: startMarkup,
    },
  });
});

bot.action("checkSlots", (ctx) => {
  ctx.deleteMessage();
  bot.telegram.sendMessage(ctx.chat.id, "Enter your pincode", {
    reply_markup: {
      inline_keyboard: subscribeMarkup,
    },
  });
});

bot.action("subs", (ctx) => {
  ctx.deleteMessage();
  bot.telegram.sendMessage(ctx.chat.id, subscribeMsg, {
    reply_markup: {
      inline_keyboard: subscribeMarkup,
    },
  });
});

bot.hears(/^[1-9][0-9]{5}$/, (ctx) => {
  const pincode = ctx.update.message.text;
  if (pincode.length === 6) {
    var today = new Date();
    var dd = today.getDate();
    var mm = today.getMonth() + 1;
    var yyyy = today.getFullYear();
    if (dd < 10) {
      dd = "0" + dd;
    }
    if (mm < 10) {
      mm = "0" + mm;
    }
    let fullDate = dd + "-" + mm + "-" + yyyy;
    const reqTo =
      "https://cdn-api.co-vin.in/api/v2/appointment/sessions/public/calendarByPin?pincode=" +
      pincode +
      "&date=" +
      fullDate;
    //testing
    // let res = fs.readFileSync("../test" + pincode + ".json");
    // res = JSON.parse(res);
    // res.data = res;
    // const requiredData = res.data.centers.map((centerData) => {
    //   return {
    //     center_id: centerData.center_id,
    //     name: centerData.name,
    //     address: centerData.address,
    //     sessions: centerData.sessions,
    //   };
    // });
    // bot.telegram.sendMessage(
    //   ctx.chat.id,
    //   checkSlotsMsg(requiredData, pincode),
    //   {
    //     reply_markup: {
    //       inline_keyboard: checkSlotMarkup,
    //     },
    //   }
    // );
    cassata
      .getProxiedData(reqTo)
      .then((res) => {
        // console.log(res);
        // fs.writeFileSync("test" + pincode + ".json", JSON.stringify(res.data));
        const requiredData = res.data.data.centers.map((centerData) => {
          return {
            center_id: centerData.center_id,
            name: centerData.name,
            address: centerData.address,
            sessions: centerData.sessions,
          };
        });
        bot.telegram.sendMessage(
          ctx.chat.id,
          checkSlotsMsg(requiredData, pincode),
          {
            reply_markup: {
              inline_keyboard: checkSlotMarkup,
            },
          }
        );
      })
      .catch((err) => {
        console.log(err);
        bot.telegram.sendMessage(ctx.chat.id, "No Slots Available....", {
          reply_markup: {
            inline_keyboard: checkSlotMarkup,
          },
        });
      });
  } else {
    bot.telegram.sendMessage(ctx.chat.id, "Invalid PINCODE", {
      reply_markup: {
        inline_keyboard: checkSlotMarkup,
      },
    });
  }
});

bot.hears(/[s][u][b][s][c][r][i][b][e] [1-9][0-9]{5}$/, (ctx) => {
  const pincode = ctx.update.message.text.split(" ")[1];
  User.findOne({ pincode: pincode })
    .then((user) => {
      if (!user) {
        const user = new User({
          pincode: pincode,
          telegramUser: [],
        });
        user.telegramUser.push({ id: ctx.chat.id });
        pincodesQ.enqueue(pincode);
        return user.save();
      } else {
        const isAlreadySubscribed = user.telegramUser.find((tUser) => {
          return tUser.id == ctx.chat.id;
        });
        console.log(isAlreadySubscribed);
        // for(let x of user.telegramUser){

        // }
        if (!isAlreadySubscribed) {
          user.telegramUser.push({ id: ctx.chat.id });
          return user.save();
        } else {
          return user;
        }
      }
    })
    .then((user) => {
      bot.telegram.sendMessage(ctx.chat.id, afterSubscribeMsg, {
        reply_markup: {
          inline_keyboard: subscribeMarkup1,
        },
      });
    })
    .catch((err) => {
      console.log(err);
    });
});

bot.action("india", (ctx) => {
  axios
    .get("https://api.covid19india.org/data.json")
    .then((data) => {
      let message = `
Active Cases:  ${data.data.statewise[0].active}\n
Confirmed Cases:  ${data.data.statewise[0].confirmed}\n
Deaths:  ${data.data.statewise[0].deaths}\n
Recovered:  ${data.data.statewise[0].recovered}\n
Last Update :  ${data.data.statewise[0].lastupdatedtime}
`;
      ctx.deleteMessage();
      bot.telegram.sendMessage(ctx.chat.id, message, {
        reply_markup: {
          inline_keyboard: indiaMarkup,
        },
      });
    })
    .catch((err) => {
      console.lof(err);
    });
});

bot.action("state", (ctx) => {
  ctx.deleteMessage();
  ctx.telegram.sendMessage(ctx.chat.id, "Enter State", {
    reply_markup: {
      inline_keyboard: stateMarkup,
    },
  });
});

bot.action(stateList, (ctx) => {
  const selectedState = ctx.match;
  axios
    .get("https://api.covid19india.org/data.json")
    .then((data) => {
      const stateData = data.data.statewise.find((val) => {
        return val.state === selectedState;
      });
      let message = `
State:  ${selectedState}\n
Active Cases:  ${stateData.active}\n
Confirmed Cases:  ${stateData.confirmed}\n
Deaths:  ${stateData.deaths}\n
Recovered:  ${stateData.recovered}\n
New Cases : ${stateData.deltaconfirmed}\n
Last Update :  ${stateData.lastupdatedtime}
`;
      ctx.deleteMessage();
      ctx.telegram.sendMessage(ctx.chat.id, message, {
        reply_markup: {
          inline_keyboard: stateNameMarkup,
        },
      });
    })
    .catch((err) => {
      console.log(err);
    });
});

bot.action("bot-info", (ctx) => {
  ctx.deleteMessage();
  ctx.telegram.sendMessage(ctx.chat.id, "Bot Information", {
    reply_markup: {
      inline_keyboard: botInfoMarkup,
    },
  });
});

bot.action("credits", (ctx) => {
  ctx.deleteMessage();
  const message = `
API used -  https://api.covid19india.org/data.json
            https://apisetu.gov.in/public/api/cowin#/Metadata%20APIs/states
  `;
  ctx.telegram.sendMessage(ctx.chat.id, message, {
    reply_markup: {
      inline_keyboard: afterInfoMarkup,
    },
  });
});

bot.action("dev", (ctx) => {
  ctx.deleteMessage();
  const message = `
Developed By - Archit Goyal
  `;
  ctx.telegram.sendMessage(ctx.chat.id, message, {
    reply_markup: {
      inline_keyboard: afterInfoMarkup,
    },
  });
});

bot.action("start", (ctx) => {
  ctx.deleteMessage();
  ctx.telegram.sendMessage(ctx.chat.id, startMessage, {
    reply_markup: {
      inline_keyboard: startMarkup,
    },
  });
});

// bot.launch();

mongoose
  .connect(keys.mongoKey)
  .then((result) => {
    return User.find();
  })
  .then((users) => {
    for (const user of users) {
      pincodesQ.enqueue(user.pincode);
    }
    // bot.launch();
    bot.startPolling();
  })
  .catch((err) => {
    console.log(err);
  });
