import dbg from "debug";
import config from "config";

const debug = dbg("slackMessage");
const oncall_map = config.get("pagerduty.oncall_map");

export const handleOncallMention = (oncalls, message) => {
  debug("oncalls", oncalls, "message", message);
  // extract mentioned shortname
  let oncallMentioned = oncalls.find((oncall) =>
    message.includes(`@${oncall}`)
  );
  // get the full name from that
  const fullname = oncall_map[oncallMentioned];
  debug("oncall mentioned was", fullname);
  // get the current oncall for this shift
  pagerDuty.getOnCalls(null, (err, pdUsers) => {
    if (err){
      debug("err", err);
    }
    debug("getOncalls callback");
    async.each(
      pdUsers,
      (pdUser, cb) => {
        if (pdUser.user.name == undefined) {
          debug("...", pdUser);
          cb();
        } else {
          slackdata.getUser(
            FIND_BY_EMAIL,
            pdUser.user.email,
            (err, slacker) => {
              if (err) {
                debug("err", err);
              } else if (!slacker) {
                debug("user doesn't have a slack id");
              } else {
                oncallSlackers.push(slacker.id);
                oncallSlackerNames.push(slacker.name);
              }
              cb();
            }
          );
        }
      },
      (err) => {
        if (err) {
          debug("err", err);
        } else {
          debug("got all oncalls:", oncallSlackerNames);
          callback(oncallSlackers);
        }
      }
    );
  });
};
