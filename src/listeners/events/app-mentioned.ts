// import { constructMappedMessage } from "../pd/ls";
import { pagerDuty } from "@api/pd";
import { AllMiddlewareArgs, SlackEventMiddlewareArgs } from "@slack/bolt";
import { version, name as packageName } from "package.json";
import { OncallSlackUser, PdOncallResult } from "@types";

const USER_MENTION_REGEX = "^<@U[A-Z0-9]{8,10}>";
const VERSION_REGEX = new RegExp(`${USER_MENTION_REGEX} version`);
const LS_REGEX = new RegExp(`${USER_MENTION_REGEX} ls`);

// const getOncallSlackers = async () => {
//   var oncallSlackers: OncallSlackUser[] = [];
//   var oncallSlackerNames: string[] = [];
//   const pdUsers: PdOncallResult[] = await pagerDuty.getOnCalls(null);
//   for (const pdUser of pdUsers) {
//     const slackUser: SlackUser = await slackdata.getUser(
//       FIND_BY_EMAIL,
//       pdUser.user.email
//     );
//     oncallSlackers.push(
//       new OncallSlackUser(
//         pdUser.user.name,
//         pdUser.user.email,
//         pdUser.user.id,
//         pdUser.schedule.id,
//         slackUser.id
//       )
//     );
//     oncallSlackerNames.push(slackUser.name);
//   }
//   return oncallSlackers;
// };

// const getOncallSlackers = async () => {
//   var oncallSlackers: OncallSlackUser[] = [];
//   var oncallSlackerNames: string[] = [];
//   const pdUsers: PdOncallResult[] = await pagerDuty.getOnCalls(null);
//   for (const pdUser of pdUsers) {
//     if (pdUser.user.name == undefined) {
//       console.error("...", pdUser);
//     } else {
//       const slackUser: SlackUser = await slackdata.getUser(
//         FIND_BY_EMAIL,
//         pdUser.user.email
//       );
//       if (!slackUser) {
//         console.error("user doesn't have a slack id");
//       } else {
//         oncallSlackers.push(
//           new OncallSlackUser(
//             pdUser.user.name,
//             pdUser.user.email,
//             pdUser.user.id,
//             pdUser.schedule.id,
//             slackUser.id
//           )
//         );
//         oncallSlackerNames.push(slackUser.name);
//       }
//     }
//   }
//   return oncallSlackers;
// };

const appMentionedCallback = async ({
  event,
  say,
}: AllMiddlewareArgs & SlackEventMiddlewareArgs<"app_mention">) => {
  console.log("bot mentioned", event, event.bot_id);
  if (event.text.match(VERSION_REGEX)) {
    say(`I am *${packageName}* and running version ${version}.`);
  } else if (event.text.match(LS_REGEX)) {
    // const usersMessage = constructMappedMessage(await getOncallSlackers());
    const usersMessage = JSON.stringify((await pagerDuty.getOncalls(null)).map((x) => x.user.name));
    say(`Current oncall listing: ${usersMessage}`);
  } else {
    say("hey");
  }
};

export default appMentionedCallback;
