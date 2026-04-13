declare module 'jspdf' {
  class jsPDF {
    constructor(options?: any);
    setFontSize(size: number): this;
    setTextColor(r: number, g?: number, b?: number): this;
    text(text: string, x: number, y: number, options?: any): this;
    line(x1: number, y1: number, x2: number, y2: number): this;
    save(filename: string): void;
    internal: {
      pageSize: {
        getWidth: () => number;
        getHeight: () => number;
      };
    };
    lastAutoTable: { finalY: number };
    setDrawColor(r: number, g?: number, b?: number): this;
    setFont(size?: number): this;
  }
  export default jsPDF;
}

declare module 'jspdf-autotable' {
  import { jsPDF } from 'jspdf';
  interface AutoTableOptions {
    startY?: number;
    head?: any[][];
    body?: any[][];
    theme?: 'striped' | 'grid' | 'plain';
    headStyles?: any;
    didDrawPage?: (data: any) => void;
  }
  function autoTable(doc: jsPDF, options: AutoTableOptions): void;
  export = autoTable;
}
