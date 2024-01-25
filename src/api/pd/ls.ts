import { BotConfig } from "@types";
import { OncallSlackUser } from "@api/slack";
import jsonConfig from "config";

const config: BotConfig = jsonConfig as BotConfig;
type OncallMap = { [key: string]: string };
const oncallMap:OncallMap = config.pagerduty.oncall_map;

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

export const makeOncallMappingMessage = (oncallSlackMembers: OncallSlackUser[]) => {
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

