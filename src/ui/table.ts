export type Cell = { content: string; props?: Props } | string;
export type Row = { cells: Cell[]; props?: Props } | Cell[];
export type Props = { [key: string]: string };

export class Table {
  private props?: Props;
  private header?: Row;
  private rows: Row[] = [];
  private styled = true;

  constructor(props?: Props) {
    this.props = props;
  }

  headers(header: Row): this {
    Table.validateRow(header, "header");
    this.header = header;
    return this;
  }

  row(row: Row): this {
    Table.validateRow(row, `row ${this.rows.length + 1}`);
    this.rows.push(row);
    return this;
  }

  withoutStyle(): this {
    this.styled = false;
    return this;
  }

  toString(): string {
    const { class: customClass, ...props } = this.props ?? {};

    const classes = [
      "jsv-table",
      ...(this.styled ? ["jsv-table--styled"] : []),
      ...(customClass ? [customClass] : []),
    ].join(" ");

    const propsStr = Table.propsToString({ ...props, class: classes });

    let tableString = `<table ${propsStr}> <thead>`;

    const headerString = this.header ? this.rowToString(this.header, "th") : "";

    const rowStrings = this.rows.map((row) => this.rowToString(row, "td"));

    return tableString.concat(
      headerString,
      "</thead><tbody>",
      ...rowStrings,
      "</tbody></table>",
    );
  }

  private static cellsFromRow(row: Row): Cell[] {
    return "cells" in row ? row.cells : row;
  }

  private static validateRow(row: unknown, location: string): void {
    const cells =
      row && typeof row === "object" && "cells" in row ? row.cells : row;
    if (!Array.isArray(cells)) {
      throw new TypeError(
        `Table ${location}: expected an array of cells or { cells: [...] }.`,
      );
    }
    for (const [index, cell] of cells.entries()) {
      if (
        typeof cell !== "string" &&
        !(cell && typeof cell === "object" && typeof cell.content === "string")
      ) {
        throw new TypeError(
          `Table ${location}, cell ${index + 1}: expected a string or { content: string }.`,
        );
      }
    }
  }

  private static getPropsString(element: Row | Cell) {
    if (
      !element ||
      typeof element != "object" ||
      !("props" in element) ||
      !element.props
    ) {
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
    } else if (
      cell &&
      typeof cell === "object" &&
      typeof cell.content === "string"
    ) {
      return cell.content;
    } else {
      throw new TypeError(
        "Table cell: expected a string or { content: string }.",
      );
    }
  }
}
