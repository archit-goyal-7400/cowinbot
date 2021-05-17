exports.startMessage = `
Hi there!
Welcome to the Vaccine Notifier Bot

I can check the slots availability in your area.Just press Check Open Slots button below.
`;

exports.agePref = "Select Your Age Preference";

exports.checkSlotsMsg = (centers, pincode) => {
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
            "   (Age - " +
            session.min_age_limit +
            ")\n";
        }
      }
      // msg += "\n";
    }
  }
  if (cnt == 0) {
    msg = "No slots available for pincode " + pincode;
  }
  return msg;
};
