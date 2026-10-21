import "@logseq/libs";
import type { SettingSchemaDesc } from "@logseq/libs/dist/LSPlugin";

// TODO use a dropdown instead, previously opened graph paths are stored by logseq somewhere
export const settingsSchema: SettingSchemaDesc[] = [
  {
    key: "trustedPaths",
    type: "object",
    default: [],
    title: "Trusted Paths/Graphs",
    description: `Paths to the graphs that JSView is allowed to run in.
        This is a security measure to prevent JSView blocks in foreign graphs
        from running automatically and potentially doing damage to your system.
        Add the exact graph path reported by JSView to the trustedPaths array in settings.json.
        Paths must match exactly; approving a parent directory does not approve other graphs.
        Only approve graphs whose code you trust.
        e.g. ${"`"} trustedPaths: ["${`/home/myuser/my-logseq-graph`}", "${`/home/myuser/my-other-logseq-graph`}"] ${"`"} `,
  },
];

export function initSettings() {
  logseq.useSettingsSchema(settingsSchema);
}
