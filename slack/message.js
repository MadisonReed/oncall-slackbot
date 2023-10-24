import dbg from "debug";

const debug = dbg("slackMessage");

export const handleOncallMention = (oncalls, message) => {
  debug("oncalls", oncalls, "message", message);
  let oncallMentioned = oncalls.find((oncall) =>
    message.includes(`@${oncall}`)
  );
  debug("oncall mentioned was", oncallMentioned);
};
