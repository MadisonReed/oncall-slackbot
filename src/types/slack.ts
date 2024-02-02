import { IConfig } from "config";

export type Email = string;

export interface BotConfig extends IConfig {
  slack: {
    emoji: string;
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

export interface SlackUser {
  id: string;
  name: string;
}
