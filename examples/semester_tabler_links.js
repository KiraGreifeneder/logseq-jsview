const deadlines = await jsv.simpleQuery(`(property :deadline-name)`);

const table = jsv.table();
table.headers(["Name", "Status", "Days Left"]);

// sort by date - put passed deadlines at the end
const now = new Date();
const today = [
  now.getFullYear(),
  String(now.getMonth() + 1).padStart(2, "0"),
  String(now.getDate()).padStart(2, "0"),
].join("-"); // local date as "YYYY-MM-DD"

deadlines.sort((a, b) => {
  const aDate = a.properties.deadlineDate[0] ?? "";
  const bDate = b.properties.deadlineDate[0] ?? "";

  const aPast = aDate < today;
  const bPast = bDate < today;

  if (aPast !== bPast) return aPast ? 1 : -1; // past deadlines go last
  return aDate.localeCompare(bDate);
});

function getDeadlineString(date, time, status) {
  const now = new Date();
  let deadlineString = "unknown";
  let deadline = null;

  if (date) {
    // Build a local Date from "YYYY-MM-DD" and "HH:mm"
    const [y, m, d] = date.split("-").map(Number);
    const [hh = 0, mm = 0] = (time ?? "").split(":").map(Number);
    deadline = new Date(y, m - 1, d, hh, mm);

    const weekday = new Intl.DateTimeFormat("en-GB", {
      weekday: "short",
    }).format(deadline);
    const dd = String(deadline.getDate()).padStart(2, "0");
    const MM = String(deadline.getMonth() + 1).padStart(2, "0");
    const yy = String(deadline.getFullYear()).slice(-2);
    const HH = String(deadline.getHours()).padStart(2, "0");
    const min = String(deadline.getMinutes()).padStart(2, "0");

    deadlineString = `${weekday}, ${dd}.${MM}.${yy}, ${HH}:${min}`;
  }

  let color = "#CD5C5C";
  let daysUntil = "-";
  let hoursUntil = "";

  if (deadline != null) {
    hoursUntil = Math.round(
      (deadline.getTime() - now.getTime()) / 1000 / 60 / 60,
    );
    daysUntil = Math.floor(hoursUntil / 24);

    if (deadline <= now) {
      color = status === "Closed" ? "green" : "red";
    } else if (daysUntil <= 7) {
      switch (status) {
        case "Closed":
          color = "lightgreen";
          break;
        case "Resolved":
          color = "yellow";
          break;
        default:
          color = "orange";
          break;
      }
    } else if (daysUntil <= 14) {
      color = status === "Closed" ? "lightgreen" : "lightgray";
    } else {
      color = status === "Closed" ? "lightgreen" : "gray";
    }
  }

  return `<span style='color:${color}'>${deadlineString} (${daysUntil}d, ${hoursUntil % 24}h)</span>`;
}

async function goToBlock(e) {
  const uuid = e.dataset.uuid;
  // Navigates to the block, zoomed in
  logseq.App.pushState("page", { name: uuid });
}

jsv.registerFunction("goToBlock", goToBlock);

function blockLink(uuid, label) {
  return `<a data-on-click="goToBlock" data-uuid="${uuid}" style="cursor:pointer">${label}</a>`;
}

for (d of deadlines) {
  const props = d.properties;

  let shortName = d.page.originalName.substring(2);
  shortName = (shortName.match(/[A-Z]/g) || []).join(""); // only keep uppercase
  shortName = shortName + ": " + props.deadlineName;

  // create row
  table.row([
    blockLink(d.uuid, shortName),
    props.deadlineStatus,
    getDeadlineString(
      props.deadlineDate[0],
      props.deadlineTime,
      props.deadlineStatus,
    ),
  ]);
}

return table;
