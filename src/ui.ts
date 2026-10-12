// table builder

export type Cell = { content: string; props?: Props } | string;
export type Row = { cells: Cell[]; props?: Props } | Cell[];
export type Props = { [key: string]: string };

export class Table {
  private props?: Props;
  private header?: Row;
  private rows: Row[] = [];
  private errs: string[] = [];

  private nCols(): number | undefined {
    if (!this.header) {
      return undefined;
    }
    return Table.cellsFromRow(this.header).length;
  }

  private static cellsFromRow(row: Row): Cell[] {
    return "cells" in row ? row.cells : row;
  }

  private static contentFromCell(cell: Cell) {
    return typeof cell === "string" ? cell : cell.content;
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

  private static rowToString(row: Row, elementType: "tr" | "th") {
    const cells = Table.cellsFromRow(row);

    const cellStrings = cells.map((cell) => {
      const content = Table.contentFromCell(cell);
      const props = Table.getPropsString(cell);
      const propsStr = props ? ` ${props}` : "";
      return `<td${propsStr}> ${content} </td>`;
    });

    const rowProps = Table.getPropsString(row);
    const rowPropsStr = rowProps ? ` ${rowProps}` : "";
    return `<${elementType}${rowPropsStr}> ${cellStrings.join(" ")} </${elementType} >`;
  }

  private errsAsElements() {
    return this.errs
      .map((err, idx) => `<code style="color:red"> ${idx}: ${err} </code>`)
      .join(""); // TODO newlines? or do browsers do this for us
  }

  constructor(props?: Props) {
    this.props = props;
  }

  headers(header: Row): this {
    if (Table.cellsFromRow(header).length === 0) {
      this.errs.push(
        "Header has no entries; Set a header with at least one column.",
      );
      return this;
    }

    this.header = header;
    return this;
  }

  row(row: Row): this {
    const length = Table.cellsFromRow(row).length;

    if (!this.header) {
      this.errs.push("Missing header; Add a header before adding rows.");
      return this;
    }

    if (length != this.nCols()) {
      this.errs.push("Row doesn't match header length!");
      return this;
    }

    this.rows.push(row);
    return this;
  }

  toString(): string {
    if (!this.header) {
      this.errs.push(
        "Table has no header; Add a header before calling toString()",
      );
      return this.errsAsElements(); // early return mainly for typechecking
    }

    if (this.errs.length > 0) {
      return this.errsAsElements();
    }

    const propsStr = this.props ? ` ${Table.propsToString(this.props)}` : "";
    let tableString = `<table class=table-auto${propsStr}> <thead>`;
    const headerString = Table.rowToString(this.header, "th");
    const rowStrings = this.rows.map((row) => Table.rowToString(row, "tr"));

    return tableString.concat(headerString, ...rowStrings, "</table>");
  }
}
