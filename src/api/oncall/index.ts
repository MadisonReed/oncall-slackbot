import { Member } from "@api/slack";
import { OncallSlackUser } from "@api/slack";
import SlackApi from "@api/slack";
import { Email, PdOncallResult } from "@types";
import pagerDuty from "@api/pd";

export const getOncallSlackMembers = async (): Promise<OncallSlackUser[]> => {
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
