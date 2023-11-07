export interface SlackUserProfile {
  first_name: string;
  last_name: string;
  real_name: string;
  display_name: string;
  real_name_normalized: string;
  display_name_normalized: string;
  email: string;
  team: string;
}

export interface SlackUser {
  id: string;
  team_id: string;
  name: string;
  is_bot: boolean;
  profile: SlackUserProfile;
  updated: number;
}

export interface SlackChannel {
  id: string;
  name: string;
  is_channel: boolean;
  is_group: boolean;
  is_im: boolean;
  is_mpim: boolean;
  is_private: boolean;
  created: number;
  is_archived: boolean;
  is_general: boolean;
  name_normalized: string;
  is_shared: boolean;
  is_org_shared: boolean;
  is_pending_ext_shared: boolean;
  context_team_id: string;
  updated: number;
  parent_conversation: any;
  creator: string;
  is_ext_shared: boolean;
  shared_team_ids: string[];
  is_member: boolean;
  topic: any; // { value: ""; creator: ""; last_set: 0 };
  purpose: any; // { value: ""; creator: ""; last_set: 0 };
  previous_names: any[];
  num_members: number;
}

export interface MessageDataDetails {
  ts: string;
  user: string;
  thread_ts: string;
  reply_count: number;
  text: "@pefoundation (prob Brad) can you handle the <http://sui.id|sui.id> cert expiration today? I want to move all of the SuiNS stuff to GKE but I don’t think I’ll have time today.";
}

export interface MessageData {
  type: string;
  user: SlackUser | string;
  message: MessageDataDetails;
  text: string;
  bot_id: string;
  channel: string;
  team: string;
  ts: string;
}
