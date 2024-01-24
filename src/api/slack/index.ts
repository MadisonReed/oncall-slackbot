import app from "@src/app";
import jsonConfig from "config";
import { BotConfig } from "@types";
import { Email } from "@types";
import { UsersListResponse } from "@slack/web-api";
import { Member } from "@slack/web-api/dist/response/UsersListResponse";
const config: BotConfig = jsonConfig as BotConfig;
import NodeCache from "node-cache";

export { Member } from "@slack/web-api/dist/response/UsersListResponse";

export class OncallSlackUser {
  name: string;
  email: string;
  pdId: string;
  pdScheduleId: string;
  slackId: string;

  constructor(
    name: string,
    email: string,
    pdId: string,
    pdScheduleId: string,
    slackId: string
  ) {
    this.name = name;
    this.email = email;
    this.pdId = pdId;
    this.pdScheduleId = pdScheduleId;
    this.slackId = slackId;
  }
}

export default class SlackApi {
  cache: NodeCache;
  cacheInterval: number;

  constructor() {
    this.cache = new NodeCache();
    this.cacheInterval = config.slack.cache_interval_seconds;
    this.getUsers();
  }

  getUsers = async (): Promise<UsersListResponse> => {
    const cachedUsers: UsersListResponse | undefined =
      this.cache.get("allUsers");
    if (cachedUsers) {
      return cachedUsers;
    }
    let usersResult = app.client.users
      .list({
        token: config.slack.slack_token,
        limit: 1000,
      })
      .then((result) => {
        console.log("all users: ", result.members?.length);
        return result;
      });
    this.cache.set("allUsers", usersResult, this.cacheInterval);
    return usersResult;
  };

  getUser = async (email: Email):Promise<Member> => {
    const cachedUser = this.cache.get(email);
    if (cachedUser) {
      return cachedUser;
    } else {
      const allUsers = await this.getUsers();
      const user = allUsers.members!.find((u: Member) => u.profile!.email === email);
      this.cache.set(email, user);
      if (!user) {
        throw new Error(`No user found with email: ${email}`);
      }
      return user;
    }
  };
}
