import "@logseq/libs";
import { SettingSchemaDesc } from "@logseq/libs/dist/LSPlugin";

export const settingsSchema: SettingSchemaDesc[] = [
  {
    key: "trustedPaths",
    type: "object",
    default: [],
    title: "Trusted Paths/Graphs",
    description: `Paths to the graphs that JSQ is allowed to run in. 
        This is a security measure to prevent JSQ blocks in foreign graphs 
        from running automatically and potentially doing damage to your system.
        Add the path to the trustedPahts array in settings.json, 
        e.g. ${"`"} trustedPaths: ["${`/home/myuser/my-logseq-graph`}", "${`/home/myuser/my-other-logseq-graph`}"] ${"`"} `,
  },
];

export function initSettings() {
  logseq.useSettingsSchema(settingsSchema);
}
