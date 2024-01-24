import { IConfig } from "config";

export interface BotConfig extends IConfig {
  slack: {
    emoji: string;
    slack_token: string;
    bot_name: string;
    cache_interval_seconds: number;
    next_in_queue_interval: number;
    test_user: string;
    allowed_response_bots: string[];
  };
  pagerduty: {
    schedule_ids: string[];
    pagerduty_token: string;
    cache_interval_seconds: number;
    oncall_map: any;
  };
}

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
