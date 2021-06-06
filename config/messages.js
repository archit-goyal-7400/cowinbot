exports.startMessage = `
Hi there!
Welcome to the Vaccine Notifier Bot

I can check the slots availability in your area.Just press Check Open Slots button below.\n
Press Setup Alerts to get notified when slots are available\n
Press India to know all the information of covid-19 in India\n
Press State to know all the information of of Covid-19 by state
`;

exports.agePref = "Select Your Age Preference";

exports.subscribeMsg = "Enter subscribe <your pincode>";
exports.afterSubscribeMsg =
  "You are now subscribed to recieve COVID-19 vaccine shot alerts for your pin...";

const createMsg = (centers, pincode) => {
  let msg = "";
  let cnt = 0;
  msg += "Slots available for the pincode " + pincode + " are : \n";
  for (const center of centers) {
    if (center.sessions.length) {
      let isThere = 0;
      for (let session of center.sessions) {
        if (session.available_capacity) {
          if (isThere == 0) {
            isThere++;
            cnt++;
            msg += "(" + cnt + ").   " + center.name + " : \n";
          }
          msg +=
            "          - " +
            session.date +
            " :  " +
            session.available_capacity +
            "  - " +
            session.vaccine +
            "   (Age - " +
            session.min_age_limit +
            ")\n";
        }
      }
      // msg += "\n";
    }
  }
  if (cnt == 0) {
    return -1;
  }
  return msg;
};

exports.checkSlotsMsg = (centers, pincode) => {
  let msg = createMsg(centers, pincode);
  if (msg === -1) {
    msg = "No slots available for pincode " + pincode;
  }
  return msg;
};

exports.getMessage = (centers, pincode) => {
  return createMsg(centers, pincode);
};
