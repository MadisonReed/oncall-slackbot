import { Member } from "@api/slack";
import { BotConfig } from "@types";
import SlackApi from "@api/slack";
import { pagerDuty } from "@api/pd";
import { AllMiddlewareArgs, SlackEventMiddlewareArgs } from "@slack/bolt";
import { version, name as packageName } from "package.json";
import { Email, PdOncallResult, SlackUser } from "@types";
import { OncallSlackUser } from "@api/slack";
import jsonConfig from "config";

const config: BotConfig = jsonConfig as BotConfig;

const USER_MENTION_REGEX = "^<@U[A-Z0-9]{8,10}>";
const VERSION_REGEX = new RegExp(`${USER_MENTION_REGEX} version`);
const LS_REGEX = new RegExp(`${USER_MENTION_REGEX} ls`);

type OncallMap = { [key: string]: string };
const oncallMap: OncallMap = config.pagerduty.oncall_map;

const transformMapping = (mapping: OncallMap) => {
  // Given the regular oncall mapping, transform it into a
  // mapping of schedule id to a list of shortnames.
  const transformed: {
    [key: string]: string[];
  } = {};

  for (const name in mapping) {
    const id = mapping[name];
    if (transformed[id]) {
      transformed[id].push(name);
    } else {
      transformed[id] = [name];
    }
  }

  return transformed;
};

const constructMappedMessage = (oncallSlackMembers: OncallSlackUser[]) => {
  const shortnamesMap = transformMapping(oncallMap);
  return (
    Object.entries(shortnamesMap)
      .map(([pdScheduleId, shortnames]) => [
        shortnames,
        oncallSlackMembers.find((s) => s.pdScheduleId == pdScheduleId),
      ])
      // remove null and undefined
      .filter(([_, id]: (string[] | OncallSlackUser | undefined)[]) => !!id)
      .map(
        ([shortnames, s]: (string[] | OncallSlackUser | undefined)[]) =>
          `(${(shortnames! as string[]).join(" | ")}): @${
            (s as OncallSlackUser).name
          }`
      )
      .join("\n")
  );
};

const getOncallSlackMembers = async (): Promise<OncallSlackUser[]> => {
  var oncallSlackMembers: OncallSlackUser[] = [];
  var oncallSlackerNames: string[] = [];
  const pdUsers: PdOncallResult[] = await pagerDuty.getOncalls(null);
  const slack = new SlackApi();
  for (const pdUser of pdUsers) {
    const slackUser: Member = await slack.getUser(pdUser.user.email as Email);
    console.log("slackUser", slackUser);
    oncallSlackMembers.push(
      new OncallSlackUser(
        pdUser.user.name,
        pdUser.user.email,
        pdUser.user.id,
        pdUser.schedule.id,
        slackUser.id!
      )
    );
    oncallSlackerNames.push(slackUser.name!);
  }
  return oncallSlackMembers;
};

const appMentionedCallback = async ({
  event,
  say,
}: AllMiddlewareArgs & SlackEventMiddlewareArgs<"app_mention">) => {
  console.log("bot mentioned", event, event.bot_id);
  if (event.text.match(VERSION_REGEX)) {
    say(`I am *${packageName}* and running version ${version}.`);
  } else if (event.text.match(LS_REGEX)) {
    const slackMembers = await getOncallSlackMembers();
    const usersMessage = constructMappedMessage(slackMembers);
    let threadTs = event.ts;
    await say({
      text: `Current oncall listing:\n ${usersMessage}`,
      thread_ts: threadTs,
    });
  } else {
    say("hey");
  }
};

export default appMentionedCallback;
