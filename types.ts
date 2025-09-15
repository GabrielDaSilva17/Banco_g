
export enum ColumnType {
  TEXT = 'TEXT',
  NUMBER = 'NUMBER',
  BOOLEAN = 'BOOLEAN',
  DATE = 'DATE',
  IMAGE = 'IMAGE',
}

export interface Column {
  id: string;
  name: string;
  type: ColumnType;
}

export interface Row {
  _id: string;
  [columnId: string]: any;
}

export interface Table {
  id: string;
  name: string;
  columns: Column[];
  rows: Row[];
}

export interface Database {
  [tableId: string]: Table;
}

export interface User {
  id: string;
  email: string;
}
