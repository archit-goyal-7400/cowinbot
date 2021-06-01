const Telegraf = require("telegraf");
const mongoose = require("mongoose");
const User = require("./model/user");
const keys = require("./keys");
const fs = require("fs");

const {
  startMessage,
  checkSlotsMsg,
  getMessage,
} = require("./config/messages");
const { startMarkup, checkSlotMarkup } = require("./config/keymapping");
const { default: axios } = require("axios");
const Queue = require("./config/Queue");

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
      const prevSession = prevDetails.sessions.find((detail) => {
        return detail.session_id === session.session_id;
      });
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
        console.log("sending for ", user);
        bot.telegram.sendMessage(user.id, generatedMsg);
      }
    }
  }
};

/*
Structure of info
info[pincode]={
  state : "",
  district : "",
  centers : [
    {center}
  ]
}

*/

const fn = () => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, 1000);
  });
};
const mockApi = async () => {
  await fn();
  // return fakeUser;
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
};

const poll = () => {
  console.log("Start poll...");

  const executePoll = async (resolve, reject) => {
    console.log("- poll");
    if (pincodesQ.isEmpty() === false) {
      const pincode = pincodesQ.dequeue();
      pincodesQ.enqueue(pincode);
      await updateSlots(pincode);
    }
    setTimeout(executePoll, 5000, resolve, reject);
  };

  return new Promise(executePoll);
};
poll();

// poll(mockApi, 10000, 10);
// fn();
const bot = new Telegraf(keys.telegrafKey);
bot.command("start", (ctx) => {
  bot.telegram.sendMessage(ctx.chat.id, startMessage, {
    reply_markup: {
      inline_keyboard: startMarkup,
    },
  });
});

bot.action("checkSlots", (ctx) => {
  bot.telegram.sendMessage(ctx.chat.id, "Enter your pincode");
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
    axios
      .get(reqTo)
      .then((res) => {
        // fs.writeFileSync("test" + pincode + ".json", JSON.stringify(res.data));
        const requiredData = res.data.centers.map((centerData) => {
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
        bot.telegram.sendMessage(
          ctx.chat.id,
          "Something went wrong.Please try again...",
          {
            reply_markup: {
              inline_keyboard: checkSlotMarkup,
            },
          }
        );
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
          return tUser.id === ctx.chat.id;
        });
        if (!isAlreadySubscribed) {
          user.telegramUser.push({ id: ctx.chat.id });
          return user.save();
        } else {
          return user;
        }
      }
    })
    .then((user) => {})
    .catch((err) => {
      console.log(err);
    });
});

bot.action("start", (ctx) => {
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
    bot.launch();
  })
  .catch((err) => {
    console.log(err);
  });
