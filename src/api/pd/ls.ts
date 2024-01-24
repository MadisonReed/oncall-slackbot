import { BotConfig } from "@types";
import { OncallSlackUser } from "@api/slack";
import jsonConfig from "config";

const config: BotConfig = jsonConfig as BotConfig;
const oncallMap = config.pagerduty.oncall_map;

const transformMapping = (mapping: any) => {
  // Given the regular oncall mapping, transform it into a
  // mapping of schedule id to a list of shortnames.
  const transformed: { [id: string]: string[] } = {};

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

export const constructMappedMessage = (
  oncallSlackers: OncallSlackUser[]
): string => {
  const shortnamesMap = transformMapping(oncallMap);
  const entries: Array<[string, string[]]> = Object.entries(shortnamesMap);
  return (
    entries
      .map(
        ([pdScheduleId, shortnames]): [
          string[],
          OncallSlackUser | undefined
        ] => [
          shortnames,
          oncallSlackers.find((s) => s.pdScheduleId == pdScheduleId),
        ]
      )
      // remove null and undefined
      .filter(
        ([_, slack_user]: [string[], OncallSlackUser | undefined]) => !!slack_user
      )
      .map(
        ([shortnames, slack_user]) =>
          `(${shortnames.join(" | ")}): @${
            (slack_user as OncallSlackUser).name
          }`
      )
      .join("\n")
  );
};
