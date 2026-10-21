export type Cell = { content: string; props?: Props } | string;
export type Row = { cells: Cell[]; props?: Props } | Cell[];
export type Props = { [key: string]: string };

/**
 * Builds an HTML table through `jsq.table(tableProps?)`.
 *
 * Call `headers(row)` to set or replace the optional header, and `row(row)` to
 * append a body row. Both return the table so calls can be chained.
 * You can return the table from a JSQ block directly or call `toString()` to get its HTML.
 *
 * A row is either an array of cells or `{ cells: [...], props: {...} }`.
 * A cell is either a string or `{ content: "...", props: {...} }`.
 * Props are string-valued HTML attributes applied to the table, row, or cell.
 * Header cells render as `<th>`; body cells render as `<td>`.
 *
 * Cell strings are raw HTML, not escaped text. Convert numbers and other values
 * with `String(value)` and HTML-escape untrusted text before adding it.
 * Attribute names and values are currently inserted without escaping as well,
 * so please only supply trusted attributes.
 *
 * @example
 * const table = jsq.table({ style: "border-collapse: collapse" })
 *   .headers(["Task", "Status"])
 *   .row(["Write docs", "Done"])
 *   .row({
 *     cells: [
 *       { content: "<strong>Publish V1</strong>", props: { title: "Next step" } },
 *       "Pending",
 *     ],
 *     props: { style: "font-weight: bold" },
 *   });
 *
 * return table;
 */
export class Table {
  private props?: Props;
  private header?: Row;
  private rows: Row[] = [];
  private errs: string[] = [];

  constructor(props?: Props) {
    this.props = props;
  }

  headers(header: Row): this {
    this.header = header;
    return this;
  }

  row(row: Row): this {
    this.rows.push(row);
    return this;
  }

  toString(): string {
    if (this.errs.length > 0) {
      return this.errsAsElements();
    }

    const propsStr = this.props ? ` ${Table.propsToString(this.props)}` : "";

    let tableString = `<table class="jsq-table" ${propsStr}> <thead>`;

    const headerString = this.header ? this.rowToString(this.header, "th") : "";

    const rowStrings = this.rows.map((row) => this.rowToString(row, "td"));

    return tableString.concat(
      headerString,
      "</thead>",
      ...rowStrings,
      "</table>",
    );
  }

  private static cellsFromRow(row: Row): Cell[] {
    return "cells" in row ? row.cells : row;
  }

  private static getPropsString(element: Row | Cell) {
    if (typeof element != "object" || !("props" in element) || !element.props) {
      return "";
    }

    return Table.propsToString(element.props);
  }

  private static propsToString(props: Props) {
    return Object.entries(props)
      .map(([key, value]) => `${key}="${value}"`)
      .join(" ");
  }

  private rowToString(row: Row, elementType: "td" | "th") {
    const cells = Table.cellsFromRow(row);

    const cellStrings = cells.map((cell) => {
      const content = this.contentFromCell(cell);
      const props = Table.getPropsString(cell);
      const propsStr = props ? ` ${props}` : "";
      return `<${elementType}${propsStr}> ${content} </${elementType}>`;
    });

    const rowProps = Table.getPropsString(row);
    const rowPropsStr = rowProps ? ` ${rowProps}` : "";
    return `<tr ${rowPropsStr}> ${cellStrings.join(" ")} </tr>`;
  }

  private contentFromCell(cell: Cell) {
    if (typeof cell === "string") {
      return cell;
    } else if (cell.content && typeof cell.content === "string") {
      return cell.content;
    } else {
      this.errs.push(
        "Couldn't read non-string cell content; Ensure that all cells contain string representations",
      );
      return "";
    }
  }

  private errsAsElements() {
    return this.errs
      .map(
        (err, idx) => `<code class="jsq-table-error"> ${idx}: ${err} </code>`,
      )
      .join(""); // TODO newlines? or do browsers do this for us
  }
}
